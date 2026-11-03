/**
 * A second, independent signed cookie that carries ONLY the pooled email
 * assigned by a verified experience token — nothing else touches this.
 *
 * WHY THIS EXISTS: the "email" passthrough claim used to be echoed into the
 * clean URL's query string right after a token verified, and then re-read
 * from req.query on every later request that resolved to a gated
 * experience — including a repeat visit resolved purely from the persisted
 * `xp` cookie, with no token in that request at all. That trusted whatever
 * "email" happened to be in the CURRENT url unconditionally, with no proof
 * it ever came from a signed token. Any link carrying `?email=` for a
 * completely unrelated reason (marketing/CRM tools commonly auto-append the
 * recipient's own email to every link they send) would have had that value
 * treated as our own pooled address and handed straight to Whop's
 * prefill-email field — confirmed exploitable in review: a hand-appended
 * `?email=` survived unchanged through both the token-redirect hop and a
 * cookie-only repeat visit.
 *
 * FIX: the pooled email is signed into its own cookie the instant a real
 * token verifies it, using the exact same HMAC primitives
 * (token.generateToken/verifyToken) and secret (engine.config.secret) the
 * experience-engine itself uses for its own `xp` cookie — engine.config.secret
 * never leaves this server, so the browser cannot forge a value that
 * verifies. From then on, "email" is read ONLY from this cookie (or the
 * fixed FALLBACK_CHECKOUT_EMAIL) — NEVER from req.query, on any request,
 * ever. Whop can therefore only ever receive an address that came from
 * zypheratcg's own pool or the fallback — never anything a URL parameter
 * could supply.
 *
 * The payload also records WHICH experience id the email was assigned for,
 * and a read is only honored if it matches the currently resolved id — so a
 * pooled email claimed for one gated experience is never carried over and
 * reused for a different one on the same site.
 *
 * Identical to northbridgeai's server/pooledEmailCookie.js, just pointed at
 * this repo's vendored copy of the engine instead of the npm package.
 */
import { token } from '../lib/experience-engine/src/index.js';

const COOKIE_NAME = 'xpe';

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
 * @returns {string|null} the pooled email, only if the cookie is present,
 *   signature-valid, unexpired, AND was signed for this exact experience id.
 */
export function readPooledEmailCookie(req, engine, experienceId) {
  try {
    const raw = readCookieRaw(req);
    if (!raw) return null;
    const payload = token.verifyToken(engine.config.secret, raw);
    if (!payload || typeof payload.email !== 'string' || !payload.email) return null;
    if (payload.experience !== experienceId) return null;
    return payload.email;
  } catch {
    return null;
  }
}

export function setPooledEmailCookie(res, req, engine, email, experienceId) {
  try {
    const ttlMs = engine.config.cookie.ttlMs;
    const signed = token.generateToken(engine.config.secret, { email, experience: experienceId }, { ttlMs });
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
