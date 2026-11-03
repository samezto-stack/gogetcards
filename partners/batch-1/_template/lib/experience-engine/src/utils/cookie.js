"use strict";

/**
 * Framework-neutral cookie helpers. No dependency on Express — works with any
 * Node http ServerResponse / request with a `headers.cookie` string.
 */

/** Parse a raw Cookie header into a plain object. */
function parseCookieHeader(header) {
  const out = {};
  if (!header || typeof header !== "string") return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    if (!key) continue;
    let value = part.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    try {
      out[key] = decodeURIComponent(value);
    } catch (err) {
      out[key] = value;
    }
  }
  return out;
}

/** Serialize a Set-Cookie header value. */
function serializeCookie(name, value, options) {
  const opts = options || {};
  const segments = [name + "=" + encodeURIComponent(value)];

  segments.push("Path=" + (opts.path || "/"));
  if (typeof opts.maxAgeMs === "number") {
    segments.push("Max-Age=" + Math.floor(opts.maxAgeMs / 1000));
    segments.push("Expires=" + new Date(Date.now() + opts.maxAgeMs).toUTCString());
  }
  if (opts.domain) segments.push("Domain=" + opts.domain);
  if (opts.httpOnly !== false) segments.push("HttpOnly");
  if (opts.secure) segments.push("Secure");
  segments.push("SameSite=" + (opts.sameSite || "Lax"));

  return segments.join("; ");
}

/** Append a Set-Cookie header without clobbering existing ones. */
function appendSetCookie(res, cookieStr) {
  if (typeof res.append === "function") {
    res.append("Set-Cookie", cookieStr);
    return;
  }
  const prev = res.getHeader ? res.getHeader("Set-Cookie") : undefined;
  let next;
  if (!prev) next = cookieStr;
  else if (Array.isArray(prev)) next = prev.concat(cookieStr);
  else next = [prev, cookieStr];
  res.setHeader("Set-Cookie", next);
}

/** Best-effort HTTPS detection (direct or behind a proxy). */
function isSecureRequest(req) {
  if (req.secure) return true;
  const header =
    (req.headers && req.headers["x-forwarded-proto"]) ||
    (req.get && req.get("x-forwarded-proto")) ||
    "";
  return String(header).split(",")[0].trim() === "https";
}

module.exports = {
  parseCookieHeader,
  serializeCookie,
  appendSetCookie,
  isSecureRequest,
};
