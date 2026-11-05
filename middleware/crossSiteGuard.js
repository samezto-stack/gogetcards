/**
 * Refuse a state-changing request that a browser says came from another
 * site.
 *
 * Both cookies are SameSite=Lax, which is what stops a cross-site form
 * post from carrying a session today. That is one cookie attribute away
 * from every admin and account POST being forgeable, so the request's own
 * provenance is checked as well.
 *
 * The decision, in order:
 *   1. GET/HEAD/OPTIONS and the few legitimately cross-origin endpoints
 *      (HMAC-verified partner callbacks, unsubscribe links) pass.
 *   2. Sec-Fetch-Site, when the browser sends it, is authoritative: every
 *      current browser sends it, it cannot be set by a page, and it says
 *      exactly what we want to know. same-origin / same-site / none pass;
 *      cross-site is refused. Nothing else is consulted in that case —
 *      an Origin a privacy tool rewrote to "null" must not override it.
 *   3. Without Sec-Fetch-Site (old browsers, server-to-server): a foreign
 *      Origin is refused; no Origin passes.
 *
 * A refusal is logged with what was seen, so a false positive can be
 * diagnosed from the platform logs rather than guessed at.
 */
const site = require('../config/site');

const CROSS_SITE_OK = [
  /^\/api\/checkout\/(payment-recorded|session|confirm-arrival)/,
  /^\/email\/unsubscribe\//,
  /^\/api\/track-order/,
  /^\/feed\//,
];

function ownHosts(req) {
  const own = new Set([String(req.hostname || '').toLowerCase(), 'localhost', '127.0.0.1']);
  if (req.hostname) own.add(`www.${String(req.hostname).toLowerCase()}`);
  try { own.add(new URL(site.origin()).hostname.toLowerCase()); } catch (_) { /* no SITE_URL */ }
  return own;
}

function decide(req) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return null;
  if (CROSS_SITE_OK.some((re) => re.test(req.path))) return null;
  const sfs = String(req.get('Sec-Fetch-Site') || '').toLowerCase();
  if (sfs) return (sfs === 'same-origin' || sfs === 'same-site' || sfs === 'none') ? null : `Sec-Fetch-Site ${sfs}`;
  const origin = req.get('Origin');
  if (!origin) return null;
  let host = '';
  try { host = new URL(origin).hostname.toLowerCase(); } catch (_) { return `Origin ${origin}`; }
  return ownHosts(req).has(host) ? null : `Origin ${origin}`;
}

function crossSiteGuard(req, res, next) {
  const reason = decide(req);
  if (!reason) return next();
  console.warn(`[cross-site] refused ${req.method} ${req.path}: ${reason}; host=${req.hostname}; ua=${(req.get('User-Agent') || '').slice(0, 80)}`);
  return res.status(403).send('Forbidden');
}

module.exports = crossSiteGuard;
module.exports.decide = decide;
