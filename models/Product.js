const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  /* Every slug this product has ever answered to.
   *
   * A renamed product is a DELETED PAGE as far as a search engine is
   * concerned: the old URL 404s, whatever it had ranked for goes with it,
   * and every link anyone ever built to it is wasted. Keeping the history
   * lets /products/:slug recognise an old address and 301 to the current
   * one, which passes the ranking along instead of discarding it.
   *
   * NOT unique, deliberately. Two products can each have carried the same
   * slug at different times, and the lookup resolves the CURRENT slug
   * first, so a live product always beats another product's history. */
  previousSlugs: { type: [String], default: [], index: true },
  price: { type: Number, required: true }, // in cents
  comparePrice: { type: Number, default: null },
  imageUrl: { type: String, default: '' },
  images: [{ type: String }],
  description: { type: String, default: '' },
  // Free-form product specifications rendered in the product page's
  // Specifications column, after the built-in rows (vendor, type, etc.).
  // Free-form because the meaningful attributes differ per configuration:
  // a booster box has packs-per-box, a case has boxes-per-case, an ETB has
  // neither. Edited in the admin as one "Label: Value" per line.
  specs: [{
    label: { type: String, default: '' },
    value: { type: String, default: '' },
    _id: false,
  }],
  /* Product identifiers.
     Google Shopping matches a listing to its catalogue using these. A feed
     without them is accepted but competes badly, and Merchant Center
     specifically flags "missing GTIN" for brands that publish them, which
     sealed TCG product does — every booster box and ETB carries a barcode.

     All optional, and all omitted from the page and the schema when blank:
     an invented GTIN is far worse than an absent one, because Google
     validates the check digit and resolves it against the real product. A
     mismatch there is a Misrepresentation finding.

     `sku` is the store's own code. Before this existed, the Product schema
     emitted the URL slug as the SKU, which is not an identifier anyone can
     reconcile against a purchase order or a stock count. */
  sku: { type: String, default: '', trim: true },
  gtin: { type: String, default: '', trim: true },   // UPC/EAN barcode
  mpn: { type: String, default: '', trim: true },    // manufacturer part number

  /* The manufacturer, as Google understands "brand": the company that made
     the product, not the shop selling it. `vendor` already carried this
     ("The Pokemon Company", "Konami") and stays as the display field;
     brand falls back to it. */
  brand: { type: String, default: '', trim: true },

  /* Facts a TCG buyer asks for by name and Google exposes as attributes.
     Language matters commercially here: a Japanese booster box listed
     without saying so is the most common complaint in this category, and
     that is an accuracy problem rather than a nicety. */
  language: { type: String, default: 'English', trim: true },
  edition: { type: String, default: '', trim: true },   // "1st Edition", "Unlimited"
  setCode: { type: String, default: '', trim: true },   // "OP-17", "SV3.5"

  /* ── Variant grouping ────────────────────────────────────────────────
     One manufactured item sold as two or more boxes — Day and Night, an
     alternate-art printing, a regional cover. Each box stays a separate
     Product with its own slug, price, stock and orders, because everything
     past the Buy button in this codebase is keyed on the slug; these three
     fields only say that the boxes are alternatives.

     See services/variants.js for the reasoning and the Google limits.

     variantGroup is the shared id. The manufacturer's item number is the
     natural choice — it is already the thing the two boxes have in common —
     but any stable string works, so long as every member uses the same one.
     Indexed because the product page reads siblings by it on every load. */
  variantGroup: { type: String, default: '', trim: true, index: true },
  /* What this box is called within the group: "Night (Umbreon ex)". Both
     the appended title and the Google variant attribute are built from it,
     so it is written once and never restated. */
  variantName: { type: String, default: '', trim: true },
  /* Which Google attribute carries the name. Google reads a fixed set and
     ignores anything else, so this is validated against that set rather
     than passed through — see VARIANT_AXES. */
  variantAxis: { type: String, default: 'color', trim: true },
  /* Display order in the storefront switcher. Ascending. */
  variantOrder: { type: Number, default: 0 },

  vendor: { type: String, default: '' },
  productType: { type: String, default: '' },
  category: { type: String, default: '' },
  collections: [{ type: String }],
  tags: [{ type: String }],
  /* variantId and checkoutUrl used to live here. Both belonged to the
     Shopify checkout — a manual variant seed for the rotator, and a
     per-product URL that bypassed checkout entirely — and both are now
     deleted along with it. Nothing reads them, so a value still sitting on
     an old document is inert; Mongoose simply ignores the extra keys. */

  /* ── Product distribution (Google Merchant Center, and channels added
        later) ──────────────────────────────────────────────────────────
     Everything here affects what leaves the site in a feed and NOTHING
     affects the storefront. That separation is the point: a title that
     works for a shopper reading a product page is often not the title that
     performs in Shopping, and Merchant Center has hard limits (150
     characters on a title) that a storefront does not.

     Every field is optional. Unset means "derive it from the product",
     which is what feedBuilder does, so a store that never opens this panel
     still produces a valid feed. */
  merchant: {
    /* Per-channel opt-OUT. Read only while the channel's selectionMode is
       'all'. Absent means the product is sent. */
    excluded: {
      google: { type: Boolean, default: false },
      meta: { type: Boolean, default: false },
      microsoft: { type: Boolean, default: false },
      pinterest: { type: Boolean, default: false },
      tiktok: { type: Boolean, default: false },
    },

    /* Per-channel opt-IN. Read only while the channel's selectionMode is
       'selected'. Absent means the product is NOT sent.
     *
     * A SEPARATE FIELD, not the inverse of `excluded`. One flag carrying
     * two meanings would mean that switching a channel from "everything
     * except these" to "only these" silently reinterprets every existing
     * decision — a product deliberately excluded would become the only
     * product listed. Two lists means switching modes is reversible and
     * each list keeps saying what its owner meant. */
    included: {
      google: { type: Boolean, default: false },
      meta: { type: Boolean, default: false },
      microsoft: { type: Boolean, default: false },
      pinterest: { type: Boolean, default: false },
      tiktok: { type: Boolean, default: false },
    },

    /* Overrides. Blank falls back to the storefront value. Held separately
       rather than editing the product so the two can differ deliberately
       and so clearing an override restores the derived value. */
    title: { type: String, default: '', trim: true, maxlength: 150 },
    description: { type: String, default: '', trim: true, maxlength: 5000 },
    imageLink: { type: String, default: '', trim: true },

    /* Google taxonomy. googleCategory is Google's own numeric id or full
       path; productType is the store's own breadcrumb, which Google uses
       for reporting and bidding rather than classification. */
    googleCategory: { type: String, default: '', trim: true },
    googleProductType: { type: String, default: '', trim: true },

    /* identifierExists=false is the correct declaration for a product that
       genuinely has no GTIN/MPN (a bundle a retailer assembled, say).
       Setting it wrongly is worse than leaving GTIN blank: it tells Google
       to stop looking for a match that does exist. */
    identifierExists: { type: Boolean, default: true },

    isBundle: { type: Boolean, default: false },
    multipack: { type: Number, default: 0 },      // units in a multipack, 0 = not one
    adult: { type: Boolean, default: false },

    // Feed-side grouping used for shipping and bidding rules in Google.
    shippingLabel: { type: String, default: '', trim: true },
    taxCategory: { type: String, default: '', trim: true },

    /* Destinations to keep this product out of, e.g. ['Shopping_ads'].
       Kept as free strings because Google's destination list changes. */
    excludedDestinations: [{ type: String }],

    // Last successful sync, per channel, for drift detection.
    lastSyncedAt: { type: Date, default: null },
    lastSyncHash: { type: String, default: '' },
    lastSyncStatus: { type: String, default: '' },
    lastSyncError: { type: String, default: '' },
  },
  available: { type: Boolean, default: true },
  stock: { type: Number, default: 0 },
  badge: { type: String, default: null }, // Hot, Limited, Preorder, Rare, New
  preorder: { type: Boolean, default: false },
  preorderShips: { type: String, default: null },
  allocationLimit: { type: Number, default: 0 }, // Max units one customer may order (0 = unlimited)

  /* ── Per-market pricing ───────────────────────────────────────────────
     `price` above stays the US price in cents and is untouched, so every
     existing product, order, feed row and Merchant Center listing keeps
     working exactly as it does now.

     A row here is a STORED COMMERCIAL PRICE, not a conversion. CA$189.99
     is a number somebody chose; 139.99 × today's rate is 191.4372, which
     changes hourly and would put a different figure in the feed from the
     one on the page every time the rate moved. Google compares those two,
     so a live conversion is a price mismatch waiting for a slow crawl.

     NO ROW MEANS THE PRODUCT IS NOT SOLD IN THAT MARKET. Not "fall back
     to USD", not "convert on the fly" — absent. It is left out of that
     market's feed and its market URL 404s. Silence has to mean not-for-
     sale rather than guess-a-price, because the guess is the thing that
     ends up disagreeing with the checkout.

     `amount` is the smallest unit of that market's currency: cents for
     USD/CAD/EUR, pence for GBP, and whole yen for JPY, which has no minor
     unit. config/markets.js owns which is which. */
  marketPrices: [{
    market: { type: String, required: true, trim: true, uppercase: true },
    amount: { type: Number, required: true },
    /* Optional per-market "was" price, for the same reason the base
       product has one. Absent means no saving is claimed. */
    compareAmount: { type: Number, default: 0 },
    /* A product can be withdrawn from one market without losing its
       price. Distinct from having no row at all: this keeps the URL and
       the page, and reports out of stock. */
    available: { type: Boolean, default: true },
    _id: false,
  }],

  /* ── Listed but unsellable ────────────────────────────────────────────
     `stockHold` means: we cannot fulfil this, but the page stays up and
     keeps saying it is available. The buyer is stopped at the PAYMENT
     step, not before, and offered `supersededBy` instead.

     THIS IS DELIBERATE AND IT IS NOT THE SAME AS `available: false`.
     Setting `available: false` is the honest flag and the one to reach
     for: the page shows sold out, the feed says OUT_OF_STOCK, and the
     checkout refuses at session start. `stockHold` exists because the
     owner wants a sold-out product to keep reading as in-stock to
     crawlers and AI assistants, and to catch the buyer late with an
     alternative rather than early with a dead button.

     What it costs, so nobody has to rediscover it:
       - The customer fills in name, address and email before being told.
         Nothing is charged, but they gave those details for nothing.
       - Advertising an item as purchasable when it is not is a misleading
         commercial practice under UK CPRs and the EU UCPD, both markets
         the store is expanding into.
       - The Shopping feed reports whatever `available` and `stock` say
         and ignores this flag entirely (see feedBuilder.availability(),
         which documents why). So a held product with available:true is
         advertised as in stock while its checkout refuses. That is an
         availability misrepresentation rather than a mismatch, and
         Merchant Center acts on the account for it, not the listing.
         Chosen knowingly by the owner; `available` is the honest lever
         and it is one click away. */
  stockHold: { type: Boolean, default: false },
  /* Slug of what to offer instead. Optional: without it the buyer is told
     it sold out and sent back to the catalogue. */
  supersededBy: { type: String, default: '', trim: true },
  releaseDate: { type: Date, default: null },
  featured: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-generate slug from title if not provided
productSchema.pre('validate', function (next) {
  if (this.title && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

/* ── Remember the address a product is moving away from ──
 *
 * Renaming a product is the one edit that silently destroys something the
 * admin cannot see. The old URL stops existing, whatever it had earned in
 * search goes with it, and every link anyone built to it is wasted.
 *
 * Recorded on the MODEL rather than in the admin route, so it holds for
 * every path that can rename a product — the edit form, the quick-update,
 * a script, a bulk import — instead of only the one someone remembered to
 * update. Both of mongoose's update paths are covered, because the admin
 * uses findByIdAndUpdate and pre('save') never fires for that.
 *
 * Nothing is recorded for a new document: it has no history yet. */

/* The slug as it came out of the database, which is exactly the value an
   edit is about to replace. */
productSchema.post('init', function () {
  this.$locals.originalSlug = this.slug;
});

productSchema.pre('save', function (next) {
  const gone = this.$locals.originalSlug;
  if (!this.isNew && gone && gone !== this.slug && !this.previousSlugs.includes(gone)) {
    this.previousSlugs.push(gone);
  }
  next();
});

/* Covers findByIdAndUpdate / findOneAndUpdate, which bypass save(). */
productSchema.pre('findOneAndUpdate', async function (next) {
  try {
    const update = this.getUpdate() || {};
    const nextSlug = update.slug !== undefined ? update.slug : (update.$set || {}).slug;
    if (!nextSlug) return next();

    const current = await this.model.findOne(this.getQuery()).select('slug').lean();
    if (!current || current.slug === nextSlug) return next();

    /* Mongo rejects an update that mixes bare fields with operators, so
       fold the bare ones into $set before adding one. */
    const $set = { ...(update.$set || {}) };
    const rest = {};
    for (const [k, v] of Object.entries(update)) {
      if (k.startsWith('$')) rest[k] = v;
      else $set[k] = v;
    }
    /* $addToSet rather than $push: renaming back and forth must not build
       a list with the same slug in it twice. */
    this.setUpdate({
      ...rest,
      $set,
      $addToSet: { ...(rest.$addToSet || {}), previousSlugs: current.slug },
    });
    next();
  } catch (err) {
    /* A rename must not fail because the history could not be written. */
    console.error('[Product] could not record previous slug:', err.message);
    next();
  }
});

// Virtual: formatted price
productSchema.virtual('formattedPrice').get(function () {
  return (this.price / 100).toFixed(2);
});

// Virtual: savings percentage
productSchema.virtual('savingsPct').get(function () {
  if (this.comparePrice && this.comparePrice > this.price) {
    return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
  }
  return 0;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
