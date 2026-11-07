/**
 * Turns a Product into the exact payload a channel receives.
 *
 * WHY THIS IS THE ONLY PLACE THAT DOES IT: the site already states a
 * shipping promise, a return window, a price, an availability and a set of
 * payment methods in several places — the product page, the Offer schema,
 * the policy pages. Merchant Center compares the feed against the landing
 * page and disapproves the item when they disagree, and "price mismatch"
 * and "availability mismatch" are the two most common reasons an otherwise
 * fine catalogue gets stuck.
 *
 * So this module reads the SAME config modules the storefront reads
 * (config/shipping, config/faq, config/company, config/preorder) rather
 * than restating any of it. A shipping rate cannot be right on the page and
 * wrong in the feed, because there is one copy of it.
 *
 * It deliberately does no validation and no network. It answers one
 * question — "what would we send for this product?" — so the preview, the
 * validator and the transport all look at the same object rather than
 * three approximations of it.
 */

const crypto = require('crypto');
const shipping = require('../../config/shipping');
const company = require('../../config/company');
const preorderCfg = require('../../config/preorder');
const markets = require('../../config/markets');
const marketService = require('../market');
const { RETURN_WINDOW_DAYS } = require('../../config/faq');
const distribution = require('../../config/distribution');
const site = require('../../config/site');
const productImage = require('../../helpers/productImage');
const variants = require('../variants');

const D = distribution.defaults;

function siteOrigin() {
  return site.origin();
}

/** Money as Google wants it: a decimal string plus a currency. */
function price(amount, currency = 'USD') {
  /* MICROS ARE A MILLIONTH OF A MAJOR UNIT, not of a cent — so the factor
     depends on how many minor units the currency has. USD cents are
     ×10,000; JPY has no minor unit at all, so ¥15000 is 15000 major units
     and ×1,000,000. Using one factor for both understates every yen price
     by a hundredfold, which Google accepts happily and charges nobody for
     until a customer sees it. */
  const decimals = markets.currency(currency).decimals;
  const factor = decimals === 0 ? 1000000 : 10000;
  return { amountMicros: String(Math.round(Number(amount || 0) * factor)), currencyCode: currency };
}

/** Human-readable version of the same figure, for the preview. */
function priceDisplay(amount, currency = 'USD') {
  const c = markets.currency(currency);
  const n = Number(amount || 0);
  return `${c.decimals === 0 ? Math.round(n) : (n / 100).toFixed(2)} ${currency}`;
}

/**
 * Plain text from stored HTML.
 * Google rejects markup in `description` and truncates at 5000 characters.
 * Entities are decoded because "&amp;" reaching a feed renders literally in
 * a Shopping listing.
 */
function plainText(html, limit = 5000) {
  const text = String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.length > limit ? text.slice(0, text.lastIndexOf(' ', limit)).trim() : text;
}

/**
 * Absolute URL. A relative image_link is an automatic disapproval.
 *
 * The protocol-relative case is handled FIRST and separately. A `//host/x`
 * URL works in a browser, which is why it survives in stored data, but it
 * is not relative to this site — prefixing the site origin produces
 * `https://gogetcards.com//cdn.shopify.com/x.jpg`, a URL that 404s while
 * looking perfectly well-formed in the feed. Google fetches image_link with
 * its own crawler, so nothing on the storefront would ever reveal it.
 */
function absolute(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return 'https:' + trimmed;
  return siteOrigin() + (trimmed.startsWith('/') ? '' : '/') + trimmed;
}

/**
 * A GTIN as Google parses it: digits only.
 *
 * Barcodes are commonly copied off a label with the grouping spaces or
 * dashes intact. The validator already strips those before checking the
 * length, so a grouped GTIN reads as valid there — which means without this
 * the feed would send `820 650-85041 1`, Google would reject it as
 * malformed, and the panel would insist the product was fine.
 */
function gtin(value) {
  const digits = String(value || '').replace(/[\s-]/g, '');
  return /^\d{8}$|^\d{12,14}$/.test(digits) ? digits : String(value || '').trim();
}

/**
 * Google's availability enum.
 *
 * PREORDER is a distinct value from IN_STOCK and using the wrong one is the
 * availability misrepresentation that gets accounts suspended rather than
 * items disapproved — Google can see the landing page says "not yet
 * released". A preorder additionally requires availabilityDate.
 */
function availability(product) {
  if (!product.available) return 'OUT_OF_STOCK';
  /* STOCKHOLD IS DELIBERATELY NOT CONSULTED HERE. This is not an
     oversight and it is not a bug — do not "fix" it by adding the check.

     A held product (Product.stockHold) cannot be fulfilled and its
     checkout refuses at the payment step, but the feed reports whatever
     `available` and `preorder` say, exactly as it does for every other
     product. The owner decided this on 2026-08-22, having been told the
     consequence: the feed and the landing page then agree with each other
     and both disagree with the checkout, so this stops being an
     availability MISMATCH that disapproves one item and becomes an
     availability MISREPRESENTATION, which is an account-level action.

     The lever is `available`. Unticking it reports OUT_OF_STOCK from the
     line above and refuses at session start — that is the honest path and
     it is one click away. */
  /* in_stock / preorder / backorder, decided in one place so the feed, the
     schema and the landing page agree. A released-but-still-flagged product
     is a backorder, not a preorder (see config/preorder.js). */
  return preorderCfg.availabilityState(product);
}

/**
 * Shipping for the countries this feed TARGETS, from config/shipping.js.
 *
 * The same source data the Offer schema uses, mapped into Google's field
 * names, so both change together when the shipping policy changes.
 *
 * FILTERED TO THE TARGET COUNTRY, which is the part worth explaining. The
 * store genuinely ships to thirty-two countries and the product page says
 * so, correctly — that is a fact about the business. The FEED is a
 * different statement: it is submitted under one feed label, `US`, and
 * describes what is on sale in that one market. Declaring delivery
 * services for thirty-one countries the feed does not target adds nothing
 * Google will act on, multiplies every item's size by thirty-two, and
 * invites an "invalid shipping country" warning for entries outside the
 * targeted market.
 *
 * Expanding to a second market is a matter of listing it in
 * config/distribution's targetCountries; this function follows from that
 * rather than needing to be found and edited. Canada is declared there now,
 * so every item carries a US and a CA delivery service and one feed file
 * can be submitted under both markets.
 */
/**
 * A shipping row for EVERY country this feed serves.
 *
 * NOT ONE ROW FOR THE FEED'S PRIMARY COUNTRY. A feed that covers the six
 * euro countries has to declare delivery for all six: Google validates a
 * row against the country it is serving an impression in, and a missing
 * one is "no shipping information for <country>" — the listing simply does
 * not run there, silently, in exactly the market you meant to open.
 *
 * The currency has to match the feed's, not the store's. A euro feed
 * quoting a USD shipping price is a currency mismatch even at zero.
 */
/** Is this the storefront on the bare URL? */
function isDefault(m) {
  return !!m && m.id === markets.defaultMarket().id;
}

function shippingRows(target = D.targetCountries || D.targetCountry, currencyCode = 'USD') {
  const wanted = new Set(Array.isArray(target) ? target : [target]);
  return shipping.REGIONS.filter((r) => r.countries.length).flatMap((r) =>
    r.countries.filter((c) => wanted.has(c)).map((country) => ({
      country,
      service: r.carrier,
      price: { amountMicros: '0', currencyCode },
      minHandlingTime: '0',
      maxHandlingTime: String(shipping.DISPATCH.inStockBusinessDays),
      minTransitTime: String(r.transitDays[0]),
      maxTransitTime: String(r.transitDays[1]),
    }))
  );
}

/** The store's return policy, in Google's shape. */
function returnPolicy() {
  return {
    /* One country on purpose. A return policy is the merchant's own, filed
       against the country the business operates FROM — where the parcel goes
       back to — not against every market the feed serves. */
    countryCode: company.business.countryCode || D.targetCountry,
    returnPolicyDays: RETURN_WINDOW_DAYS,
    returnPolicyUri: `${siteOrigin()}/refund-policy`,
  };
}

/**
 * The title Google receives.
 *
 * Falls back to the product title, which is already written for humans and
 * usually correct. Google truncates at 150 characters, and truncation in
 * the middle of a set name is worse than a shorter, complete title, so an
 * over-long derived title is cut on a word boundary rather than mid-word.
 * An explicit override always wins and is never trimmed silently.
 *
 * A VARIANT'S NAME IS PART OF THE DERIVED TITLE, because two boxes in one
 * group otherwise reach Google under the same title and it has no way to
 * show a shopper which one they found. The override is left alone: someone
 * who typed a title by hand has already decided what it says.
 */
function title(product) {
  const raw = (product.merchant && product.merchant.title)
    || variants.displayTitle(product)
    || product.title || '';
  let clean = raw.replace(/\s+/g, ' ').trim();
  /* A pack-sold product's price is the pack's, so the title says so:
     a title that reads as one unit beside a four-unit price is a price
     mismatch to a reviewer. Only when the title does not already. */
  const pack = parseInt(product.packSize, 10) > 1 ? parseInt(product.packSize, 10) : 0;
  if (pack && !(product.merchant && product.merchant.title)
      && !new RegExp(`\\b(pack of ${pack}|${pack}[- ]pack|x ?${pack})\\b`, 'i').test(clean)) {
    /* Before the " – detail" tail when there is one, so the pack is in
       the part of the title an ad actually shows. */
    const dash = clean.indexOf(' – ');
    clean = dash === -1 ? `${clean} (Pack of ${pack})` : `${clean.slice(0, dash)} (Pack of ${pack})${clean.slice(dash)}`;
  }
  if (clean.length <= 150) return clean;
  return clean.slice(0, clean.lastIndexOf(' ', 150)).trim();
}

function description(product) {
  const override = product.merchant && product.merchant.description;
  if (override) return plainText(override);

  /* A price written into the description goes stale the day the price
     moves and reaches Google verbatim. The import wrote "Sold in packs of
     N: N units for $X, $Y each."; the pack is stated by `multipack` and
     the title instead. */
  const base = plainText(product.description)
    .replace(/\s*Sold in packs of \d+:[^.]*\$[\d.,]+[^.]*\.\s*/g, ' ')
    .replace(/\s*Preorder\. Expected release[^]*?(full refund any time before dispatch\.|dispatch\.)/g, ' ')
    .trim();
  /* A description built only from marketing copy loses the facts a
     Shopping shopper filters on. These are appended from real fields, and
     only when they are set, so nothing is invented. */
  const facts = [];
  if (product.language) facts.push(`Language: ${product.language}`);
  if (product.edition) facts.push(`Edition: ${product.edition}`);
  if (product.setCode) facts.push(`Set: ${product.setCode}`);
  facts.push('Condition: factory sealed');
  if (parseInt(product.packSize, 10) > 1) facts.push(`Sold as a pack of ${parseInt(product.packSize, 10)}; the price is for the pack`);
  /* A preorder fact is added only while the product is an ACTIVE preorder
     (flagged AND not yet released). The moment the release date passes the
     product is in stock, so its description must not keep calling it a
     preorder — that would be the availability misrepresentation Google
     acts on at account level. A released product awaiting restock is a
     backorder, which is set per-product via availabilityOverride. */
  if (preorderCfg.isActivePreorder(product)) {
    const rel = preorderCfg.releaseInfo(product);
    facts.push(rel.hasDate ? `Preorder, releases ${rel.display}` : 'Preorder, not yet released');
  } else if (preorderCfg.isBackorder(product)) {
    const rel = preorderCfg.releaseInfo(product);
    facts.push(`Backorder, expected to ship by ${preorderCfg.displayIso(preorderCfg.expectedAvailability(product))}`);
  }
  const tail = facts.join('. ') + '.';
  return plainText(base ? `${base}\n\n${tail}` : tail);
}

/** Every image, main first, deduplicated, absolute. */
function images(product) {
  const override = product.merchant && product.merchant.imageLink;
  const all = [override || product.imageUrl, ...(product.images || [])]
    .filter(Boolean)
    .map(absolute)
    /* Google wants a large, sharp image; the hosted links carry width=800.
       Shopify returns the original when it is smaller, never an upscale. */
    .map((u) => productImage.at(u, 1600))
    /* Photos this app hosts are served as WebP for browsers; the feed asks
       for JPEG on white (Google's preferred background, a tenth of the
       bytes of a transparent PNG at this size). */
    .map((u) => (/\/images\/products\//.test(u) ? u.replace('fmt=webp', 'fmt=jpeg') : u));
  return [...new Set(all)];
}

/**
 * Builds the channel-neutral view of a product.
 * Provider modules map this into their own field names; nothing here is
 * Google-specific except the taxonomy defaults, which are overridable.
 */
function build(product, { channel = 'google', market = null, country = null } = {}) {
  const m = product.merchant || {};
  const origin = siteOrigin();
  /* availabilityDate is required for PREORDER and BACKORDER and must never
     be sent for an in-stock item. It is driven off the derived state (which
     advances by the calendar) rather than the raw preorder flag, so a
     product whose release date has passed is in stock and carries no date. */
  const availState = preorderCfg.availabilityState(product);
  const wantsAvailabilityDate = availState === 'PREORDER' || availState === 'BACKORDER';
  const rel = preorderCfg.releaseInfo(product);
  const imgs = images(product);
  /* A pack is pictured as a pack: the composite of N copies leads, the
     single photo follows as an additional image. services/multipackImage. */
  const packImage = require('../multipackImage').urlFor(product, origin);
  const feedImgs = packImage ? [packImage, ...imgs] : imgs;

  /* ── The market this row is for ────────────────────────────────────
     Defaults to the US, so every existing caller keeps producing exactly
     the feed it produces today. When a market is given, the price, the
     currency and the link all come from it — from the SAME
     marketService.priceFor the landing page renders — because the one
     check a price-mismatch disapproval performs is fetching `link` and
     comparing what it finds against `price`. Deriving them separately is
     how they drift.

     offerId gets the market suffix for anything but the default. Google
     keys an offer on id + feed, and two feeds carrying one id with two
     currencies is the same offer submitted twice. */
  const mkt = market || markets.defaultMarket();
  /* WHICH COUNTRY'S FEED THIS ROW IS FOR. One market can produce several:
     the euro storefront is submitted separately to Germany, the
     Netherlands, Ireland, Belgium, Austria and Finland. Every one of them
     carries the same link and the same euro price — it is the same offer —
     and differs only in the feed it is filed under, which is what makes
     them six campaigns instead of one. */
  /* ONE FEED PER STOREFRONT, WHICH IS ONE FEED PER CURRENCY. The euro
     feed covers Germany, the Netherlands, Ireland, Belgium, Austria and
     Finland in a single submission, because a Merchant Center feed may
     serve several countries as long as its currency is accepted in all of
     them — which is exactly what a currency zone is.

     THIS DOES NOT COST PER-COUNTRY CAMPAIGNS. Country targeting is a
     campaign setting in Google Ads, not a property of the feed: one euro
     feed still supports six campaigns with six budgets. Nine feeds bought
     nothing that six campaigns pointed at one feed do not already give. */
  /* LEGACY COUNTRIES ON THE DEFAULT FEED. Canada is currently submitted
     against /feed/google.xml with USD prices — that arrangement predates
     markets and is live in Merchant Center right now — so the default
     feed keeps declaring shipping for whatever config/distribution lists,
     and today's Canadian listings keep running.

     When Canada is opened properly as its own CAD storefront, drop 'CA'
     from distribution.defaults.targetCountries and repoint the Canadian
     feed at /feed/ca/google.xml. Until then both would be true at once:
     Canada served in USD from the US feed and in CAD from its own. That
     is the one combination to avoid, which is why opening the market is a
     deliberate act rather than a side effect of this deploy. */
  const served = isDefault(mkt)
    ? [...new Set([...(mkt.countries || []), ...(D.targetCountries || [])])]
    : (mkt.countries || [mkt.feedLabel]);
  const isDefaultMarket = isDefault(mkt);
  const local = marketService.priceFor(product, mkt);
  /* NO PRICE IN THIS MARKET MEANS NO ROW, and returning null is the only
     safe answer. The tempting alternative — fall back to the US figure —
     puts a USD amount in a CAD feed pointing at a `/ca/` URL that 404s,
     which is a price mismatch and a broken landing page in one row. It
     also fails quietly, because a feed with a wrong price still
     validates. The caller filters nulls; anything that forgets to gets a
     TypeError immediately rather than a bad row six weeks later. */
  if (!local) return null;
  const baseId = product.sku || product.slug;

  const payload = {
    // Stable across syncs. Changing it orphans the old entry in Google.
    /* Suffixed per storefront. An id need only be unique within its own
       feed, so this could be bare — but a distinct id means a disapproval
       names the market it came from instead of leaving you to guess. The
       default market keeps its bare id so every live US listing survives. */
    offerId: isDefaultMarket ? baseId : `${baseId}-${mkt.id.toLowerCase()}`,
    contentLanguage: mkt.language || D.contentLanguage,
    feedLabel: mkt.feedLabel || D.targetCountry,
    channel: D.channel,

    title: title(product),
    description: description(product),
    link: `${origin}${markets.path(mkt, `/products/${product.slug}`)}`,
    imageLink: feedImgs[0] || '',
    additionalImageLinks: feedImgs.slice(1, 11), // Google accepts 10 extras

    /* A market row where the product is withdrawn reports out of stock
       rather than vanishing: pulling the row entirely would make Google
       re-crawl it as a new offer when it came back, losing its history. */
    availability: local.available === false ? 'OUT_OF_STOCK' : availability(product),
    condition: D.condition,
    price: price(local.amount, local.currency),

    brand: product.brand || product.vendor || '',
    ...(product.gtin ? { gtin: gtin(product.gtin) } : {}),
    ...(product.mpn ? { mpn: product.mpn } : {}),
    ...(product.sku ? { sku: product.sku } : {}),

    /* Declared false ONLY when the product genuinely has no identifier.
       Sending false while a GTIN exists tells Google to stop trying to
       match a product that is in its catalogue, which costs impressions. */
    identifierExists: (product.gtin || product.mpn)
      ? true
      : (m.identifierExists === false ? false : true),

    googleProductCategory: m.googleCategory || D.googleCategoryId,
    productTypes: [m.googleProductType || [product.vendor, product.productType].filter(Boolean).join(' > ')]
      .filter(Boolean),

    shipping: shippingRows(served, local.currency),
    returnPolicy: returnPolicy(),

    ...(product.language ? { productDetails: [
      { sectionName: 'Details', attributeName: 'Language', attributeValue: product.language },
      ...(product.edition ? [{ sectionName: 'Details', attributeName: 'Edition', attributeValue: product.edition }] : []),
      ...(product.setCode ? [{ sectionName: 'Details', attributeName: 'Set code', attributeValue: product.setCode }] : []),
    ] } : {}),

    /* Variant grouping. Two boxes of one manufactured item share a GTIN
       and an MPN, and Google reads two ungrouped offers carrying the same
       GTIN as the same listing submitted twice — it keeps one and
       suppresses the other. item_group_id plus one differing variant
       attribute is what tells it they are alternatives rather than
       duplicates, and it is the only arrangement in which a shared
       barcode is allowed. Empty for a standalone product. */
    ...variants.feedFields(product),

    ...(wantsAvailabilityDate && rel.hasDate ? { availabilityDate: `${preorderCfg.expectedAvailability(product)}T00:00:00Z` } : {}),
    ...(m.shippingLabel ? { shippingLabel: m.shippingLabel } : {}),
    ...(m.taxCategory ? { taxCategory: m.taxCategory } : {}),
    ...(m.isBundle ? { isBundle: true } : {}),
    /* A pack-sold product is a multipack to Google: the price is the
       pack's, so the listing must say how many units it buys. An explicit
       merchant override still wins. See helpers/packs.js. */
    ...(m.multipack > 0 ? { multipack: String(m.multipack) }
      : (parseInt(product.packSize, 10) > 1 ? { multipack: String(parseInt(product.packSize, 10)) } : {})),
    ...(m.adult ? { adult: true } : {}),
    ...(m.excludedDestinations && m.excludedDestinations.length
      ? { excludedDestinations: m.excludedDestinations } : {}),
    /* Campaign grouping. The whole catalogue is listed; ads are run on a
       chosen set. The "launch-30" tag (set in the import CSV) marks that
       set; everything else is catalog_only, which a Shopping campaign can
       exclude. Both values travel in the feed so they survive a re-fetch. */
    customLabel0: (product.tags || []).some((t) => /^launch[-_]30$/i.test(String(t))) ? 'launch_30' : 'catalog_only',
    /* Pack-sold or single: a campaign can bid differently, or leave packs
       out, without touching the product data. */
    customLabel1: parseInt(product.packSize, 10) > 1 ? 'multipack' : 'single',
    /* Unit pricing: Google shows "US$66.65 / ct" beside the pack price in
       the ad, which is the per-unit figure a shopper compares on. "ct"
       (count) is Google's unit for pieces. */
    ...(parseInt(product.packSize, 10) > 1
      ? { unitPricingMeasure: `${parseInt(product.packSize, 10)} ct`, unitPricingBaseMeasure: '1 ct' }
      : {}),
  };

  return payload;
}

/**
 * Fingerprint of what would be sent.
 *
 * Stored after a successful sync so the next run can skip products that
 * have not changed. That is not only a speed matter: Merchant API quota is
 * per-day, and re-pushing an unchanged catalogue every night is how a store
 * runs out of it and then cannot push the one product that did change.
 */
function hash(payload) {
  return crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

/**
 * Whether a product is meant to go to this channel at all.
 *
 * Two modes, because "everything except these" and "only these" are
 * genuinely different intentions and a store that lists part of its
 * catalogue on purpose should not have to maintain the inverse of its own
 * decision every time it adds a product.
 *
 *   'all'      excluded when merchant.excluded[channel] is set.
 *   'selected' excluded UNLESS merchant.included[channel] is set. A new
 *              product is therefore not advertised until somebody says so,
 *              which is the safe direction for this mode to fail in.
 */
function isExcluded(product, channel = 'google', { selectionMode = 'all' } = {}) {
  const m = product.merchant || {};
  if (selectionMode === 'selected') {
    return !(m.included && m.included[channel]);
  }
  return !!(m.excluded && m.excluded[channel]);
}

module.exports = {
  build,
  hash,
  isExcluded,
  // exported for the preview panel and the validators
  title,
  description,
  images,
  availability,
  plainText,
  absolute,
  gtin,
  priceDisplay,
  siteOrigin,
};
