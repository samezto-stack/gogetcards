/**
 * Peer Window — SSR Express server.
 *
 * Server-rendered rather than a single-page bundle, for one reason that
 * matters commercially: every page has to arrive as HTML. A shopping-style
 * service site whose copy only exists after JavaScript runs is a site whose
 * copy a crawler may never see, and the pages here ARE the product
 * description.
 *
 * PARTNER CHECKOUT. The service routes are wired through the experience
 * engine so zypheratcg can hand a buyer across with signed claims. A DIRECT
 * visitor to any of those URLs is unaffected and sees the ordinary marketing
 * page — the gating only ever fires for a request carrying a valid one-time
 * token, or a repeat visit resolved from the signed cookie that token set.
 * See the partner-checkout block below.
 */
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import 'dotenv/config';
import engine from './server/experience.js';
import { signFields } from './server/thankYouSigning.js';
import { THANK_YOU_SIGNING_SECRET } from './server/secrets.js';
import { readPooledEmailCookie, setPooledEmailCookie } from './server/pooledEmailCookie.js';
import {
  readExperienceClaimsCookie,
  setExperienceClaimsCookie,
  readExperienceClaimsIssuedAt,
} from './server/experienceClaimsCookie.js';
import { mintSigningGrant, verifySigningGrant } from './server/signingGrant.js';
import { attachmentRoute, briefRoute, reportStorage } from './server/uploads.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;

const app = express();
app.disable('x-powered-by');

/**
 * Checkout funnel beacon.
 *
 * Whop's embed mounts an iframe into a container on the page. When it does
 * not — a blocked script, a slow network, an ad blocker that dislikes
 * payment domains — the customer sees a box that never becomes a checkout
 * and simply leaves. Nothing about that reaches any log by default, so the
 * most expensive failure on the site would be its most invisible one.
 *
 * A 1x1 GIF request rather than fetch(): no CORS, no preflight, and it
 * still fires from a page whose other scripts have failed.
 */
const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');
const CHECKOUT_EVENT_STEPS = new Set(['payment_shown', 'payment_failed']);
/* ── The brief ────────────────────────────────────────────────────────
 * Mounted before the body parsers deliberately: attachmentRoute reads the
 * multipart stream itself so it can stop at the size ceiling rather than
 * buffer a rejected body to the end. A json() parser in front of it would
 * consume the stream first and this route would receive nothing.
 *
 * See server/uploads.js for what currently happens to the bytes, which is
 * nothing, and for the interlock that stops that reaching a paying customer.
 */
app.post('/api/brief/attachment', attachmentRoute);
app.post('/api/brief', express.json({ limit: '256kb' }), briefRoute);
reportStorage();

app.get('/api/checkout-event', (req, res) => {
  const { page, step } = req.query;
  if (CHECKOUT_EVENT_STEPS.has(step)) {
    console.log(`[checkout-event] step=${step} page=${String(page || '').slice(0, 80)} ip=${req.ip}`);
  }
  res.set('Cache-Control', 'no-store');
  res.set('Content-Type', 'image/gif');
  res.status(200).send(TRANSPARENT_GIF);
});

/* Generated from server/seo.js rather than served out of public/, and
   registered AHEAD of the static middleware so a stale copy left in
   dist/client by an older build can never win. */
const { ROUTES, renderHead, renderSitemap, renderRobots } = await import('./server/seo.js');

app.get('/sitemap.xml', (_req, res) => {
  res.type('application/xml').send(renderSitemap());
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(renderRobots());
});

// ---- Vite: middleware in dev, pre-built assets in production ----
let vite;
if (!isProd) {
  const { createServer } = await import('vite');
  vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist/client'), { index: false }));
}

async function renderPage(req, res) {
  try {
    const url = req.originalUrl;
    const pathname = req.path;

    let template;
    let render;
    if (!isProd) {
      template = await fs.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render;
    } else {
      template = await fs.readFile(path.resolve(__dirname, 'dist/client/index.html'), 'utf-8');
      render = (await import('./dist/server/entry-server.js')).render;
    }

    const { html: appHtml } = render(url);
    const responseHtml = template
      .replace('<!--app-head-->', renderHead(pathname))
      .replace('<!--app-html-->', appHtml);

    /* A REAL 404 for an unknown path. The React tree renders its NotFound
       page either way, but a crawler that receives 200 for every URL treats
       every typo and every dead link as a real page worth indexing. */
    const status = ROUTES[pathname] ? 200 : 404;
    res.status(status).set({ 'Content-Type': 'text/html' }).end(responseHtml);
  } catch (err) {
    vite?.ssrFixStacktrace(err);
    console.error(err);
    res.status(500).end('Internal Server Error');
  }
}

/* The service routes zypheratcg may route a buyer to. Listed here
   rather than derived from the content file because server.js must not
   import TypeScript — and because which routes are gated is a security
   decision worth stating explicitly in the file that enforces it. */
const SERVICE_SLUGS = [
  'business-plan-review',
];

/* ── Partner checkout (zypheratcg) ────────────────────────────────────────
 *
 * A DIRECT VISITOR TO A SERVICE PAGE SEES NOTHING DIFFERENT. No token and no
 * persisted cookie resolves to the default experience, which falls straight
 * through to the ordinary server-rendered marketing page. Everything below
 * only ever affects a visitor zypheratcg routed here with a signed one-time
 * token, and nothing here grants anything without one.
 *
 * Every gated id serves the SAME partner checkout document. Which product is
 * shown comes from the signed claims on the token, not from the id or the
 * route — so a new service needs no new file and no new page.
 */

/* Apple Pay domain verification.
 *
 * Apple will not offer Apple Pay inside the Whop embed until it can fetch
 * this file over HTTPS from this exact domain. Without it the payment sheet
 * simply omits the button, with no error anywhere.
 *
 * The file is not domain-specific — it is issued per payment provider, and
 * the same bytes serve every domain on the account. It carries no secret: it
 * is public verification data fetched by Apple from an ungated path.
 *
 * Served by an explicit route rather than from the static directory, because
 * Express's static middleware skips dotfiles and anything under
 * /.well-known/ would silently 404. Sent byte-for-byte, never parsed.
 *
 * Necessary but not sufficient — the domain must also be added as a payment
 * domain in the Whop dashboard.
 */
const appleMerchantAssociation = readFileSync(
  path.join(__dirname, 'server', 'well-known', 'apple-developer-merchantid-domain-association'),
  'utf8',
);
app.get('/.well-known/apple-developer-merchantid-domain-association', (_req, res) => {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.status(200).send(appleMerchantAssociation);
});

const PARTNER_CHECKOUT_PAGE = path.join(__dirname, 'server', 'experiences', 'partner.html');

app.post('/internal/experience/token', express.json(), engine.middleware.internalAuth, engine.handlers.issueToken);

/**
 * Tells zypheratcg, server-to-server, that a routed visitor reached this host
 * but did NOT resolve to the gated experience they were sent for — they are
 * about to see the marketing page instead of the checkout.
 *
 * Fires the instant the server makes that decision, rather than from the
 * page, so it distinguishes "reached the host, token hop failed" from "the
 * redirect died in transit and never arrived". Without it both look
 * identical downstream: a checkout_click with no matching checkout_arrived.
 *
 * Only fires when zcid is present, i.e. this really was a routed visit.
 * Fire-and-forget; it never blocks the response.
 */
function reportTokenFailed(req) {
  try {
    const zcid = req.query && req.query.zcid;
    if (!zcid) return;
    const url = new URL('https://gogetcards.com/api/checkout/confirm-arrival');
    url.searchParams.set('zcid', String(zcid));
    url.searchParams.set('step', 'token_failed');
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    fetch(url.toString(), { signal: ctrl.signal }).catch(() => {}).finally(() => clearTimeout(timeout));
  } catch {
    /* no-op */
  }
}

/**
 * Signs the post-purchase field set once Whop's onComplete fires in the
 * browser. This never calls Whop — it only signs data the browser already
 * has — but it does require proof that this browser belongs to a real gated
 * checkout. No proof, no signature, and zypheratcg's pipeline never creates
 * an order for it.
 */
app.post('/internal/thank-you/token', express.json(), engine.middleware.resolve(), (req, res) => {
  const secret = THANK_YOU_SIGNING_SECRET;
  if (!secret) {
    console.error('[thank-you/token] THANK_YOU_SIGNING_SECRET not set — refusing to sign.');
    return res.status(503).json({ error: 'signing_not_configured' });
  }

  const fields = req.body && typeof req.body === 'object' ? { ...req.body } : {};

  /* TWO WAYS TO PROVE IT, because one of them does not survive a frame.
   *
   * The cookie is the original proof and is still the only one used outside
   * a frame. But it is SameSite=Lax, and a Lax cookie is not sent on a
   * subrequest from a cross-site framed document — not even a same-origin
   * fetch, because "same site" is measured against the TOP-LEVEL site. In
   * zypheratcg's embedded checkout this call therefore arrives with no
   * cookie, comes back 403, the fields go out unsigned, and no order is ever
   * created for a payment that has already been taken. Silent, and expensive.
   *
   * The grant carries the same claim in the page instead: minted when this
   * server served the gated checkout — the exact moment it had verified a
   * one-time token — and handed back here. It authorises one thing on one
   * host and expires in two hours. */
  const grantId = verifySigningGrant(fields.__grant, secret);
  const hasCookieSession = !!(req.experience && req.experienceSource !== 'default');
  if (!hasCookieSession && !grantId) {
    return res.status(403).json({ error: 'no_experience_session' });
  }

  /* Never part of what gets signed. signFields covers every key it is given
     and the browser puts the signed FIELDS in the URL — the grant is not one
     of them, so leaving it in would produce a signature zypheratcg could
     never reproduce and every order would fail verification instead. */
  delete fields.__grant;
  const { iat, sig } = signFields(fields, secret);
  res.json({ iat, sig });

  notifyZypheratcg(fields, iat, sig);
});

/**
 * Reports a confirmed payment to zypheratcg the instant Whop confirms it.
 *
 * It hits /api/checkout/payment-recorded, which records the payment WITHOUT
 * creating an order. Orders are created by exactly one thing: a real browser
 * arriving at zypheratcg's /thank-you. That distinction is what keeps "there
 * is an order in the admin" meaning "the customer saw their confirmation"
 * rather than merely "a payment happened somewhere".
 *
 * This call is what stops a payment vanishing when that arrival never
 * happens — a closed tab mid-redirect, blocked storage, a dead connection.
 * The payment lands in zypheratcg's "paid, but never confirmed" list instead
 * of leaving no trace at all.
 *
 * Fire-and-forget by design: nothing here can be usefully retried from a
 * request that has already responded, so failures are logged, not thrown.
 */
function notifyZypheratcg(fields, iat, sig) {
  const url = process.env.ZYPHERATCG_PAYMENT_RECORDED_URL
    || 'https://gogetcards.com/api/checkout/payment-recorded';

  /* A JSON body rather than a query string. The signature covers every key
     in the payload, so a body keeps the signed field set intact; a URL can
     pick up an appended parameter in transit — a proxy, a redirect, a
     tracker — and any addition invalidates the signature. */
  const payload = { ...fields, iat: String(iat), sig };

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 5000);
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: ctrl.signal,
  })
    .then((r) => {
      if (!r.ok) console.error(`[payment-recorded] zypheratcg responded ${r.status} for order ${fields.order_id}`);
    })
    .catch((err) => {
      console.error(`[payment-recorded] failed to reach zypheratcg for order ${fields.order_id}:`, err.message);
    })
    .finally(() => clearTimeout(timeout));
}

/* Claims that identify a PERSON rather than a product. Every one is handled
   the way 'email' is: deleted from any URL that carries it, trusted only
   from a verified token, kept in the signed claims cookie, and handed to the
   page as a JS object rather than emitted into window.location. An address
   does not belong in an address bar, in browser history, or in the Referer
   of the next link the customer clicks. */
const PRIVATE_CLAIMS = [
  'email',
  'buyerName',
  'buyerAddress1',
  'buyerAddress2',
  'buyerCity',
  'buyerState',
  'buyerPostalCode',
  'buyerCountry',
];

/**
 * The origins allowed to embed this checkout and receive its messages.
 *
 * WHY AN ALLOWLIST AND NOT "whatever the request said". This value becomes
 * postMessage's targetOrigin, which is the only thing standing between a
 * completed order — the customer's email, name and address — and whatever
 * window is listening. An unvalidated body field there would let anyone who
 * can POST to this route have those fields delivered to an origin of their
 * choosing. The request may only SELECT from this list; it can never add to
 * it, and "*" is never an option.
 */
const ALLOWED_PARENT_ORIGINS = new Set([
  'https://gogetcards.com',
  'https://www.gogetcards.com',
  'https://gogetcards.onrender.com',
]);

/**
 * The host's origin, stated rather than inferred.
 *
 * This used to be recovered by parsing document.referrer, which works right
 * up until a browser does not send one — a hardened privacy profile, strict
 * mode, a corporate proxy that strips the header. Those visitors got no
 * greeting, the parent timed out, and they were dropped onto the plain
 * redirect. They still paid, so it never registered as a failure; they just
 * silently got the worse checkout. zypheratcg knows its own origin for
 * certain, so it says so, and the referrer stays as the fallback.
 */
function parentOriginFrom(req) {
  const claimed = String((req.body && req.body.parentOrigin) || '').trim();
  if (!claimed) return '';
  return ALLOWED_PARENT_ORIGINS.has(claimed) ? claimed : '';
}

/* Hands the page its buyer without going near the URL. Escaped so a value
   containing "</script>" cannot end the tag early. */
function injectBuyer(html, buyer) {
  if (!buyer || Object.keys(buyer).length === 0) return html;
  const json = JSON.stringify(buyer).replace(/</g, '\\u003c');
  const tag = '<script>window.__zbuyer=' + json + ';</script>';
  return html.includes('</head>') ? html.replace('</head>', tag + '</head>') : tag + html;
}

function serveExperienceRoute(req, res) {
  const tokenParam = engine.config.tokenParam;
  const id = req.experience && req.experience.id;
  const isGated = id && id !== engine.config.defaultExperienceId;

  /* EMBEDDED MODE. zypheratcg asks for this with ?embed=1 on the URL it
   * loads in a frame. It changes nothing about what is served or to whom —
   * same page, same gating, same claims — only how the claims reach it.
   *
   * WHY IT HAS TO EXIST. The normal path redirects once to strip the token
   * from the address bar, relying on the signed cookie set on the first
   * request to survive into the second. That cookie is SameSite=Lax, and a
   * Lax cookie is not sent at all in a cross-site frame. The redirect would
   * land on a request with no cookie, resolve to the default experience, and
   * serve this site's ordinary marketing page inside zypheratcg's checkout.
   * Every framed payment would fail, in every browser, and be recorded as a
   * token failure.
   *
   * So in a frame: no redirect, no cookie, nothing persisted. The claims come
   * straight off the token verified on THIS request, and zypheratcg mints a
   * fresh one-time token each time it renders the frame. The redirect is not
   * needed here anyway — its whole job is the address bar, and a frame has
   * none.
   *
   * Not a detection of anything: ?embed=1 is a request from the URL, honoured
   * identically for every visitor who arrives with it, and without a valid
   * token it grants nothing. */
  const isEmbed = req.body?.embed === '1' || req.query.embed === '1';

  /* If the URL still carries the one-time token, redirect to the same URL
     without it and serve the page on the clean URL. A real navigation strips
     the token reliably on every device, where a client-side
     history.replaceState is not reflected in the address bar on some mobile
     browsers. The experience is already persisted in the signed cookie by
     the resolve middleware, so the redirected request resolves the same way.

     A POST never redirects: the token arrived in the body, and a redirect
     turns the next request into a GET that no longer has it — the customer
     would land on the marketing page holding nothing.

     Whatever private claims were already on this URL are DELETED, not
     forwarded. A value sitting in a query string carries no proof it came
     from a verified token; the token's own claims go into their own signed
     cookies instead, and those cookies are the only thing trusted from here
     on. */
  if (req.query[tokenParam] !== undefined && !isEmbed && req.method !== 'POST') {
    const parsed = new URL(req.originalUrl, 'http://internal');
    parsed.searchParams.delete(tokenParam);
    for (const key of PRIVATE_CLAIMS) parsed.searchParams.delete(key);

    const claims = req.experienceClaims || {};
    const nonEmailClaims = {};
    for (const [key, value] of Object.entries(claims)) {
      if (key === 'email') continue; // -> its own signed cookie
      if (value === undefined || value === null || value === '') continue;
      /* Persisted so a refresh or a repeat visit still has them. Without
         this the URL is the only copy and it is stripped after load, so a
         second visit falls back to the page's built-in product rather than
         the one the customer was routed to buy. */
      nonEmailClaims[key] = String(value);
      if (PRIVATE_CLAIMS.includes(key)) continue;
      parsed.searchParams.set(key, String(value));
    }
    if (isGated && claims.email) {
      setPooledEmailCookie(res, req, engine, claims.email, id);
    }
    if (isGated && Object.keys(nonEmailClaims).length > 0) {
      setExperienceClaimsCookie(res, req, engine, nonEmailClaims, id);
    }

    res.set('Cache-Control', 'no-store');
    return res.redirect(302, parsed.pathname + parsed.search);
  }

  let html = null;
  if (isGated) {
    try {
      html = engine.variants.load(PARTNER_CHECKOUT_PAGE);
    } catch {
      html = null; // unreadable page -> silent fallback to the marketing page
    }
  }

  if (html == null) {
    /* Either resolution never granted a gated experience — an invalid or
       expired token, or a repeat visit whose cookie says default — or it did
       and the checkout page could not be read. Either way this visitor is
       about to see the ordinary marketing page; reportTokenFailed no-ops
       unless zcid is present. */
    reportTokenFailed(req);
    return renderPage(req, res);
  }

  /* When the token was verified on THIS request its own claims are the
     source; otherwise the signed cookie is.
   *
   * That covers two cases which both arrive with a token and no readable
   * cookie. A framed request never gets one back at all. And a POST — from
   * the payment window — sets the cookie on the RESPONSE, which does nothing
   * for the request being served right now. In both the token was just
   * cryptographically verified, so its claims are the strongest thing
   * available rather than a fallback. */
  const tokenClaims = (req.experienceSource === 'token' && req.experienceClaims) ? req.experienceClaims : null;
  const persistedClaims = tokenClaims || (isGated ? readExperienceClaimsCookie(req, engine, id) : null);
  const claimsInUrl = {};
  const buyer = {};
  for (const key of engine.config.passthroughClaims || []) {
    if (key === 'email') continue;
    if (PRIVATE_CLAIMS.includes(key)) {
      /* Cookie only. req.query is deliberately not consulted: a value there
         carries no proof it came from a verified token. */
      if (persistedClaims && persistedClaims[key]) buyer[key] = persistedClaims[key];
      continue;
    }
    if (req.query[key]) {
      claimsInUrl[key] = req.query[key];
    } else if (persistedClaims && persistedClaims[key]) {
      claimsInUrl[key] = persistedClaims[key];
    }
  }
  /* The email comes only from the verified token or its own signed cookie,
     and never from req.query — a URL parameter could contain anything,
     including a real address appended by an unrelated tracker. It goes into
     window.__zbuyer, never into window.location: in the address bar it would
     reach browser history, the Referer sent to every third party the page
     loads, and any screenshot. */
  const pooledEmail = tokenClaims
    ? (tokenClaims.email || null)
    : (isGated ? readPooledEmailCookie(req, engine, id) : null);

  if (Object.keys(claimsInUrl).length > 0) {
    html = engine.html.injectClaims(html, claimsInUrl);
  }
  if (pooledEmail) buyer.email = pooledEmail;
  /* Also in the injected object, not only the URL injectClaims writes: the
     page strips the URL as soon as it has read it, so the object is the copy
     still there after a refresh. */
  if (claimsInUrl.zcid) buyer.zcid = claimsInUrl.zcid;
  /* Proof this document was served as a gated checkout, for the thank-you
     signing call to present later. It travels in the page because a frame
     will not send the cookie that used to carry the same claim. Only ever
     minted for a gated render, so a visitor on the marketing page carries
     nothing. */
  if (isGated) buyer.grant = mintSigningGrant(id, THANK_YOU_SIGNING_SECRET);
  if (isGated) {
    const po = parentOriginFrom(req);
    if (po) buyer.parentOrigin = po;
  }
  html = injectBuyer(html, buyer);

  /* Tell the page it is a panel, not a page: the CSS keyed on this hides the
     header, the order summary and the heading, all of which the parent has
     already drawn. Done on the server so the duplicates are never painted at
     all — a script would show two headers for a frame or two. */
  if (isEmbed) {
    html = html.replace('<html lang="en" data-ck-step="2">', '<html lang="en" data-ck-step="2" data-ck-embed="1">');
  }

  res.set('Cache-Control', 'no-store');
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}

/**
 * Accept the one-time token in a POST BODY instead of the query string.
 *
 * zypheratcg loads this page in a frame. With the token in the frame's src it
 * is a query parameter on a real navigation: in the parent page's HTML, in
 * this server's access log, and the document URL at the moment Whop's own
 * iframe is created — which is what Whop receives as its referrer. A form
 * POST removes that entirely: the frame navigates to a URL with no query
 * string, and the token travels in the body, which is not logged, not in any
 * address bar and not in any referrer.
 *
 * THE ENGINE IS NOT TOUCHED. Its resolver reads req.query and only req.query,
 * and it stays that way — this hands it a request whose query already carries
 * the token, exactly as a GET would have. defineProperty rather than
 * assignment because Express's query is a lazily-evaluated getter and
 * assigning to it silently does nothing on some versions.
 *
 * No token in the body means nothing is copied and the request resolves as an
 * anonymous one, so this cannot grant anything by itself.
 */
function acceptTokenFromBody(req, _res, next) {
  try {
    const name = engine.config.tokenParam;
    const fromBody = req.body && req.body[name];
    if (fromBody && !(req.query && req.query[name])) {
      Object.defineProperty(req, 'query', {
        value: { ...(req.query || {}), [name]: String(fromBody) },
        configurable: true,
        enumerable: true,
      });
    }
  } catch { /* an unreadable body is simply no token */ }
  next();
}

/* The body is only ever these two fields, so the limit is deliberately tiny:
   this endpoint has no reason to accept a payload of any size. */
const tokenForm = express.urlencoded({ extended: false, limit: '4kb' });

/* Engine resolution, scoped to exactly the service routes. Every gated
   visitor gets the same shared partner checkout; every direct visitor falls
   through to renderPage untouched.
 *
 * POST is how zypheratcg's embedded checkout delivers the token without
 * putting it in a URL. Same middleware, same handler, and neither grants
 * anything without a valid token. */
for (const slug of SERVICE_SLUGS) {
  app.get(`/services/${slug}`, engine.middleware.resolve(), serveExperienceRoute);
  app.post(`/services/${slug}`, tokenForm, acceptTokenFromBody, engine.middleware.resolve(), serveExperienceRoute);
}

/**
 * Hand a mid-checkout visitor back to zypheratcg if they land on this site's
 * home page.
 *
 * WHO THIS AFFECTS, and nobody else: a browser holding a valid, unexpired,
 * signed experience cookie for a gated id. That cookie exists only because a
 * real one-time token from zypheratcg was verified on this server. A direct
 * visitor, a search result, a shared link and every crawler have no such
 * cookie and get the normal home page — so this is a session decision, not
 * anything about who is asking.
 *
 * WHY: someone routed here to pay who then clicks the logo is not looking for
 * this site's marketing pages. They are trying to get back to the shop they
 * were buying from.
 *
 * TIME-BOUNDED ON PURPOSE. The experience cookie lasts a year; a redirect
 * that lasted a year would mean anyone who ever checked out here could never
 * see this home page again. The window is measured from the SIGNED issued-at
 * on the claims cookie, so a visitor cannot extend it by editing their own
 * clock or their own cookie.
 *
 * 302 and no-store, NEVER 301: a permanent redirect would be cached against
 * this site's own root and would survive the cookie expiring, which is
 * exactly the trap above with no way out of it.
 */
const HANDBACK_WINDOW_MS = 30 * 60 * 1000;

function zypheraHandbackUrl(claims) {
  /* Back to the product they were buying when we know it, so they land where
     they left off. The slug is signed, but it is still pattern-checked before
     going into a URL: nothing that is not a plain slug gets appended. */
  const slug = String((claims && claims.productSlug) || '').trim();
  if (/^[a-z0-9][a-z0-9-]{0,120}$/.test(slug)) {
    return 'https://gogetcards.com/products/' + slug;
  }
  return 'https://gogetcards.com/';
}

app.get('/', engine.middleware.resolve(), (req, res, next) => {
  const id = req.experience && req.experience.id;
  if (!id || id === engine.config.defaultExperienceId) return next();

  const issuedAt = readExperienceClaimsIssuedAt(req, engine, id);
  if (!issuedAt || Date.now() - issuedAt > HANDBACK_WINDOW_MS) return next();

  res.set('Cache-Control', 'no-store');
  return res.redirect(302, zypheraHandbackUrl(readExperienceClaimsCookie(req, engine, id)));
});


app.use(renderPage);

app.listen(port, () => {
  console.log(`[board-pack] listening on ${port}`);
});
