/**
 * Feed validation: catch what Google would reject, before sending it.
 *
 * Each check returns an issue carrying four things, because a bare error
 * string is useless to whoever has to fix it:
 *
 *   severity  'error'   blocks submission. Google would reject the item, so
 *                       sending it burns quota and puts a disapproval on
 *                       the account's record.
 *             'warning' submits, but competes badly or risks a later
 *                       review.
 *             'info'    worth knowing, costs nothing.
 *   why       what Google does about it and why it cares.
 *   fix       the specific action, naming the field.
 *   field     which product field to jump to.
 *
 * A validator that says "invalid product" teaches nobody anything. This one
 * is written so the admin panel can render the reason next to the fix.
 */

const feedBuilder = require('./feedBuilder');
const preorderCfg = require('../../config/preorder');
const { RETURN_WINDOW_DAYS } = require('../../config/faq');

const issue = (code, severity, message, why, fix, field) =>
  ({ code, severity, message, why, fix, field });

/* ── TCG product-type detection ────────────────────────────
   Used by several checks and by the readiness panel. Ordered most specific
   first: a "collector booster box" is a booster box, and a "booster case"
   is a case rather than a box, so a naive substring match on "booster box"
   would mislabel half the catalogue. */
const TCG_TYPES = [
  { id: 'case',        label: 'Case / Display',      test: /\b(case|master case|display case|shipper)\b/i },
  { id: 'booster-box', label: 'Booster Box',         test: /\bbooster box\b|\bdisplay box\b/i },
  /* Sports card configurations (Topps, Panini, Bowman). A "Jumbo Hobby
     Box" and a "Mega Box" are hobby-channel and retail-channel boxes of
     the same set, which is the first thing a sports buyer filters on. */
  { id: 'hobby-box',   label: 'Hobby / Retail Box',  test: /\bhobby box\b|\bjumbo box\b|\bmega box\b|\bblaster box\b|\bhanger box\b|\bcello box\b/i },
  { id: 'etb',         label: 'Elite Trainer Box',   test: /\belite trainer box\b|\betb\b/i },
  { id: 'trove',       label: 'Illumineer’s Trove', test: /\btrove\b/i },
  { id: 'premium',     label: 'Premium Collection',  test: /\b(ultra[- ]premium|premium|figure|special) collection\b/i },
  { id: 'bundle',      label: 'Bundle',              test: /\bbundle\b|\bcollection box\b|\bgift set\b|\bcollection\b/i },
  { id: 'tin',         label: 'Tin',                 test: /\btin\b/i },
  { id: 'prerelease',  label: 'Prerelease Kit',      test: /\bprerelease\b|\bbuild (&|and) battle\b/i },
  { id: 'starter',     label: 'Starter / Deck',      test: /\b(starter deck|structure deck|theme deck|battle deck|commander deck|draft night|jumpstart|deck)\b/i },
  { id: 'pack',        label: 'Booster Pack',        test: /\bbooster pack\b|\bpack\b|\bblister\b/i },
  { id: 'single',      label: 'Single Card',         test: /\bsingle\b|\bgraded\b|\bpsa\b|\bbgs\b/i },
];

function detectTcgType(product) {
  const haystack = `${product.title || ''} ${product.productType || ''}`;
  return TCG_TYPES.find((t) => t.test.test(haystack)) || null;
}

/* Publishers whose names Google matches against its catalogue. Feeding
   "pokemon" where the catalogue holds "The Pokémon Company" costs the
   match. Keys are lowercase and accent-stripped for comparison. */
const BRAND_CANON = {
  'pokemon': 'The Pokémon Company',
  'the pokemon company': 'The Pokémon Company',
  'nintendo': 'Nintendo',
  'bandai': 'Bandai',
  'konami': 'Konami',
  'wizards of the coast': 'Wizards of the Coast',
  'wotc': 'Wizards of the Coast',
  'hasbro': 'Hasbro',
  /* Publisher of the Palworld Official Card Game, Cardfight!! Vanguard and
     Weiss Schwarz. One word, no space — "Bushi Road" is the common miss and
     lands on the same canonical spelling. */
  'bushiroad': 'Bushiroad',
  'bushi road': 'Bushiroad',
  'ravensburger': 'Ravensburger',
  /* Sports card manufacturers. Bowman is a Topps line, but distributors and
     checklists name it as the brand, so it is accepted as one. */
  'topps': 'Topps',
  'bowman': 'Bowman',
  'panini': 'Panini',
  'panini america': 'Panini',
  'fanatics': 'Fanatics',
  'upper deck': 'Upper Deck',
  'upperdeck': 'Upper Deck',
  'upper deck': 'Upper Deck',
  'topps': 'Topps',
  'panini': 'Panini',
};

/* Acronyms this category writes in capitals legitimately. Anything here is
   never treated as shouting and never decapitalised. */
const TITLE_ACRONYMS = /^(TCG|ETB|MTG|OP|SV|PSA|BGS|CGC|UPC|EAN|GTIN|MPN|NM|LP|MP|HP|GX|EX|VMAX|VSTAR|CCG|OCG|JP|EN|KR|II|III|IV|VI|VII|VIII|IX|XI|XII)$/;

/* Ordinary product vocabulary that a shouting title capitalises.
 *
 * WHY A WORD LIST RATHER THAN A LENGTH THRESHOLD: "BOOSTER BOX" needs
 * fixing and "BOX" is only three letters, but a blanket three-letter rule
 * would mangle the set codes this category is full of — SVI, PAL, OBF, MEW,
 * PAR, TWM, SCR are all real Pokémon sets and all correctly capitalised.
 * There is no way to tell those apart by shape, so the list names the words
 * that are English rather than codes. The generic six-letter rule below
 * still catches anything long enough to be unambiguous.
 */
const SHOUTED_WORDS = new Set([
  'BOX', 'BOXES', 'CASE', 'CASES', 'PACK', 'PACKS', 'TIN', 'TINS', 'DECK', 'DECKS',
  'SET', 'SETS', 'LOT', 'CARD', 'CARDS', 'NEW', 'HOT', 'RARE', 'MINT', 'SEALED',
  'ELITE', 'BOOSTER', 'BUNDLE', 'DISPLAY', 'TRAINER', 'COLLECTION', 'STARTER',
  'SINGLE', 'SINGLES', 'EDITION', 'FACTORY', 'ENGLISH', 'JAPANESE', 'KOREAN',
  'PROMO', 'PREORDER', 'ORDER', 'FREE', 'SHIPPING', 'STOCK', 'SALE', 'DEAL',
]);

/**
 * Whether a single word is capitalised for emphasis rather than because it
 * is an acronym. Shared with autofix so the check and the repair cannot
 * disagree about what counts as shouting.
 */
function isShouted(word) {
  const core = String(word || '').replace(/[^A-Za-z]/g, '');
  if (core.length < 3) return false;
  if (core !== core.toUpperCase()) return false;
  if (TITLE_ACRONYMS.test(core)) return false;
  return SHOUTED_WORDS.has(core) || core.length >= 6;
}

function canonicalBrand(value) {
  const key = String(value || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  return BRAND_CANON[key] || null;
}

/**
 * Runs every check against one product.
 * @returns {{issues: object[], errors: number, warnings: number, score: number,
 *            eligible: boolean, tcgType: object|null}}
 */
function validate(product, opts = {}) {
  const { channel = 'google', imageProbe = null, selectionMode = 'all' } = opts;
  const issues = [];
  const payload = feedBuilder.build(product, { channel, market: opts.market, country: opts.country });
  /* Not priced in this market at all — not an error, just not part of
     this market's catalogue. Reported as ineligible so the panel can say
     so rather than the product silently disappearing. */
  if (!payload) {
    return { eligible: false, errors: [{ field: 'price', message: `No price set for the ${(opts.market && opts.market.id) || 'US'} market` }], warnings: [], payload: null, product };
  }
  const m = product.merchant || {};
  const isPreorder = preorderCfg.isPreorder(product);
  const tcgType = detectTcgType(product);

  /* ── Identity and identifiers ── */
  if (product.gtin) {
    /* GS1 mod-10 check digit. Google validates it and rejects the item;
       better to refuse the row here than to learn from a disapproval. */
    const d = String(product.gtin).replace(/[\s-]/g, '');
    const ok = /^(\d{8}|\d{12,14})$/.test(d)
      && d.split('').reverse().reduce((sum, c, i) => sum + Number(c) * (i === 0 ? 1 : (i % 2 ? 3 : 1)), 0) % 10 === 0;
    if (!ok) {
      issues.push(issue('gtin_check_digit', 'error',
        `GTIN "${product.gtin}" fails its check digit`,
        'Google validates the check digit and disapproves an item whose GTIN fails it.',
        'Re-copy the barcode from the product, or clear the field.',
        'gtin'));
    }
  }
  if (!payload.brand) {
    issues.push(issue('brand_missing', 'error',
      'No brand',
      'Google requires a brand for any product made by a recognisable manufacturer, and sealed TCG product always is. Without it the item cannot be matched to Google\'s catalogue and is commonly disapproved outright.',
      'Set Brand on the product, or Vendor, which brand falls back to. For sealed product this is the publisher or manufacturer: The Pokémon Company, Bandai, Wizards of the Coast, Ravensburger, Topps, Panini.',
      'brand'));
  } else {
    const canon = canonicalBrand(payload.brand);
    if (canon && canon !== payload.brand) {
      issues.push(issue('brand_noncanonical', 'warning',
        `Brand "${payload.brand}" is not the catalogue spelling`,
        'Google matches on the manufacturer name as it appears in its own catalogue. A near-miss spelling still submits but competes as an unmatched product.',
        `Change Brand to "${canon}".`,
        'brand'));
    }
  }

  if (!product.gtin && !product.mpn) {
    if (m.identifierExists === false) {
      issues.push(issue('identifier_declared_absent', 'info',
        'Declared as having no identifier',
        'Correct for something a retailer assembled, and wrong for anything with a barcode. Google stops looking for a catalogue match when this is set.',
        'If this product has a barcode on the case, clear the declaration and enter the GTIN instead.',
        'gtin'));
    } else {
      issues.push(issue('gtin_missing', 'warning',
        'No GTIN or MPN',
        'Sealed TCG product carries a barcode, so Google expects one. Items without an identifier are eligible but rank behind matched competitors for the same product, and Merchant Center reports them under "limited performance".',
        'Copy the barcode from the case into GTIN. If this really is a retailer-assembled bundle with no barcode, set "no identifier exists" instead.',
        'gtin'));
    }
  }
  if (product.gtin && !/^\d{8}$|^\d{12,14}$/.test(String(product.gtin).replace(/\s|-/g, ''))) {
    issues.push(issue('gtin_malformed', 'error',
      `GTIN "${product.gtin}" is not a valid length`,
      'A GTIN must be 8, 12, 13 or 14 digits and Google validates the check digit. A malformed one is rejected; a well-formed but wrong one resolves to somebody else\'s product, which is a misrepresentation finding rather than a data error.',
      'Re-copy the digits from the barcode, without spaces or dashes.',
      'gtin'));
  }

  /* ── Title ── */
  const rawTitle = (m.title || product.title || '').trim();
  if (!rawTitle) {
    issues.push(issue('title_missing', 'error', 'No title',
      'A product without a title cannot be submitted.',
      'Set the product title, or a Google title override.', 'title'));
  } else {
    if (rawTitle.length > 150) {
      issues.push(issue('title_long', 'warning',
        `Title is ${rawTitle.length} characters; Google shows about 150`,
        'Google truncates at 150 characters. On a long set name the cut usually lands mid-phrase, which reads as a broken listing.',
        'Add a Google title override that fits, leading with brand and set name.',
        'merchant.title'));
    }
    const shouted = rawTitle.split(/\s+/).filter(isShouted);
    if (shouted.length) {
      issues.push(issue('title_shouting', 'warning',
        `Title shouts: ${shouted.join(', ')}`,
        'Google\'s editorial rules prohibit gratuitous capitalisation and will disapprove a title that reads as shouting.',
        'Use sentence or title case. Set codes and acronyms are left alone; the automatic fix will correct the rest.',
        'merchant.title'));
    }
    /* Repeated or trailing exclamation marks are shouting; one inside a
       set name ("Attack of the Vine!") is the product's name. */
    if (/!{2,}|!\s*$|\bfree shipping\b|\bbest price\b|\bsale\b|\bbuy now\b/i.test(rawTitle)) {
      issues.push(issue('title_promotional', 'error',
        'Title contains promotional text',
        'Promotional language in a title ("free shipping", "sale", "buy now", exclamation marks) is an editorial violation and Google disapproves the item.',
        'Move the offer out of the title. Shipping is declared as a shipping attribute, which is where Google reads it.',
        'merchant.title'));
    }
  }

  /* ── Description ── */
  const desc = payload.description || '';
  if (!desc || desc.length < 40) {
    issues.push(issue('description_thin', 'error',
      'Description is missing or too short',
      'Google requires a description and uses it for matching. A near-empty one is rejected, and a thin one loses queries the product would otherwise match.',
      'Write the product description on the product, or set a Google description override.',
      'description'));
  } else if (desc.length > 5000) {
    issues.push(issue('description_long', 'warning',
      'Description exceeds 5000 characters and will be truncated',
      'Google cuts at 5000 characters.',
      'Shorten it, or set a Google description override.', 'merchant.description'));
  }
  if (/<[a-z][\s\S]*>/i.test(m.description || '')) {
    issues.push(issue('description_html', 'warning',
      'Description override contains HTML',
      'Google strips markup and can mangle the text around it.',
      'Use plain text in the override. The storefront description keeps its HTML.',
      'merchant.description'));
  }

  /* ── Images ── */
  const imgs = payload.additionalImageLinks
    ? [payload.imageLink, ...payload.additionalImageLinks].filter(Boolean)
    : [payload.imageLink].filter(Boolean);
  if (!payload.imageLink) {
    issues.push(issue('image_missing', 'error', 'No image',
      'An item with no image cannot be submitted at all.',
      'Add a product image, or a Google image override.', 'imageUrl'));
  } else if (!/^https?:\/\//i.test(payload.imageLink)) {
    issues.push(issue('image_relative', 'error', 'Image URL is not absolute',
      'Google fetches images from its own crawlers and cannot resolve a relative path.',
      'Use a full https:// URL.', 'imageUrl'));
  }

  /* Image hosting. Not a Google rule, and deliberately 'info' so it never
     touches the score — but it is the single largest standing risk to this
     catalogue's approval status, and it is invisible until the day it
     fires. If image_link points at a CDN belonging to a store this business
     does not control, that store can delete the product and every listing
     using the image is disapproved with no warning and no way to fix it
     except re-uploading. See docs/image-hosting.md. */
  if (payload.imageLink && /^https?:\/\//i.test(payload.imageLink)) {
    let host = '';
    try { host = new URL(payload.imageLink).hostname; } catch { /* covered by image_relative */ }
    const ownHost = (() => { try { return new URL(feedBuilder.siteOrigin()).hostname; } catch { return ''; } })();
    if (host && ownHost && host !== ownHost && !host.endsWith('.' + ownHost)) {
      issues.push(issue('image_third_party_host', 'info',
        `Image is hosted on ${host}`,
        'Google fetches image_link from that host on its own schedule. Whoever controls it can remove the file at any time, and the first sign is a disapproval — not a broken product page, because the storefront reads the same URL and fails the same way only after a cache expires.',
        'Fine while the host is reliable. Re-host the image under your own domain before this becomes the reason a listing disappears.',
        'imageUrl'));
    }
  }

  /* Probe results are supplied by the caller so validation stays
     synchronous and network-free by default; the dashboard fetches them in
     a batch. An unreachable image is one of the most common disapproval
     causes and is invisible until Google tries. */
  if (imageProbe) {
    if (imageProbe.ok === false) {
      issues.push(issue('image_unreachable', 'error',
        `Image did not load (${imageProbe.status || imageProbe.error || 'no response'})`,
        'Google crawls image_link separately from the landing page. An image that 404s, times out, or is blocked by robots.txt disapproves the item, and this is invisible from the storefront if the browser has it cached.',
        'Re-upload the image or point image_link at a URL under your own control.',
        'imageUrl'));
    } else if (imageProbe.width && imageProbe.width < 100) {
      issues.push(issue('image_small', 'error',
        `Image is ${imageProbe.width}x${imageProbe.height}; Google requires at least 100x100`,
        'Below 100x100 for non-apparel, Google rejects the image.',
        'Supply an image of at least 800x800 for good Shopping presentation.',
        'imageUrl'));
    } else if (imageProbe.width && imageProbe.width < 800) {
      issues.push(issue('image_lowres', 'warning',
        `Image is ${imageProbe.width}x${imageProbe.height}`,
        'Google accepts it, but Shopping surfaces render around 800px and an upscaled image looks worse than every competitor beside it.',
        'Supply at least 800x800.',
        'imageUrl'));
    }
  }

  /* ── Price and availability ── */
  if (!product.price || product.price <= 0) {
    issues.push(issue('price_missing', 'error', 'No price',
      'An item with no price or a zero price is rejected.',
      'Set the price.', 'price'));
  }
  if (product.comparePrice && product.comparePrice <= product.price) {
    issues.push(issue('compare_price_invalid', 'warning',
      'Compare-at price is not higher than the price',
      'A strike-through price that is not actually higher is a pricing-accuracy problem, and Google disapproves sale pricing it cannot verify.',
      'Clear the compare-at price, or set it to the genuine former price.',
      'comparePrice'));
  }

  /* ── Preorder compliance ──
   *
   * EVERY CHECK HERE KEYS OFF WHAT IS ACTUALLY BEING SENT, not off the
   * preorder flag. An earlier version keyed off the flag and produced two
   * blocking errors for every preorder that was merely marked unavailable
   * — a state that is correct and needs no fixing — while telling the
   * operator to set a flag that was already set. Google's rules attach to
   * the availability value in the payload, so the checks do too. */
  const rel = preorderCfg.releaseInfo(product);
  /* Named so the message can say which one, because "this is a preorder"
     is not useful when you disagree and cannot see why the system thinks
     so. A released product usually still carries the tag from when it was
     not. */
  const preorderSource = product.preorder
    ? 'the Preorder checkbox'
    : ((product.tags || []).includes('preorder') ? 'the "preorder" tag' : null);

  if (payload.availability === 'PREORDER') {
    /* Only now is a date mandatory: it is required for the PREORDER
       availability value specifically. */
    if (!rel.hasDate) {
      issues.push(issue('preorder_no_date', 'error',
        'Preorder has no release date',
        'Google accepts the preorder availability value only with an availability_date. Without one the item is disapproved, and the listing cannot tell a shopper when they would receive it.',
        `Set Release date on the product. The free-text "ships" window is not a date and cannot be sent. If this is not actually a preorder, clear ${preorderSource} instead.`,
        'releaseDate'));
    } else if (new Date(rel.iso) > new Date(Date.now() + 365 * 86400e3)) {
      issues.push(issue('availability_date_too_far', 'error',
        `Release date ${rel.display} is more than a year away`,
        'Google rejects an availability_date more than one year ahead.',
        'Set a date within a year, or hold the product back until one is known.',
        'releaseDate'));
    }
  } else if (payload.availability === 'BACKORDER') {
    /* Released, still flagged: the set is out but our allocation has not
       reached us, so Google is told backorder (released, temporarily out of
       stock, orderable for fulfilment on the availability_date) rather than
       preorder. Backorder also requires a date. */
    if (!rel.hasDate) {
      issues.push(issue('backorder_no_date', 'error',
        'Backorder has no availability date',
        'Google accepts the backorder availability value only with an availability_date — the date the item is expected back in stock and shipping.',
        `Set Release date, or untick ${preorderSource || 'the preorder flag'} if the stock has arrived.`,
        'releaseDate'));
    } else {
      issues.push(issue('backorder_awaiting_stock', 'warning',
        `Released ${rel.display}, sent as backorder`,
        'The product is released and still flagged, so the feed sends backorder with an availability_date a few business days out. That is the correct Google value for a released item awaiting restock, but the date must be one you can actually meet.',
        `Confirm the availability_date is a restock date you can hold to, and untick ${preorderSource || 'the preorder flag'} the moment the stock lands so it reads in_stock.`,
        'preorder'));
    }
  } else if (isPreorder && payload.availability === 'OUT_OF_STOCK') {
    /* Correct, and stated so nobody goes looking for the bug. A preorder
       that cannot currently be ordered is out of stock as far as a shopper
       is concerned, and out_of_stock needs no availability_date. */
    issues.push(issue('preorder_closed', 'info',
      'Preorder is sent as out of stock',
      'The product is marked as a preorder but not available, so Google is told out of stock rather than preorder. That is the honest value — preorder means orderable now and shipping later, which this is not — and it needs no release date.',
      `Nothing to fix if the preorder is closed or sold out. If it should be orderable, tick Available on the product. If it is not a preorder at all, clear ${preorderSource}.`,
      'available'));
  }

  /* THE REAL MISREPRESENTATION, which the old check claimed to catch and
     could not: a product the storefront calls a preorder, sent to Google
     as in stock. Advertising an unreleased product as in stock is an
     account-level finding rather than an item-level one, and it happens
     when the flag was never set on a product whose title says preorder. */
  if (!isPreorder && payload.availability === 'IN_STOCK'
      && /\bpre-?order\b/i.test(`${product.title || ''} ${product.slug || ''}`)) {
    issues.push(issue('preorder_flag_missing', 'error',
      'Called a preorder, but sent to Google as in stock',
      'The title or URL says preorder while the feed says in stock. Google compares the feed against the landing page, and advertising an unreleased product as in stock is an availability misrepresentation — an account-level finding rather than an item-level one.',
      'Tick Preorder on the product and set its Release date. If it has actually released, take "preorder" out of the title.',
      'preorder'));
  }

  /* ── TCG-specific ── */
  if (!tcgType) {
    issues.push(issue('tcg_type_unknown', 'info',
      'Product configuration not recognised',
      'Not a Google requirement. The configuration (booster box, case, ETB, tin) is what buyers filter on, and a title that does not name it competes badly.',
      'Name the configuration in the title or Product Type, e.g. "Booster Box", "Elite Trainer Box", "Case".',
      'productType'));
  }
  if (!product.language) {
    issues.push(issue('language_missing', 'warning',
      'No language set',
      'Not a Google requirement, but the single most common complaint in this category is receiving Japanese product bought as English. It is an accuracy problem before it is a feed problem.',
      'Set Language on the product. It appears in the feed as a product detail.',
      'language'));
  }
  if (!/factory sealed|sealed/i.test(`${product.title} ${feedBuilder.plainText(product.description)}`)
      && tcgType && tcgType.id !== 'single') {
    issues.push(issue('sealed_wording_missing', 'info',
      'Neither the title nor the description says "sealed"',
      'Buyers searching this category filter on it, and the store guarantees it. Absent wording loses matched queries.',
      'Mention factory sealed in the description.',
      'description'));
  }

  /* ── Landing page consistency ──
     Google fetches the landing page and compares. These are the pairs it
     actually checks. */
  if (!product.available && payload.availability !== 'OUT_OF_STOCK') {
    issues.push(issue('availability_mismatch', 'error',
      'Availability does not match the product',
      'Google compares the feed against the landing page and disapproves a mismatch.',
      'Check the Available flag on the product.', 'available'));
  }

  /* ── Variant grouping ──
     Half a group is worse than none, and both halves fail SILENTLY in
     Merchant Center: a group id with no version name gives Google members
     it cannot tell apart, so it treats them as one offer sent twice and
     keeps one; a version name with no group id renames the listing while
     grouping nothing. Neither is reported as an error there, so this panel
     is the only place either becomes visible. */
  const hasGroupId = !!String(product.variantGroup || '').trim();
  const hasVersionName = !!String(product.variantName || '').trim();
  if (hasGroupId && !hasVersionName) {
    issues.push(issue('variant_name_missing', 'error',
      'In a variant group but has no version name',
      'Every member of a group has to differ by a variant attribute. With no version name this product carries none, so Google reads it and its sibling as the same offer submitted twice and keeps only one.',
      'Set Version name on the product — "Night (Umbreon ex)" — or clear the group id if this is not one of several boxes.',
      'variantName'));
  }
  if (hasVersionName && !hasGroupId) {
    issues.push(issue('variant_group_missing', 'warning',
      'Has a version name but no group id',
      'The name is appended to the title, so the listing itself reads correctly, but nothing links it to the other boxes. Where they share a barcode, Google sees duplicate listings rather than variants and suppresses one.',
      'Set the same Group id on every box of this product.',
      'variantGroup'));
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;

  /* Readiness score. Errors dominate because one is enough to block; each
     warning costs less but they accumulate. Clamped so a very messy product
     still reports a number rather than a negative. */
  const score = Math.max(0, 100 - errors * 34 - warnings * 8);

  return {
    issues,
    errors,
    warnings,
    score,
    eligible: errors === 0 && !feedBuilder.isExcluded(product, channel, { selectionMode }),
    excluded: feedBuilder.isExcluded(product, channel, { selectionMode }),
    tcgType,
    payload,
  };
}

/** One-word status for the dashboard list. */
function statusOf(result) {
  if (result.excluded) return 'excluded';
  if (result.errors) return 'error';
  if (result.warnings) return 'warning';
  return 'ready';
}

module.exports = {
  validate, statusOf, detectTcgType, canonicalBrand, isShouted,
  TCG_TYPES, BRAND_CANON, SHOUTED_WORDS, TITLE_ACRONYMS,
};
