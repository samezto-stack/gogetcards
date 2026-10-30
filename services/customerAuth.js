/**
 * Customer authentication. No passwords, anywhere.
 *
 * TWO WAYS IN, ONE WAY TO STAY:
 *
 *   1. Completing a checkout. The order pipeline has already verified an
 *      HMAC-signed confirmation from the payment host before this is
 *      called, so the session is a consequence of a payment the SERVER
 *      confirmed. Nothing a browser can assert creates an account.
 *   2. A single-use link emailed to the address. Proves control of the
 *      inbox, which is the same thing a password reset proves and one
 *      fewer secret for anybody to lose.
 *
 * Both produce the same thing: an opaque random token in an HttpOnly
 * cookie, whose SHA-256 is a row in CustomerSession. The token is never
 * readable by JavaScript, never appears in a URL, never goes in
 * localStorage, and is not stored anywhere in a form that could be
 * replayed — the store cannot impersonate its own customers.
 *
 * WHY NOT A JWT: because "sign out of all devices" has to work. A
 * self-contained token cannot be withdrawn; a row can be deleted.
 */

const crypto = require('crypto');
const Customer = require('../models/Customer');
const CustomerSession = require('../models/CustomerSession');
const MagicLink = require('../models/MagicLink');

const COOKIE_NAME = 'zy_cust';

/* Thirty days, halved-and-rotated. Long enough that a collector checking a
   preorder next month is still signed in, short enough that an abandoned
   session on a shared machine does not last a year. */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/* Past the halfway mark, the next request swaps the token for a fresh one.
   A leaked cookie is therefore useful for days rather than a month, and a
   stolen-then-replayed token stops working as soon as the real browser
   comes back and rotates. */
const ROTATE_AFTER_MS = SESSION_TTL_MS / 2;

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

/* The button in a confirmation email is a different animal from a link
   somebody just asked for. It sits in an inbox and gets opened days
   later, from a phone that has never seen this site, often after the
   receipt has been forwarded to a partner. Fifteen minutes would make it
   useless; a month would make a forwarded receipt an account key. Seven
   days is the compromise, and the link is still single-use and still
   scoped to the one order it was minted for. */
const ORDER_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Reads one cookie off the raw header.
 *
 * `res.cookie()` is built into Express but READING is not — that is
 * cookie-parser, which this project does not depend on. Ten lines here
 * beats a dependency added for ten lines, and beats the failure mode where
 * `req.cookies` is undefined on a host where the middleware was not
 * mounted and every customer silently appears signed out.
 */
function readCookie(req, name) {
  /* Respect cookie-parser if some other middleware has already run. */
  if (req && req.cookies && typeof req.cookies[name] === 'string') return req.cookies[name];
  const header = (req && req.headers && req.headers.cookie) || '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      try { return decodeURIComponent(part.slice(eq + 1).trim()); } catch { return part.slice(eq + 1).trim(); }
    }
  }
  return '';
}

/** 32 random bytes, url-safe. The only value that must never be logged. */
function mintToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hash(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Truncated client IP.
 * A /24 or /48 is enough to tell "this is the session from my office" apart
 * from "this is not mine", which is the only question the customer asks of
 * it. A full address is a location, and storing one to decorate a list is
 * not a trade worth making.
 */
function ipPrefix(req) {
  const raw = String((req && req.ip) || '').replace(/^::ffff:/, '');
  if (raw.includes(':')) return raw.split(':').slice(0, 3).join(':') + '::';
  const parts = raw.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0` : '';
}

function cookieOptions() {
  return {
    httpOnly: true,
    /* Secure in production only, or local development over http could
       never hold a session and would be tested in a configuration nobody
       ships. */
    secure: process.env.NODE_ENV === 'production',
    /* Lax, not Strict: the customer arrives at /thank-you as a top-level
       navigation from the payment host, and Strict would withhold the
       cookie on exactly that request — the one where they are meant to
       discover they now have an account. Lax still withholds it from
       cross-site POSTs, which is the case that matters. */
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/',
  };
}

/* ── Sessions ─────────────────────────────────────────── */

/**
 * Signs a customer in and sets the cookie.
 * @returns {Promise<object>} the CustomerSession row
 */
async function startSession(res, customer, { req = null, origin = 'purchase' } = {}) {
  const token = mintToken();
  const session = await CustomerSession.create({
    customer: customer._id,
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    userAgent: String((req && req.get && req.get('user-agent')) || '').slice(0, 200),
    ipPrefix: ipPrefix(req),
    origin,
  });

  res.cookie(COOKIE_NAME, token, cookieOptions());
  await Customer.updateOne({ _id: customer._id },
    { $set: { lastLoginAt: new Date(), lastSeenAt: new Date() } });
  return session;
}

/**
 * Resolves the signed-in customer for a request, rotating the token when
 * it is past its halfway point.
 *
 * Returns null for anything that is not a live session — no cookie, an
 * unknown token, an expired row, a closed account. Every one of those is
 * the same answer to the caller: this request is anonymous.
 */
async function resolveSession(req, res) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;

  const session = await CustomerSession.findOne({ tokenHash: hash(token) });
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    /* TTL deletion is not instantaneous — Mongo sweeps roughly once a
       minute — so the expiry is checked here too rather than trusted to
       have already happened. */
    await CustomerSession.deleteOne({ _id: session._id });
    if (res) res.clearCookie(COOKIE_NAME, { path: '/' });
    return null;
  }

  const customer = await Customer.findById(session.customer);
  if (!customer || customer.status !== 'active') {
    await CustomerSession.deleteOne({ _id: session._id });
    if (res) res.clearCookie(COOKIE_NAME, { path: '/' });
    return null;
  }

  /* Rotation. The row is updated in place rather than replaced so the
     session keeps its identity in the customer's device list, but the
     token that opens it changes. */
  if (res && Date.now() - session.rotatedAt.getTime() > ROTATE_AFTER_MS) {
    const fresh = mintToken();
    session.tokenHash = hash(fresh);
    session.rotatedAt = new Date();
    session.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await session.save();
    res.cookie(COOKIE_NAME, fresh, cookieOptions());
  }

  /* Throttled so a page with a dozen sub-requests does not write a dozen
     times. Fire-and-forget: a bookkeeping write must never fail a page. */
  if (Date.now() - session.lastUsedAt.getTime() > 5 * 60 * 1000) {
    CustomerSession.updateOne({ _id: session._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
    Customer.updateOne({ _id: customer._id }, { $set: { lastSeenAt: new Date() } }).catch(() => {});
  }

  return { customer, session };
}

/** Ends this browser's session. */
async function endSession(req, res) {
  const token = readCookie(req, COOKIE_NAME);
  if (token) await CustomerSession.deleteOne({ tokenHash: hash(token) });
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/** Ends every session for a customer, including this one. */
async function endAllSessions(customerId, res) {
  await CustomerSession.deleteMany({ customer: customerId });
  if (res) res.clearCookie(COOKIE_NAME, { path: '/' });
}

/* ── Magic links ──────────────────────────────────────── */

/**
 * Only same-site paths survive.
 *
 * An authentication endpoint that will redirect anywhere is a phishing
 * primitive: the link is genuinely from the store, genuinely signs you in,
 * and genuinely lands you on somebody else's page. Anything that is not a
 * single-slash-prefixed path becomes /account.
 */
function safeRedirect(target) {
  const value = String(target || '');
  return /^\/(?!\/)[\w\-/?=&.%]*$/.test(value) ? value : '/account';
}

/**
 * Issues a sign-in link.
 *
 * Creates NOTHING for the address it is asked about — no account, no
 * probe-able difference between a known and unknown address. The caller
 * reports the same thing either way, so this endpoint cannot be used to
 * enumerate who shops here.
 */
async function issueMagicLink(rawEmail, { redirectTo = '/account', req = null, ttlMs = MAGIC_LINK_TTL_MS, purpose = 'signin', withId = false } = {}) {
  const email = Customer.normaliseEmail(rawEmail);
  if (!email || !email.includes('@')) return null;

  const token = mintToken();
  const link = await MagicLink.create({
    email,
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + ttlMs),
    redirectTo: safeRedirect(redirectTo),
    requestedIpPrefix: ipPrefix(req),
    purpose,
  });
  /* The bare token by default, so no existing caller changes. Callers
     that need to attribute a later click ask for the id as well. */
  return withId ? { token, id: link._id } : token;
}

/**
 * The "View my order" button in a transactional email.
 *
 * A magic link with a longer life and a destination pinned to one order,
 * so opening it lands on that order rather than on a generic account
 * page the customer then has to search. Returns the full URL, ready to
 * put in a template — the caller never sees the raw token, because a
 * caller that has it is one `console.log` away from leaking it.
 *
 * Returns null rather than a signed-out URL when the address is unusable,
 * so a template cannot silently render a button that goes nowhere.
 */
async function issueOrderLink(rawEmail, orderReference, { req = null } = {}) {
  const site = require('../config/site');
  const redirectTo = orderReference ? `/account/orders/${orderReference}` : '/account';
  const issued = await issueMagicLink(rawEmail, {
    redirectTo, req, ttlMs: ORDER_LINK_TTL_MS, purpose: 'order', withId: true,
  });
  if (!issued) return null;
  /* A PATH SEGMENT, NOT A QUERY PARAMETER. Query strings end up in
     referrer headers, server logs and analytics; a path segment on a
     no-store, noindex route does not travel the same way. */
  return { url: `${site.origin()}/account/open/${issued.token}`, linkId: issued.id };
}

/**
 * Records that the link in an email was used.
 *
 * Called on consumption, best effort. This is the whole of engagement
 * tracking in this system: no pixel, nothing added to the message, and
 * one row updated when a real person clicks through.
 */
async function attributeLink(link) {
  if (!link || !link.emailLog) return;
  try {
    const EmailLog = require('../models/EmailLog');
    /* First use only. A link is single-use anyway, but the guard keeps
       the timestamp meaning "when they first came back" even if this is
       ever called twice. */
    await EmailLog.updateOne(
      { _id: link.emailLog, linkOpenedAt: null },
      { $set: { linkOpenedAt: new Date() } }
    );
  } catch (err) {
    console.error('[customerAuth] could not attribute a link open:', err.message);
  }
}

/**
 * Consumes a sign-in link and signs the customer in.
 *
 * The account is created HERE rather than when the link was requested, so
 * that asking for a link for somebody else's address leaves no trace of
 * them. Marked used before the session is issued, so a double-click or a
 * mail scanner following the URL cannot spend it twice.
 */
async function consumeMagicLink(token, res, { req = null } = {}) {
  if (!token) return { ok: false, reason: 'missing' };

  const link = await MagicLink.findOne({ tokenHash: hash(token) });
  if (!link) return { ok: false, reason: 'unknown' };
  if (link.usedAt) return { ok: false, reason: 'used' };
  if (link.expiresAt.getTime() <= Date.now()) return { ok: false, reason: 'expired' };

  const claimed = await MagicLink.findOneAndUpdate(
    { _id: link._id, usedAt: null },
    { $set: { usedAt: new Date() } },
    { new: true }
  );
  if (!claimed) return { ok: false, reason: 'used' };

  const customer = await Customer.findOrCreateByEmail(link.email, { createdVia: 'magic_link' });
  if (!customer) return { ok: false, reason: 'unknown' };
  if (customer.status !== 'active') return { ok: false, reason: 'closed' };

  await startSession(res, customer, { req, origin: 'magic_link' });
  /* Not awaited: the customer is being signed in, and a bookkeeping
     write must never be able to fail that. */
  attributeLink(claimed).catch(() => {});
  return { ok: true, customer, redirectTo: safeRedirect(link.redirectTo) };
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL_MS,
  MAGIC_LINK_TTL_MS,
  ORDER_LINK_TTL_MS,
  issueOrderLink,
  attributeLink,
  startSession,
  resolveSession,
  endSession,
  endAllSessions,
  issueMagicLink,
  consumeMagicLink,
  safeRedirect,
  ipPrefix,
  readCookie,
};
