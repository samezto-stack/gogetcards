/**
 * Who our email comes from, and how it leaves the building.
 *
 * TWO MAIL SYSTEMS, ON PURPOSE, ON ONE DOMAIN:
 *
 *   Zoho Mail holds the human mailboxes — support@, returns@, privacy@.
 *   People read and reply there. Nothing in this codebase sends through
 *   it, and the free plan could not anyway: Zoho removed SMTP/IMAP/POP
 *   from the free tier, so there is no credential that would work.
 *
 *   ZeptoMail sends the machine mail — confirmations, dispatch notices,
 *   refund updates, sign-in links. It is Zoho's transactional product,
 *   billed per email with no monthly floor, and its IP pool carries no
 *   marketing traffic.
 *
 * Keeping them apart is a deliverability decision before it is a
 * technical one. A mailbox and a sending service earn reputation
 * differently, and a bounce storm from a bad address should not be able
 * to degrade delivery of a reply to a customer.
 *
 * FROM is a send-only address. REPLY-TO is the Zoho mailbox, so a
 * customer who hits reply reaches a human rather than a black hole —
 * which is also the single cheapest thing you can do for inbox
 * placement, because engagement with a reply is a strong positive
 * signal and a bouncing Reply-To is a strong negative one.
 */

const company = require('./company');

/* Overridable so a staging deploy can send from somewhere obvious
   without editing code, but every value has a real default: an unset
   variable must not produce a From header of "undefined". */
const FROM_NAME = process.env.MAIL_FROM_NAME || 'Zyphera TCG';
const FROM_ADDRESS = process.env.MAIL_FROM || 'orders@zypheratcg.com';
const REPLY_TO = process.env.MAIL_REPLY_TO || company.business.supportEmail;

/* ZeptoMail's SMTP endpoint. Only the credentials belong in env; the
   host and port are facts about the provider, not about this deploy,
   and leaving them to be typed is how a deploy ends up pointed at a
   plausible-looking host that does not exist. Override anyway if you
   move providers — everything here speaks ordinary SMTP. */
const HOST = process.env.SMTP_HOST || 'smtp.zeptomail.com';
/* 465, NOT 587, and this is a deliberate default.
 *
 * Both ports reach ZeptoMail and both are documented by it. The difference
 * is what a PLATFORM does to them. 587 opens plaintext and upgrades with
 * STARTTLS, and it is the port shared hosts throttle, filter or silently
 * drop to keep spam off their IP ranges — Render blocks it outright, and
 * on Railway it timed out here. The failure that produces is not an error
 * the app can see and explain: it is a socket that never answers, i.e. the
 * "Connection timeout" that had every message logged and none delivered.
 *
 * 465 is implicit TLS from the first byte, on a port those same platforms
 * generally leave open. services/mail/index.js reads `secure` straight
 * off this number (secure: PORT === 465), so choosing 465 here also
 * chooses the right handshake — there is nothing else to set.
 *
 * Still overridable, for a host that is the other way round. */
const PORT = Number(process.env.SMTP_PORT) || 465;

/**
 * Retry schedule for a failed send, in milliseconds.
 *
 * Three attempts over about half a minute. Long enough to ride out a
 * connection reset or a brief provider blip, short enough that the
 * customer still gets their confirmation while they are looking at the
 * thank-you page. Anything slower belongs in a queue, and a queue is a
 * second piece of infrastructure this store does not need yet.
 */
const RETRY_DELAYS_MS = [1000, 5000, 20000];

/** Give up rather than hang a request forever on a dead SMTP host. */
const TIMEOUTS = {
  connection: 10000,
  greeting: 10000,
  socket: 20000,
};

/* ── HTTPS API, because the host blocks SMTP ───────────────
 *
 * WHY THIS EXISTS. Shared platforms block outbound SMTP to protect their
 * IP reputation — Render blocks it, and Railway blocks ports 25/465/587 on
 * every plan below Pro. On those hosts no SMTP port will ever connect, and
 * the symptom is a socket that never answers: "Connection timeout", every
 * message logged, none delivered. ZeptoMail's own answer, and Railway's, is
 * the same: send over the provider's HTTPS API on 443, which no host blocks.
 *
 * ONE TOKEN. In ZeptoMail the SMTP password and the API "Send Mail Token"
 * are the same value, so the API reuses SMTP_PASS when no dedicated token is
 * set — which means a deploy that already had working credentials needs
 * nothing added, just a redeploy. A stray "Zoho-enczapikey " prefix pasted
 * in with the token is stripped, because the adapter adds it itself. */
const API_TOKEN = String(process.env.ZEPTOMAIL_TOKEN || process.env.SMTP_PASS || '')
  .trim()
  .replace(/^Zoho-enczapikey\s+/i, '');

/* Region follows the SMTP host: an EU account is api.zeptomail.eu, everyone
   else api.zeptomail.com. Overridable outright for anything unusual. */
const API_URL = (process.env.ZEPTOMAIL_API_URL || '').trim()
  || (/\.eu$/i.test(HOST.replace(/\/.*$/, '')) ? 'https://api.zeptomail.eu/v1.1/email' : 'https://api.zeptomail.com/v1.1/email');

/* Which transport carries the mail.
 *   MAIL_TRANSPORT=smtp  forces SMTP (a Pro plan, or local dev to a catcher)
 *   MAIL_TRANSPORT=api   forces the HTTPS API
 *   unset (default)      uses the API whenever a token is present, since the
 *                        hosts this runs on block SMTP. */
function useApi() {
  const forced = String(process.env.MAIL_TRANSPORT || '').trim().toLowerCase();
  if (forced === 'smtp') return false;
  if (forced === 'api') return true;
  return !!API_TOKEN;
}

/** Bare hostname of the API endpoint, for the admin banner. */
function apiHost() {
  try { return new URL(API_URL).host; } catch { return API_URL; }
}

module.exports = {
  FROM_NAME,
  FROM_ADDRESS,
  REPLY_TO,
  HOST,
  PORT,
  RETRY_DELAYS_MS,
  TIMEOUTS,
  API_TOKEN,
  API_URL,
  useApi,
  apiHost,
  from() {
    return `"${FROM_NAME}" <${FROM_ADDRESS}>`;
  },
};
