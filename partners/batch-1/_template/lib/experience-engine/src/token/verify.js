"use strict";

/**
 * Token verification. Pure, side-effect-free, and never throws: any problem
 * with the token — wrong shape, bad signature, expired, malformed payload —
 * returns null so callers can silently fall back to a default.
 */
const { base64urlEncode, base64urlDecode, sign, safeEqual } = require("./codec");

const MAX_TOKEN_LENGTH = 4096;

/**
 * @param {string|Buffer} secret
 * @param {string}        token
 * @returns {object|null} the verified payload, or null if invalid/expired.
 */
function verifyToken(secret, token) {
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > MAX_TOKEN_LENGTH
  ) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const encodedPayload = parts[0];
  const providedSignature = parts[1];
  if (!encodedPayload || !providedSignature) return null;

  // Signature check first (constant-time) — reject forgeries before parsing.
  const expectedSignature = base64urlEncode(sign(secret, encodedPayload));
  if (
    !safeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    )
  ) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(base64urlDecode(encodedPayload).toString("utf8"));
  } catch (err) {
    return null;
  }

  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;

  return payload;
}

module.exports = { verifyToken };
