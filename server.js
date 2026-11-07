require('dotenv').config();

/* ── The clock the admin is read in ───────────────────────
   Render runs containers in UTC, so every server-rendered timestamp in
   /admin was an hour behind the wall clock in Morocco, and "today" on the
   dashboard began at 01:00 local rather than midnight.

   Set here rather than only in the Render dashboard so the fix travels
   with the code and cannot be lost to an env var someone tidies away.
   Still overridable: an explicit TZ in the environment wins.

   Africa/Casablanca and not a fixed +01:00 on purpose. Morocco is UTC+1
   year round EXCEPT during Ramadan, when it steps back to UTC+0. A
   hardcoded offset would silently go an hour wrong for a month each year;
   the IANA zone tracks that shift on its own.

   Must run before anything reads a Date — Node resolves the zone once, on
   first use, and ignores later changes. Hence the position above every
   other require in this file.

   Absolute values are unaffected: timestamps are stored in Mongo as
   instants and toISOString() is always UTC, so this changes how times are
   read and grouped, never what was recorded. */
if (!process.env.TZ) process.env.TZ = 'Africa/Casablanca';

const express = require('express');
const notFound = require('./helpers/notFound');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const ejsLayouts = require('express-ejs-layouts');
const cors = require('cors');

const connectDB = require('./config/db');
const site = require('./config/site');
const trackPageView = require('./middleware/tracking');
const frontendRoutes = require('./routes/frontend');
const apiRoutes = require('./routes/api');
const markets = require('./config/markets');
const adminRoutes = require('./routes/admin');
const distributionRoutes = require('./routes/distribution');
const feedRoutes = require('./routes/feed');
const fxRoutes = require('./routes/fx');
const accountRoutes = require('./routes/account');
const adminCustomerRoutes = require('./routes/adminCustomers');
const adminEmailRoutes = require('./routes/adminEmails');
const adminPreorderRoutes = require('./routes/adminPreorders');
const adminPartnerLogRoutes = require('./routes/adminPartnerLog');
const checkoutRecoveryRoutes = require('./routes/checkoutRecovery');
const checkoutFlowRoutes = require('./routes/checkoutFlow');
const adminAbandonedRoutes = require('./routes/adminAbandoned');
const adminAnalyticsRoutes = require('./routes/adminAnalytics');
const { attachCustomer } = require('./middleware/customer');
const formatPrice = require('./helpers/formatPrice');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

/* The session signing secret. A hardcoded fallback used to sign cookies
   with a value published in this repo — anyone could forge an admin
   session. We never fall back to a known string now:
     - SESSION_SECRET set  → use it (the correct, stable choice: sessions
       survive restarts).
     - not set             → generate a strong random secret for this boot
       and warn loudly. The site stays up and cookies are unforgeable; the
       only cost is that sessions reset on restart until the env var is set.
   Crashing instead would take a live store offline over a missing env var,
   which is a worse failure than per-restart logouts. */
let _sessionSecret = null;
function resolveSessionSecret() {
  if (_sessionSecret) return _sessionSecret;
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim()) {
    /* Use the configured secret as-is, whatever its length — the point is
       only to never fall back to a value published in this repo. */
    _sessionSecret = process.env.SESSION_SECRET;
  } else {
    _sessionSecret = require('crypto').randomBytes(48).toString('hex');
    console.error('⚠️  SESSION_SECRET is not set (or too short). Using a random ' +
      'per-boot secret so cookies stay unforgeable. Set SESSION_SECRET in the ' +
      'environment to keep sessions alive across restarts/deploys.');
  }
  return _sessionSecret;
}

/* ── Security & Performance ────────────────────────────── */
app.set('trust proxy', 1); // Trust exactly one proxy hop (Render's load balancer). Using `true` is unsafe as it allows X-Forwarded-For spoofing.
app.disable('x-powered-by');

/* ── Health check ───────────────────────────────────────────
   For the platform's liveness/readiness probe and for uptime monitors.
   Mounted before sessions and tracking so a probe every few seconds
   creates no session document and no visitor row. 503 when the database
   is not connected, so a replica that cannot serve orders is taken out
   of rotation rather than answering 200 with an error page. */
app.get(['/health', '/healthz'], (req, res) => {
  const dbUp = require('mongoose').connection.readyState === 1;
  res.status(dbUp ? 200 : 503).set('Cache-Control', 'no-store').json({ ok: dbUp, db: dbUp ? 'connected' : 'disconnected' });
});

/* ── One canonical host: www → apex ────────────────────────
   The store lives on the apex, gogetcards.com — that is what config/site.js
   pins as canonical, what the feeds and Merchant Center point at, and what
   every canonical tag already declares. But the DNS also answers on
   www.gogetcards.com, and a request that arrives there is served the whole
   site on a second hostname. Two live hostnames serving identical pages
   split link equity and reputation across both, and after a stretch of
   competitors reporting this domain, one address to defend is worth more
   than the convenience of the second.

   So www is not served — it is redirected, permanently, to the exact same
   path and query on the apex. 301 so browsers and crawlers fold the two
   hostnames into one for good.

   PRECISE ON PURPOSE. It fires only when the requested host, with a leading
   `www.` stripped, equals the canonical host AND still had that `www.` — i.e.
   only for www.<canonical>. It never touches the apex itself, the Railway
   *.up.railway.app hostname (whose health checks must keep getting a plain
   200), or localhost, none of which match. req.hostname honours
   X-Forwarded-Host because trust proxy is set above, so it reflects the
   hostname the visitor actually typed, not the internal one. */
app.use((req, res, next) => {
  const requested = String(req.hostname || '').toLowerCase();
  const canonical = site.host(); // bare apex, already without www
  if (requested === `www.${canonical}`) {
    return res.redirect(301, site.origin() + req.originalUrl);
  }
  next();
});
/* Begin refreshing exchange rates. Fire-and-forget, six-hourly, on an
   unref'd timer, and it never throws — see services/fx.js. */
require('./services/fx').start();

/* Helmet security headers. A full Content-Security-Policy with a strict
   script-src is the real defence-in-depth against XSS, but this app has
   many inline <script> blocks and several CDN script sources, so enforcing
   one blindly would break the live storefront. Instead we enable the CSP
   directives that restrict NOTHING the site legitimately loads, yet close
   real escalation vectors:
     - base-uri 'self'       blocks a <base> tag injection that would
                             rewrite every relative URL on the page.
     - object-src 'none'     blocks <object>/<embed> plugin-based XSS.
     - frame-ancestors 'self' blocks click-jacking (same intent as the
                             X-Frame-Options helmet already sends).
   No default-src/script-src is set (useDefaults:false), so scripts,
   styles, images, fonts and pixels load exactly as before.
   FOLLOW-UP (needs testing): move to a nonce-based strict script-src.
   See docs/security-audit.md. */
/* ── Cross-site write guard (middleware/crossSiteGuard) ──── */
app.use(require('./middleware/crossSiteGuard'));

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      /* We deliberately set NO default-src/script-src so nothing the site
         loads (inline scripts, CDN scripts, pixels, fonts, images) is
         restricted — only the three safe directives below apply. Helmet
         refuses a CSP with no default-src unless it is explicitly disabled
         with this sentinel, which is exactly the intent here. */
      'default-src': helmet.contentSecurityPolicy.dangerouslyDisableDefaultSrc,
      'base-uri': ["'self'"],
      'object-src': ["'none'"],
      'frame-ancestors': ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());

/* ── Body Parsers ──────────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Static Assets (with cache) ────────────────────────── */
// Static files keep a long cache; their URLs carry ?v=<assetVersion>, so a
// new deploy changes the URL and the browser fetches the fresh file.
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '5m',
  immutable: process.env.NODE_ENV === 'production',
  etag: true,
  lastModified: true,
}));

/* ── Never cache dynamic pages ─────────────────────────── */
// express.static above ends the response for real files, so this only runs
// for rendered HTML / API responses. Marking them no-store guarantees every
// deploy is reflected immediately — no stale admin pages after a redeploy.
app.use((req, res, next) => {
  /* Storefront HTML: revalidated on every navigation (no-cache) but NOT
     no-store, because no-store disables the browser's back/forward cache
     and every "back" became a full reload. Anything personal or
     transactional stays no-store. */
  const sensitive = /^\/(admin|account|checkout|thank-you|api|feed|cart)(\/|$)/.test(req.path);
  if (sensitive || req.method !== 'GET') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  } else {
    res.set('Cache-Control', 'private, no-cache, must-revalidate');
  }
  next();
});

/* ── View Engine (EJS) ─────────────────────────────────── */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', true);

/* ── Global app.locals (available in ALL templates + includes) */
app.locals.formatPrice = formatPrice;

/* Safe serialiser for data embedded in inline <script> via <%- %>.
   Use this instead of JSON.stringify for any value that could contain
   user input, or a "</script>" in the data closes the tag (stored XSS). */
app.locals.jsonForScript = require('./helpers/jsonForScript');

/* Responsive product images. Every template that renders a stored product
   image goes through this so a 2048px original is not downloaded into a
   70px cart thumbnail. See docs/image-hosting.md for why this rather than
   a self-hosted media library. */
app.locals.productImage = require('./helpers/productImage');
/* Dispatch-day promise on product cards and pages (helpers/dispatch.js). */
app.locals.dispatch = require('./helpers/dispatch');

/* Lets any admin template ask whether an order came from a test purchase.
   The answer is derived from the order document, so a list and the totals
   above it cannot disagree about which rows are real. */
app.locals.testOrder = require('./services/testOrder');

/* Cache-busting version for static assets. Static files are served with a
   1-year Cache-Control, so unversioned URLs would keep serving stale CSS/JS
   after a deploy. On Render, RENDER_GIT_COMMIT changes every deploy, so this
   auto-busts caches; falls back to a timestamp locally. Append it to asset
   URLs as ?v=<%= assetVersion %>. */
/* A hash of the assets themselves, not a timestamp: the timestamp changed
   on every restart and threw away every visitor's year-long cache of CSS
   and JS for a deploy that had not touched them. */
app.locals.assetVersion = (() => {
  try {
    const crypto = require('crypto');
    const h = crypto.createHash('md5');
    for (const f of ['public/css/gogetcards.css', 'public/js/gogetcards.js']) h.update(require('fs').readFileSync(path.join(__dirname, f)));
    return h.digest('hex').slice(0, 12);
  } catch (_) {
    return (process.env.RENDER_GIT_COMMIT || String(Date.now())).slice(0, 12);
  }
})();

/* ── Boot ──────────────────────────────────────────────── */
async function boot() {
  /* ── DB Error Interceptor ────────────────────────────────
     When the database is unreachable, show the visitor a neutral
     maintenance page with a 503 (so crawlers treat it as temporary and
     monitors see the real status). The underlying cause — that it is
     MongoDB Atlas, the connection string problem, the error text — is
     written to the server log only, never to the page: naming the
     datastore and echoing the driver error to the public is needless
     information disclosure. */
  app.use((req, res, next) => {
    if (global.dbError) {
      console.error('⚠️  Serving maintenance page — database unavailable:', global.dbError);
      res.set('Retry-After', '120');
      return res.status(503).send(`
        <!doctype html><meta charset="utf-8"><title>Temporarily unavailable</title>
        <div style="font-family:system-ui,sans-serif;max-width:32rem;margin:12vh auto;padding:0 1.5rem;text-align:center;color:#222;">
          <h1 style="font-size:1.4rem;">We'll be right back</h1>
          <p style="color:#555;">The store is briefly unavailable while we carry out maintenance. Please try again in a couple of minutes.</p>
        </div>
      `);
    }
    next();
  });

  /* ── Sessions ────────────────────────────────────────
   *
   * BUILT ONCE, NOT PER REQUEST. This used to call session() AND
   * MongoStore.create() inside the handler, so every single request
   * constructed a fresh session middleware and a fresh session store —
   * each with its own connect-mongo state and its own TTL timer, none of
   * them ever released. On a quiet day that is waste. Under sustained
   * traffic, or when the database stops answering and stores pile up
   * faster than anything can settle, it is a memory leak that ends with
   * the process being killed — and a host restarting a killed process,
   * over and over, is what a visitor sees as 502 Bad Gateway.
   *
   * Built lazily rather than at boot because the Mongo client does not
   * exist until connectDB has finished and this middleware is mounted
   * before that. If it cannot be built, the request continues WITHOUT a
   * session rather than failing: the store carries carts and logins, and
   * losing those is far better than losing the site. */
  let sessionMiddleware = null;
  app.use((req, res, next) => {
    if (global.dbError) return next(); // Skip session if DB is dead
    if (!sessionMiddleware) {
      try {
        sessionMiddleware = session({
          secret: resolveSessionSecret(),
          resave: false,
          /* MUST stay true. The analytics attribution (Traffic Sources)
             groups visits by req.sessionID, which is only stable across a
             visitor's page views if a session cookie is set on the FIRST
             request. With saveUninitialized:false no cookie is set for an
             anonymous visitor, so every page view gets a fresh sessionID and
             each one is counted as a separate visitor — which massively
             inflates the visit counts (especially Direct). Creating the
             session eagerly is what keeps one visitor counted as one. */
          saveUninitialized: true,
          store: MongoStore.create({
            client: mongoose.connection.getClient(),
            ttl: 7 * 24 * 60 * 60,
          }),
          cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            /* Lax: the cookie is not sent on cross-site POSTs, which is the
               primary CSRF defence for the admin and account forms. */
            sameSite: 'lax',
          },
        });
      } catch (err) {
        /* getClient() throws when Mongo never connected at all. */
        console.error('⚠️  Session store unavailable:', err.message);
        return next();
      }
    }
    return sessionMiddleware(req, res, next);
  });

  /* ── Global Template Locals ──────────────────────────── */
  app.use((req, res, next) => {
    /* req.session is undefined when the session middleware above skipped
       itself because the database is down. Reading .cart off it then threw
       on EVERY request, so the "degraded" mode was not degraded, it was
       a blank 500 for the whole site — including the pages that need no
       database at all. */
    res.locals.cart = (req.session && req.session.cart) || { items: [], totalItems: 0, totalPrice: 0 };
    /* IDENTITY UNTIL THE MARKET MIDDLEWARE REPLACES IT. Every internal link
       in the customer templates is built through marketPath, so it has to
       exist on every render — including the ones that never reach the market
       middleware (error pages, standalone renders). Defaulting it here means
       a missing market costs the prefix, never the page. */
    res.locals.marketPath = (p) => (String(p || '/').startsWith('/') ? String(p || '/') : `/${p}`);
    res.locals.currentPath = req.path;
    res.locals.currentYear = new Date().getFullYear();
    res.locals.pageTitle = 'GoGetCards';
    res.locals.metaDescription = '';
    res.locals.ogType = 'website';
    res.locals.ogImage = '';
    /* Canonical URL. This used to be built from req.originalUrl, which
     * includes the entire query string — so every paid click landing with
     * ?utm_source=…&fbclid=… self-canonicalised to its own unique URL, and
     * every ?sort= variant of a collection became a separate indexable
     * page. That is textbook duplicate content, and it is worst exactly
     * where it hurts most: ad traffic.
     *
     * Canonical is now the clean path. SITE_URL pins the host so a request
     * arriving on a Render *.onrender.com URL, or on a non-www/www variant,
     * still points Google at one origin instead of splitting signals. */
    /* /about/ and /about were two URLs for one page: Express is not strict
       about trailing slashes, so both returned 200. The canonical below
       consolidates them for Google, but a duplicate URL still costs a
       crawl and still gets linked. One 301 ends it. GET and HEAD only:
       a POST must never be redirected. */
    if ((req.method === 'GET' || req.method === 'HEAD') && req.path.length > 1 && req.path.endsWith('/')) {
      const q = req.originalUrl.indexOf('?');
      return res.redirect(301, req.path.replace(/\/+$/, '') + (q === -1 ? '' : req.originalUrl.slice(q)));
    }
    const canonicalOrigin = site.origin();
    const canonicalPath = req.path === '/' ? '/' : req.path.replace(/\/$/, '');
    res.locals.canonicalUrl = `${canonicalOrigin}${canonicalPath}`;
    res.locals.canonicalOrigin = canonicalOrigin;
    res.locals.jsonLd = null;
    res.locals.bodyClass = '';
    res.locals.metaPixelId = process.env.META_PIXEL_ID || '';
    /* ── Google Ads ─────────────────────────────────────────────────
       Both committed rather than read from the environment. Neither is a
       secret: both ship in the page source of every public page, and the
       label is meaningless without access to the account. A value that has
       to be set in a dashboard before the site can measure anything is a
       value that will eventually be missing from one — which is how this
       store spent its first weeks of Shopping ads reporting no purchases at
       all. The environment still overrides both, for pointing a staging
       deploy somewhere harmless.

       An earlier default pointed at an account that had since been
       abandoned, which is worse than none: every page loaded a dead
       account's tag and every order reported a conversion into it. These
       two belong to the live account, together.

       WHY BOTH OR NEITHER. views/pages/thank-you.ejs gates the purchase
       conversion on the pair, because an id with no label loads the tag and
       reports nothing while a label with no id cannot fire at all. With
       only the id set, page views were the sole conversion action — and
       Maximize-conversion-value bidding then pays purchase-intent prices to
       buy page views, which is exactly what it did.

       The label is the string after the slash in the purchase action's
       send_to, from Goals -> Conversions. */
    /* Exchange rates for the approximate local price shown under the real
       one. A plain object of numbers, inlined into the page: no request from
       the visitor's browser to anyone, and nothing here can fail a render
       because services/fx.js always returns a table. */
    res.locals.fx = require('./services/fx').snapshot();
    /* No default. zypheratcg's tag id was hardcoded here as the fallback,
       and inheriting it would report every GoGetCards purchase into the
       other store's Google Ads account. Unset means the tag is not
       rendered at all. */
    res.locals.googleAdsId = process.env.GOOGLE_ADS_ID || '';
    /* GA4 property. Unset means no GA4 tag; the Ads tag is independent. */
    res.locals.ga4Id = process.env.GA4_MEASUREMENT_ID || '';
    /* Numeric stock/allocation counts on the storefront ("Only 4 left",
       "61 units remaining"). Shown by default, from Product.stock, which the
       owner maintains by hand; SHOW_STOCK_COUNTS=false hides every number. */
    res.locals.showStockCounts = process.env.SHOW_STOCK_COUNTS !== 'false';
    res.locals.googleAdsPurchaseLabel = process.env.GOOGLE_ADS_PURCHASE_LABEL || '';
    // Free-shipping copy comes from config/shipping.js, the same module
    // the Product Offer schema uses, so the promise shown to customers
    // and the rate declared to Google can never drift apart.
    res.locals.shippingCopy = require('./config/shipping').copy;
    // Verifiable company facts (config/company.js). Everything is null by
    // default and every consuming block omits itself when unset, so an
    // unfilled field renders nothing rather than an invented figure.
    res.locals.company = require('./config/company');
    // The lines sold (config/catalog.js): nav, footer, hero chips, home grid,
    // badges and the product card all read this one list.
    res.locals.catalog = require('./config/catalog');
    // Accepted payment methods (config/payments.js). Every badge row, trust
    // line and FAQ answer reads from this one list, so the site cannot
    // advertise a method on one page that checkout does not offer — which
    // is a Merchant Center misrepresentation violation, not a cosmetic slip.
    res.locals.payments = require('./config/payments');
    /* Preorder helpers and the shipping/returns figures. In res.locals
       rather than passed per-route because product-card.ejs renders on the
       homepage, on every collection and in the related-products strip, and
       a partial that silently loses a local it needs fails at render time
       on whichever page forgot to pass it. */
    res.locals.preorder = require('./config/preorder');
    res.locals.packs = require('./helpers/packs');
    /* Variant-aware display title (appends " — Night", " — Mew", …). The
       product page already used it; the product card did not, so grouped
       products showed the same generic name on collection grids. Exposed
       here so the shared card partial can render the distinguishing name. */
    res.locals.variants = require('./services/variants');
    res.locals.shippingCfg = require('./config/shipping');
    res.locals.returnWindowDays = require('./config/faq').RETURN_WINDOW_DAYS;
    res.locals.freeReturns = require('./config/faq').FREE_RETURNS;
    next();
  });

  /* ── Visitor Tracking (lightweight heartbeat) ────────── */
  const Visitor = require('./models/Visitor');
  const geoip = require('geoip-lite');
  
  app.use(async (req, res, next) => {
    const isHtml = req.accepts('html');
    const userAgent = (req.get('User-Agent') || '').toLowerCase();
    const isBot = /bot|spider|crawl|github|slack|twitter|facebook|preview|lighthouse/i.test(userAgent);

    if (
      req.method === 'GET' &&
      isHtml &&
      !isBot &&
      !req.path.startsWith('/admin') &&
      !req.path.startsWith('/api') &&
      !req.path.includes('.')
    ) {
      const ip = req.ip || ''; // trust-proxy resolved; the leftmost X-Forwarded-For hop is client-chosen
      const geo = geoip.lookup(ip);
      const country = geo ? geo.country : 'Unknown';
      const countryCode = geo ? geo.country : '';

      Visitor.findOneAndUpdate(
        { sessionId: req.sessionID },
        { 
          /* The path, plus the search term on a search: the live list
             shows "Searching ‘op-13’". Nothing else from the query string
             is kept, so a token in a URL never lands in this collection. */
          page: req.path + (typeof req.query.q === 'string' && req.query.q.trim()
            ? '?q=' + encodeURIComponent(req.query.q.trim().slice(0, 80)) : ''),
          ip, 
          country,
          countryCode,
          lastSeen: new Date(), 
          userAgent: req.get('User-Agent') || '' 
        },
        { upsert: true, new: true }
      ).catch(() => {});
    }
    next();
  });

  /* ── Page View Tracking ──────────────────────────────── */
  app.use(trackPageView);

  /* ── Signed-in customer ──────────────────────────────── */
  /* Resolves the account session on every storefront request so the header
     can offer "Account" instead of "Sign in". It NEVER blocks: a database
     blip renders the site signed-out rather than failing the page. The
     guard that actually refuses anonymous requests is requireCustomer,
     applied inside routes/account.js only. */
  app.use(attachCustomer);

  /* ── Rate Limiting (API) ─────────────────────────────── */
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    /* The partner host's server-to-server calls come from a handful of
       IPs and are already HMAC-verified; a burst of payments must not be
       answered 429. Everything else under /api keeps the limit. */
    skip: (req) => /^\/checkout\/(payment-recorded|confirm-arrival)|^\/chat(\/|$)/.test(req.path),
  });

  /* ── Phone push notifications ────────────────────────── */
  // Registers itself as a channel on the order pipeline's existing
  // notifier, so no pipeline code changes. No-ops entirely when neither
  // BARK_KEY nor NTFY_TOPIC is set.
  require('./services/pushNotify').register();

  /* ── Routes ──────────────────────────────────────────── */
  app.use('/api', apiLimiter, apiRoutes);
  /* Mounted before /admin so its own routes win. Both are admin-only; this
     one is a separate router purely because the distribution surface is
     large enough that folding it into routes/admin.js would bury it. */
  /* Public and unauthenticated on purpose: Google's feed fetcher cannot
     log in. Everything it serves is already on the product pages. */
  app.use('/feed', feedRoutes);

  /* The approximate-local-price script the partner payment step loads.
     Public and cross-origin by necessity — that page is on another domain.
     It serves published exchange rates and nothing else; see routes/fx.js. */
  app.use('/js', fxRoutes);

  /* Customer portal. Mounted before the storefront so /account is never
     swallowed by a catch-all page route, and self-contained: every page
     inside it is noindex + no-store, set on the router itself. */
  app.use('/account', accountRoutes);

  /* Money in the admin carries the currency its order was taken in.
     Several views built their own `'$' + amount` helper, so a Belgian
     order for 69.99 EUR read "$69.99" on the orders list — the right
     number wearing the wrong currency, on the screens used to reconcile
     against the payment provider.

     Mounted here, at app level, rather than inside routes/admin: the
     admin is SEVEN routers and /admin/customers, /admin/preorders and the
     rest are mounted ahead of the catch-all, so a router.use inside any
     one of them reaches only its own pages. One definition covers all of
     them, and markets.format holds the prefixes. */
  app.use('/admin', (req, res, next) => {
    res.locals.money = (cents, currency) =>
      markets.format(Number(cents || 0), currency || 'USD');
    next();
  });

  /* Before /admin so its routes win, same reason as distribution. */
  app.use('/admin/customers', adminCustomerRoutes);
  app.use('/admin/emails', adminEmailRoutes);
  app.use('/admin/preorders', adminPreorderRoutes);
  app.use('/admin/partner-log', adminPartnerLogRoutes);
  app.use('/admin/abandoned', adminAbandonedRoutes);
  /* Mounted BEFORE the catch-all /admin router, whose '/' route would
     otherwise never let /admin/analytics through. */
  app.use('/admin/analytics', adminAnalyticsRoutes);

  app.use('/admin/distribution', distributionRoutes);
  app.use('/admin', adminRoutes);

  /* ── Markets ──────────────────────────────────────────
     Turns a leading `/ca`, `/gb`, `/eu` … into req.market and rewrites the
     path so every route below keeps working unchanged. Mounted here, after
     /api, /feed and /admin, because none of those carry a market prefix —
     the feed takes its market as a route parameter instead, so a machine
     endpoint never depends on path rewriting.

     Nothing above this line changes for the US market: `/products/x` has
     no prefix to strip, so it reaches the same route it always did. */
  app.use(require('./middleware/market')());

  /* Before the catch-all frontend router, which owns '/' and would
     otherwise 404 these three paths itself. */
  app.use('/', checkoutRecoveryRoutes);
  /* Before frontendRoutes, which owns /checkout/step-1, /checkout/whop and
     /checkout/success. checkoutFlow's :token param is shape-checked and
     calls next() on anything that is not a 40+ char base64url string, so
     those three keep working. */
  app.use('/', checkoutFlowRoutes);
  app.use('/', frontendRoutes);

  /* ── 404 Handler ─────────────────────────────────────── */
  app.use((req, res) => {
    notFound(res);
  });

  /* ── Error Handler ───────────────────────────────────────
     The stack trace is logged server-side (visible in the platform logs),
     never sent to the client: an error message can leak file paths, query
     shapes and dependency internals that help an attacker. The visitor
     gets a generic 500 only.

     This replaces a second handler that appended err.stack to a local
     file on every error (unbounded growth, and synchronous I/O on the
     request path) and returned err.message to the browser. */
  app.use((err, req, res, next) => {
    console.error('Server Error:', req.method, req.path, '-', err && err.stack ? err.stack : err);
    if (res.headersSent) return next(err);
    res.status(500).send('Internal Server Error');
  });

  /* ── Start Express Immediately ───────────────────────── */
  const server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║  🔮 GoGetCards — Server Running         ║
║  📍 http://localhost:${PORT}                ║
║  📦 Admin: http://localhost:${PORT}/admin    ║
╚═══════════════════════════════════════════╝
    `);
  });

  /* ── Graceful shutdown ──────────────────────────────────
     The platform sends SIGTERM on every deploy and scale-down. Without a
     handler the process dies mid-request: a /thank-you that had just
     written the Order but not yet sent the confirmation email would leave
     a paid customer with no email, and the email claim flag already set.
     Stop accepting connections, let in-flight requests finish, close the
     database, then exit; a hard deadline so a hung request cannot keep a
     dead replica alive. */
  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, draining`);
    server.close(() => {
      require('mongoose').connection.close(false).finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 25000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  /* ONE STRAY PROMISE MUST NOT BE ABLE TO CLOSE THE SHOP.
   *
   * Since Node 15 an unhandled rejection terminates the process by
   * default. For a web server that trade is backwards: a background sweep
   * that fails is worth a log line, not every customer seeing 502 while
   * the host restarts a process that will die again in thirty seconds.
   *
   * This is not hypothetical. It is precisely what happened when the
   * database stopped answering: the recovery sweep threw on a tick nobody
   * was awaiting, the process exited, and the site went from "degraded"
   * to "gone" — a state it could not recover from on its own.
   *
   * A net, not a licence. Every one of these is a bug, and it is logged
   * loudly enough to find. An uncaught EXCEPTION is deliberately NOT
   * caught here, because that genuinely can leave a process in a state
   * you should not keep serving from. */
  process.on('unhandledRejection', (reason) => {
    console.error('⚠️  Unhandled promise rejection (the process is staying up):',
      reason && reason.stack ? reason.stack : reason);
  });

  // Connect to DB in the background
  connectDB().then(() => {
    /* Pack pictures: render them now, two at a time, so the first shopper
       after a deploy is not the one who waits for them. */
    setTimeout(() => require('./services/multipackImage').warmAll().catch((err) => console.error('[multipack image] warm-up:', err.message)), 3000);
    /* Reaching here proves nothing about the database. In production
       connectDB CATCHES a failed connection, records global.dbError and
       resolves anyway — so without this check the sweeps start against a
       dead database and simply churn failures every few minutes. */
    if (global.dbError) {
      console.error('⚠️  Database unavailable — background jobs not started:', global.dbError);
      return;
    }

    /* cron/recoveryBot is gone with pooled email. Its only job was
       releasing a claimed pool address back to 'available' after a few
       hours, and doing that is what wiped `usedFor` — the record of which
       checkout an address had been handed to. Nothing claims one any more,
       so the sweep had nothing left to find and every run it did make was
       erasing history we now keep. See docs/pooled-email.md. */

    /* Abandoned-checkout recovery. Same in-process pattern as the sweeps
       above: promotes quiet checkouts to 'abandoned' and sends whatever
       step is due, re-checking for a payment before every send. */
    require('./cron/abandonedCheckout').start();

    /* Payments a partner confirmed that never became an order, because the
       customer's browser never reached /thank-you. Silent until now: the
       money was taken and nothing said so. Pushes once, after a grace
       period, so a real sale is never mistaken for a lost one. */
    require('./cron/unconfirmedPayments').start();

    /* Drains the failed-email retry queue, one message at a time. The
       spacing lives on each row, not here — see services/mail/retryQueue.js
       for why recovering from a provider outage must not be a burst. */
    require('./cron/emailRetryQueue').start();

    /* Drains the broadcast queue — release-day announcements and the
       keep-or-refund offer — one message every twenty-odd seconds. Sending
       several hundred at once from the domain the receipts go out on is
       how the receipts stop arriving. See services/mail/broadcast.js. */
    require('./cron/broadcastQueue').start();

    /* Brings the Event TTL index up to the schema's retention. A no-op
       unless the live index actually differs — but without it, raising the
       number in models/Event.js changes nothing on a database that already
       has the index, and analytics would offer a year of history over
       ninety days of data. See cron/eventTtl.js. */
    require('./cron/eventTtl').start();

    /* One-time, self-guarded data migration: undo the visit-count inflation
       from the saveUninitialized:false window. Runs once (SiteConfig flag),
       is idempotent, and never throws into boot. Safe to remove once run.
       See cron/deinflateVisitsMigration.js. */
    require('./cron/deinflateVisitsMigration').run();

    /* Keeps the Google feed alive. Google expires a product about 30 days
       after it was last submitted, so a catalogue that stops syncing does
       not fail loudly — it disappears from Shopping one item at a time. */
  }).catch(err => {
    console.error('❌ Failed to connect to DB during boot:', err);
  });
}

boot();
