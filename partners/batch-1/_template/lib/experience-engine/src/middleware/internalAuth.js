"use strict";

/**
 * Guards internal, server-to-server endpoints. A caller must present the shared
 * secret (config.apiKey) as `Authorization: Bearer <secret>`. The secret lives
 * only in the server environment; the comparison is constant-time. Fails
 * closed: if no api key is configured, every request is denied.
 *
 * Returns a standard (req, res, next) handler compatible with Express/Connect.
 */
const crypto = require("crypto");

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createInternalAuth(config, logger) {
  return function internalAuth(req, res, next) {
    const configured = config.apiKey;
    if (!configured) {
      logger.error(
        "internal auth denied: no api key configured (fails closed)"
      );
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "unavailable" }));
    }

    const header =
      (req.headers && req.headers.authorization) ||
      (req.get && req.get("authorization")) ||
      "";
    const match = /^Bearer\s+(.+)$/i.exec(header);
    const presented = match ? match[1] : null;

    if (!presented || !timingSafeEqual(presented, configured)) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "unauthorized" }));
    }

    return next();
  };
}

module.exports = { createInternalAuth };
