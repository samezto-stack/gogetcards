/* ── Traffic source attribution ───────────────────────────
   Builds the aggregation that answers "how many UNIQUE VISITORS arrived,
   and which channel actually brought each of them".

   Extracted from routes/admin.js so the pipeline is one reviewable,
   testable value rather than forty lines buried in a route handler.

   What was wrong with the previous version
   ----------------------------------------
   It grouped page views by each view's OWN source and counted distinct
   IPs inside every bucket. Two separate defects came out of that:

     1. One visitor could land in several buckets. Arriving from Google
        and clicking through to a product produced a "Google" visit and a
        second visit under whatever the internal hop resolved to, from
        one person.
     2. The percentages divided by the SUM of those overlapping buckets,
        which is bigger than the real visitor count, so every share was
        measured against an inflated denominator.

   What this does instead
   ----------------------
   Each visitor is resolved once, to the first source in the period that
   names a real acquisition channel, and appears in exactly one bucket.
   The buckets therefore sum to the true unique-visitor count.

   Internal navigation is detected from the stored `referrer`, not only
   from the `source` field, so page views recorded BEFORE detectSource
   learned to recognise internal referrers are classified correctly as
   well. No backfill migration is required.
*/

/** Sources that name no acquisition channel. Order matters below. */
const NON_ACQUISITION = ['Internal', 'Direct', 'Other', '', null];

const { APP_CHANNELS } = require('../../middleware/tracking');

/* Recovers the channel for referrer-less visits from the stored
   User-Agent, the same way middleware/tracking.js does live. Applying it
   here as well means events recorded BEFORE that detection existed are
   reclassified at query time, so the current period's numbers correct
   themselves with no backfill. APP_CHANNELS is imported rather than
   redeclared so the live path and this one cannot drift apart.

   Builds a nested $switch: if the source is anything other than Direct,
   it is left alone; only a Direct row is re-examined. */
function appChannelExpr(sourceExpr) {
  return {
    $switch: {
      branches: APP_CHANNELS.map(({ channel, pattern }) => ({
        case: {
          $and: [
            { $in: [sourceExpr, ['Direct', '', null]] },
            { $regexMatch: { input: { $ifNull: ['$userAgent', ''] }, regex: pattern, options: 'i' } },
          ],
        },
        then: channel,
      })),
      default: sourceExpr,
    },
  };
}

/**
 * @param {object} match  extra $match conditions (date range, etc.)
 * @param {string} siteHost  bare hostname, e.g. "gogetcards.com"
 * @returns {object[]} aggregation pipeline
 */
function buildTrafficSourcePipeline(match = {}, siteHost = '') {
  const internalTest = siteHost
    ? {
        $or: [
          { $eq: ['$source', 'Internal'] },
          { $regexMatch: { input: { $ifNull: ['$referrer', ''] }, regex: siteHost, options: 'i' } },
        ],
      }
    : { $eq: ['$source', 'Internal'] };

  return [
    { $match: { type: 'page_view', ...match } },

    // Oldest first, so $push below preserves real browsing order and
    // "first touch" genuinely means the first one.
    { $sort: { createdAt: 1 } },

    {
      $addFields: {
        // A browser session identifies a person far better than an IP.
        // Mobile carriers and offices put many people behind one address,
        // which silently merged distinct visitors into one. Falls back to
        // IP only when no session was recorded.
        visitorKey: {
          $ifNull: [
            { $cond: [{ $in: ['$sessionId', ['', null]] }, null, '$sessionId'] },
            '$ip',
          ],
        },
        isInternal: internalTest,
      },
    },

    // An internal hop carries no attribution information, so it is
    // discarded rather than competing with the real first touch. A
    // referrer-less hit is re-examined against the User-Agent first, which
    // is what turns "Direct" back into the app the visitor came from.
    {
      $addFields: {
        cleanSource: {
          $cond: ['$isInternal', null, appChannelExpr({ $ifNull: ['$source', null] })],
        },
      },
    },

    { $group: { _id: '$visitorKey', sources: { $push: '$cleanSource' } } },

    {
      $addFields: {
        // Real channels this visitor showed, in order.
        acquisition: {
          $filter: { input: '$sources', as: 's', cond: { $not: [{ $in: ['$$s', NON_ACQUISITION] }] } },
        },
        // Anything that is not an internal hop, as a fallback. This is
        // what keeps a genuinely direct visitor counted as Direct.
        nonInternal: {
          $filter: { input: '$sources', as: 's', cond: { $not: [{ $in: ['$$s', ['Internal', null]] }] } },
        },
      },
    },

    {
      $addFields: {
        firstTouch: {
          $ifNull: [
            { $arrayElemAt: ['$acquisition', 0] },
            { $ifNull: [{ $arrayElemAt: ['$nonInternal', 0] }, 'Direct'] },
          ],
        },
      },
    },

    { $group: { _id: '$firstTouch', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ];
}

/** The site's own hostname, for filtering self-referrals. */
function siteHostFromEnv(siteUrl) {
  /* Delegates to config/site so the analytics notion of "us" and the
     canonical URL's notion of "us" cannot diverge — a self-referral filter
     keyed on a different host than the one that serves the pages silently
     files every internal click as a new visit. Still takes an argument so
     the existing tests can pass a host in. */
  if (siteUrl === undefined) return require('../../config/site').host();
  return String(siteUrl)
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./i, '')
    .toLowerCase();
}

module.exports = { buildTrafficSourcePipeline, siteHostFromEnv, NON_ACQUISITION };

/* ── What is left in "Direct" ──────────────────────────────
   Even after in-app browsers are recovered, some visitors genuinely
   arrive with no referrer and no app signature. This answers what they
   are, by the page they LANDED on.

   That distinction is the useful one. A visitor landing on "/" plausibly
   typed the address or used a bookmark. A visitor landing straight on
   /products/op-17-booster-box did not type that URL from memory: they
   followed a link from somewhere that stripped the referrer, which in
   practice means a messaging app, an email client, a QR code, or a
   privacy setting. Those are still real acquisitions, they just cannot
   name themselves.
*/
function buildDirectLandingPipeline(match = {}, siteHost = '', limit = 12) {
  const internalTest = siteHost
    ? {
        $or: [
          { $eq: ['$source', 'Internal'] },
          { $regexMatch: { input: { $ifNull: ['$referrer', ''] }, regex: siteHost, options: 'i' } },
        ],
      }
    : { $eq: ['$source', 'Internal'] };

  return [
    { $match: { type: 'page_view', ...match } },
    { $sort: { createdAt: 1 } },
    {
      $addFields: {
        visitorKey: {
          $ifNull: [{ $cond: [{ $in: ['$sessionId', ['', null]] }, null, '$sessionId'] }, '$ip'],
        },
        isInternal: internalTest,
      },
    },
    { $addFields: { cleanSource: { $cond: ['$isInternal', null, appChannelExpr({ $ifNull: ['$source', null] })] } } },
    // First non-internal view per visitor: their true landing page.
    {
      $group: {
        _id: '$visitorKey',
        sources: { $push: '$cleanSource' },
        pages: { $push: { $cond: ['$isInternal', null, '$page'] } },
      },
    },
    {
      $addFields: {
        acquisition: { $filter: { input: '$sources', as: 's', cond: { $not: [{ $in: ['$$s', NON_ACQUISITION] }] } } },
        landing: {
          $arrayElemAt: [{ $filter: { input: '$pages', as: 'p', cond: { $ne: ['$$p', null] } } }, 0],
        },
      },
    },
    // Only visitors who stayed Direct after every recovery attempt.
    { $match: { 'acquisition.0': { $exists: false } } },
    { $group: { _id: { $ifNull: ['$landing', '/'] }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ];
}

module.exports.buildDirectLandingPipeline = buildDirectLandingPipeline;
