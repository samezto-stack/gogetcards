"use strict";

/**
 * Low-level, framework-agnostic primitives for the signed-token layer.
 * Pure functions only — the caller supplies the secret, which never leaves
 * the server. There is no global state here.
 */
const crypto = require("crypto");

function base64urlEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str) {
  const padded = String(str).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

/** HMAC-SHA256 of `data` under `secret`, returned as a Buffer. */
function sign(secret, data) {
  return crypto.createHmac("sha256", secret).update(data).digest();
}

/**
 * Constant-time comparison that tolerates unequal lengths instead of throwing
 * (crypto.timingSafeEqual requires equal-length buffers).
 */
function safeEqual(a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b) || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

module.exports = { base64urlEncode, base64urlDecode, sign, safeEqual };
