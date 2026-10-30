const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'page_view', 'view_product', 'add_to_cart', 'checkout_click', 'checkout_arrived',
      // Funnel steps INSIDE the checkout page itself, between "arrived" and
      // the order being recorded — see /api/checkout/confirm-arrival's
      // `step` param. All correlated by the same checkoutId as the arrival
      // event, so they can be joined into one per-visit timeline.
      'checkout_form_completed', 'checkout_payment_shown', 'checkout_payment_failed',
      // Fired when the checkout page itself refuses to proceed because no
      // pooled email arrived with the token (empty pool at redirect time) —
      // a technical block, not a customer choosing not to pay. Distinct from
      // checkout_payment_failed (that's Whop's iframe failing to load).
      'checkout_no_pooled_email',
      // Fired SERVER-SIDE by the host (northbridgeai, careerforge-studio, any
      // future one) itself, at the exact point it decides token/cookie
      // resolution did NOT grant the gated experience and it is falling back
      // to its own normal/default page instead. Unlike checkout_arrived (a
      // client-side beacon that depends on the visitor's browser actually
      // loading and executing the checkout page's JS), this never depends on
      // the browser at all — it fires the instant the host's server makes
      // that decision. That makes (checkout_click - checkout_arrived -
      // checkout_token_failed) an honest "died in transit before even
      // reaching the host" count, instead of silently lumping token/cookie
      // failures into it.
      'checkout_token_failed',
      // Fired by the checkout page's defense-in-depth check (see partner.html's
      // verifyWhopEmail()): Whop's embedded checkout ended up associated with
      // an email different from the pooled one we prefilled it with (e.g. the
      // visitor was already signed into an existing Whop account in this
      // browser) and the page forced it back via Whop's setEmail API. Should
      // be rare/never — its presence at all is the signal worth watching for.
      'checkout_email_mismatch_corrected',
    ],
    index: true,
  },
  productSlug: { type: String, default: null },
  quantity: { type: Number, default: null },
  page: { type: String, default: '' },
  sessionId: { type: String, default: '' },
  ip: { type: String, default: '' },
  country: { type: String, default: '' },
  countryCode: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  // Where a checkout_click was actually sent ('partner_experience' |
  // 'two_step_checkout'), and the id correlating a
  // checkout_click with its matching checkout_arrived (fired by the
  // checkout page itself once it actually loads in the browser) — see
  // trackCheckoutReached() in routes/frontend.js.
  destination: { type: String, default: null },
  /* The market the event happened in, so funnel and revenue reporting can
     be split by storefront: views, add-to-carts, checkouts and purchases
     all carry it. One event per action, tagged — NOT a second event when
     somebody switches country, which would double-count the funnel. */
  market: { type: String, default: 'US', uppercase: true, trim: true, index: true },
  checkoutId: { type: String, default: null, index: true },
  // The pooled PartnerEmail assigned to this checkout at the moment it was
  // claimed (see resolvePartnerRedirect() + trackCheckoutReached() in
  // routes/frontend.js) — stored here, keyed by checkoutId, so the order
  // pipeline can look it back up by zcid and permanently mark that specific
  // pooled email 'converted' once a real order completes (see
  // services/orderPipeline/index.js). Null until a pooled email is
  // actually claimed, which happens at the partner hand-off rather than
  // at the click.
  pooledEmail: { type: String, default: null },
  // Traffic source attribution
  source: { type: String, default: 'Direct', index: true },
  referrer: { type: String, default: '' },

  /* ── Campaign attribution ──────────────────────────────────────────
     The five UTM parameters as they appeared on the landing URL.

     STORED RAW AND UNINTERPRETED. utm_source is what the advertiser typed;
     `source` above is our own first-party reading of the referrer and
     remains the authority on "where did this visitor actually come from".
     The two disagree often and legitimately — a Google Ads click tagged
     utm_source=newsletter is still a Google click — and keeping both means
     a mistagged campaign shows up as a mistagged campaign instead of
     quietly rewriting the channel.

     Set only on the view that carried them, which is normally the session's
     landing page. Later views in the same session have none, and that is
     correct: the campaign is a property of the arrival, not of every page. */
  utmSource: { type: String, default: '' },
  utmMedium: { type: String, default: '' },
  utmCampaign: { type: String, default: '' },
  utmContent: { type: String, default: '' },
  utmTerm: { type: String, default: '' },

  // Geolocation for globe
  lat: { type: Number, default: null },
  lon: { type: Number, default: null },
  /* No `index: true` here. The TTL index below is already on { createdAt: 1 },
     the exact same key, so declaring both made Mongoose warn on every boot
     ("Duplicate schema index on {createdAt:1}") and asked MongoDB to build
     two indexes over one field. Worse than noise: whichever definition
     Mongoose applies second is ignored, so the 90-day expiry was one
     ordering decision away from silently not existing — and this collection
     is the one that grows on every page view. */
  createdAt: { type: Date, default: Date.now },
});

/* TTL: auto-delete events older than a year. Also the only index on
   createdAt, so it serves ordinary range queries too.

   RAISED FROM 90 DAYS so /admin/analytics can answer over a year rather
   than silently returning a partial funnel for any longer window — a date
   picker offering "this year" against 90 days of data does not report less,
   it reports wrong.

   CHANGING THIS NUMBER DOES NOT CHANGE THE LIVE INDEX. MongoDB will not
   alter expireAfterSeconds on an existing index from a create call, so an
   already-deployed collection keeps expiring at 90 days until the index is
   modified in place. cron/eventTtl.js does that on boot; without it this
   line is documentation of an intention rather than a setting. */
const EVENT_TTL_DAYS = parseInt(process.env.EVENT_TTL_DAYS || '', 10) || 365;
eventSchema.index({ createdAt: 1 }, { expireAfterSeconds: EVENT_TTL_DAYS * 24 * 60 * 60 });

/* The analytics aggregations all narrow by type and date first, then group
   by one dimension. Without these each panel is a collection scan over a
   year of page views on a 512 MB instance.

   Compound rather than single-field: a query filtering type AND createdAt
   can only use one single-field index and must then examine every match
   from it, which over a year of page_view rows is most of the collection. */
eventSchema.index({ type: 1, createdAt: -1 });
eventSchema.index({ type: 1, createdAt: -1, productSlug: 1 });
eventSchema.index({ type: 1, createdAt: -1, countryCode: 1 });
eventSchema.index({ type: 1, createdAt: -1, source: 1 });
/* Funnel joins walk from a checkout_click to its later step events by the
   id they share. */
eventSchema.index({ checkoutId: 1, type: 1 });
/* Distinct-visitor counts group by session within a window. */
eventSchema.index({ sessionId: 1, createdAt: -1 });

module.exports = mongoose.model('Event', eventSchema);
module.exports.EVENT_TTL_DAYS = EVENT_TTL_DAYS;
