"use strict";

/**
 * Persistent experience cookie. The value is a signed token (same HMAC layer
 * as the URL token) whose payload is { experience, iat, exp } with a long
 * lifetime. The browser is never trusted: the signature is verified on every
 * read, and any tampered/expired value is rejected (returns null).
 */
const { generateToken } = require("../token/generate");
const { verifyToken } = require("../token/verify");
const {
  parseCookieHeader,
  serializeCookie,
  appendSetCookie,
  isSecureRequest,
} = require("../utils/cookie");

function createCookie(config) {
  const NAME = config.cookie.name;

  /** Read + verify the signed cookie. Returns the experience id, or null. */
  function read(req) {
    const header = req && req.headers && req.headers.cookie;
    const raw = parseCookieHeader(header)[NAME];
    if (!raw) return null;
    const payload = verifyToken(config.secret, raw);
    if (!payload || typeof payload.experience !== "string") return null;
    return payload.experience;
  }

  /** Sign a long-lived cookie value for an experience. */
  function sign(experienceId) {
    return generateToken(
      config.secret,
      { experience: experienceId },
      { ttlMs: config.cookie.ttlMs }
    );
  }

  /**
   * Set the signed cookie on the response. HttpOnly + SameSite + configured
   * lifetime; Secure is decided by config (true/false) or auto-detected from
   * the request when set to "auto".
   */
  function set(res, experienceId, req) {
    const secure =
      config.cookie.secure === "auto"
        ? isSecureRequest(req || {})
        : !!config.cookie.secure;

    const cookieStr = serializeCookie(NAME, sign(experienceId), {
      httpOnly: true,
      secure,
      sameSite: config.cookie.sameSite,
      maxAgeMs: config.cookie.ttlMs,
      path: config.cookie.path,
      domain: config.cookie.domain,
    });
    appendSetCookie(res, cookieStr);
  }

  /** Clear the cookie (e.g. to reset a visitor to default). */
  function clear(res) {
    const cookieStr = serializeCookie(NAME, "", {
      httpOnly: true,
      sameSite: config.cookie.sameSite,
      maxAgeMs: 0,
      path: config.cookie.path,
      domain: config.cookie.domain,
    });
    appendSetCookie(res, cookieStr);
  }

  return { name: NAME, read, sign, set, clear };
}

module.exports = { createCookie };
