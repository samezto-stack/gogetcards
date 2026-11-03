"use strict";

/**
 * Optional helper for projects that render a completely different, standalone
 * HTML document per experience. Loads a file once and caches it in memory
 * (static assets; a deploy restarts the process). The document is treated as a
 * black box — read verbatim, never parsed or modified. The cached string is
 * never mutated; callers build their own copies (e.g. to inject URL cleanup).
 *
 * The engine does not assume anything about the HTML. It is entirely optional.
 */
const fs = require("fs");

function createVariants() {
  const cache = new Map();

  function load(absPath) {
    const cached = cache.get(absPath);
    if (cached !== undefined) return cached;
    const html = fs.readFileSync(absPath, "utf8"); // throws if unreadable
    cache.set(absPath, html);
    return html;
  }

  function clear() {
    cache.clear();
  }

  return { load, clear };
}

module.exports = { createVariants };
