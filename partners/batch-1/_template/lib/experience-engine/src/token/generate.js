"use strict";

/**
 * Token generation. Produces a compact, URL-safe, HMAC-signed token of the
 * form `<base64url(payload)>.<base64url(signature)>`. Payloads use JWT-style
 * field names: the caller's claims plus `iat` (issued-at) and `exp` (expiry),
 * both epoch milliseconds.
 */
const { base64urlEncode, sign } = require("./codec");

/**
 * @param {string|Buffer} secret        signing secret (server-side only)
 * @param {object}        claims        JSON-serializable claims (keep minimal)
 * @param {object}        options
 * @param {number}        options.ttlMs  lifetime in milliseconds from now
 * @returns {string} signed token
 */
function generateToken(secret, claims, options) {
  const ttlMs = options && options.ttlMs;
  if (typeof ttlMs !== "number" || !Number.isFinite(ttlMs)) {
    throw new TypeError("generateToken: options.ttlMs must be a number");
  }

  const now = Date.now();
  const payload = Object.assign({}, claims, { iat: now, exp: now + ttlMs });

  const encodedPayload = base64urlEncode(
    Buffer.from(JSON.stringify(payload), "utf8")
  );
  const signature = base64urlEncode(sign(secret, encodedPayload));

  return encodedPayload + "." + signature;
}

module.exports = { generateToken };
