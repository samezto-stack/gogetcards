/**
 * Where this site lives, in one place.
 *
 * THE DOMAIN IS HARDCODED as the default and the environment can override
 * it. That combination is deliberate, and it is not the same as "just use
 * an env var" or "just hardcode it":
 *
 *   - Production needs no configuration and cannot be misconfigured. A
 *     missing variable used to produce a broken canonical URL, a relative
 *     OAuth redirect, or a sitemap pointing at the wrong host. None of
 *     those announce themselves.
 *   - Local development and any future staging host can still override,
 *     which a bare constant would not allow.
 *
 * WHY THIS FILE EXISTS AT ALL: SITE_URL was read in twenty places with
 * FOUR different fallbacks — the real domain in two, an empty string in
 * three, and `${req.protocol}://${req.get('host')}` in a dozen. That last
 * one is the dangerous one. It means the canonical tag, the sitemap, the
 * OG URL and the JSON-LD @id all describe whichever hostname the request
 * happened to arrive on. A crawler reaching the Render internal hostname,
 * a preview URL, or the apex versus www would be told THAT is the
 * canonical address, which is how a site ends up competing with itself in
 * the index. The origin of a page is a property of the site, not of the
 * request that fetched it.
 */

/* The live domain. Changing this changes every canonical URL, the
   sitemap, the feed's product links and the OAuth redirect URI, so it is
   stated once, here. */
const PRODUCTION_ORIGIN = 'https://zypheratcg.com';

/** Absolute origin, never with a trailing slash. */
function origin() {
  const configured = (process.env.SITE_URL || '').trim().replace(/\/$/, '');
  /* An override has to be a real absolute origin. A half-set variable —
     "zypheratcg.com" with no scheme, or a stray path — would otherwise
     silently produce URLs that resolve nowhere, which is worse than the
     unset case this default exists to prevent. */
  return /^https?:\/\/[^/]+$/i.test(configured) ? configured : PRODUCTION_ORIGIN;
}

/** Bare hostname, lowercased, without `www.`. For self-referral checks. */
function host() {
  return origin()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./i, '')
    .toLowerCase();
}

/** An absolute URL for a path on this site. */
function url(path = '/') {
  return origin() + (path.startsWith('/') ? path : `/${path}`);
}

/* The clock this business is read in.
 *
 * server.js sets process.env.TZ from this at boot, which fixes every Date
 * that Node renders. It does NOT reach MongoDB: $hour, $dayOfMonth and the
 * rest run inside the database and are UTC unless a timezone is passed
 * explicitly. So any aggregation bucketing by a unit of local time has to
 * state this, or the chart it draws is an hour out — which is exactly what
 * the hourly-visitors chart was doing after the TZ fix.
 *
 * An IANA zone rather than a fixed offset: Morocco is UTC+1 except during
 * Ramadan, when it steps back to UTC+0. */
function timezone() {
  return process.env.TZ || 'Africa/Casablanca';
}

module.exports = { origin, host, url, timezone, PRODUCTION_ORIGIN };
