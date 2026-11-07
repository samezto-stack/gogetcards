const express = require('express');
const orderCap = require('../helpers/orderCap');
const notFound = require('../helpers/notFound');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const router = express.Router();

/* Abuse guard for the public, unauthenticated write forms (contact, lead
   capture). Keeps a bot from flooding the inbox / lead table and burning
   email quota. Generous enough that no real visitor is ever caught. */
const publicFormLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please wait a moment and try again.',
});
const Product = require('../models/Product');
const Collection = require('../models/Collection');
const Page = require('../models/Page');
const Event = require('../models/Event');
const Order = require('../models/Order');
const ChatMessage = require('../models/ChatMessage');
const SiteConfig = require('../models/SiteConfig');
const PendingPayment = require('../models/PendingPayment');
const abandonedCheckoutService = require('../services/abandonedCheckout');
const ContactMessage = require('../models/ContactMessage');
const recaptcha = require('../services/recaptcha');
const cryptoUtil = require('../services/cryptoUtil');
const mail = require('../services/mail');
const partnerClient = require('../services/partnerClient');
const variants = require('../services/variants');
const partnerRotation = require('../services/partnerRotation');
const partnerHealth = require('../services/partnerHealth');
const marketService = require('../services/market');
const markets = require('../config/markets');
const { runThankYouPipeline } = require('../services/orderPipeline');
const { verifySignature } = require('../services/orderPipeline/signatureVerifier');
const { detectSource, isAcquisitionSource } = require('../middleware/tracking');
const shipping = require('../config/shipping');
const productRedirects = require('../config/redirects');
const site = require('../config/site');
const company = require('../config/company');
const payments = require('../config/payments');
const faqConfig = require('../config/faq');
const distributionCfg = require('../config/distribution');
const preorderCfg = require('../config/preorder');
const caseOfferService = require('../services/caseOffer');
const productImage = require('../helpers/productImage');
const trustPages = require('../config/trustPages');
const catalog = require('../config/catalog');
const orderReference = require('../helpers/orderReference');
const fulfilmentFor = require('../helpers/orderFulfilment');
const { provisionFromOrder } = require('../services/customerProvisioning');
const testOrder = require('../services/testOrder');

/**
 * A redirect target that keeps whatever was on the query string.
 *
 * THE CLICK ID IS IN THE QUERY, AND A REDIRECT THAT DROPS IT LOSES THE
 * SALE'S ATTRIBUTION. Google appends ?gclid=... to an ad click and reads it
 * back from a cookie the tag writes on the landing page. If the landing URL
 * 301s somewhere else and the query is dropped, the tag never sees a gclid,
 * the conversion is recorded as unattributed, and Smart Bidding learns
 * nothing from a click that was actually paid for. The same applies to
 * Meta's fbclid and to every utm_* parameter behind the source reports.
 *
 * It is not a hypothetical: a Merchant Center feed keeps serving a product
 * URL until it next re-syncs, so a renamed product sends real paid traffic
 * through the rename redirect for as long as that takes.
 *
 * Only for redirects a VISITOR follows. Nothing here belongs on an internal
 * one, where carrying a stale query string forward is a bug rather than a
 * courtesy.
 */
function withQuery(req, path) {
  const i = req.originalUrl.indexOf('?');
  if (i === -1) return path;
  const qs = req.originalUrl.slice(i + 1);
  if (!qs) return path;
  return path + (path.includes('?') ? '&' : '?') + qs;
}

/**
 * GTIN as schema.org properties.
 *
 * Returns the generic `gtin` AND the length-specific alias, because the two
 * have different audiences: schema.org added `gtin` later and it is the
 * modern spelling, while Google's structured-data documentation still
 * enumerates gtin8/gtin12/gtin13/gtin14 and a number of third-party
 * validators only recognise those. A feed audit that reports "no GTIN in
 * Product schema" on a page that plainly has one is usually looking for the
 * specific property, and emitting both costs nothing.
 *
 * Length decides the alias: 13 an EAN, 12 a UPC, 14 an ITF-14 case code,
 * 8 an EAN-8. Anything else is malformed and gets no alias rather than a
 * wrong one — a GTIN under the wrong property resolves against the wrong
 * catalogue, which is worse than an absent identifier.
 */
function gtinProperties(raw) {
  const digits = String(raw || '').replace(/[\s-]/g, '');
  if (!digits) return {};
  const alias = { 8: 'gtin8', 12: 'gtin12', 13: 'gtin13', 14: 'gtin14' }[digits.length];
  return alias ? { gtin: digits, [alias]: digits } : { gtin: digits };
}

// Resolves the TRUE first-touch marketing channel (Facebook, Google, Yahoo,
// Direct, ...) for the session about to check out. Deliberately NOT
// detectSource(req) computed right here — by the time someone clicks Buy
// they've often browsed the site already, so req's own Referer at this
// instant is usually just an internal gogetcards URL, not the ad/search
// result that actually brought them to the site. The session's EARLIEST
// page_view (recorded by middleware/tracking.js at the moment they first
// landed, days or minutes earlier) is the honest signal. Falls back to the
// live request only if no prior page_view exists for this session (e.g. a
// same-request edge case) so this never returns nothing.
async function resolveTrafficSource(req) {
  try {
    if (req.sessionID) {
      /* The session's earliest page view that names a REAL acquisition
       * channel. It used to take the earliest page view of any kind, which
       * meant a visitor who arrived from Google and browsed for a while
       * could have their order credited to an internal hop or to "Direct"
       * if that happened to be the first row recorded — the exact case of
       * "came from Google, clicked into the One Piece collection, bought
       * OP-17" being logged as Direct.
       *
       * Falls back to the earliest non-internal view (genuinely Direct
       * traffic), then to live detection. */
      const views = await Event.find({ sessionId: req.sessionID, type: 'page_view' })
        .sort({ createdAt: 1 })
        .select('source')
        .lean();
      const acquired = views.find(v => isAcquisitionSource(v.source));
      if (acquired) return acquired.source;
      const external = views.find(v => v.source && v.source !== 'Internal');
      if (external) return external.source;
    }
  } catch { /* fall through to live detection */ }
  return detectSource(req);
}

// Count a "reached checkout" for the dashboard Checkouts metric. Fired the
// moment a customer is SENT toward a checkout — Shopify rotator, Static
// Payment Link, or Partner Experience — so all three flows are tracked
// consistently. This only proves we issued the redirect, NOT that the
// browser actually made it there (closed tab, network failure, an ad
// blocker eating the redirect, etc. all leave zero trace here) — that's
// what checkout_arrived (see /api/checkout/confirm-arrival below) is for.
// Returns a checkoutId the caller can hand to the destination checkout page
// so a later checkout_arrived beacon can be correlated back to this click.
//
// Also stores the resolved traffic source (see resolveTrafficSource above).
// The order-creation pipeline (services/orderPipeline) later looks this
// Event up by checkoutId (a.k.a. zcid) to attach the true traffic source —
// see index.js's use of raw.zcid.
//
// It no longer writes a pooled email, because none is claimed any more. The
// FIELD stays on the Event: rows written while the scheme ran still carry
// one, the abandoned-checkout sweep still reads them to tell a paid
// checkout from an abandoned one, and deleting the field would silently
// turn those into "never paid".
function trackCheckoutReached(req, quantity, destination, productSlug) {
  const checkoutId = crypto.randomUUID();
  try {
    /* Geolocated here, once. The later step beacons fire from the partner
       domain and would be looking up the same visitor for the same answer. */
    let geo = null;
    try { geo = require('geoip-lite').lookup(req.ip); } catch { /* optional */ }

    resolveTrafficSource(req)
      .then((source) =>
        Event.create({
          type: 'checkout_click',
          quantity: quantity || 1,
          page: (req.get && req.get('Referer')) || '/checkout-redirect',
          sessionId: req.sessionID,
          ip: req.ip,
          userAgent: req.get ? req.get('User-Agent') : '',
          destination: destination || null,
          checkoutId,
          source,
          /* WHAT was being bought, and FROM WHERE — recorded at the one
             point that knows both and cannot fail.
             The later funnel beacons carry neither: they fire from the
             partner domain and know only their zcid. This row is therefore
             what makes "step 1 and step 2, by product and by country"
             answerable at all — those stages inherit the dimension by
             sharing this checkoutId. Recording it once here also stops the
             answer drifting between stages, which is what would happen if
             each beacon worked it out for itself. */
          productSlug: productSlug || null,
          country: geo ? geo.country : '',
          countryCode: geo ? geo.country : '',
        }),
      )
      .catch(() => {});
  } catch (e) { /* never block checkout on tracking */ }
  return checkoutId;
}

// Helper: render with layout
function renderPage(res, page, data = {}) {
  const layoutData = {
    ogType: 'website',
    ogImage: 'https://gogetcards.com/images/og-default.jpg',
    ...res.locals,
    ...data,
  };
  res.render(`pages/${page}`, layoutData);
}

/* THE ONE PLACE A CHECKOUT CAN END WITHOUT A PAYMENT PAGE.
 *
 * There used to be two other checkouts behind this one — a pool of Shopify
 * storefronts and a table of static Stripe links — and every partner
 * refusal quietly fell through to whichever was configured. That is how a
 * buyer clicking Buy on a correctly priced product ended up on "Product
 * Resolution Failed": the partner declined for a reason nobody could see,
 * and the answer they got came from a system that had nothing to do with
 * the order. Both are gone. A refusal is now visible, says nothing was
 * charged, and points back at the product.
 *
 * The server-side reason is on the `[partner] declined ...` line in the
 * logs; the customer is not shown configuration detail. */
function checkoutUnavailable(res, slug) {
  return res.status(503).render('pages/checkout-token-message', {
    layout: false,
    pageTitle: 'Checkout unavailable | GoGetCards',
    heading: 'We cannot take this order right now',
    message: 'Nothing was charged. This is on our side, not yours — the product is still available, '
      + 'and checkout usually comes back within a few minutes. Contact us if it does not.',
    ctaHref: slug ? `/products/${slug}` : '/',
    ctaLabel: slug ? 'Back to the product' : 'Browse the store',
  });
}

/* ── Homepage ──────────────────────────────────────────── */
router.get('/', async (req, res) => {
  if (global.dbError) {
    return res.status(500).send(`
      <div style="font-family:sans-serif;padding:40px;color:red;background:#fff;">
        <h1>Database Connection Failed</h1>
        <p>Your server booted up, but it could NOT connect to MongoDB Atlas.</p>
        <p><strong>Error Details:</strong> ${global.dbError}</p>
        <p>Please fix your MONGODB_URI or Atlas IP Whitelist and restart the server.</p>
      </div>
    `);
  }
  try {
    const featuredProducts = await Product.find({ featured: true, available: true }).limit(4).lean();
    const preorderProducts = await Product.find({ preorder: true, available: true }).limit(2).lean();
    renderPage(res, 'home', {
      pageTitle: 'GoGetCards — Premium Sealed TCG Marketplace',
      /* From config/catalog.js, so the snippet Google shows names exactly
         the lines this store sells. It was copied from Zyphera and listed
         Yu-Gi-Oh!, which GoGetCards does not carry. */
      metaDescription: `Factory-sealed booster boxes, ETBs and hobby boxes for ${catalog.listNames(catalog.all(), 'shortName')}, from authorized distribution.`,
      featuredProducts,
      preorderProducts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

/* ── Partner Experience Checkout Broker (shared) ─────────── */
// Given a product slug, returns a fully-formed partner checkout redirect,
// or null when partner experience is disabled, no route matches the slug, or
// anything fails — the caller then falls back to its normal checkout flow.
// Shared by BOTH the product page's Secure Checkout (POST
// /api/checkout/partner) and the cart's Secure Checkout (GET
// /checkout-redirect), so the two paths behave identically.
//
// The email that travels with the checkout is the buyer's own. It was once
// possible to substitute one of ours instead; that is gone, and
// docs/pooled-email.md says why and where the records went.
async function resolvePartnerRedirect(slug, qty, buyer) {
  if (!slug) return null;
  const quantity = Math.max(1, parseInt(qty, 10) || 1);
  /* Accepts either the bare email it used to take, or the whole buyer from
     a Step 1 session. The address matters now: the payment page stopped
     collecting one when it became the payment step, so unless it is told,
     the customer retypes on Whop's form everything they just typed on
     ours — which is the difference between one click and a second address
     form on a page they did not expect one. */
  const who = buyer && typeof buyer === 'object' ? buyer : { email: buyer };
  const customerEmail = who.email;
  const trim = (v) => String(v == null ? '' : v).trim().slice(0, 200) || undefined;
  try {
    /* EVERY REFUSAL SAYS WHY, on one line, naming the slug and quantity.
     *
     * This function declining is indistinguishable from the outside from it
     * never having been called: the buyer simply lands on the ordinary
     * checkout. When that ordinary checkout is itself misconfigured they
     * meet an error page instead, and there is nothing anywhere connecting
     * the two. Six preconditions can decline here and until now none of them
     * left a trace. */
    const decline = (why) => {
      console.warn(`[partner] declined ${slug} x${quantity}: ${why}`);
      return null;
    };

    const partnerExperience = await SiteConfig.getValue('partnerExperience', null);
    if (!partnerExperience) return decline('no partnerExperience config saved');
    if (!partnerExperience.enabled) {
      /* THE TRAP THIS NAMES. Choosing the Partner Experience MODE card and
         ticking "Send buyers to partner sites" are two different switches in
         two different forms; the first only reveals the panel. */
      return decline('the integration is switched off — tick "Send buyers to partner sites" and save');
    }
    if (!Array.isArray(partnerExperience.savedSites) || partnerExperience.savedSites.length === 0) {
      return decline('no partner sites are configured');
    }

    /* THE PRODUCT IS LOADED FIRST, because its price is what decides both
       which sites can serve it and which of their plans applies. */
    const product = await Product.findOne({ slug }).lean();
    if (!product) return decline('no product with that slug');

    /* ── The market this charge belongs to ────────────────────────────
       Passed down from the checkout session, which pinned it at Step 1.
       Everything below — which sites are eligible, which ladder is read,
       what figure is sent to the payment host — is in this market's
       currency. A product not priced here has no charge that could be
       correct, so the hop is abandoned rather than falling back to USD. */
    const market = markets.byId(who.market) || markets.defaultMarket();
    const localPrice = marketService.priceFor(product, market);
    if (!localPrice) return decline(`not sold in ${market.id}`);

    /* WHICH SITE. Several sites can serve the same product, and rotation
       picks whoever is up next — see services/partnerRotation.js for why the
       cursor is a site id rather than an index into a list that changes
       whenever anything is paused. */
    const rotatedSite = partnerRotation.nextSite(partnerExperience, product,
      { amount: localPrice.amount, market: market.id });
    if (!rotatedSite) {
      /* Say which of the three it is, per site, rather than "none matched" —
         the difference between a paused site, a missing link and a price off
         the grid is the difference between three unrelated fixes. */
      const why = partnerExperience.savedSites
        .map((site) => `${site.name || site.id}: ${partnerRotation.siteForProduct(site, product).detail || (site.enabled === false ? 'paused' : (site.url ? 'ok' : 'no service link'))}`)
        .join(' | ');
      return decline(`no site can serve it (${why})`);
    }

    /* WHICH PLAN, BY ARITHMETIC RATHER THAN CONFIGURATION. A partner site
       sells one ladder of twelve plans in equal steps, so the ladder is a
       price grid: a product costing three steps uses rung 3 for one unit,
       rung 6 for two, rung 9 for three. Nothing is entered per product, and
       nothing can drift out of step with the product's own price.

       null means no plan charges exactly what the page says — the price is
       off the grid, or the quantity runs past the top of the ladder. The
       partner hop is abandoned and the buyer takes the ordinary checkout,
       because Whop charges what the plan id says regardless of what was
       displayed, and a near-miss is a wrong charge rather than a near-miss. */
    const chosen = partnerRotation.planFor(rotatedSite, localPrice.amount, quantity, market.id);
    if (!chosen) {
      const steps = partnerRotation.unitsFor(rotatedSite, localPrice.amount, market.id);
      return decline(steps
        ? `${rotatedSite.name} has no plan at step ${steps * quantity} (${steps} steps x ${quantity}; the ladder stops at ${partnerRotation.LADDER_STEPS})`
        : `${markets.format(localPrice.amount, localPrice.currency)} is not a multiple of this site's ${market.id} step price`);
    }

    const matchedRoute = {
      label: rotatedSite.name || rotatedSite.url,
      url: rotatedSite.url,
      /* ONE ID FOR EVERY HOST. They all register 'partner' alongside their
         own service slugs so a single broker configuration works against all
         of them, and the id only selects gated-versus-marketing — which
         product is shown comes from the signed claims. */
      experienceId: partnerRotation.PARTNER_EXPERIENCE_ID,
      savedSiteId: rotatedSite.id,
    };

    /* ONE KEY FOR EVERY HOST, for the same reason: it is literally the same
       secret on all of them, so a per-site copy could only ever be identical
       or wrong. The env var stays as an override for a single deployment. */
    const testApiKey = cryptoUtil.decrypt(partnerExperience.apiKey)
      || process.env.PARTNER_EXPERIENCE_API_KEY;
    if (!testApiKey) return decline('no API key is set');

    const whopPlanId = chosen.whopPlanId;
    /* From the grid, not from the product times the quantity. They agree by
       construction — the plan was chosen BECAUSE it charges this — and
       deriving the display from the same place as the charge is what stops
       the two ever disagreeing. */
    const priceOverride = markets.currency(chosen.currency).decimals === 0
      ? String(Math.round(chosen.priceCents))
      : (chosen.priceCents / 100).toFixed(2);

    /* POOLED EMAIL IS GONE, NOT SWITCHED OFF. This could substitute one of
       our own addresses for the buyer's, so the Whop order came back under
       an address we controlled. Removed rather than left as a toggle: the
       billing name and card belonged to a real person while the email on
       the transaction did not, which is the pattern a processor reads as
       fraud — and it put us between a customer and their own receipt, on a
       purchase they had every right to be able to look up themselves.

       The buyer's own address goes to the payment step as a signed claim,
       exactly as it has whenever the toggle was off. What the scheme
       already produced is KEPT: see scripts/export-partner-emails.js and
       docs/pooled-email.md. Those records are the only way to answer, for
       an order sitting under one of our addresses, whose order it was. */
    const tokenData = await partnerClient.getPartnerToken({
      url: matchedRoute.url,
      apiKey: testApiKey,
      experienceId: matchedRoute.experienceId,
      claims: {
        /* The address the customer gave at Step 1 — theirs, always — so
           the payment page has something to prefill now that it no longer
           collects one itself. A CLAIM, which the partner host puts in a
           signed cookie and never in the URL. */
        email: customerEmail || undefined,
        /* The shipping address from Step 1, so the payment page can prefill
           the billing form instead of asking for it a second time.

           These are claims, exactly like email: they go server-to-server in
           the signed token, the partner host keeps them in a signed cookie
           and hands them to the page in the HTML. None of them is ever a
           query parameter, on either domain. */
        /* Also sent as a claim, not only as the query parameter below.
           The payment page reads zcid off the URL once and strips it, so a
           REFRESH had nothing left to read and showed "start over" on a
           checkout that was perfectly alive. As a claim the partner host
           keeps it in its signed cookie and hands it back on every later
           request, so the page survives a reload. It identifies an order,
           never a person. */
        zcid: trim(who.checkoutId),
        buyerName: trim([who.firstName, who.lastName].filter(Boolean).join(' ')),
        buyerAddress1: trim(who.address1),
        buyerAddress2: trim(who.address2),
        buyerCity: trim(who.city),
        buyerState: trim(who.state),
        buyerPostalCode: trim(who.postalCode),
        buyerCountry: trim(who.country),
        productName: product ? product.title : undefined,
        productImage: product ? (product.imageUrl || (product.images && product.images[0])) : undefined,
        productSlug: product ? product.slug : undefined,
        whopPlanId,
        productPrice: priceOverride,
        /* The currency travels with the price. A plan id is opaque, so
           without this the host would have to assume, and an assumption
           here is a receipt in the wrong currency. */
        productCurrency: chosen.currency,
        productQuantity: quantity > 1 ? String(quantity) : undefined,
      }
    });

    /* ── This site has now been handed a buyer ─────────────────────────
       Counted here rather than at the click, because every precondition
       above can still decline and a declined hop never reached the partner
       at all. From this line the buyer is on that site's checkout, and if
       no order ever comes back, this hand-off is the thing that says so.

       Best-effort, and deliberately not awaited: the bookkeeping is worth
       less than the checkout it is bookkeeping for, and a slow write must
       not sit between a buyer and a payment form. The sweep runs straight
       after the count, so a site that has just crossed the line is out of
       the rotation before it is handed the next one. */
    partnerHealth.recordHandoff(rotatedSite.id)
      .then(() => SiteConfig.getValue('partnerExperience', null))
      .then((fresh) => (fresh ? partnerHealth.sweep(fresh) : null))
      .catch((err) => console.error('[partner-health] hand-off bookkeeping failed:', err.message));

    const redirectUrl = new URL(matchedRoute.url);
    redirectUrl.searchParams.set(tokenData.param, tokenData.token);
    /* url stays exactly as it was — every existing caller redirects to it and
       none of them change. token and tokenParam are returned ALONGSIDE it for
       the embedded checkout, which delivers the token in a POST body so the
       frame's URL can be bare. Recovering it by re-parsing the URL would work
       today and break silently the day the param is renamed. */
    return {
      url: redirectUrl.toString(),
      token: tokenData.token,
      tokenParam: tokenData.param,
      /* Which site actually served this checkout. Recorded on the order so
         the rotation can be audited after the fact — a cycle you cannot
         check is a cycle you have to take on trust, and every way it can go
         wrong looks like a working checkout that simply favours one host. */
      partnerSiteId: rotatedSite ? rotatedSite.id : null,
      partnerSiteName: matchedRoute.label || null,
      market: market.id,
      currency: chosen.currency,
    };
  } catch (err) {
    console.error('Partner checkout error:', err.message);
    return null;
  }
}

/* ── API: Partner Experience Checkout Brokering ──────────── */
router.post('/api/checkout/partner', async (req, res) => {
  const { slug, quantity } = req.body;
  let qty = Math.max(1, parseInt(quantity) || 1);

  const limitProduct = await Product.findOne({ slug }).lean();
  if (limitProduct) qty = orderCap.clamp(limitProduct, qty);


  // THROUGH STEP 1, NOT STRAIGHT TO THE PAYMENT HOST. This used to resolve
  // the partner URL here and redirect to it. That worked while the partner
  // page carried its own information form; it is the payment step and
  // nothing else now, so the same redirect would take money for an order
  // with no name and nowhere to ship it. Step 1 asks, stores the details
  // against the session, and hands off from there — routes/checkoutFlow.js.
  try {
    const checkoutId = trackCheckoutReached(req, qty, 'two_step_checkout', slug);
    const sessionService = require('../services/checkout/session');
    const started = await sessionService.start(slug, qty, {
      checkoutId,
      market: (req.market && req.market.id) || undefined,
      userAgent: req.get('User-Agent') || '',
      ip: req.ip,
    });
    if (started.ok) return res.redirect(303, markets.path(req.market || markets.defaultMarket(), `/checkout/${started.token}`));
  } catch (err) {
    console.error('[api/checkout/partner] two-step start failed:', err.message);
  }
  return checkoutUnavailable(res, slug);
});

/* ── API: Checkout Funnel Beacon ──────────────────────────── */
// Called by the actual checkout page (a tiny beacon in NorthbridgeAI's
// server/experiences/partner.html, and any future site built the same way)
// at each step of the checkout, carrying the zcid handed out by
// trackCheckoutReached() above. Originally just "did the page load at all"
// (the gap between "Checkouts" and this told us about redirects dying in
// transit — closed tab, blocked pop-up, network drop). Extended with an
// optional `step` so the SAME beacon can report further into the funnel:
// did they get past the info form, did Whop's payment iframe actually
// render for them, or did it time out. Every step shares the same
// checkoutId as the arrival event, so a dashboard can join them into one
// per-visit timeline instead of two opaque totals with a gap in between.
// `step` absent -> 'arrived' (the original, unchanged behavior — nothing
// calling this without `step` needs to change).
// A 1x1 GIF response (not JSON) so this also works as a plain <img> beacon
// from any checkout page, not just ones that can do a CORS fetch.
const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');
const CHECKOUT_STEP_TYPES = {
  arrived: 'checkout_arrived',
  form_completed: 'checkout_form_completed',
  payment_shown: 'checkout_payment_shown',
  payment_failed: 'checkout_payment_failed',
  no_pooled_email: 'checkout_no_pooled_email',
  // Fired server-side by the host itself (see models/Event.js) — no browser
  // involvement, so it's a reliable signal independent of checkout_arrived.
  token_failed: 'checkout_token_failed',
  // Fired by partner.html's verifyWhopEmail() when Whop's embedded checkout
  // ended up with an email other than the pooled one we prefilled it with,
  // and the page corrected it via Whop's setEmail API. Should be rare/never.
  email_mismatch_corrected: 'checkout_email_mismatch_corrected',
};
router.get('/api/checkout/confirm-arrival', (req, res) => {
  const { zcid, step } = req.query;
  const eventType = CHECKOUT_STEP_TYPES[step] || CHECKOUT_STEP_TYPES.arrived;
  if (zcid) {
    Event.create({
      type: eventType,
      checkoutId: String(zcid),
      page: (req.get && req.get('Referer')) || '',
      ip: req.ip,
      userAgent: req.get ? req.get('User-Agent') : '',
    }).catch(() => {});
  }
  res.set('Cache-Control', 'no-store');
  res.set('Content-Type', 'image/gif');
  res.status(200).send(TRANSPARENT_GIF);
});

/* ── Partner host: payment recorded (server-to-server) ─────
 * Partner hosts call this the instant Whop confirms a payment, straight
 * from their server, with no browser involved.
 *
 * They used to call /thank-you instead, which runs the full order
 * pipeline. That made an Order creatable by a host's server alone, so
 * "there is an order in the admin" did NOT mean the customer ever saw our
 * confirmation page — it only meant a payment happened somewhere. Orders
 * are now created by exactly one thing: a real browser arriving at
 * /thank-you with a valid signature. This endpoint records the payment
 * instead, so nothing is lost when that arrival never happens.
 *
 * The signature is verified with the same shared secret and the same
 * verifier /thank-you uses, so an unsigned or tampered call writes
 * nothing. Responds 200 to a valid call and 202 to an invalid one on
 * purpose: this is a fire-and-forget notification from a server that
 * cannot act on an error anyway, and a non-2xx would just fill the host's
 * logs with noise. The real signal is the warn line below.
 */
router.post('/api/checkout/payment-recorded', express.json({ limit: '32kb' }), async (req, res) => {
  const payload = (req.body && typeof req.body === 'object') ? req.body : {};
  const orderId = typeof payload.order_id === 'string' ? payload.order_id.trim() : '';

  const verification = verifySignature(payload, process.env.THANK_YOU_SIGNING_SECRET);
  if (!verification.valid) {
    console.warn(`[payment-recorded] rejected (${verification.reason}) for order_id=${orderId || '(none)'}`);
    return res.status(202).json({ recorded: false, reason: verification.reason });
  }
  if (!orderId) {
    console.warn('[payment-recorded] signed payload carried no order_id');
    return res.status(202).json({ recorded: false, reason: 'missing_order_id' });
  }

  try {
    /* $setOnInsert only: a retry, or the host calling twice, must never
     * overwrite what was recorded the first time, and must never clear a
     * resolvedOrderId that /thank-you has since written. */
    await PendingPayment.updateOne(
      { orderId },
      {
        $setOnInsert: {
          orderId,
          store: payload.store || '',
          customerEmail: payload.email || '',
          customerName: [payload.first_name, payload.last_name].filter(Boolean).join(' ').trim(),
          productName: payload.product || '',
          productSlug: payload.product_slug || '',
          price: payload.price || '',
          currency: payload.currency || 'USD',
          quantity: payload.quantity || '1',
          paymentProvider: payload.payment_provider || '',
          paymentId: payload.payment_id || '',
          payload,
        },
      },
      { upsert: true }
    );

    /* THE PAYMENT CLOSES THE CHECKOUT, whether or not an order follows.
     *
     * This used to be done only by the order pipeline, which runs on
     * /thank-you — so a customer who paid and closed the tab stayed
     * 'abandoned' forever: counted against conversion in the funnel, listed
     * as an abandoned checkout in the admin, and queued for the recovery
     * sequence. They had paid. Recovery's own pre-send gate now reads
     * PendingPayment too, so this is the second of two independent guards
     * rather than the only one; both exist because mailing a paying
     * customer "you left something behind" is unrecoverable.
     *
     * Matched on the zcid the payment carried and, failing that, on the
     * address — the same pair the order pipeline uses, and for the same
     * reason: in pooled-email mode the address on the payment is the pooled
     * one, not what the customer typed at Step 1.
     *
     * Awaited rather than fired and forgotten: the host is not waiting on
     * anything that matters and a lost write here is what the whole change
     * is about. Failures are logged and still answer 200 — the payment
     * itself was recorded above, which is the part that must not be retried
     * into a duplicate. */
    try {
      const zcid = typeof payload.zcid === 'string' ? payload.zcid.trim() : '';
      const email = typeof payload.email === 'string' ? payload.email.toLowerCase().trim() : '';
      if (zcid || email) {
        /* Just "paid". NOT "confirmation page not reached", which is what
           this said first and was wrong on almost every order: this call
           runs server-to-server the instant Whop settles, which is BEFORE
           the customer's browser gets to /thank-you, so at this moment
           whether they arrive is simply not known yet. The pipeline's own
           markRecovered would say "payment completed", but it only matches
           rows still active or abandoned — this one has already closed the
           row, so the first note is the one that sticks.

           Whether the confirmation was actually reached is answered by
           PendingPayment.resolvedOrderId, which is the record that exists
           to answer it. This note should not guess at it. */
        await abandonedCheckoutService.markRecovered({
          checkoutId: zcid,
          email,
          orderId,
          note: 'paid',
        });

        const CheckoutSession = require('../models/CheckoutSession');
        const or = [];
        if (zcid) or.push({ checkoutId: zcid });
        if (email) or.push({ email });
        await CheckoutSession.updateMany(
          { $or: or, status: { $nin: ['paid', 'expired', 'cancelled'] } },
          { $set: { status: 'paid', orderId, paidAt: new Date(), lastActivityAt: new Date() } }
        );
      }
    } catch (err) {
      console.error(`[payment-recorded] could not close checkout for ${orderId}:`, err.message);
    }

    return res.status(200).json({ recorded: true });
  } catch (err) {
    console.error(`[payment-recorded] failed to record ${orderId}:`, err.message);
    return res.status(202).json({ recorded: false, reason: 'server_error' });
  }
});

/* ── Product Page ──────────────────────────────────────── */
/**
 * The words of a slug, sorted — its identity regardless of arrangement.
 *
 * "a-b-c" and "c-a-b" share a signature; "a-b" and "a-b-b" do not, because
 * the count of each word matters. Used only to recognise a slug that was
 * rebuilt from the same product title in a different order.
 */
/**
 * Sentences the import wrote into stored descriptions that are stated
 * live elsewhere on the page, from the product's current data: the pack
 * price ("Sold in packs of 4: 4 units for $149.97, $37.49 each.") and the
 * preorder status ("Preorder. Expected release 2026-11-06; ships on
 * release day ..."). Stored copies go stale the day the price or the
 * status changes, and then contradict the page around them.
 */
function cleanDescription(html) {
  return String(html)
    .replace(/<p>\s*Sold in packs of \d+:[^<]*<\/p>/g, '')
    .replace(/\s*Sold in packs of \d+:[^.]*\$[\d.,]+[^.]*\./g, '')
    .replace(/<p>\s*Preorder\.[^<]*<\/p>/g, '')
    .replace(/\s*Preorder\. Expected release[^<]*?(full refund any time before dispatch\.|dispatch\.)/g, '');
}

function slugSignature(slug) {
  return String(slug || '').toLowerCase().split('-').filter(Boolean).sort().join('-');
}

router.get('/products/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).lean();

    /* A slug this product used to have. Renaming one silently kills the
       old URL — it 404s, whatever it ranked for is lost, and every link
       built to it is wasted. A 301 hands all of that to the current
       address instead.

       Checked only AFTER the current slug misses, so a live product can
       never be shadowed by another product's history. 301 rather than
       302 because the move is permanent: a temporary redirect tells
       Google to keep the old URL indexed and pass nothing along. */
    if (!product) {
      const renamed = await Product.findOne({ previousSlugs: req.params.slug })
        .select('slug').lean();
      if (renamed && renamed.slug !== req.params.slug) {
        return res.redirect(301, withQuery(req, `/products/${renamed.slug}`));
      }

      /* Renames that happened before the history above existed, listed in
         config/redirects.js so shipping them is the whole job — no script
         run against production, no separate step to forget.

         The target is CHECKED before redirecting. Bouncing a visitor to a
         second dead page is worse than an honest 404, for a person and for
         a crawler, so a stale entry here degrades to a 404 rather than to
         a redirect chain that ends in nothing. */
      const moved = productRedirects[req.params.slug];
      if (moved && moved !== req.params.slug && (await Product.exists({ slug: moved }))) {
        return res.redirect(301, withQuery(req, `/products/${moved}`));
      }

      /* LAST RESORT: THE SAME WORDS IN A DIFFERENT ORDER.
       *
       * Nearly every accidental duplicate URL on this store is one slug
       * reordered — "…-warriors-booster-box-op-17-preorder" against
       * "…-op-17-…-warriors-booster-box-preorder". Both were built from
       * the same title, so they carry an identical multiset of words and
       * differ only in arrangement. Listing every permutation by hand is
       * hopeless; comparing the sorted words finds them all.
       *
       * DETERMINISTIC, NOT FUZZY. The word bags must match EXACTLY — same
       * words, same number of each — and exactly one product may match. A
       * near miss redirects nowhere, because sending a customer to the
       * wrong product is far worse than a 404.
       *
       * Runs only on the path that was about to 404, so normal traffic
       * never pays for it, and it reads one indexed field. */
      const wanted = slugSignature(req.params.slug);
      const candidates = await Product.find({}, { slug: 1 }).lean();
      const matches = candidates.filter(
        (p) => p.slug !== req.params.slug && slugSignature(p.slug) === wanted
      );
      if (matches.length === 1) {
        return res.redirect(301, withQuery(req, `/products/${matches[0].slug}`));
      }

      return notFound(res);
    }

    // Related products (same collection, excluding current)
    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      collections: { $in: product.collections || [] },
      available: true,
    }).limit(4).lean();

    /* The other boxes of the same item — Day against Night, say.
     *
     * Read on the product page rather than joined into the query above
     * because they are not "related products": a shopper who wants the
     * Night box is not being offered an alternative, they are choosing
     * which one of one product to buy, and the two belong in different
     * places on the page.
     *
     * Unavailable siblings are KEPT. A sold-out Day box that vanishes from
     * the switcher tells the shopper the choice never existed, and they
     * are left wondering whether they are on the right listing; shown and
     * marked sold out, the page answers the question it raised.
     *
     * Skipped entirely for an ungrouped product, so the ordinary catalogue
     * pays nothing for this. */
    const variantSiblings = variants.isGrouped(product)
      ? variants.sortSiblings(
        await Product.find(variants.siblingQuery(product))
          .select('slug title imageUrl images variantName variantOrder available price')
          .lean()
      )
      : [];

    /* Composed once, used by the heading, the tab title, the meta
       description, the Open Graph tags and the structured data — so a
       variant cannot be named one thing on the page and another in the
       snippet Google renders from it. */
    const variantTitle = variants.displayTitle(product);

    /* Track view. This is now the ONLY place a view_product event is
     * written; the duplicate client-side fetch in public/js/gogetcards.js was
     * removed, so the admin "top products" report no longer counts each
     * real view twice. Crawlers are excluded with the same test the
     * visitor middleware uses, otherwise the surviving server-side write
     * would inflate on bot traffic in a way the old client-side one did
     * not. */
    const ua = req.get('User-Agent') || '';
    if (!/bot|spider|crawl|github|slack|twitter|facebook|preview|lighthouse/i.test(ua)) {
      Event.create({
        type: 'view_product',
        productSlug: product.slug,
        market: (req.market && req.market.id) || 'US',
        page: req.path,
        sessionId: req.sessionID,
        ip: req.ip,
        userAgent: ua,
      }).catch(() => {});
    }

    /* Structured data. The previous Product node was missing several
     * fields Google needs before it will show a rich result, and there
     * was no BreadcrumbList at all despite the page rendering a visible
     * breadcrumb — so the trail never appeared in search results.
     *
     * Deliberately NOT emitted: aggregateRating / review. This store has
     * no review system, and inventing ratings to win stars in the SERP is
     * both a structured-data spam violation (Google will issue a manual
     * action) and, for a US retailer, an FTC violation. Add it when real
     * reviews exist. */
    const origin = site.origin();
    /* ── The market this URL is ─────────────────────────────────────────
       req.market comes from the path prefix and nothing else, so the
       price below is the same for every visitor and for every crawler
       that fetches this URL. See services/market for why that property
       is the whole design rather than a nicety. */
    const market = req.market || markets.defaultMarket();
    const priced = marketService.priceFor(product, market);
    /* NOT SOLD HERE IS A 404, not a fallback to US dollars. A `/ca/`
       URL quoting US$ would be precisely the mismatch this prevents. */
    if (!priced) {
      return notFound(res);
    }
    const productUrl = `${origin}${markets.path(market, `/products/${product.slug}`)}`;
    /* Self-canonical per market, and an hreflang cluster across only the
       markets that genuinely price this product — an alternate pointing
       at a URL that 404s makes Google drop the whole set. x-default is
       the US page, which is where an unmatched locale should land. */
    /* ONE ENTRY PER COUNTRY, NOT PER STOREFRONT. The euro market serves
       six countries from one URL, so it emits `en-DE`, `en-NL`, `en-IE`
       and the rest all pointing at that same `/eu/` page. Several
       hreflang values resolving to one URL is correct and is exactly how
       a shared-language, shared-currency region is expressed — the
       alternative, a URL per country, would be six identical pages for
       Google to pick between. */
    const marketAlternates = marketService
      .alternatesFor(product, req.sellableMarkets || [market])
      .flatMap((m) => {
        const href = `${origin}${markets.path(m, `/products/${product.slug}`)}`;
        return (m.countries || []).map((cc) => ({ locale: `${m.language}-${cc}`, href }));
      });
    const productImages = [product.imageUrl, ...(product.images || [])].filter(Boolean).map((u) => productImage.at(u, 1200));
    /* A pack-sold product is pictured as the pack, on the page as in the
       ad: the composite leads the gallery, the JSON-LD image list and the
       share image; the single photo stays as the second picture. */
    const packImage = require('../services/multipackImage').urlFor(product, site.origin());
    if (packImage) productImages.unshift(packImage);
    const cleanDesc = product.description
      ? cleanDescription(product.description).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500)
      : `${variantTitle}. Factory sealed, sourced through authorized distribution.`;

    /* Availability, and the two dates that qualify it.
     *
     * The comment here used to say a preorder is only valid to advertise
     * up to its release, then computed a flat rolling year regardless — so
     * a preorder releasing next month advertised a price guaranteed for a
     * year, which is neither true nor what the store promises.
     *
     * availabilityDate is separately required: Merchant Center accepts a
     * preorder only when the listing states WHEN the item becomes
     * available. Without it an unreleased product is indistinguishable
     * from an in-stock one, which is the availability misrepresentation
     * that suspends accounts rather than disapproving items. */
    const rel = preorderCfg.releaseInfo(product);
    /* An ACTIVE preorder (flagged AND not yet released) shows the preorder
       strip. The moment the release date passes the product is in stock, so
       the strip and the preorder price-validity window disappear on their
       own, with no restock and no untick needed. */
    const isPreorderItem = preorderCfg.isActivePreorder(product);
    const oneYearOut = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    /* availabilityDate is required for schema.org PreOrder and BackOrder and
       must never appear on an in-stock item. Driven off the derived state
       (which advances by the calendar), not the raw flag. */
    const availState = preorderCfg.availabilityState(product);
    const availIso = (availState === 'PREORDER' || availState === 'BACKORDER')
      ? preorderCfg.expectedAvailability(product)
      : null;
    const priceValidUntil = (availIso && new Date(availIso) < oneYearOut)
      ? availIso
      : oneYearOut.toISOString().split('T')[0];

    /* in_stock / preorder / backorder / out_of_stock, decided once in
       config/preorder.js so the schema matches the feed and the page. A
       released-but-still-flagged product is schema.org/BackOrder. */
    const availability = preorderCfg.schemaAvailability(product);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          '@id': `${productUrl}#breadcrumb`,
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
            { '@type': 'ListItem', position: 2, name: 'Shop', item: `${origin}/collection/all` },
            { '@type': 'ListItem', position: 3, name: variantTitle },
          ],
        },
        {
          '@type': 'Product',
          '@id': `${productUrl}#product`,
          name: variantTitle,
          description: cleanDesc,
          /* The variant group, in schema.org's terms. Google cross-checks
             the landing page against the feed, and a page that does not
             say it belongs to a group while the feed sends an
             item_group_id is the two disagreeing about the same product.
             Emitted only for a grouped product. */
          ...(variants.isGrouped(product)
            ? {
              inProductGroupWithID: variants.groupIdOf(product),
              /* The attribute that tells this box apart from its sibling,
                 under the same name the feed uses. schema.org defines
                 color, pattern, material and size on Product, which is
                 exactly the set Google accepts as variant attributes, so
                 the axis maps across without translation. */
              [variants.axisOf(product)]: variants.nameOf(product),
            }
            : {}),
          image: productImages.length ? productImages : undefined,
          /* Brand is the manufacturer, which is what Google matches
             against its catalogue. It fell back to "GoGetCards" — the
             shop — whenever vendor was blank, telling Google this store
             manufactures Pokemon booster boxes. */
          brand: { '@type': 'Brand', name: product.brand || product.vendor || undefined },
          /* Identifiers, each emitted ONLY when set: Google validates a
             GTIN's check digit and resolves it against the real product,
             so a placeholder is a Misrepresentation finding rather than a
             missing-field warning. sku was the URL slug before, which is
             not an identifier anyone can reconcile against stock. */
          ...(product.sku ? { sku: product.sku } : {}),
          /* GTIN, under BOTH the generic property and the length-specific
             one. schema.org added the general `gtin` later; Google's own
             structured-data documentation still enumerates gtin8, gtin12,
             gtin13 and gtin14, and several validators only look for those.
             Emitting the pair costs nothing and is read by everything.
             The length decides which: 13 digits is an EAN, 12 a UPC, 14 an
             ITF-14 case code, 8 an EAN-8. */
          ...gtinProperties(product.gtin),
          ...(product.mpn ? { mpn: product.mpn } : {}),
          productID: product.sku || product.slug,
          ...(product.language || product.edition || product.setCode ? {
            additionalProperty: [
              product.language && { '@type': 'PropertyValue', name: 'Language', value: product.language },
              product.edition && { '@type': 'PropertyValue', name: 'Edition', value: product.edition },
              product.setCode && { '@type': 'PropertyValue', name: 'Set code', value: product.setCode },
              { '@type': 'PropertyValue', name: 'Condition', value: 'Factory sealed' },
            ].filter(Boolean),
          } : {}),
          category: product.productType || undefined,
          url: productUrl,
          offers: {
            '@type': 'Offer',
            '@id': `${productUrl}#offer`,
            url: productUrl,
            /* THE SAME NUMBERS THE PAGE PRINTS AND THE FEED SUBMITS.
               All three read marketService.priceFor, so a Canadian page
               cannot say CA$189.99 while its Offer says 139.99 USD —
               which is the single comparison a price-mismatch
               disapproval performs. JPY has no minor unit, so the
               divisor comes from the currency, not a hardcoded 100. */
            price: markets.currency(priced.currency).decimals === 0
              ? String(Math.round(priced.amount))
              : (priced.amount / 100).toFixed(2),
            priceCurrency: priced.currency,
            priceValidUntil,
            itemCondition: 'https://schema.org/NewCondition',
            availability,
            /* Emitted only for a preorder that states a real release date.
               Asserting an availabilityDate we do not have would be worse
               than omitting it: it becomes a date the store is held to.
               `preorderShips` ("Q2 2026") is deliberately not used here —
               it is not a date. */
            ...(availIso ? { availabilityStarts: availIso, availabilityDate: availIso } : {}),
            seller: { '@type': 'Organization', '@id': `${origin}/#organization`, name: 'GoGetCards' },
            // Driven by config/shipping.js, which the announcement bar
            // reads too. Previously hardcoded '0' for every product, so a
            // $20 item advertised free shipping while the site's own copy
            // said free only over $150.
            shippingDetails: shipping.shippingDetailsFor(),
            /* Return policy. Three changes from the version that shipped:
               the window is read from config/faq.js so the page copy, the
               FAQ answer and this markup state one number;
               returnPolicyCountry is set, because Google warns without it
               and applicableCountry alone does not satisfy the check; and
               returnFees follows config/faq's FREE_RETURNS rather than
               being hardcoded. It once claimed FreeReturn while a change
               of mind was the customer's postage, which was untrue; it
               then said ReturnShippingFees. The store now covers postage
               on every return, so FreeReturn is accurate again — and it
               is derived, so it cannot outlive the policy a second time. */
            hasMerchantReturnPolicy: {
              '@type': 'MerchantReturnPolicy',
              '@id': `${origin}/#returnpolicy`,
              /* Every market the feed serves, not only the country the
                 business trades from. Merchant Center now holds a return
                 policy for Canada as well as the US, and this markup is on
                 the page Google fetches while reviewing a Canadian listing —
                 US-only here is the two of them describing the same policy
                 differently. Read from config/distribution so opening a
                 market updates the feed and the markup together.

                 returnPolicyCountry stays single and stays the business
                 country: it is where the parcel goes back TO, which does not
                 change when a new market opens. */
              applicableCountry: distributionCfg.defaults.targetCountries
                || [company.business.countryCode || 'US'],
              returnPolicyCountry: company.business.countryCode || 'US',
              returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
              merchantReturnDays: faqConfig.RETURN_WINDOW_DAYS,
              returnMethod: 'https://schema.org/ReturnByMail',
              returnFees: faqConfig.FREE_RETURNS
                ? 'https://schema.org/FreeReturn'
                : 'https://schema.org/ReturnShippingFees',
              /* Money back to the original card, never store credit unless
                 asked: refund-policy page, "Refunds". Google lists this as
                 a recommended property and reads its absence as unknown. */
              refundType: 'https://schema.org/FullRefund',
              /* The canonical URL, not /page/refund-policy, which only 301s
                 here. Merchant Center compares this link with the policy URL
                 filed in the account; they should be the same string, and a
                 redirect hop is one more thing to go wrong on a fetch. */
              merchantReturnLink: `${origin}/refund-policy`,
            },
          },
        },
      ],
    };
    const partnerExperience = await SiteConfig.getValue('partnerExperience', { enabled: false, targetProductSlugs: '' });

    /* THE HIGHEST QUANTITY ANYTHING CAN ACTUALLY CHARGE FOR.
     *
     * A partner site sells a ladder of twelve steps, so a product costing
     * seven of them can only be bought one at a time — there is no plan at
     * step fourteen. Offering two was the bug: the stepper allowed it, the
     * checkout could find no plan, and the buyer fell through to the Shopify
     * path and met "Product Resolution Failed". A dead end that is reachable
     * from the Buy button is worse than a lower limit.
     *
     * Zero means no partner serves this product, in which case the existing
     * limit is left exactly as it was — this only ever tightens, and only
     * for products a partner is actually going to handle. */
    const partnerMaxQty = partnerExperience && partnerExperience.enabled
      ? partnerRotation.maxQuantityAcross(partnerExperience, product,
          { amount: priced.amount, market: market.id })
      : 0;
    /* The order cap (helpers/orderCap: no line above $1,199.76, the top of
       the ladder) already includes the product's own allocation limit. */
    const allocationLimit = orderCap.maxQuantity(product, priced.amount);
    const buyLimit = partnerMaxQty > 0
      ? (allocationLimit > 0 ? Math.min(allocationLimit, partnerMaxQty) : partnerMaxQty)
      : allocationLimit;

    /* The case for this box, or the box for this case (services/caseOffer).
       Candidates are the live products of the same line; the pairing is by
       set code or title, and null when nothing matches cleanly. Priced in
       the shopper's market, and dropped when the pair is not sold there. */
    let caseOffer = null;
    try {
      const lineCollections = (product.collections || []).filter((c) => c && c !== 'preorders');
      if (lineCollections.length) {
        const candidates = await Product.find({
          _id: { $ne: product._id },
          available: true,
          collections: { $in: lineCollections },
          /* A box looks for cases (or anything sharing its set code); a
             case looks among every live product of its line. */
          ...(caseOfferService.isCase(product) ? {} : {
            $or: [
              { productType: /\bcase\b/i },
              { title: /\bcase\b/i },
              ...(product.setCode ? [{ setCode: String(product.setCode) }] : []),
            ],
          }),
        }).select('title slug price productType specs setCode imageUrl images available marketPrices').limit(60).lean();
        const pair = caseOfferService.pairFor(product, candidates);
        if (pair) {
          const pairPriced = marketService.priceFor(pair.product, market);
          if (pairPriced) caseOffer = { ...pair, priced: pairPriced };
        }
      }
    } catch (e) {
      console.error('caseOffer', e.message);
    }

    /* The import wrote the pack price into descriptions; it is rendered
       live from the price instead (and stripped from the feed the same way). */
    if (product.description) product.description = cleanDescription(product.description);
    renderPage(res, 'product', {
      caseOffer,
      pageTitle: variantTitle,
      /* Said "In Stock." for preorders too, so the snippet Google showed
         for an unreleased product advertised it as available now. The
         description a searcher reads is a product claim like any other. */
      metaDescription: `Buy ${variantTitle} from GoGetCards. ${
        !product.available ? 'Sold Out.'
          : isPreorderItem ? `${preorderCfg.shortLine(product)}.`
          : 'In Stock.'
      } Factory sealed, sourced through authorized distribution.`,
      ogType: 'product',
      ogImage: packImage || productImage.at(product.imageUrl || (product.images && product.images[0]) || '', 1200),
      packImage,
      /* A product with no photo is not a landing page worth indexing: the
         Product rich result needs an image, Merchant Center rejects the
         item, and a searcher who lands on it sees an empty frame. The page
         stays reachable and is indexed again the moment an image is set.
         The sitemap applies the same rule. */
      robotsOverride: (product.imageUrl || (product.images && product.images[0])) ? undefined : 'noindex, follow',
      product,
      priced,
      market,
      canonicalUrl: productUrl,
      marketAlternates,
      buyLimit,
      variantTitle,
      variantSiblings,
      relatedProducts,
      jsonLd,
      partnerExperience,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

/* ── Collection Page ───────────────────────────────────── */
router.get('/collection/:handle', async (req, res) => {
  try {
    const handle = req.params.handle;
    let query = {};
    let collectionTitle = 'All Products';
    let collectionDescription = '';
    let collectionHandle = handle;

    if (handle === 'all') {
      query = {};
    } else if (handle === 'preorders') {
      query = { preorder: true };
      collectionTitle = 'Preorders';
      collectionDescription = 'Lock in your price today. We ship directly from our distributor on release day.';
    } else {
      // Find by collection handle
      const col = await Collection.findOne({ handle }).lean();
      if (col) {
        query = { collections: handle };
        collectionTitle = col.name;
        collectionDescription = col.description || '';
      } else {
        /* Fallback: a tag used as a collection. ONLY when the tag exists.
           Without this check /collection/<anything-at-all> rendered an
           empty, indexable, self-canonical page with a 200 status — a
           soft 404 for every misspelt or invented handle, and an
           unbounded set of junk URLs for a crawler to spend budget on. */
        if (!(await Product.exists({ tags: handle }))) {
          return notFound(res);
        }
        query = { tags: handle };
        collectionTitle = handle.charAt(0).toUpperCase() + handle.slice(1);
      }
    }

    /* Search.
     *
     * The sitewide WebSite schema in layout.ejs has always advertised a
     * SearchAction targeting /collection/all?q={search_term_string}, and
     * nothing read `q` — so the sitelinks search box Google can render
     * from that markup returned the entire unfiltered catalogue for every
     * term. Structured data promising a capability the site does not have
     * is the same class of problem as a fake review snippet.
     *
     * Escaped before it reaches the regex: an unescaped user string in a
     * $regex is a denial-of-service vector (a pattern like "(a+)+$" makes
     * the engine backtrack forever) as well as a correctness bug for any
     * term containing a dot or a plus. */
    const rawQuery = String(req.query.q || '').trim().slice(0, 80);
    if (rawQuery) {
      const safe = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(safe, 'i');
      query = { ...query, $or: [{ title: rx }, { vendor: rx }, { productType: rx }, { tags: rx }, { setCode: rx }] };
      collectionTitle = `Search: ${rawQuery}`;
      collectionDescription = '';
    }

    /* ── Filters ──────────────────────────────────────────────────
       Facets are counted on the UNFILTERED collection (plus any search
       term), so a buyer sees "Booster Box (19)" whether or not Booster
       Box is already ticked, and can always see what else is there. The
       filters then narrow the product query. Every value arriving from
       the URL is matched against the facet it came from, so nothing a
       buyer types reaches the database as anything but a known string. */
    const PRICE_BANDS = [
      { id: 'under-100', label: 'Under $100', min: 0, max: 10000 },
      { id: '100-250', label: '$100 to $250', min: 10000, max: 25000 },
      { id: '250-500', label: '$250 to $500', min: 25000, max: 50000 },
      { id: 'over-500', label: '$500 and up', min: 50000, max: Infinity },
    ];
    const lineHandles = catalog.handles();
    const onLinePage = lineHandles.includes(collectionHandle);
    const facetRows = (await Product.aggregate([
      { $match: query },
      { $facet: {
        type: [{ $match: { productType: { $nin: ['', null] } } }, { $group: { _id: '$productType', n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 24 }],
        lang: [{ $match: { language: { $nin: ['', null] } } }, { $group: { _id: '$language', n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }],
        line: [{ $unwind: '$collections' }, { $match: { collections: { $in: lineHandles } } }, { $group: { _id: '$collections', n: { $sum: 1 } } }],
        avail: [{ $group: { _id: { $cond: ['$preorder', 'preorder', { $cond: [{ $eq: ['$available', true] }, 'in-stock', 'sold-out'] }] }, n: { $sum: 1 } } }],
        price: [{ $group: { _id: null, prices: { $push: '$price' } } }],
      } },
    ]))[0] || {};
    const prices = ((facetRows.price || [])[0] || {}).prices || [];
    const facets = {
      avail: [
        { id: 'in-stock', label: 'In stock', n: ((facetRows.avail || []).find((r) => r._id === 'in-stock') || {}).n || 0 },
        { id: 'preorder', label: 'Preorder', n: ((facetRows.avail || []).find((r) => r._id === 'preorder') || {}).n || 0 },
      ].filter((f) => f.n > 0),
      line: onLinePage ? [] : lineHandles.map((h) => ({ id: h, label: (catalog.byHandle(h) || {}).shortName || h, n: ((facetRows.line || []).find((r) => r._id === h) || {}).n || 0 })).filter((f) => f.n > 0),
      type: (facetRows.type || []).map((r) => ({ id: r._id, label: r._id, n: r.n })),
      lang: (facetRows.lang || []).map((r) => ({ id: r._id, label: r._id, n: r.n })),
      price: PRICE_BANDS.map((b) => ({ id: b.id, label: b.label, n: prices.filter((p) => p >= b.min && p < b.max).length })).filter((f) => f.n > 0),
    };
    /* Language is a filter only when there is something to choose. */
    if (facets.lang.length < 2) facets.lang = [];

    const pick = (key, allowed) => String(req.query[key] || '').split(',').map((s) => s.trim()).filter((v) => v && allowed.some((f) => f.id === v));
    const filters = {
      avail: pick('avail', facets.avail).slice(0, 1),
      line: pick('line', facets.line),
      type: pick('type', facets.type),
      lang: pick('lang', facets.lang),
      price: pick('price', facets.price).slice(0, 1),
    };
    const clauses = [];
    if (filters.avail[0] === 'in-stock') clauses.push({ preorder: { $ne: true }, available: true });
    if (filters.avail[0] === 'preorder') clauses.push({ preorder: true });
    if (filters.line.length) clauses.push({ collections: { $in: filters.line } });
    if (filters.type.length) clauses.push({ productType: { $in: filters.type } });
    if (filters.lang.length) clauses.push({ language: { $in: filters.lang } });
    if (filters.price[0]) {
      const b = PRICE_BANDS.find((x) => x.id === filters.price[0]);
      clauses.push({ price: { $gte: b.min, ...(Number.isFinite(b.max) ? { $lt: b.max } : {}) } });
    }
    if (clauses.length) query = { $and: [query, ...clauses] };
    const activeFilterCount = Object.values(filters).reduce((n, v) => n + v.length, 0);

    // Sort
    let sortObj = { featured: -1, createdAt: -1 };
    const sort = req.query.sort || 'featured';
    if (sort === 'price-asc') sortObj = { price: 1 };
    else if (sort === 'price-desc') sortObj = { price: -1 };
    else if (sort === 'title-asc') sortObj = { title: 1 };
    else if (sort === 'newest') sortObj = { createdAt: -1 };

    /* Pagination. This query had no limit at all: every collection page
     * fetched and rendered the entire matching catalogue in one response.
     * That is fine at a few dozen products and becomes a slow query, a
     * huge HTML payload and a bad Largest Contentful Paint the moment the
     * catalogue grows, which is exactly when these pages start to matter
     * for search. 24 keeps the grid a whole number of rows at 2, 3 and 4
     * columns. */
    const PER_PAGE = 24;
    const requestedPage = parseInt(req.query.page, 10);
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalProducts / PER_PAGE));
    const page = Math.min(Math.max(1, isNaN(requestedPage) ? 1 : requestedPage), totalPages);

    const products = await Product.find(query)
      .sort(sortObj)
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .lean();

    /* Sorted views are the same products reordered, and they are
     * consolidated by ONE mechanism: the query-free rel=canonical set in
     * server.js. An earlier pass also added robots.txt "Disallow: /*?sort="
     * plus a noindex on these views — both wrong alongside a canonical. A
     * disallowed URL is never fetched, so a noindex on it can never be
     * read; and noindex combined with a canonical pointing elsewhere is
     * contradictory signalling. The canonical alone is correct and lets
     * crawlers keep following the product links on these pages. */

    const origin = site.origin();
    const collectionUrl = `${origin}/collection/${collectionHandle}`;

    /* Unique page copy. Without this a collection page is a title plus a
     * product grid, which is thin content that competes with its own
     * product pages for the same queries. config/collectionContent.js
     * holds the text; handles with no entry render nothing rather than
     * boilerplate. */
    const content = require('../config/collectionContent').forHandle(collectionHandle);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          '@id': `${collectionUrl}#breadcrumb`,
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
            { '@type': 'ListItem', position: 2, name: collectionTitle },
          ],
        },
        {
          '@type': 'CollectionPage',
          '@id': `${collectionUrl}#collection`,
          url: collectionUrl,
          name: collectionTitle,
          description: collectionDescription || `Factory-sealed ${collectionTitle} from GoGetCards.`,
          isPartOf: { '@id': `${origin}/#website` },
          // The product set itself, so an answer engine can extract what
          // this page actually contains rather than guessing from copy.
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: totalProducts,
            // Positions are absolute across the whole collection, not
            // 1..24 restarting on every page, so the list reads as one
            // sequence rather than N conflicting lists.
            itemListElement: products.map((p, i) => ({
              '@type': 'ListItem',
              position: (page - 1) * PER_PAGE + i + 1,
              url: `${origin}/products/${p.slug}`,
              name: p.title,
            })),
          },
        },
      ],
    };

    /* FAQPage is emitted only when the questions are actually rendered on
     * the page, and only on page 1 so a paginated set does not declare the
     * same FAQ block N times. Marking up questions that a visitor cannot
     * see is a structured-data violation, not a shortcut. */
    if (content && content.faqs && content.faqs.length && page === 1) {
      jsonLd['@graph'].push({
        '@type': 'FAQPage',
        '@id': `${collectionUrl}#faq`,
        isPartOf: { '@id': `${collectionUrl}#collection` },
        mainEntity: content.faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      });
    }

    /* Paginated pages self-canonicalise. The sitewide canonical in
     * server.js strips the query string, which is right for ?sort= (same
     * products reordered) but wrong for ?page= (different products
     * entirely) — page 2 would have declared page 1 as its canonical and
     * told Google its own contents did not exist. */
    const pageUrl = page > 1 ? `${collectionUrl}?page=${page}` : collectionUrl;
    const paginationLinks = [];
    if (page > 1) paginationLinks.push({ rel: 'prev', href: page === 2 ? collectionUrl : `${collectionUrl}?page=${page - 1}` });
    if (page < totalPages) paginationLinks.push({ rel: 'next', href: `${collectionUrl}?page=${page + 1}` });

    const pageSuffix = page > 1 ? ` | Page ${page}` : '';

    /* Search-result views are noindex, follow.
     *
     * An indexable internal search page is thin, near-duplicate content
     * that multiplies without limit — one URL per term anyone ever
     * searches — and Google's own guidance is explicit that these should
     * stay out of the index. "follow" is deliberate: the product links on
     * the page are still worth crawling.
     *
     * The canonical also stays on the plain collection URL, since a search
     * view is a filtered subset of it rather than a page in its own
     * right. */
    const isSearch = !!rawQuery;

    /* One URL builder for every filter link and the pager, so a filter
       never drops the sort and a page link never drops the filters. */
    const filterHref = (over = {}) => {
      const next = { ...filters, ...over };
      const qs = [];
      if (rawQuery) qs.push('q=' + encodeURIComponent(rawQuery));
      for (const k of ['avail', 'line', 'type', 'lang', 'price']) {
        const v = Array.isArray(next[k]) ? next[k] : (next[k] ? [next[k]] : []);
        if (v.length) qs.push(k + '=' + v.map(encodeURIComponent).join(','));
      }
      if (sort && sort !== 'featured') qs.push('sort=' + encodeURIComponent(sort));
      if (over.page && over.page > 1) qs.push('page=' + over.page);
      return `/collection/${collectionHandle}` + (qs.length ? '?' + qs.join('&') : '');
    };
    /* Toggle one value in a multi-value facet, or set/clear a single one. */
    const toggleHref = (key, id) => {
      const current = filters[key];
      const single = key === 'avail' || key === 'price';
      const next = single ? (current[0] === id ? [] : [id]) : (current.includes(id) ? current.filter((v) => v !== id) : current.concat(id));
      return filterHref({ [key]: next });
    };

    renderPage(res, 'collection', {
      facets,
      filters,
      activeFilterCount,
      filterHref,
      toggleHref,
      pageTitle: isSearch
        ? `Search results for "${rawQuery}" | GoGetCards`
        : `${collectionTitle}${pageSuffix} | GoGetCards`,
      metaDescription: isSearch
        ? `${totalProducts} factory-sealed product${totalProducts === 1 ? '' : 's'} matching "${rawQuery}" at GoGetCards.`
        : (collectionDescription
          ? `${collectionDescription} ${totalProducts} factory-sealed products in stock at GoGetCards.`.substring(0, 158)
          : `Factory-sealed ${collectionTitle} booster boxes, cases and elite trainer boxes, sourced through authorized distribution. ${totalProducts} products at GoGetCards.`.substring(0, 158)),
      ...(isSearch ? { robotsOverride: 'noindex, follow' } : {}),
      canonicalUrl: isSearch ? collectionUrl : pageUrl,
      paginationLinks: isSearch ? [] : paginationLinks,
      searchQuery: rawQuery,
      collectionTitle,
      collectionDescription,
      collectionHandle,
      content,
      products,
      totalProducts,
      page,
      totalPages,
      perPage: PER_PAGE,
      sort,
      jsonLd,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

/* ── Legacy / mistyped product URL ─────────────────────────
 * The canonical product route is /products/:slug (plural). Several
 * templates linked to /product/:slug (singular) for a long time — the
 * cart drawer, the cart page, and the homepage preorder cards — so every
 * one of those links 404'd. The templates are fixed, but any of those
 * URLs already shared, bookmarked, or crawled would still be dead, so
 * this 301s them to the real page and passes the link equity along. */
router.get('/product/:slug', (req, res) => res.redirect(301, withQuery(req, `/products/${req.params.slug}`)));

/* ── Collections redirect ──────────────────────────────── */
// 301, not 302: these are permanent URL-shape decisions, and a temporary
// redirect tells Google to keep the old URL indexed and pass no equity.
// Matches the /product/:slug -> /products/:slug redirect above.
router.get('/shop', (req, res) => res.redirect(301, withQuery(req, '/collection/all')));
router.get('/collections', (req, res) => res.redirect(301, withQuery(req, '/collection/all')));
router.get('/collections/:handle', (req, res) => res.redirect(301, withQuery(req, `/collection/${req.params.handle}`)));

/* ── Shopify-era URLs ──────────────────────────────────────
 * This domain ran on Shopify before this app. Google's index, old ads,
 * marketplace listings and bookmarks still carry Shopify's URL shapes
 * (/pages/returns-refunds, /policies/shipping-policy,
 * /collections/x/products/y, /search, /account/login), and a Merchant
 * Center reviewer who follows one of them lands on a 404 instead of the
 * policy they came to read. Each shape is sent to the page that now holds
 * the same information. Only handles with a real destination redirect;
 * anything else stays an honest 404 rather than a guess. */
const SHOPIFY_PAGE_REDIRECTS = {
  'returns-refunds': '/refund-policy',
  'refund-policy': '/refund-policy',
  'return-policy': '/refund-policy',
  returns: '/refund-policy',
  refunds: '/refund-policy',
  'shipping-policy': '/shipping',
  shipping: '/shipping',
  'shipping-delivery': '/shipping',
  delivery: '/shipping',
  'pre-order-faq': '/preorder-policy',
  'preorder-faq': '/preorder-policy',
  'pre-order-policy': '/preorder-policy',
  'preorder-policy': '/preorder-policy',
  preorders: '/preorder-policy',
  'pre-orders': '/preorder-policy',
  about: '/about',
  'about-us': '/about',
  contact: '/contact',
  'contact-us': '/contact',
  'contact-information': '/contact',
  faq: '/faq',
  faqs: '/faq',
  'privacy-policy': '/privacy-policy',
  privacy: '/privacy-policy',
  'terms-of-service': '/terms-of-service',
  terms: '/terms-of-service',
  'terms-and-conditions': '/terms-of-service',
  'terms-conditions': '/terms-of-service',
  'legal-notice': '/disclaimer',
  'track-order': '/order-tracking',
  'track-your-order': '/order-tracking',
  tracking: '/order-tracking',
  authenticity: '/authenticity-guarantee',
};
function shopifyPageTarget(handle) {
  const h = String(handle || '').toLowerCase();
  if (SHOPIFY_PAGE_REDIRECTS[h]) return SHOPIFY_PAGE_REDIRECTS[h];
  if (trustPages.bySlug(h)) return `/${h}`; // same slug, served at top level now
  return null;
}
router.get(['/pages/:handle', '/policies/:handle'], (req, res, next) => {
  const target = shopifyPageTarget(req.params.handle);
  if (!target) return next();
  res.redirect(301, withQuery(req, target));
});
/* Shopify nests a product URL under the collection it was reached from
   (/collections/pokemon/products/x). The product is what matters. */
router.get('/collections/:handle/products/:slug', (req, res) => res.redirect(301, withQuery(req, `/products/${req.params.slug}`)));
/* Shopify's search and account entry points. Search lives on the
   catalogue page here and reads the same `q` parameter. */
router.get('/search', (req, res) => res.redirect(301, withQuery(req, '/collection/all')));
router.get(['/account/login', '/account/register'], (req, res) => res.redirect(301, '/account/sign-in'));

/* ── Cart Page ─────────────────────────────────────────── */
router.get('/cart', (req, res) => {
  renderPage(res, 'cart', {
    pageTitle: 'Shopping Cart | GoGetCards',
    metaDescription: 'Review your cart at GoGetCards.',
    robotsOverride: 'noindex, follow',
  });
});

/* ── About Page ────────────────────────────────────────── */
router.get('/about', (req, res) => {
  const origin = site.origin();
  renderPage(res, 'about', {
    pageTitle: 'About Us | GoGetCards',
    /* No longer promises a "team" section. That block is config-driven
       and renders nothing until config/company.js is filled in, so the
       old description advertised content a visitor would not find, which
       is the kind of mismatch that costs you the click on the next
       search. */
    metaDescription: 'How GoGetCards sources factory-sealed trading card product through authorized distribution, what we guarantee on every order, and the things we will not do.',
    jsonLd: (function () {
      /* AboutPage on top of the standard breadcrumb + WebPage graph, so the
         page is typed as what it is and points at the Organization entity
         rather than floating unattached. */
      const url = `${origin}/about`;
      const graph = breadcrumbGraph(origin, url, 'About GoGetCards')['@graph'];
      graph.push({
        '@type': 'AboutPage',
        '@id': `${url}#aboutpage`,
        url,
        name: 'About GoGetCards',
        mainEntity: { '@id': `${origin}/#organization` },
        isPartOf: { '@id': `${origin}/#website` },
        inLanguage: 'en-US',
      });
      return { '@context': 'https://schema.org', '@graph': graph };
    })(),
  });
});

/* ── Contact Page ──────────────────────────────────────── */

/* ContactPage + ContactPoint + FAQPage for /contact.
 *
 * Built as one graph rather than three script tags so the nodes can
 * reference each other. ContactPoint is what lets Google associate a
 * support address with the Organization entity instead of treating it as
 * loose text on a page, and FAQPage comes from config/faq.js — the same
 * array the accordion renders, because marked-up answers that differ from
 * the visible ones earn a manual action. */
function contactGraph(origin, url) {
  const b = company.business;
  const graph = breadcrumbGraph(origin, url, 'Contact GoGetCards')['@graph'];

  const contactPoint = {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: b.supportEmail,
    availableLanguage: ['English'],
    url,
  };
  if (b.phone) contactPoint.telephone = b.phone;
  if (b.countryCode) contactPoint.areaServed = b.countryCode;

  graph.push({
    '@type': 'ContactPage',
    '@id': `${url}#contactpage`,
    url,
    name: 'Contact GoGetCards',
    isPartOf: { '@id': `${origin}/#website` },
    about: { '@id': `${origin}/#organization` },
    inLanguage: 'en-US',
  });
  graph.push({
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    contactPoint: [contactPoint],
  });
  graph.push(faqConfig.faqSchema(url));

  return { '@context': 'https://schema.org', '@graph': graph };
}

/* Locals shared by the GET and both POST failure re-renders, so the three
 * cannot drift into rendering different versions of the same page. */
function contactLocals(origin, extra = {}) {
  return {
    pageTitle: 'Contact Us | GoGetCards',
    metaDescription: 'Contact GoGetCards about an order, a preorder release date, or stock availability. We reply within one business day.',
    jsonLd: contactGraph(origin, `${origin}/contact`),
    faqs: faqConfig.faqs(),
    sent: false,
    formError: '',
    formValues: {},
    /* Public by design — it is rendered into the page. */
    recaptchaSiteKey: recaptcha.SITE_KEY,
    ...extra,
  };
}

router.get('/contact', (req, res) => {
  const origin = site.origin();
  /* Named Discord and Instagram in the description before. Both are
     conditional on config/company.js's social links, which are unset, so
     the page does not offer them. Describing support channels that are not
     there is a promise the page cannot keep. */
  renderPage(res, 'contact', contactLocals(origin, { sent: req.query.sent === '1' }));
});

/* The contact form's POST target.
 *
 * The page previously offered no way to send anything: it listed an email
 * address and two social handles that config/company.js records as unset.
 * Merchant Center expects a shopper to be able to reach the seller before
 * buying and a reviewer checks by trying, so the form has to actually work
 * rather than look like it does.
 *
 * Validation is deliberately server-side and total. Client-side `required`
 * attributes are a convenience for real people and no obstacle at all to
 * anything else. */
router.post('/contact', publicFormLimiter, express.urlencoded({ extended: false, limit: '32kb' }), async (req, res) => {
  const origin = site.origin();
  const body = req.body || {};
  const values = {
    name: String(body.name || '').trim().slice(0, 120),
    email: String(body.email || '').trim().slice(0, 200),
    topic: String(body.topic || 'general').trim(),
    orderNumber: String(body.orderNumber || '').trim().slice(0, 60),
    message: String(body.message || '').trim().slice(0, 5000),
  };

  const ALLOWED_TOPICS = ['general', 'order', 'shipping', 'returns', 'preorder', 'wholesale'];
  if (!ALLOWED_TOPICS.includes(values.topic)) values.topic = 'general';

  let error = '';
  if (!values.name) error = 'Please tell us your name.';
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) error = 'Please enter an email address we can reply to.';
  else if (values.message.length < 10) error = 'Please give us a little more detail so we can help.';

  /* Honeypot: a field hidden from people but not from a naive bot. When it
     comes back filled the submission is dropped, and the response is the
     ordinary success page rather than an error — telling a bot it was
     detected only teaches it to stop filling the field. */
  if (String(body.website || '').trim()) {
    return res.redirect('/contact?sent=1#contact-form');
  }

  /* reCAPTCHA. After the honeypot so an obvious bot never costs a round
     trip to Google, and after the cheap field checks so somebody who
     mistyped their email is told that rather than being asked to prove
     they are human first.

     A failure here is shown as an ordinary form error with their text
     preserved, because the commonest cause is a real person whose
     challenge expired while they were writing. */
  if (!error) {
    const check = await recaptcha.verify(body['g-recaptcha-response'], req.ip);
    if (!check.ok) {
      console.warn('[contact] recaptcha rejected a submission:', check.reason);
      error = check.reason === 'missing'
        ? 'Please tick the "I\'m not a robot" box so we know you are human.'
        : 'That verification expired. Please tick the box again and resend.';
    }
  }

  if (error) {
    return res.status(400).render('pages/contact', {
      ...res.locals,
      ...contactLocals(origin, { formError: error, formValues: values }),
    });
  }

  try {
    const saved = await ContactMessage.create({
      ...values,
      ip: req.ip,
      userAgent: req.get('User-Agent') || '',
    });

    /* Tell somebody. Storing the row used to be the whole of it, so a
       message waited until a human happened to open /admin/messages —
       which is how a customer asking where their preorder had got to went
       four days without an answer.

       AFTER the save and deliberately not awaited: the customer's
       confirmation must not wait on SMTP, and a mail failure must not turn
       a message we already hold safely into an error page telling them it
       was not saved. If the send fails it is logged here and recorded in
       EmailLog like every other send; the message is still in the admin. */
    mail.send('contactReceived', {
      to: company.business.supportEmail,
      /* So hitting reply in the support inbox answers the customer instead
         of us. mail.send validates it before it reaches a header. */
      replyTo: values.email,
      data: values,
    }).catch((err) => {
      console.error('[contact] notification failed for message', String(saved._id), err.message);
    });
  } catch (err) {
    console.error('[contact] could not store message:', err.message);
    return res.status(500).render('pages/contact', {
      ...res.locals,
      ...contactLocals(origin, {
        /* Says what went wrong and offers a route that does not depend on
           this server working. Swallowing the failure would leave a
           customer believing a message was sent that never was. */
        formError: `Something went wrong on our end and your message was not saved. Please email ${company.business.supportEmail} directly and we will pick it up there.`,
        formValues: values,
      }),
    });
  }

  // Redirect after POST so a refresh cannot resubmit the same message.
  res.redirect('/contact?sent=1#contact-form');
});

/* Turns page HTML into a search-result snippet. Used only when a page has
 * no hand-written metaDescription, so a policy page still gets a
 * description that says what IS on it rather than a templated stub.
 * Every /page/* previously emitted the same sentence shape, which is
 * duplicate-description territory and tells a searcher nothing about
 * which of five policy pages they are looking at. */
function snippetFromHtml(html, limit = 155) {
  const text = String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= limit) return text;
  // Cut on a word boundary so the snippet never ends mid-word.
  return text.slice(0, text.lastIndexOf(' ', limit)).replace(/[,;:]$/, '') + '...';
}

/* BreadcrumbList for a simple two-level page. Emitting it is what makes
 * Google show "gogetcards.com > Privacy Policy" instead of a bare URL,
 * and it is the one piece of structured data these pages can honestly
 * carry. */
function breadcrumbGraph(origin, url, name) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
          { '@type': 'ListItem', position: 2, name },
        ],
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name,
        isPartOf: { '@id': `${origin}/#website` },
        publisher: { '@id': `${origin}/#organization` },
        inLanguage: 'en-US',
      },
    ],
  };
}

/* ── Release calendar ─────────────────────────────────────
 * Every set with a date, soonest first, grouped by month; the ones
 * released in the last two months underneath. Collectors search for a
 * set by name and date, and a preorder listing alone does not rank for
 * "when does X come out". Read from the same releaseDate/preorderShips
 * fields the product page and the feed use, so one admin edit moves the
 * date everywhere. Priced in the shopper's market; a product not sold
 * there is left off rather than shown in a currency it cannot be bought
 * in. */
router.get('/releases', async (req, res) => {
  try {
    const origin = site.origin();
    const url = `${origin}/releases`;
    const market = res.locals.market;
    const lineHandles = catalog.handles();
    const line = lineHandles.includes(String(req.query.line || '')) ? String(req.query.line) : '';

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const recentCutoff = new Date(today.getTime() - 60 * 86400000);
    const query = { $or: [{ preorder: true }, { releaseDate: { $gte: recentCutoff } }] };
    if (line) query.collections = line;

    const rows = await Product.find(query)
      .select('title slug price packSize imageUrl images collections tags productType vendor preorder preorderShips releaseDate available stock badge setCode marketPrices')
      .sort({ releaseDate: 1, title: 1 })
      .limit(400)
      .lean();

    const entries = [];
    for (const p of rows) {
      const priced = marketService.priceFor(p, market);
      if (!priced) continue;
      const info = preorderCfg.releaseInfo(p);
      const date = info.hasDate ? new Date(p.releaseDate) : null;
      const dayUtc = date ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) : null;
      const daysOut = dayUtc ? Math.round((dayUtc - today) / 86400000) : null;
      const pack = Math.max(1, parseInt(p.packSize, 10) || 1);
      const lineCfg = lineHandles.map((h) => catalog.byHandle(h)).find((l) => l && (p.collections || []).includes(l.handle))
        || catalog.detect(p);
      entries.push({
        product: p,
        priced,
        unit: pack > 1 ? Math.round(priced.amount / pack) : priced.amount,
        pack,
        line: lineCfg,
        info,
        daysOut,
        monthKey: dayUtc ? `${dayUtc.getUTCFullYear()}-${String(dayUtc.getUTCMonth() + 1).padStart(2, '0')}` : 'tbc',
        monthLabel: dayUtc ? dayUtc.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Date to be confirmed',
        day: dayUtc ? dayUtc.getUTCDate() : null,
        monthShort: dayUtc ? dayUtc.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }) : null,
        weekday: dayUtc ? dayUtc.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }) : null,
      });
    }

    /* Upcoming: a future date, or a preorder with none yet (listed last).
       Released: a past date inside the window, newest first. */
    const upcoming = entries.filter((e) => (e.daysOut !== null ? e.daysOut >= 0 : e.product.preorder));
    const released = entries.filter((e) => e.daysOut !== null && e.daysOut < 0).sort((a, b) => b.daysOut - a.daysOut);
    const months = [];
    for (const e of upcoming) {
      let m = months.find((x) => x.key === e.monthKey);
      if (!m) { m = { key: e.monthKey, label: e.monthLabel, entries: [] }; months.push(m); }
      m.entries.push(e);
    }
    months.sort((a, b) => (a.key === 'tbc' ? 1 : b.key === 'tbc' ? -1 : a.key.localeCompare(b.key)));

    const graph = breadcrumbGraph(origin, url, 'Release Calendar')['@graph'];
    graph.push({
      '@type': 'ItemList',
      '@id': `${url}#releases`,
      name: 'Upcoming trading card releases',
      numberOfItems: upcoming.length,
      itemListElement: upcoming.slice(0, 50).map((e, i) => ({
        '@type': 'ListItem', position: i + 1, name: e.product.title, url: `${origin}/products/${e.product.slug}`,
      })),
    });

    const lineName = line ? (catalog.byHandle(line) || {}).name : '';
    renderPage(res, 'releases', {
      pageTitle: `${lineName ? lineName + ' ' : ''}Release Calendar ${today.getUTCFullYear()} | GoGetCards`,
      metaDescription: `Every upcoming ${lineName || 'trading card'} set with its release date, what it costs and whether preorders are open. Factory sealed, allocated before release day.`,
      canonicalUrl: line ? `${url}?line=${line}` : url,
      months,
      released,
      upcomingCount: upcoming.length,
      line,
      lineName,
      lines: lineHandles.map((h) => catalog.byHandle(h)).filter(Boolean),
      jsonLd: { '@context': 'https://schema.org', '@graph': graph },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

/* ── FAQ ───────────────────────────────────────────────────
 * A real route rather than a database page, so the questions, the visible
 * answers and the FAQPage markup all come from config/faq.js. The seeded
 * FAQ page could contradict the rest of the site and did: it named PayPal
 * as an accepted method and quoted a shipping threshold that no longer
 * exists. */
router.get('/faq', (req, res) => {
  const origin = site.origin();
  const url = `${origin}/faq`;
  const graph = breadcrumbGraph(origin, url, 'Frequently Asked Questions')['@graph'];
  graph.push(faqConfig.faqSchema(url));

  renderPage(res, 'faq', {
    pageTitle: 'Frequently Asked Questions | GoGetCards',
    metaDescription: 'Answers on authenticity, factory-sealed guarantees, preorders and allocations, free worldwide shipping, returns, payment and support at GoGetCards.',
    canonicalUrl: url,
    jsonLd: { '@context': 'https://schema.org', '@graph': graph },
    faqs: faqConfig.faqs(),
    trustNav: trustPages.navByGroup(),
    lastReviewed: trustPages.LAST_REVIEWED,
  });
});

/* ── Trust & policy pages ──────────────────────────────────
 * Eight hardcoded pages served from config/trustPages.js at top-level
 * URLs: the authenticity and factory-sealed guarantees, the preorder and
 * allocation policies, payment information, secure checkout, order
 * tracking and customer support.
 *
 * They are in code rather than the database on purpose. The database
 * pages drifted from the rest of the site with nothing to catch it — they
 * named PayPal as a payment processor for a long time after PayPal stopped
 * being offered, and published a shipping rate table that contradicted
 * both the announcement bar and the Offer schema. Every figure on these
 * pages is interpolated from the same config the rest of the site reads,
 * so a policy page cannot state a return window, a payment method or a
 * shipping promise that the product pages disagree with.
 *
 * Registered before /page/:slug so a same-named database page can never
 * shadow one of these.
 */
router.get('/:slug', (req, res, next) => {
  const page = trustPages.bySlug(req.params.slug);
  if (!page) return next();

  const origin = site.origin();
  const url = `${origin}/${req.params.slug}`;

  /* WebPage + BreadcrumbList, and nothing more. These pages carry no
     FAQPage markup even though several are written as questions: FAQPage
     is for a page of questions and answers, and applying it to a policy
     page to win a rich result is the kind of stretch that earns a manual
     action rather than a snippet. */
  const jsonLd = breadcrumbGraph(origin, url, page.title);

  renderPage(res, 'trust-page', {
    pageTitle: `${page.title} | GoGetCards`,
    metaDescription: page.description,
    canonicalUrl: url,
    jsonLd,
    page,
    trustNav: trustPages.navByGroup(),
    lastReviewed: trustPages.LAST_REVIEWED,
  });
});

/* ── Shipping & Delivery ───────────────────────────────────
 * A real route rather than a database page, because every figure on it
 * has to come from config/shipping.js.
 *
 * It used to be a Page document holding a hand-written HTML rate table.
 * That table said UK free over $100 and Rest of World over $300, the
 * announcement bar said "free over $150" with no country named, and the
 * Offer schema quoted a single flat US rate to every shopper on earth.
 * Three published answers to one question, and "shipping mismatch" is a
 * named Merchant Center rejection reason found exactly that way: compare
 * the feed's shipping value against the policy page.
 *
 * The old /page/shipping-and-returns URL 301s here (below), so nothing
 * that was linked, bookmarked or crawled breaks.
 */
router.get('/shipping', (req, res) => {
  const origin = site.origin();
  renderPage(res, 'shipping', {
    pageTitle: 'Shipping & Delivery | GoGetCards',
    metaDescription: `Tracked, insured worldwide shipping on every order. Rates, delivery estimates and dispatch times by destination, plus how customs and duties work on international orders.`,
    jsonLd: breadcrumbGraph(origin, `${origin}/shipping`, 'Shipping & Delivery'),
  });
});

/* The database pages these replaced, 301'd to their hardcoded versions.
 *
 * Leaving both live is how policy text drifts apart again: two URLs
 * stating a return window is two places for it to be wrong. These slugs
 * also have inbound links from the old footer, from the seeded FAQ, and
 * from anything already crawled or bookmarked, so a redirect rather than
 * a 404 keeps that link equity and keeps a reviewer's click working.
 *
 * Ordered before /page/:slug so a stale Page document with the same slug
 * can never be served instead. */
const LEGACY_PAGE_REDIRECTS = {
  'shipping-and-returns': '/shipping',
  'refund-policy': '/refund-policy',
  'terms-of-service': '/terms-of-service',
  'privacy-policy': '/privacy-policy',
  'cookie-policy': '/cookie-policy',
  disclaimer: '/disclaimer',
  'track-order': '/order-tracking',
  faq: '/faq',
};
router.get('/page/:slug', (req, res, next) => {
  const target = LEGACY_PAGE_REDIRECTS[req.params.slug];
  if (!target) return next();
  res.redirect(301, withQuery(req, target));
});

/* ── Static Pages (policies, etc.) ─────────────────────── */
router.get('/page/:slug', async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug }).lean();
    if (!page) return notFound(res);

    const origin = site.origin();
    const url = `${origin}/page/${page.slug}`;

    /* Hand-written description wins; otherwise derive one from the actual
       content. The old value was `${page.title} — GoGetCards policies and
       information.` on EVERY page: the same sentence five times over, and
       it described none of them. */
    const description =
      (page.metaDescription && page.metaDescription.trim())
      || snippetFromHtml(page.content)
      || `${page.title} at GoGetCards.`;

    renderPage(res, 'page', {
      pageTitle: `${page.title} | GoGetCards`,
      metaDescription: description,
      ogType: 'article',
      jsonLd: breadcrumbGraph(origin, url, page.title),
      page,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

/* ── Thank You Page ────────────────────────────────────────
   Three shapes can land here:
   1. The legacy minimal redirect (order_id/value/currency only) used by
      the existing Meta pixel dedup script — rendered exactly as before,
      no DB writes.
   2. A rich-looking redirect (email/payment_id/checkout_id present) but
      carrying no signed token, or one that fails verification — treated
      as unproven. NOTHING is created: no order, no email, no admin
      notification. This is the actual security boundary — presence of
      these fields alone used to be enough to create a real "paid" order;
      now it never is.
   3. A rich redirect with a VALID signed token (iat + sig, verified via
      signatureVerifier.js against a secret shared only with NorthbridgeAI's
      backend) — this is the only path that runs the pipeline (parse ->
      validate -> detect source -> normalize -> create order -> email ->
      notify -> render). The token proves this came from NorthbridgeAI's
      own server right after a real checkout completed there, not from
      someone hand-typing a URL. */
/**
 * The confirmation page's presentation extras.
 *
 * READ-ONLY, and separate from the pipeline on purpose. The pipeline
 * decides whether an order exists; this decides how to describe it. The
 * product lookup is what lets the page say "releases 28 August" instead of
 * promising same-day dispatch on something that has not been printed yet,
 * and a failure to resolve it degrades to the in-stock wording rather than
 * failing the page somebody just paid on.
 */
async function confirmationExtras(order) {
  if (!order) return { orderRef: '', fulfilment: null };
  let product = null;
  try {
    if (order.productSlug) product = await Product.findOne({ slug: order.productSlug }).lean();
  } catch (err) {
    console.error('[thank-you] product lookup failed:', err.message);
  }
  return { orderRef: orderReference(order), fulfilment: fulfilmentFor(order, product) };
}

router.get('/thank-you', async (req, res) => {
  const hasToken = !!(req.query.sig && req.query.iat);

  if (!hasToken) {
    /* Nothing from the URL is echoed. An unsigned ?order_id=X&value=99.99
       used to render "Order confirmed · Total paid US$99.99" with a
       reference derived from X: a ready-made receipt on the real domain
       for anyone to link to. Without a signature there is no order to
       show, so the page is the neutral "thank you" with no figures. */
    return renderPage(res, 'thank-you', {
      pageTitle: 'Thank You | GoGetCards',
      metaDescription: 'Thank you for your purchase from GoGetCards.',
      order_id: null,
      orderRef: '',
      account: { customer: null, created: false, signedIn: false },
      value: null,
      currency: 'USD',
      pipelineOrder: null,
      fulfilment: null,
      pipelineErrors: null,
    });
  }

  const verification = verifySignature(req.query, process.env.THANK_YOU_SIGNING_SECRET);
  if (!verification.valid) {
    console.warn(`Thank You link failed verification (${verification.reason}) for order_id=${req.query.order_id}`);
    return renderPage(res, 'thank-you', {
      pageTitle: 'Order Confirmed | GoGetCards',
      metaDescription: 'Thank you for your purchase from GoGetCards.',
      order_id: null,
      orderRef: '',
      account: { customer: null, created: false, signedIn: false },
      value: null,
      currency: 'USD',
      pipelineOrder: null,
      fulfilment: null,
      pipelineErrors: { token: 'This confirmation link is invalid or has expired.' },
    });
  }

  try {
    const result = await runThankYouPipeline(req.query);

    /* Close the loop with the server-to-server record. The host reported
     * this payment the moment Whop confirmed it; this marks that record
     * resolved now that the customer's browser has actually arrived and
     * the order exists. Anything left unresolved in PendingPayment is
     * therefore a genuine "paid but never reached our confirmation page"
     * case rather than normal traffic. Fire-and-forget: a bookkeeping
     * write must never fail the page the customer is looking at. */
    if (result.ok && result.order) {
      PendingPayment.updateOne(
        { orderId: req.query.order_id, resolvedOrderId: null },
        { $set: { resolvedOrderId: result.order.orderId, resolvedAt: new Date() } }
      ).catch((err) => console.error('[thank-you] could not resolve pending payment:', err.message));
    }

    const extras = await confirmationExtras(result.ok ? result.order : null);

    /* The account is created HERE and nowhere earlier: the pipeline above
       has already verified the HMAC signature and written a real Order, so
       an account can only ever follow a payment the server confirmed. It
       cannot fail the page — see services/customerProvisioning. */
    /* signIn only on the FIRST arrival. The signed link stays valid for
       30 minutes and is idempotent for the order, but a replay that also
       started a customer session would make the URL (which sits in
       browser history and the partner's logs) a bearer credential. */
    const account = result.ok
      ? await provisionFromOrder(result.order, req, res, { signIn: !!result.isNew })
      : { customer: null, created: false, signedIn: false };

    return renderPage(res, 'thank-you', {
      pageTitle: 'Order Confirmed | GoGetCards',
      metaDescription: 'Thank you for your purchase from GoGetCards.',
      ...extras,
      account,
      order_id: result.ok ? result.order.orderId : (req.query.order_id || null),
      value: result.ok ? (result.order.totalPrice / 100).toFixed(2) : (req.query.value || null),
      currency: result.ok ? result.order.currency : (req.query.currency || 'USD'),
      pipelineOrder: result.ok ? result.order : null,
      pipelineSource: result.ok ? result.sourceInfo : null,
      pipelineErrors: result.ok ? null : result.errors,
    });
  } catch (err) {
    console.error('Thank You pipeline error:', err);
    return renderPage(res, 'thank-you', {
      pageTitle: 'Order Confirmed | GoGetCards',
      metaDescription: 'Thank you for your purchase from GoGetCards.',
      order_id: req.query.order_id || null,
      orderRef: '',
      account: { customer: null, created: false, signedIn: false },
      value: req.query.value || null,
      currency: req.query.currency || 'USD',
      pipelineOrder: null,
      fulfilment: null,
      pipelineErrors: { server: 'Something went wrong while confirming your order.' },
    });
  }
});

/* ── /api/track-order: GONE ────────────────────────────────
 * A relic of the Shopify era: an unauthenticated POST that wrote a paid
 * Order from whatever the request body said. Nothing has called it since
 * the move off Shopify, and anyone who found it could create fake
 * revenue, silence a real customer's abandoned-checkout recovery, and
 * plant orders inside that customer's account page. Orders are created
 * in exactly one place, services/orderPipeline/orderService.js, behind
 * the signature verifier; test/security/static-scan.test.js enforces
 * that. 410, not 404: the route existed, and is deliberately gone. */
router.post('/api/track-order', (req, res) => res.status(410).json({ error: 'Gone' }));

/* ── API: Live Chat ──────────────────────────────────────── */
/* Its own limiter, so an open chat panel polling for replies cannot use
   up the shared /api allowance that the cart and search depend on. */
const chatLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
router.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message required' });
    
    const chatMsg = await ChatMessage.create({
      sessionId: req.sessionID,
      sender: 'user',
      message: message.trim(),
      readByAdmin: false
    });
    
    res.json({ success: true, chatMsg });
  } catch (err) {
    console.error('Chat tracking error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/api/chat', chatLimiter, async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    // Fetch only messages meant for this session ID that were sent AFTER the 'since' timestamp
    const messages = await ChatMessage.find({
      sessionId: req.sessionID,
      createdAt: { $gt: since }
    }).sort({ createdAt: 1 }).lean();
    
    res.json({ messages });
  } catch (err) {
    console.error('Chat fetch error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

/* ── Checkout Redirect ─────────────────────────────────── */
/* THE CART'S "SECURE CHECKOUT" BUTTON, and the URL a few older links still
 * point at. It is now a thin entrance to the two-step flow and nothing
 * else.
 *
 * It used to be the Shopify rotator: pick a storefront from a pool, resolve
 * each line to a variant id on that storefront, and hand the customer a
 * /cart/<variant>:<qty> URL. All of that is deleted. Any refusal ends on
 * the page above rather than at somebody else's checkout, so what a buyer
 * sees after a decline is about their order instead of about a store they
 * were never told existed.
 *
 * A slug in the query means one product; otherwise the session cart's first
 * line is used, exactly as it was. */
router.get('/checkout-redirect', async (req, res) => {
  const slug = String(req.query.slug || '').trim();
  const cart = req.session.cart;
  const line = !slug && cart && Array.isArray(cart.items) && cart.items.length ? cart.items[0] : null;

  const wantedSlug = slug || (line ? line.slug : '');
  if (!wantedSlug) return res.redirect('/cart');

  /* The quantity is clamped here as well as inside the session service.
     A stepper that has been edited in the URL is the ordinary case, not an
     attack, and it should buy what the product allows rather than fail. */
  let qty = Math.max(1, parseInt(slug ? req.query.qty : line.quantity, 10) || 1);
  try {
    const product = await Product.findOne({ slug: wantedSlug }).lean();
    if (!product) return res.redirect('/cart');
    qty = orderCap.clamp(product, qty);

    const checkoutId = trackCheckoutReached(req, qty, 'two_step_checkout', wantedSlug);
    const sessionService = require('../services/checkout/session');
    const started = await sessionService.start(wantedSlug, qty, {
      checkoutId,
      market: (req.market && req.market.id) || undefined,
      userAgent: req.get('User-Agent') || '',
      ip: req.ip,
    });
    if (started.ok) return res.redirect(303, `/checkout/${started.token}`);
    console.warn(`[checkout-redirect] session start refused ${wantedSlug} x${qty}: ${started.reason || 'unknown'}`);
  } catch (err) {
    console.error('[checkout-redirect] two-step start failed:', err.message);
  }
  return checkoutUnavailable(res, wantedSlug);
});

/* /checkout was the last hop of the Shopify rotator — it read a storefront
   and variant id off the session and left the site. Nothing writes those
   any more, so it is kept only so old links land somewhere sensible. */
router.get('/checkout', (req, res) => res.redirect(302, '/cart'));

/* ── Sitemap.xml ───────────────────────────────────────── */
router.get('/sitemap.xml', async (req, res) => {
  try {
    /* Sold-out products stay in the sitemap. Filtering on available:true
     * dropped every out-of-stock page, which is exactly backwards for a
     * preorder-driven store: those URLs hold their rankings and restock,
     * and de-listing them sheds accumulated authority for no gain. */
    const products = (await Product.find({}).select('slug updatedAt price available marketPrices imageUrl images').lean())
      /* Same rule as the product page's robots meta: no photo, not
         indexed, so not advertised either. */
      .filter((p) => p.imageUrl || (p.images && p.images.length));
    const pages = await Page.find().select('slug updatedAt').lean();
    /* ── Other markets ────────────────────────────────────────────────
       Only markets that are actually open, and within them only products
       that are actually priced. Listing a market URL for a product with
       no price in it would advertise a 404, which costs crawl budget and
       teaches Google the section is unreliable. */
    const openMarkets = (await marketService.sellableNow()).filter((m) => !m.isDefault);
    // SITE_URL so the sitemap never advertises a *.onrender.com origin.
    const host = site.origin();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    /* Trust pages come from config/trustPages.js rather than being listed
       again here. A hand-maintained second list is how a page ends up
       live, linked and absent from the sitemap. */
    const staticPages = [
      '/', '/about', '/contact', '/shipping', '/faq',
      ...trustPages.allSlugs().map((s) => `/${s}`),
      '/collection/all',
      ...catalog.handles().map((h) => `/collection/${h}`),
      '/collection/preorders',
      '/releases',
    ];
    staticPages.forEach(p => {
      xml += `  <url><loc>${host}${p}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    });

    // Products
    products.forEach(p => {
      xml += `  <url><loc>${host}/products/${p.slug}</loc><lastmod>${new Date(p.updatedAt).toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
    });

    /* Each open market's storefront and the products it prices. These are
       not duplicates: every one is a different currency at a
       self-canonical URL, tied to the others by hreflang. */
    openMarkets.forEach((m) => {
      xml += `  <url><loc>${host}/${m.prefix}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
      products
        .filter((p) => !!marketService.priceFor(p, m))
        .forEach((p) => {
          xml += `  <url><loc>${host}${markets.path(m, `/products/${p.slug}`)}</loc><lastmod>${new Date(p.updatedAt).toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>\n`;
        });
    });

    /* Pages. Every slug that now 301s to a hardcoded page is excluded:
       those targets are already in the static list above, and a sitemap
       advertising a redirecting URL wastes crawl budget and muddies which
       of the two is canonical. */
    pages.filter(p => !LEGACY_PAGE_REDIRECTS[p.slug]).forEach(p => {
      xml += `  <url><loc>${host}/page/${p.slug}</loc><lastmod>${new Date(p.updatedAt).toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;
    });

    xml += '</urlset>';
    res.header('Content-Type', 'application/xml').send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});


/* ── Robots.txt ────────────────────────────────────────── */
router.get('/robots.txt', (req, res) => {
  /* Previously this disallowed only /admin, leaving cart, checkout, the
   * thank-you page and internal API routes crawlable — pages that waste
   * crawl budget, can surface in search, and in the thank-you case carry
   * order details in the query string. Sitemap uses SITE_URL so it is not
   * advertised under a *.onrender.com host. */
  const host = site.origin();
  res.type('text/plain').send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /internal/',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /checkout/',
    'Disallow: /checkout-redirect',
    'Disallow: /thank-you',
    /* The customer portal. Every page there already sends noindex and
       no-store headers; this stops a crawler spending budget discovering
       that, and stops /account/sign-in appearing in a site: search. */
    'Disallow: /account',
    '',
    /* AI search and shopping assistants. They are already allowed by the
       wildcard; naming them states the intent, and some (OAI-SearchBot,
       PerplexityBot) look for their own section before trusting "*". The
       same disallows apply: a cart or checkout URL is not an answer. */
    ...['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'Google-Extended', 'Gemini-Deep-Research', 'PerplexityBot', 'Perplexity-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Bingbot', 'Applebot', 'Applebot-Extended', 'Amazonbot', 'meta-externalagent', 'DuckAssistBot']
      .flatMap((ua) => [`User-agent: ${ua}`, 'Allow: /', 'Disallow: /admin', 'Disallow: /api/', 'Disallow: /cart', 'Disallow: /checkout', 'Disallow: /thank-you', 'Disallow: /account', '']),
    `Sitemap: ${host}/sitemap.xml`,
    `# Machine-readable summary for assistants: ${host}/llms.txt`,
  ].join('\n'));
});

/* ── Multipack image ──────────────────────────────────────
 * The feed's picture of a pack-sold product: N copies of its own photo.
 * Public (Google fetches it), cached a day here and at the edge, 404 for
 * anything that is not a pack product. See services/multipackImage. */
router.get('/images/multipack/:slug.png', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: String(req.params.slug) }).select('slug imageUrl images packSize').lean();
    if (!product || !(parseInt(product.packSize, 10) > 1)) return notFound(res);
    const { buf, type } = await require('../services/multipackImage').render(product, {
      width: parseInt(req.query.width, 10) || undefined,
      fmt: String(req.query.fmt || 'png'),
    });
    /* The URL carries ?v=<hash of the source>, so it can be immutable:
       a changed photo is a changed URL. */
    res.set('Cache-Control', 'public, max-age=31536000, immutable').set('X-Robots-Tag', 'noindex').type(type).send(buf);
  } catch (err) {
    console.error('[multipack image]', req.params.slug, err.message);
    return notFound(res);
  }
});

/* ── Self-hosted product photos (services/productAsset) ── */
router.get('/images/products/:slug.webp', async (req, res) => {
  try {
    const out = await require('../services/productAsset').render(String(req.params.slug), {
      width: parseInt(req.query.width, 10) || undefined,
      fmt: String(req.query.fmt || 'webp'),
    });
    if (!out) return notFound(res);
    res.set('Cache-Control', 'public, max-age=31536000, immutable').type(out.type).send(out.buf);
  } catch (err) {
    console.error('[product asset]', req.params.slug, err.message);
    return notFound(res);
  }
});

/* ── llms.txt ───────────────────────────────────────────
 * A plain-text summary for AI search and shopping assistants (ChatGPT,
 * Gemini, Perplexity, Claude, Copilot): what the store sells, the terms
 * that matter to a shopper, and where the machine-readable data lives.
 * Everything here is read from the same config the pages use, so it
 * cannot say something the site does not. */
router.get('/llms.txt', (req, res) => {
  const host = site.origin();
  const biz = company.business;
  const d = shipping.DISPATCH;
  const lines = [
    `# ${biz.tradingName}`,
    '',
    `> ${biz.tradingName} is an online retailer of factory-sealed trading card game and sports card products (Pokémon TCG, Magic: The Gathering, One Piece Card Game, Disney Lorcana, and Topps/Panini baseball, basketball and football hobby boxes), based in ${biz.country}, pricing in ${biz.currency}, sourced through authorized distribution and shipped sealed.`,
    '',
    '## Facts a shopper asks about',
    `- Shipping: ${shipping.copy.long}. In-stock orders placed before ${d.cutoffLocal} ${d.cutoffTimezone} on a business day ship the same day. US delivery ${shipping.PRIMARY_REGION.transitDays[0]}–${shipping.PRIMARY_REGION.transitDays[1]} business days.`,
    `- Preorders: charged in full at checkout; dispatched on the publisher's release date or within ${d.preorderBusinessDaysAfterRelease} business days of it; cancel any time before dispatch for a full refund.`,
    `- Returns: ${faqConfig.RETURN_WINDOW_DAYS} days from delivery for unopened, still-sealed product; ${faqConfig.FREE_RETURNS ? 'free prepaid return label' : 'return postage paid by the buyer'}; no restocking fee; refund to the original payment method.`,
    `- Payment: ${payments.copy.accepted} Checkout is completed on the partner payment page (Whop).`,
    `- Contact: ${biz.supportEmail}, ${host}/contact. Response within ${biz.responseTimeHours} hours, ${biz.supportHours} ${biz.supportTimezoneLabel}.`,
    `- Address: ${company.addressOneLine ? company.addressOneLine() : biz.country}.`,
    '',
    '## Pages',
    `- [All products](${host}/collection/all): the full sealed catalogue with filters and search (${host}/collection/all?q=...)`,
    ...catalog.handles().map((h) => `- [${(catalog.byHandle(h) || {}).name || h}](${host}/collection/${h})`),
    `- [Preorders](${host}/collection/preorders) and the [release calendar](${host}/releases)`,
    `- [Shipping & delivery](${host}/shipping)`,
    `- [Refund & return policy](${host}/refund-policy)`,
    `- [Preorder policy](${host}/preorder-policy)`,
    `- [Authenticity guarantee](${host}/authenticity-guarantee) and [factory-sealed guarantee](${host}/factory-sealed-guarantee)`,
    `- [FAQ](${host}/faq), [About](${host}/about), [Contact](${host}/contact), [Terms](${host}/terms-of-service), [Privacy](${host}/privacy-policy)`,
    '',
    '## Machine-readable data',
    `- Product pages carry schema.org Product/Offer JSON-LD with price, availability, GTIN where known, shipping and return policy.`,
    `- Sitemap: ${host}/sitemap.xml`,
    `- Product feed (Google Merchant Center RSS format): ${host}/feed/google.xml (JSON: ${host}/feed/google.json)`,
    '',
    '## Notes for assistants',
    '- Prices on product pages are the prices charged; products sold as packs state the pack size and pack price.',
    '- Availability on a product page is current; a preorder shows its release date.',
    '- Cart, checkout, account and admin URLs are not for indexing or quoting.',
  ];
  res.type('text/plain; charset=utf-8').set('Cache-Control', 'public, max-age=3600').send(lines.join('\n') + '\n');
});

/* ── The information form ──────────────────────────────
 *
 * This was the front of the Static Payment Links checkout, which is gone.
 * It survives because the admin test purchase posts through it (see
 * services/testOrder.js) — the customer-facing flow is the token checkout
 * in routes/checkoutFlow.js. */

router.get('/checkout/step-1', async (req, res) => {
  try {
    // Calculate total from query or session
    let cartTotal = 0;
    let cartItems = [];

    const { slug, qty, variant } = req.query;
    if (slug) {
      const product = await Product.findOne({ slug: slug }).lean();
      if (product) {
        const parsedQty = orderCap.clamp(product, qty);
        cartItems.push({ product, quantity: parsedQty, variantId: variant });
        cartTotal = product.price * parsedQty;
      }
    } else if (req.session.cart && req.session.cart.items && req.session.cart.items.length > 0) {
      for (const item of req.session.cart.items) {
        const product = await Product.findOne({ slug: item.slug }).lean();
        if (product) {
          cartItems.push({ product, quantity: item.quantity, variantId: item.variant });
          cartTotal += product.price * item.quantity;
        }
      }
    }

    if (cartItems.length === 0) {
      return res.redirect('/cart');
    }

    renderPage(res, 'checkout-step1', {
      pageTitle: 'Secure Checkout | GoGetCards',
      cartItems,
      cartTotal,
      query: req.query,
      /* Only ever populated for a signed-in admin, so a customer's page
         is byte-for-byte what it was. Rendering the address here means
         there is nothing to remember and nothing written down. */
      testMode: testOrder.isAllowed(req)
        ? { tag: testOrder.TEST_TAG, email: testOrder.CANONICAL_TEST_EMAIL }
        : null,
    });
  } catch (err) {
    console.error('Checkout Step 1 error:', err);
    res.status(500).send('Server Error');
  }
});

/**
 * Resolves a test checkout into the fields the confirmation is signed over.
 *
 * PRICES AND TITLES COME FROM THE DATABASE, not from the posted cart. The
 * browser sends the cart back to us and a tampered total would otherwise
 * be signed by our own key and written to the orders table as fact. Only
 * the slug and quantity are taken from the request, and the quantity is
 * clamped the same way the rest of checkout clamps it.
 *
 * A multi-item cart collapses to its first line for the product fields —
 * the pipeline records one productSlug per order, which is also what the
 * partner checkout does — while the total covers every line, so the money
 * on the receipt is still the money for the whole cart.
 */
async function buildTestPurchase(body) {
  const lines = Array.isArray(body.cartData && body.cartData.items) ? body.cartData.items : [];
  const slugs = lines.map((l) => (l && l.product && l.product.slug) || l.slug).filter(Boolean);
  if (!slugs.length) return { ok: false, error: 'That cart is empty, so there is nothing to confirm.' };

  const products = await Product.find({ slug: { $in: slugs } }).lean();
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  let totalCents = 0;
  let first = null;
  let firstQty = 1;
  for (const line of lines) {
    const slug = (line && line.product && line.product.slug) || line.slug;
    const product = bySlug.get(slug);
    if (!product) continue;
    const qty = orderCap.clamp(product, line.quantity);
    totalCents += (product.price || 0) * qty;
    if (!first) { first = product; firstQty = qty; }
  }
  if (!first) return { ok: false, error: 'None of those products exist any more.' };

  const d = body.addressDetails || {};
  return testOrder.buildConfirmationUrl({
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    address1: d.addressLine1 || '',
    address2: d.apartment || '',
    city: d.city || '',
    state: d.state || '',
    zip: d.zip || '',
    country: d.country || '',
    phone: d.phone || '',
    productTitle: first.title,
    productSlug: first.slug,
    productImage: first.imageUrl || (first.images || [])[0] || '',
    totalCents,
    quantity: firstQty,
    currency: 'USD',
  });
}

router.post('/checkout/capture-lead', publicFormLimiter, async (req, res) => {
  try {
    const { email, firstName, lastName, address, addressDetails, cartData } = req.body;

    /* ── Test purchase ────────────────────────────────────────────────
       A designated email address, submitted from a browser with a live
       admin session, skips the payment step and goes straight to the
       genuine signed confirmation. Everything downstream is the real
       path: real pipeline, real Order, real email, real account.

       ORDER OF THE TWO CHECKS MATTERS. isAllowed() is not consulted
       unless the address is a test address, and a non-admin who submits
       one falls THROUGH to the ordinary checkout rather than being
       refused — a refusal would tell them the address means something.

       See services/testOrder.js. Nothing in the checkout, pipeline,
       partner-experience or signing code was changed for it. */
    if (testOrder.isTestEmail(email) && testOrder.isAllowed(req)) {
      const built = await buildTestPurchase(req.body);
      if (!built.ok) return res.json({ success: false, error: built.error });
      req.session.cart = { items: [], totalItems: 0, totalPrice: 0 };
      return req.session.save(() => res.json({ success: true, redirect: built.url }));
    }

    /* NOTHING BUT A TEST REACHES THIS LINE ANY MORE.
     *
     * This endpoint existed to turn the form above into a Stripe static
     * payment link, and that checkout has been deleted. A real customer
     * checks out through routes/checkoutFlow.js, which never posts here.
     *
     * No Order is written on the way out. The old code created one marked
     * 'abandoned' BEFORE deciding whether it could be paid for, so every
     * misconfiguration left an unpayable row in the admin — a record of a
     * sale that could not have happened. */
    console.warn('[checkout/capture-lead] posted by a non-test checkout; the static-link flow is gone');
    return res.json({ success: false, error: 'Checkout is not available here. Please order from the product page.' });
  } catch (err) {
    console.error('Capture Lead error:', err);
    res.json({ success: false, error: 'Something went wrong. Please try again.' });
  }
});

/* REMOVED: the ObjectId-addressed Whop page.
 *
 * It took `?id=<mongo ObjectId>` and did `Order.findById(id)` with NO
 * ownership check of any kind, so anyone holding or guessing an id could
 * open somebody else's checkout — and ObjectIds are timestamp + machine +
 * counter, not random. It was also unreachable by design: the
 * `pendingOrderId` it fell back to is read here and written nowhere in the
 * codebase, it had no on-complete handler, so a payment made through it
 * would never have reached the order pipeline. Dead Stripe-era code on a
 * live URL with an IDOR on it.
 *
 * The replacement is routes/checkoutFlow.js, where a checkout is addressed
 * by 32 bytes of CSPRNG stored only as a hash. Anything still pointing
 * here is sent to the product catalogue rather than a 404, because the
 * only visitors are stale links. */
router.get('/checkout/whop', (req, res) => {
  res.set('Cache-Control', 'no-store');
  return res.redirect(302, '/');
});

router.get('/checkout/success', async (req, res) => {
  // Logic simplified as session is no longer holding the Order ID
  renderPage(res, 'checkout-success', {
    pageTitle: 'Order Confirmed | GoGetCards'
  });
});

module.exports = router;

/* Exported for routes/checkoutRecovery.js. A recovery link must go through
   exactly this function — it claims a pooled email, resolves the bundle
   plan for the quantity and mints the partner token. Reimplementing any of
   that in the recovery route is how the two paths would drift. */
module.exports.resolvePartnerRedirect = resolvePartnerRedirect;

/* Also exported for routes/checkoutFlow.js. The zcid is minted at the
   moment of the checkout CLICK, which in the two-step flow is Step 1
   starting rather than the partner redirect firing — so the funnel keeps
   one event shape across both flows. */
module.exports.trackCheckoutReached = trackCheckoutReached;

/* Also exported for routes/checkoutFlow.js, so a refusal there and a
   refusal here are literally the same page. Two hand-written "sorry"
   screens drift, and the one that drifts is always the rarer one. */
module.exports.checkoutUnavailable = checkoutUnavailable;
