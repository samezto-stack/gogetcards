"use strict";

/**
 * Experience resolver. Determines which experience a request should receive,
 * from (in priority order) a signed URL token, then a signed persistent
 * cookie, then the default. It does NOT render, switch, or redirect — it
 * returns a browser-safe descriptor, where the decision came from, and any
 * signed passthrough claims (e.g. an assigned email) carried by the token.
 *
 * Never throws, never reveals WHY a token/cookie was rejected: anything
 * missing, malformed, forged, expired, or naming an unknown experience falls
 * through to the default.
 *
 * Passthrough claims are read from the TOKEN only — they are one-time values
 * tied to a specific hand-off, not persisted in the long-lived cookie.
 */
const { verifyToken } = require("../token/verify");

function createResolver(config, catalog, cookie) {
  function claimsFrom(payload) {
    const out = {};
    if (!config.passthroughClaims.length) return out;
    for (const name of config.passthroughClaims) {
      if (payload[name] !== undefined) out[name] = payload[name];
    }
    return out;
  }

  function outcome(id, source, claims) {
    return {
      experience: catalog.publicView(id),
      source,
      claims: claims || {},
    };
  }

  function usable(id) {
    return catalog.isIssuable(id); // known AND not the default
  }

  /**
   * @param {object} req  request-like object with `query` and `headers`
   * @returns {{ experience: {id, traits}, source: "token"|"cookie"|"default", claims: object }}
   */
  function resolve(req) {
    // 1) URL token — an explicit grant takes precedence, and carries claims.
    const token = req && req.query ? req.query[config.tokenParam] : undefined;
    if (token) {
      const payload = verifyToken(config.secret, token);
      if (payload && usable(payload.experience)) {
        return outcome(payload.experience, "token", claimsFrom(payload));
      }
    }

    // 2) Signed persistent cookie (verified on every request). No claims.
    const cookieId = cookie.read(req);
    if (usable(cookieId)) {
      return outcome(cookieId, "cookie", {});
    }

    // 3) Default.
    return outcome(catalog.DEFAULT_ID, "default", {});
  }

  return { resolve };
}

module.exports = { createResolver };
