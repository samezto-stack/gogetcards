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
const orderCap = require('../../helpers/orderCap');
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

  /* The product's own allocation limit AND the ladder's ceiling: no line
     may exceed $1,199.76 (helpers/orderCap), in this market's price. */
  const limit = orderCap.maxQuantity(product, localPrice.amount);
  let quantity = Math.max(1, parseInt(requestedQty, 10) || 1);
  /* Counted stock is a ceiling. Stock is in packs, like `quantity`; 0
     means not counted (see services/orderPipeline/stockLedger). */
  if (process.env.STOCK_LEDGER === 'true' && opts.enforceStock && typeof product.stock === 'number' && product.stock > 0 && quantity > product.stock) {
    quantity = product.stock;
  }
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

/* ── Mixed carts ───────────────────────────────────────────────────────
 *
 * SEVERAL PRODUCTS, ONE CHARGE. Every price in the catalogue is a whole
 * number of ladder steps ($49.99 in the US), so the sum of any cart is a
 * whole number of steps too, and the partner ladder already sells every
 * step from 1 to 24. A cart is therefore charged with exactly the plan a
 * single product of the same total would use: nothing new on the partner
 * side, and the figure charged is the figure shown by construction.
 *
 * THE CEILING IS THE LADDER. 24 steps — $1,199.76 in the US — for the
 * whole order, not per line. A cart past it has no plan that charges it,
 * so it is refused here and the cart itself never lets one be built.
 *
 * The lines live on the checkout session and are copied onto the order by
 * the pipeline, which already trusts the session (not the payment host)
 * for everything about the buyer. The single-product fields stay filled
 * with the first line so nothing that reads them breaks. */
const MAX_CART_LINES = 12;

/** Merge duplicate slugs, drop junk, keep order. Quantities are packs. */
function normaliseLines(lines) {
  const out = [];
  for (const l of Array.isArray(lines) ? lines : []) {
    const slug = String((l && l.slug) || '').trim();
    const qty = Math.max(1, parseInt(l && l.quantity, 10) || 1);
    if (!slug) continue;
    const hit = out.find((x) => x.slug === slug);
    if (hit) hit.quantity += qty; else out.push({ slug, quantity: qty });
    if (out.length >= MAX_CART_LINES) break;
  }
  return out;
}

/** The single plan that charges a whole cart total, or null. */
async function resolveCartPlan(firstProduct, totalMinor, market) {
  try {
    const partnerExperience = await SiteConfig.getValue('partnerExperience', null);
    if (!partnerExperience || !partnerExperience.enabled) return null;
    const mkt = market || markets.defaultMarket();
    const site = partnerRotation.nextSite(partnerExperience, firstProduct, { amount: totalMinor, market: mkt.id });
    if (!site) return null;
    const chosen = partnerRotation.planFor(site, totalMinor, 1, mkt.id);
    if (!chosen) return null;
    return { whopPlanId: chosen.whopPlanId, amount: chosen.priceCents, currency: chosen.currency };
  } catch (err) {
    console.error('[checkout/session] cart plan lookup failed:', err.message);
  }
  return null;
}

/**
 * Prices a cart. One line is exactly priceFor (unchanged path); two or
 * more are priced line by line from the catalogue and charged as one plan.
 * Returns priceFor's shape — product/quantity/unitPrice describe the FIRST
 * line — plus `lines` for anything that shows the whole order.
 */
async function priceCart(lines, opts = {}) {
  const clean = normaliseLines(lines);
  if (!clean.length) return { ok: false, reason: 'not_found' };
  if (clean.length === 1) return priceFor(clean[0].slug, clean[0].quantity, opts);

  const market = markets.byId(opts.market) || markets.defaultMarket();
  const out = [];
  let total = 0;
  let currency = null;
  for (const l of clean) {
    const product = await Product.findOne({ slug: l.slug }).lean();
    if (!product) return { ok: false, reason: 'not_found' };
    const local = marketService.priceFor(product, market);
    if (!local) return { ok: false, reason: 'not_found', product };
    if (product.available === false) return { ok: false, reason: 'unavailable', product };
    if (opts.enforceStock && product.stockHold) return { ok: false, reason: 'sold_out', product, replacement: null };
    let quantity = orderCap.clamp(product, l.quantity, local.amount);
    if (process.env.STOCK_LEDGER === 'true' && opts.enforceStock && typeof product.stock === 'number' && product.stock > 0 && quantity > product.stock) {
      quantity = product.stock;
    }
    const release = preorderCfg.releaseInfo(product);
    out.push({
      product,
      slug: product.slug,
      title: product.title,
      imageUrl: product.imageUrl || (product.images && product.images[0]) || '',
      packSize: Math.max(1, parseInt(product.packSize, 10) || 1),
      quantity,
      unitPrice: local.amount,
      lineTotal: local.amount * quantity,
      isPreorder: preorderCfg.isActivePreorder(product),
      release,
    });
    total += local.amount * quantity;
    currency = local.currency;
  }

  /* The ceiling, stated in the default market's money where it is known
     exactly; every other market is held to the same 24 steps by the plan
     lookup below, which has no rung past it. */
  if (market.id === markets.defaultMarket().id && total > orderCap.MAX_ORDER_CENTS) {
    return { ok: false, reason: 'over_cap', product: out[0].product, total };
  }

  const plan = await resolveCartPlan(out[0].product, total, market);
  if (!plan) return { ok: false, reason: 'no_bundle_plan', product: out[0].product, total };

  const first = out[0];
  const preorderLine = out.find((x) => x.isPreorder) || null;
  return {
    ok: true,
    product: first.product,
    quantity: first.quantity,
    unitPrice: first.unitPrice,
    total,
    shippingCents: 0,
    taxCents: 0,
    market: market.id,
    currency: plan.currency || currency,
    whopPlanId: plan.whopPlanId,
    isPreorder: !!preorderLine,
    release: preorderLine ? preorderLine.release : first.release,
    lines: out,
  };
}

/** Prices whatever a session holds: its cart lines, or its one product. */
function priceForSession(session, opts = {}) {
  const lines = (session && Array.isArray(session.items)) ? session.items : [];
  if (lines.length > 1) return priceCart(lines, { market: session.market, ...opts });
  return priceFor(session.productSlug, session.quantity, { market: session.market, ...opts });
}

/** Creates a session for a whole cart (two or more products). */
async function startCart(lines, meta = {}) {
  const clean = normaliseLines(lines);
  if (clean.length < 2) {
    return clean.length ? start(clean[0].slug, clean[0].quantity, meta) : { ok: false, reason: 'not_found' };
  }
  const priced = await priceCart(clean, { market: meta.market });
  if (!priced.ok) return priced;

  const { doc, token } = await CheckoutSession.issue({
    checkoutId: meta.checkoutId || '',
    productSlug: priced.product.slug,
    items: priced.lines.map(itemRecord),
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

/** What a session stores about a priced line (the order copies it). */
function itemRecord(l) {
  return {
    slug: l.slug,
    title: l.title,
    quantity: l.quantity,
    packSize: l.packSize,
    unitPrice: l.unitPrice,
    lineTotal: l.lineTotal,
    imageUrl: l.imageUrl,
    /* Snapshot at purchase time: was this line an unreleased preorder, and
       when does it release. The confirmation page and email read these, so
       a mixed order says which items ship now and which ship on release. */
    isPreorder: !!l.isPreorder,
    releaseDisplay: (l.isPreorder && l.release && l.release.hasDate) ? l.release.display : '',
  };
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
  const priced = await priceForSession(session);
  if (!priced.ok) return { ok: false, reason: priced.reason, product: priced.product };

  if (priced.total !== session.total) {
    /* The price moved. Update the session and tell the caller, so Step 1
       can show the new figure and ask them to confirm rather than
       silently charging something they did not agree to. */
    session.unitPrice = priced.unitPrice;
    session.total = priced.total;
    session.whopPlanId = priced.whopPlanId;
    if (priced.lines) session.items = priced.lines.map(itemRecord);
    Object.assign(session, check.values);
    session.lastActivityAt = new Date();
    await session.save();
    return { ok: false, reason: 'price_changed', session, priced };
  }

  Object.assign(session, check.values);
  session.unitPrice = priced.unitPrice;
  session.total = priced.total;
  session.whopPlanId = priced.whopPlanId;
  if (priced.lines) session.items = priced.lines.map(itemRecord);
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
  priceCart,
  priceForSession,
  start,
  startCart,
  itemRecord,
  normaliseLines,
  MAX_CART_LINES,
  validateDetails,
  completeStep1,
  markHandedOff,
  markPaid,
  markFailed,
  resolveBundle,
  REQUIRED,
  SUBDIVISION_REQUIRED,
};
