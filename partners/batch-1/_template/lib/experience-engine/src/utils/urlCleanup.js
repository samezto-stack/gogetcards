"use strict";

/**
 * Invisible client hooks that adjust the address bar AFTER the server has read
 * the token — via history.replaceState, so there is no reload and no second
 * redirect. Nothing the user sees changes; only the URL in the bar is adjusted.
 */

/**
 * Cleanup-only: removes the one-time experience token from the URL. Used when a
 * token was present but there are no passthrough claims to emit.
 */
function buildUrlCleanupSnippet(param) {
  const p = JSON.stringify(String(param));
  return (
    "<script>(function(){try{" +
    "var u=new URL(window.location.href);" +
    "if(u.searchParams.has(" +
    p +
    ")){u.searchParams.delete(" +
    p +
    ");" +
    "var s=u.searchParams.toString();" +
    'window.history.replaceState(null,"",u.pathname+(s?("?"+s):"")+u.hash);' +
    "}}catch(e){}})();</script>"
  );
}

/**
 * Emit trusted passthrough claims (e.g. an assigned email) into the URL query
 * as `?<name>=<value>` from the SERVER-VERIFIED token values, and remove the
 * one-time token param. Injected as early as possible so the values are present
 * in `location.search` before the page's own scripts read them. The values come
 * from the signed token, so they cannot have been tampered with in transit.
 */
function buildClaimEmitSnippet(claims, tokenParam) {
  const data = JSON.stringify(claims || {});
  const p = JSON.stringify(String(tokenParam));
  return (
    "<script>(function(){try{" +
    "var d=" +
    data +
    ";var u=new URL(window.location.href);" +
    "Object.keys(d).forEach(function(k){u.searchParams.set(k,d[k]);});" +
    "u.searchParams.delete(" +
    p +
    ");" +
    "var s=u.searchParams.toString();" +
    'window.history.replaceState(null,"",u.pathname+(s?("?"+s):"")+u.hash);' +
    "}catch(e){}})();</script>"
  );
}

/**
 * Strip a given list of query params from the URL via history.replaceState.
 * Injected late (after the page has read them) so the address bar ends clean.
 */
function buildParamStripSnippet(names) {
  const arr = JSON.stringify((names || []).map(String));
  return (
    "<script>(function(){try{" +
    "var ns=" +
    arr +
    ";var u=new URL(window.location.href);var c=false;" +
    "ns.forEach(function(n){if(u.searchParams.has(n)){u.searchParams.delete(n);c=true;}});" +
    "if(c){var s=u.searchParams.toString();" +
    'window.history.replaceState(null,"",u.pathname+(s?("?"+s):"")+u.hash);}' +
    "}catch(e){}})();</script>"
  );
}

/**
 * Insert a snippet immediately before the final </body>. Returns a new string;
 * the input is never mutated. Falls back to appending if there is no </body>.
 */
function injectBeforeBodyClose(html, snippet) {
  const idx = String(html).toLowerCase().lastIndexOf("</body>");
  if (idx === -1) return html + snippet;
  return html.slice(0, idx) + snippet + html.slice(idx);
}

/**
 * Insert a snippet as early as possible — right after the opening <head> (or
 * <body>, or at the very top as a last resort) — so it runs before the page's
 * own scripts. Returns a new string; the input is never mutated.
 */
function injectEarly(html, snippet) {
  const head = /<head[^>]*>/i.exec(html);
  if (head) {
    const idx = head.index + head[0].length;
    return html.slice(0, idx) + snippet + html.slice(idx);
  }
  const body = /<body[^>]*>/i.exec(html);
  if (body) {
    const idx = body.index + body[0].length;
    return html.slice(0, idx) + snippet + html.slice(idx);
  }
  return snippet + html;
}

module.exports = {
  buildUrlCleanupSnippet,
  buildClaimEmitSnippet,
  buildParamStripSnippet,
  injectBeforeBodyClose,
  injectEarly,
};
