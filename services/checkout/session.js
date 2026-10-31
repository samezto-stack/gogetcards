/**
 * The rules behind the two-step checkout.
 *
 * Routes stay thin and this file holds the decisions, so they can be
 * tested without driving a browser.
 *
 * THE PRICE IS RECALCULATED HERE, TWICE. Once when the session is created
 * and again immediately before the customer is handed to the payment step.
 * Nothing the browser posts about price, product or quantity is trusted at
 * any point — the browser only says WHICH product and HOW MANY, and both
 * are re-read from the catalogue.
 *
 * QUANTITY > 1 IS NOT A MULTIPLICATION. It resolves to a pre-built bundle
 * plan with a fixed price, exactly as routes/frontend.js's partner hop
 * does, because the plan id alone determines what the payment provider
 * charges. There is no way to multiply a price and expect the provider to
 * honour it, so a quantity with no matching bundle is refused rather than
 * guessed — that refusal is what stops Step 1 quoting a figure the payment
 * step would not charge.
 */

const CheckoutSession = require('../../models/CheckoutSession');
const Product = require('../../models/Product');
const SiteConfig = require('../../models/SiteConfig');
const preorderCfg = require('../../config/preorder');
const partnerRotation = require('../partnerRotation');
const marketService = require('../market');
const markets = require('../../config/markets');

/**
 * Everything Step 1 needs to render, priced by the server.
 *
 * `enforceStock` is what makes a held product (see Product.stockHold) fail
 * at the PAYMENT step and nowhere earlier. Every other caller leaves it
 * off, so Step 1 renders and submits exactly as it does for a product in
 * stock — which is the whole point of the hold, and also its cost: the
 * buyer has typed their name and address by the time they are told.
 *
 * The check is deliberately NOT folded into the `available === false`
 * line above. That one is the honest flag and refuses at session start;
 * conflating them would make every sold-out product behave this way.
 */
async function priceFor(slug, requestedQty, opts = {}) {
  const product = await Product.findOne({ slug }).lean();
  if (!product) return { ok: false, reason: 'not_found' };
  /* THE MARKET IS AN INPUT, NOT A DEFAULT TO FALL BACK ON. It arrives
     from the product page's URL at Step 1 and off the session after
     that, so every re-price during a checkout reads the same
     storefront. A product with no price in the market is not sold
     there, which at this point means the session cannot continue. */
  const market = markets.byId(opts.market) || markets.defaultMarket();
  const localPrice = marketService.priceFor(product, market);
  if (!localPrice) return { ok: false, reason: 'not_found', product };
  if (product.available === false) return { ok: false, reason: 'unavailable', product };
  if (opts.enforceStock && product.stockHold) {
    /* The replacement is resolved here rather than in the view so the page
       can only ever offer something that genuinely exists and is itself
       sellable — a successor that is sold out, held, or deleted would send
       the buyer from one dead end to the next. */
    let replacement = null;
    if (product.supersededBy) {
      replacement = await Product.findOne({
        slug: product.supersededBy, available: true, stockHold: { $ne: true },
      }).lean();
      if (!replacement) {
        console.warn(`[stock-hold] ${slug} names successor "${product.supersededBy}" `
          + 'which is missing, unavailable or itself held — offering the catalogue instead');
      }
    }
    return { ok: false, reason: 'sold_out', product, replacement };
  }

  const limit = product.allocationLimit || 0;
  let quantity = Math.max(1, parseInt(requestedQty, 10) || 1);
  /* Silently capping is correct here rather than an error: the customer
     asked for more than we allow one person to have, and the honest
     response is to sell them the maximum, which is what the product page
     already does. */
  if (limit > 0 && quantity > limit) quantity = limit;

  const unitPrice = localPrice.amount;
  let total = unitPrice * quantity;
  let whopPlanId = '';

  if (quantity > 1) {
    const bundle = await resolveBundle(slug, quantity, market);
    if (!bundle) return { ok: false, reason: 'no_bundle_plan', product, quantity };
    /* The bundle's own price, NOT unitPrice * quantity. A bundle is
       normally discounted, so multiplying would overstate the total and
       the payment step would charge something else.

       bundle.price is in MAJOR UNITS — resolvePartnerRedirect sends it
       as a decimal string — while everything here is in the smallest
       unit. The divisor comes from the currency because JPY has none. */
    total = bundle.amount;
    whopPlanId = bundle.whopPlanId || '';
  }

  const release = preorderCfg.releaseInfo(product);

  return {
    ok: true,
    product,
    quantity,
    unitPrice,
    total,
    shippingCents: 0,          // free, everywhere, today
    taxCents: 0,               // included in the price
    market: market.id,
    currency: localPrice.currency,
    whopPlanId,
    isPreorder: !!product.preorder,
    release,
  };
}

/**
 * What a quantity costs on the partner site that would serve it.
 *
 * READ THROUGH THE SAME GRID THE HOP USES, so Step 1 and the payment step
 * can never quote different figures. A partner site sells one ladder of
 * twenty-four plans in equal steps, which makes it a price grid: a product
 * costing three steps uses rung 3 for one unit, rung 6 for two. Nothing is
 * configured per product, so there is nothing here that can drift out of
 * step with what resolvePartnerRedirect will actually charge.
 *
 * null means no plan charges exactly that, and the caller refuses the
 * quantity rather than quoting a figure the payment step would not honour.
 */
async function resolveBundle(slug, quantity, market) {
  try {
    const partnerExperience = await SiteConfig.getValue('partnerExperience', null);
    if (!partnerExperience || !partnerExperience.enabled) return null;

    const product = await Product.findOne({ slug }).select('slug price marketPrices available').lean();
    if (!product) return null;

    const mkt = market || markets.defaultMarket();
    const local = marketService.priceFor(product, mkt);
    if (!local) return null;

    const site = partnerRotation.nextSite(partnerExperience, product, {
      amount: local.amount, market: mkt.id,
    });
    if (!site) return null;

    /* THE LADDER IS CHOSEN BY MARKET. A German checkout must resolve a
       German plan id — not merely a euro one — so the sale is attributed
       to the country whose campaign paid for it, and Whop bills what the
       plan says regardless of what the page displayed. */
    const chosen = partnerRotation.planFor(site, local.amount, quantity, mkt.id);
    if (!chosen) return null;

    return {
      quantity: chosen.quantity,
      whopPlanId: chosen.whopPlanId,
      amount: chosen.priceCents,
      currency: chosen.currency,
      price: markets.currency(chosen.currency).decimals === 0
        ? Math.round(chosen.priceCents)
        : chosen.priceCents / 100,
    };
  } catch (err) {
    console.error('[checkout/session] bundle lookup failed:', err.message);
  }
  return null;
}

/** Creates a session for a product, or explains why it cannot. */
async function start(slug, quantity, meta = {}) {
  const priced = await priceFor(slug, quantity, { market: meta.market });
  if (!priced.ok) return priced;

  const { doc, token } = await CheckoutSession.issue({
    checkoutId: meta.checkoutId || '',
    productSlug: slug,
    /* Pinned now. Every later re-price reads it off the session, so the
       currency cannot drift between Step 1 and the charge. */
    market: priced.market,
    quantity: priced.quantity,
    unitPrice: priced.unitPrice,
    total: priced.total,
    currency: priced.currency,
    shippingCents: priced.shippingCents,
    taxCents: priced.taxCents,
    whopPlanId: priced.whopPlanId,
    userAgent: (meta.userAgent || '').slice(0, 300),
    ip: meta.ip || '',
  });

  return { ok: true, session: doc, token, priced };
}

/* ── Step 1 validation ──
   Deliberately the same field set and the same rules the partner checkout
   applies in the browser, so a customer never passes one and fails the
   other. The browser copy is a convenience; THIS is the one that counts. */

const REQUIRED = ['email', 'firstName', 'lastName', 'address1', 'city', 'country'];

/* Countries whose state/province Step 1 renders as a picker, and which
   therefore must arrive filled in — a US or Canadian address without one
   cannot be shipped. Kept next to the validator rather than in the view so
   the rule holds whatever posted the form. */
const SUBDIVISION_REQUIRED = new Set(['US', 'CA', 'AU']);

function validateDetails(body = {}) {
  const errors = {};
  /* Array-tolerant: the state field is rendered twice (a picker and a text
     box, one of them disabled) and a browser that submitted both would send
     an array. Take the first value that has anything in it rather than
     stringifying the array into "CA,". */
  const clean = (v) => {
    if (Array.isArray(v)) v = v.find((x) => String(x == null ? '' : x).trim()) || '';
    return String(v == null ? '' : v).trim().slice(0, 200);
  };

  const out = {
    email: clean(body.email).toLowerCase(),
    firstName: clean(body.firstName),
    lastName: clean(body.lastName),
    phone: clean(body.phone),
    country: clean(body.country).toUpperCase().slice(0, 2),
    address1: clean(body.address1),
    address2: clean(body.address2),
    city: clean(body.city),
    state: clean(body.state),
    postalCode: clean(body.postalCode),
  };

  for (const field of REQUIRED) {
    if (!out[field]) errors[field] = 'Required';
  }
  /* Deliberately permissive: the only email test that means anything is
     whether mail arrives, and a clever regex mostly rejects valid
     addresses. This catches the typo, not the edge case. */
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(out.email)) {
    errors.email = 'Enter a valid email address';
  }
  if (out.country && out.country.length !== 2) {
    errors.country = 'Select your country';
  }
  /* Postal code is required where the country actually uses one. The
     partner page's AddressKit already knows this per country; here the
     rule is the conservative one — required unless the country is on the
     short list that genuinely has none. */
  const NO_POSTCODE = new Set(['AE','AO','AG','AW','BS','BZ','BJ','BW','BF','BI','CM','CF','KM','CG','CD','CK','CI','DJ','DM','GQ','ER','FJ','TF','GM','GH','GD','GN','GY','HK','IE','JM','KE','KI','LY','MO','MW','ML','MR','MU','MS','NR','AN','NU','KP','PA','QA','RW','KN','LC','ST','SA','SC','SL','SB','SO','ZA','SR','SY','TZ','TL','TK','TO','TT','TV','UG','VU','YE','ZW']);
  if (!out.postalCode && out.country && !NO_POSTCODE.has(out.country)) {
    errors.postalCode = 'Required';
  }
  if (!out.state && SUBDIVISION_REQUIRED.has(out.country)) {
    errors.state = out.country === 'CA' ? 'Select your province' : 'Select your state';
  }

  return { ok: Object.keys(errors).length === 0, values: out, errors };
}

/**
 * Saves validated details and re-prices, moving the session to
 * step1_completed. Returns { ok:false, reason } if the product moved
 * underneath the customer while they were typing.
 */
async function completeStep1(session, body) {
  const check = validateDetails(body);
  if (!check.ok) return { ok: false, reason: 'invalid', errors: check.errors, values: check.values };

  /* RE-PRICE. The customer may have had this page open for an hour. */
  const priced = await priceFor(session.productSlug, session.quantity, { market: session.market });
  if (!priced.ok) return { ok: false, reason: priced.reason, product: priced.product };

  if (priced.total !== session.total) {
    /* The price moved. Update the session and tell the caller, so Step 1
       can show the new figure and ask them to confirm rather than
       silently charging something they did not agree to. */
    session.unitPrice = priced.unitPrice;
    session.total = priced.total;
    session.whopPlanId = priced.whopPlanId;
    Object.assign(session, check.values);
    session.lastActivityAt = new Date();
    await session.save();
    return { ok: false, reason: 'price_changed', session, priced };
  }

  Object.assign(session, check.values);
  session.unitPrice = priced.unitPrice;
  session.total = priced.total;
  session.whopPlanId = priced.whopPlanId;
  session.status = session.status === 'paid' ? 'paid' : 'step1_completed';
  session.lastActivityAt = new Date();
  await session.save();

  return { ok: true, session, priced };
}

/** Records that the customer was sent to the payment step.
 *
 *  It no longer writes `pooledEmail`: pooled email is retired and nothing
 *  claims an address. The FIELD stays on the schema because rows written
 *  while the scheme ran still carry one, and those rows are the record of
 *  which customer each of our addresses stood in for — see
 *  services/partnerEmailHistory.js. */
async function markHandedOff(session, { url, host, whopPlanId } = {}) {
  session.status = 'payment_pending';
  session.paymentUrl = url || '';
  session.paymentHost = host || '';
  if (whopPlanId) session.whopPlanId = whopPlanId;
  session.handedOffAt = new Date();
  session.lastActivityAt = new Date();
  await session.save();
  return session;
}

/**
 * Payment succeeded. Idempotent: a refresh, a duplicate webhook and a
 * retried pipeline call all land on the same row and only the first
 * changes anything.
 */
async function markPaid(session, orderId) {
  if (session.status === 'paid') return session;
  session.status = 'paid';
  session.orderId = orderId || session.orderId || '';
  session.paidAt = session.paidAt || new Date();
  session.lastActivityAt = new Date();
  await session.save();
  return session;
}

/** Payment declined. Step 1 survives untouched so they can simply retry. */
async function markFailed(session) {
  if (session.status === 'paid') return session;   // success always wins
  session.status = 'payment_failed';
  session.lastFailureAt = new Date();
  session.failureCount = (session.failureCount || 0) + 1;
  session.lastActivityAt = new Date();
  await session.save();
  return session;
}

module.exports = {
  priceFor,
  start,
  validateDetails,
  completeStep1,
  markHandedOff,
  markPaid,
  markFailed,
  resolveBundle,
  REQUIRED,
  SUBDIVISION_REQUIRED,
};
