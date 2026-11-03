/**
 * A third, independent signed cookie that persists the non-email passthrough
 * claims (productName, productImage, productSlug, whopPlanId, productPrice,
 * productQuantity) for a gated experience — the same problem
 * pooledEmailCookie.js solves for email, but for everything else.
 *
 * WHY THIS EXISTS: only "email" was ever persisted beyond the one-time
 * redirect URL (in the xpe cookie below). Every other claim only ever lived
 * in that URL's query string — and the URL gets stripped clean by the
 * token-cleanup script shortly after load (see injectClaims in the vendored
 * experience-engine). Any later request that resolves purely from the
 * persisted `xp` cookie — a page refresh, the customer reopening the tab,
 * revisiting a bookmarked or copied URL — had nothing left to read these
 * claims from, and silently fell back to partner.html's own BUILT-IN
 * fallback product, price, and plan id. Confirmed in testing on
 * pitchforge-studio: a repeat visit showed a completely different product at
 * a completely different price than the one the customer was actually
 * routed to buy.
 *
 * FIX: sign every non-email claim into its own cookie the instant a real
 * token verifies them, using the exact same HMAC primitives
 * (token.generateToken/verifyToken) and secret (engine.config.secret) as
 * pooledEmailCookie.js and the engine's own xp cookie. Read back on every
 * later request that resolves to the same gated experience id, so the
 * correct product/price/quantity survive a repeat visit exactly like the
 * pooled email already does.
 *
 * The payload also records WHICH experience id the claims were assigned
 * for, and a read is only honored if it matches the currently resolved id —
 * so claims from one gated experience are never carried over and reused for
 * a different one on the same site.
 */
import { token } from '../lib/experience-engine/src/index.js';

const COOKIE_NAME = 'xpc';

function isSecureRequest(req) {
  if (req.secure) return true;
  const header = (req.get && req.get('x-forwarded-proto')) || '';
  return String(header).split(',')[0].trim() === 'https';
}

function readCookieRaw(req) {
  const header = req.headers && req.headers.cookie;
  if (!header || typeof header !== 'string') return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    if (key !== COOKIE_NAME) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * @returns {Record<string,string>|null} the persisted claims, only if the
 *   cookie is present, signature-valid, unexpired, AND was signed for this
 *   exact experience id.
 */
export function readExperienceClaimsCookie(req, engine, experienceId) {
  try {
    const raw = readCookieRaw(req);
    if (!raw) return null;
    const payload = token.verifyToken(engine.config.secret, raw);
    if (!payload || typeof payload !== 'object') return null;
    if (payload.experience !== experienceId) return null;
    const { experience, iat, exp, ...claims } = payload;
    return claims;
  } catch {
    return null;
  }
}

/**
 * When this browser's claims cookie was signed, in ms since the epoch, or
 * null if there is no valid cookie for this experience.
 *
 * Read from the SIGNED payload, never from a header or a query parameter, so
 * a visitor cannot move their own clock backwards to stay inside a window
 * that depends on it. Exposed separately rather than folded into the claims
 * object above, because everything that consumes that object iterates the
 * passthrough whitelist and an extra key there would be quietly ignored in
 * some places and not others.
 */
export function readExperienceClaimsIssuedAt(req, engine, experienceId) {
  try {
    const raw = readCookieRaw(req);
    if (!raw) return null;
    const payload = token.verifyToken(engine.config.secret, raw);
    if (!payload || typeof payload !== 'object') return null;
    if (payload.experience !== experienceId) return null;
    return typeof payload.iat === 'number' ? payload.iat : null;
  } catch {
    return null;
  }
}

export function setExperienceClaimsCookie(res, req, engine, claims, experienceId) {
  try {
    const ttlMs = engine.config.cookie.ttlMs;
    const signed = token.generateToken(engine.config.secret, { ...claims, experience: experienceId }, { ttlMs });
    const secure = isSecureRequest(req);
    const parts = [
      `${COOKIE_NAME}=${encodeURIComponent(signed)}`,
      'Path=/',
      `Max-Age=${Math.floor(ttlMs / 1000)}`,
      `Expires=${new Date(Date.now() + ttlMs).toUTCString()}`,
      'HttpOnly',
      'SameSite=Lax',
    ];
    if (secure) parts.push('Secure');
    res.append('Set-Cookie', parts.join('; '));
  } catch {
    /* never block the redirect on cookie-signing failure */
  }
}
