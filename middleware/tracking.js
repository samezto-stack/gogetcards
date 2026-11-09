const Event = require('../models/Event');
const geoip = require('geoip-lite');

/**
 * The five UTM parameters off a query string, cleaned but not interpreted.
 *
 * BOUNDED AND STRINGIFIED because these are attacker-controlled: anyone can
 * put anything on a URL, and Express hands back an ARRAY when a parameter
 * appears twice (?utm_source=a&utm_source=b). Writing that array straight
 * into a String field throws in strict mode, and casting it silently would
 * store "a,b" as if it were one campaign. First value wins, capped, trimmed.
 *
 * Absent parameters are omitted rather than written as empty strings, so a
 * page view with no campaign carries no campaign keys at all.
 */
const UTM_KEYS = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_content: 'utmContent',
  utm_term: 'utmTerm',
};

function utmFrom(query) {
  const out = {};
  if (!query) return out;
  for (const [param, field] of Object.entries(UTM_KEYS)) {
    const raw = query[param];
    const first = Array.isArray(raw) ? raw[0] : raw;
    if (typeof first !== 'string') continue;
    const value = first.trim().slice(0, 120);
    if (value) out[field] = value;
  }
  return out;
}

/**
 * Detect traffic source from referrer header and URL params
 */
/* The site's own hostname, so a referrer pointing back at us can be told
   apart from a real external one. Without this, clicking from a collection
   page to a product page looked like a brand new visit from an unknown
   referrer and was filed under "Other" — so one visitor browsing five
   pages produced one real source plus four phantom "Other" visits. */
const SITE_HOST = require('../config/site').host();

/* In-app browsers. Tapping a link inside the Facebook, Instagram, TikTok
   or Google app opens an embedded webview that sends NO referrer, so this
   traffic has always been filed as "Direct" even though the visitor came
   straight from that app. This is the usual explanation for a large,
   well-converting Direct bucket: it is not people typing the URL, it is
   social and app traffic with its referrer stripped.

   The apps do identify themselves in the User-Agent, which is already
   stored on every event, so the channel is recoverable. Facebook's
   webview marks itself with FBAN/FBAV; the others are named outright.

   A User-Agent can be spoofed, so treat this as strong evidence rather
   than proof. It is only ever consulted when there is no referrer at all,
   so it can never override a real one.

   Order matters: Instagram's iOS webview also carries FBAN, so Instagram
   is tested first or every Instagram visit would read as Facebook.

   Kept as source-of-truth here and reused by the dashboard aggregation
   (services/analytics/trafficSources.js) so the live path and the
   historical reclassification can never disagree. */
const APP_CHANNELS = [
  // Instagram and Facebook are both reported as 'Facebook', matching how
  // an instagram.com referrer is already treated above. Split them here if
  // you ever want placement-level reporting.
  { channel: 'Facebook',  pattern: 'Instagram' },
  { channel: 'Facebook',  pattern: 'FBAN|FBAV|FB_IAB|FB4A|FBIOS' },
  { channel: 'TikTok',    pattern: 'BytedanceWebview|musical_ly|TikTok|Trill' },
  { channel: 'Snapchat',  pattern: 'Snapchat' },
  { channel: 'Pinterest', pattern: 'Pinterest' },
  { channel: 'LinkedIn',  pattern: 'LinkedInApp' },
  { channel: 'Twitter/X', pattern: 'TwitterAndroid|Twitter for iPhone' },
  { channel: 'Reddit',    pattern: 'Reddit' },
  // GSA is the Google Search app on iOS: a real Google visit that arrives
  // with no referrer.
  { channel: 'Google',    pattern: 'GSA/' },
  { channel: 'WhatsApp',  pattern: 'WhatsApp' },
  { channel: 'Line',      pattern: 'Line/' },
];

/** The channel an in-app browser belongs to, or null. */
function detectAppChannel(userAgent) {
  const ua = userAgent || '';
  if (!ua) return null;
  for (const { channel, pattern } of APP_CHANNELS) {
    if (new RegExp(pattern, 'i').test(ua)) return channel;
  }
  return null;
}

/** Sources that say nothing about where a visitor was acquired. */
const NON_ACQUISITION = new Set(['Internal', 'Direct', 'Other', '']);

/** True when a source names a real acquisition channel. */
function isAcquisitionSource(source) {
  return !!source && !NON_ACQUISITION.has(source);
}

/* A utm_source we don't recognise is stored and later rendered in the admin
   dashboard, so it is untrusted input and must never carry markup or control
   characters. Take the first value if the param is repeated (Express hands
   back an array then), drop anything HTML-significant or non-printable, and
   cap the length. The result is a plain label like "chatgpt.com" — never a
   payload. Returns '' when nothing usable is left, so the caller falls back. */
function cleanSourceLabel(value) {
  const first = Array.isArray(value) ? value[0] : value;
  return String(first == null ? '' : first)
    .replace(/[\u0000-\u001F\u007F<>"'`&\\]/g, '')
    .trim()
    .slice(0, 80);
}

function detectSource(req) {
  const referrer = (req.get('Referer') || req.get('Referrer') || '').toLowerCase();
  const query = req.query || {};

  // 1. Check URL params first (most reliable for paid ads)
  if (query.fbclid || query.fb_action_ids) return 'Facebook';
  /* A Google ad click. gclid is the classic id; iPhone/iOS app clicks carry
     gbraid/wbraid INSTEAD of gclid, so checking gclid alone filed those paid
     clicks under organic 'Google'. gad_source/gad_campaignid are added to
     every ad click. */
  if (query.gclid || query.gbraid || query.wbraid || query.gad_source || query.gad_campaignid) {
    /* Search Partners and YouTube ad clicks carry the same ids but arrive
       from a non-Google site. When the browser sends that referrer, file it
       separately so partner traffic can be judged on its own. No referrer
       (common) stays 'Google Ads' — Google Ads' own Network segment is the
       exact split. */
    let refHost = '';
    try { refHost = referrer ? new URL(referrer).hostname : ''; } catch { refHost = ''; }
    const fromGoogle = /(^|\.)google\.[a-z.]+$/.test(refHost);
    const fromSelf = SITE_HOST && refHost.endsWith(SITE_HOST);
    if (refHost && !fromGoogle && !fromSelf) return 'Google Ads Partners';
    return 'Google Ads';
  }
  /* Merchant Center auto-tagging marks free/organic product results with
     srsltid. No ad id above, so this is unpaid Google. */
  if (query.srsltid) return 'Google';
  if (query.msclkid) return 'Bing Ads';
  if (query.ttclid) return 'TikTok';
  if (query.utm_source) {
    const rawSource = Array.isArray(query.utm_source) ? query.utm_source[0] : query.utm_source;
    const src = String(rawSource == null ? '' : rawSource).toLowerCase();
    if (src.includes('facebook') || src.includes('fb') || src.includes('ig') || src.includes('instagram')) return 'Facebook';
    if (src.includes('google')) return 'Google';
    if (src.includes('yahoo')) return 'Yahoo';
    if (src.includes('bing')) return 'Bing';
    if (src.includes('duckduckgo')) return 'DuckDuckGo';
    if (src.includes('reddit')) return 'Reddit';
    if (src.includes('tiktok')) return 'TikTok';
    if (src.includes('twitter') || src.includes('x.com')) return 'Twitter/X';
    if (src.includes('youtube')) return 'YouTube';
    if (src.includes('snapchat')) return 'Snapchat';
    // Sanitised raw utm_source for unknown sources (never stored with markup).
    return cleanSourceLabel(rawSource) || 'Other';
  }

  // 2. No referrer at all. Before calling this Direct, check whether the
  //    User-Agent shows an in-app browser, which strips referrers.
  if (!referrer || referrer === '') {
    return detectAppChannel(req.get('User-Agent')) || 'Direct';
  }

  /* Navigation within our own site. This is NOT a new visit from a new
     source, so it must never be attributed as one. It gets its own value
     rather than being folded into 'Direct' so the two stay
     distinguishable in the data. */
  if (SITE_HOST && referrer.includes(SITE_HOST)) return 'Internal';

  if (referrer.includes('facebook.com') || referrer.includes('fb.com') || referrer.includes('instagram.com') || referrer.includes('l.facebook.com')) return 'Facebook';
  if (referrer.includes('google.com') || referrer.includes('google.co')) return 'Google';
  if (referrer.includes('yahoo.com') || referrer.includes('search.yahoo')) return 'Yahoo';
  if (referrer.includes('bing.com')) return 'Bing';
  if (referrer.includes('duckduckgo.com')) return 'DuckDuckGo';
  if (referrer.includes('reddit.com')) return 'Reddit';
  if (referrer.includes('tiktok.com')) return 'TikTok';
  if (referrer.includes('twitter.com') || referrer.includes('t.co') || referrer.includes('x.com')) return 'Twitter/X';
  if (referrer.includes('youtube.com')) return 'YouTube';
  if (referrer.includes('snapchat.com')) return 'Snapchat';
  if (referrer.includes('pinterest.com')) return 'Pinterest';

  return 'Other';
}

/**
 * Auto page-view tracking middleware
 * Records every frontend page visit with country data, traffic source, and coordinates
 */
function trackPageView(req, res, next) {
  // Ignore non-HTML requests, bots, and API/assets
  const isHtml = req.accepts('html');
  const userAgent = (req.get('User-Agent') || '').toLowerCase();
  const isBot = /bot|spider|crawl|github|slack|twitter|facebook|preview|lighthouse/i.test(userAgent);
  
  if (
    req.method === 'GET' &&
    isHtml &&
    !isBot &&
    !req.path.startsWith('/admin') &&
    !req.path.startsWith('/api') &&
    !req.path.includes('.') // Ignore strictly any file paths (.php, .xml, .txt, etc)
  ) {
    const ip = req.ip || ''; // trust-proxy resolved; the leftmost X-Forwarded-For hop is client-chosen
    const geo = geoip.lookup(ip);
    const source = detectSource(req);
    const referrer = req.get('Referer') || req.get('Referrer') || '';

    // Fire and forget — don't block the response
    Event.create({
      type: 'page_view',
      page: req.path,
      sessionId: req.sessionID || '',
      ip,
      country: geo ? geo.country : '',
      countryCode: geo ? geo.country : '',
      userAgent: req.get('User-Agent') || '',
      source,
      referrer,
      /* Campaign tags exactly as they arrived. They are only on the URL the
         visitor landed on, so most page views carry none — see the note on
         these fields in models/Event.js for why they are kept alongside
         `source` rather than overriding it. */
      ...utmFrom(req.query),
      lat: geo ? geo.ll[0] : null,
      lon: geo ? geo.ll[1] : null,
    }).catch(() => {});
  }
  next();
}

// Default export stays the middleware function itself (server.js does
// `const trackPageView = require('./middleware/tracking')` and mounts it
// directly with app.use) — detectSource is attached as a property on that
// same function so other modules (routes/frontend.js's trackCheckoutReached)
// can reuse the exact same first-party attribution logic instead of
// duplicating it.
module.exports = trackPageView;
module.exports.detectSource = detectSource;
module.exports.isAcquisitionSource = isAcquisitionSource;
module.exports.detectAppChannel = detectAppChannel;
module.exports.APP_CHANNELS = APP_CHANNELS;
module.exports.SITE_HOST = SITE_HOST;
module.exports.utmFrom = utmFrom;
