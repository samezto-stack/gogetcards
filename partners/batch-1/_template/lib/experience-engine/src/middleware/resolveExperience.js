"use strict";

/**
 * Express/Connect middleware that resolves the experience for a request and
 * attaches it to `req`, before any rendering:
 *
 *   req.experience        -> { id, traits }        (browser-safe)
 *   req.experienceSource  -> "token" | "cookie" | "default"
 *   req.experienceClaims  -> {} or signed passthrough claims (e.g. { email })
 *
 * Side effects, all opt-out via options:
 *   - On a first token-based grant, persists the signed experience cookie.
 *   - Sets `Cache-Control: no-store` when a token/cookie is in play, so shared
 *     caches never serve one visitor's resolved page to another.
 *
 * It never renders or redirects — the consuming route decides what to do with
 * `req.experience`.
 */
function createResolveMiddleware(engine, options) {
  const opts = options || {};
  const persistCookie = opts.persistCookie !== false;
  const setNoStore = opts.noStore !== false;

  return function resolveExperience(req, res, next) {
    const result = engine.resolve(req);
    req.experience = result.experience;
    req.experienceSource = result.source;
    req.experienceClaims = result.claims || {};

    if (setNoStore && res.setHeader) {
      res.setHeader("Cache-Control", "no-store");
    }

    if (persistCookie && result.source === "token") {
      engine.cookie.set(res, result.experience.id, req);
    }

    return next();
  };
}

module.exports = { createResolveMiddleware };
