"use strict";

/**
 * Mints short-lived, signed tokens for issuable experiences. Signing happens
 * entirely server-side; the secret never leaves the server.
 *
 * A token may also carry extra, signed "passthrough" claims (e.g. an assigned
 * email), but only claim names present in config.passthroughClaims are bound —
 * everything else is ignored, so a caller can never smuggle arbitrary fields.
 */
const { generateToken } = require("../token/generate");

function createIssuer(config, catalog) {
  /**
   * @param {string} experienceId
   * @param {object} [extraClaims]  values for whitelisted passthrough claims
   * @returns {string|null} signed token, or null for unknown/non-issuable ids
   *          (e.g. the default) so callers can decline without revealing which
   *          ids exist.
   */
  function issueToken(experienceId, extraClaims) {
    if (!catalog.isIssuable(experienceId)) return null;

    // JWT-style payload: { experience, ...whitelisted claims, iat, exp }.
    const claims = { experience: experienceId };
    if (extraClaims && config.passthroughClaims.length) {
      for (const name of config.passthroughClaims) {
        const value = extraClaims[name];
        if (value !== undefined && value !== null && value !== "") {
          claims[name] = value;
        }
      }
    }

    return generateToken(config.secret, claims, { ttlMs: config.tokenTtlMs });
  }

  return { issueToken };
}

module.exports = { createIssuer };
