/* Safely serialise a value for embedding inside an inline <script> block
 * rendered with EJS's raw tag (<%- ... %>).
 *
 * Plain JSON.stringify is NOT safe there: if any string in the value
 * contains "</script>" — which a crafted utm_source, campaign name, or
 * lead email can carry all the way to an admin page — it closes the
 * surrounding <script> tag and the rest is parsed as live HTML, giving a
 * stored cross-site-scripting (XSS) hole.
 *
 * Escaping "<", ">" and "&" to their \uXXXX forms keeps the output valid
 * JSON / valid JS (they sit inside string literals) while making a
 * "</script>" breakout impossible. U+2028 and U+2029 are also escaped
 * because they are literal line terminators inside JS string literals and
 * would otherwise produce a syntax error; they are matched via their code
 * points so no literal separator ever appears in this source file.
 */
var LINE_SEP = String.fromCharCode(0x2028);
var PARA_SEP = String.fromCharCode(0x2029);

module.exports = function jsonForScript(value) {
  return JSON.stringify(value === undefined ? null : value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(LINE_SEP).join('\\u2028')
    .split(PARA_SEP).join('\\u2029');
};
