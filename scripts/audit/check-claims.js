/* Adversarial phrase sweep: reads every rendered page the way a Google
 * Trust & Safety reviewer would and flags claims that trigger Merchant
 * Center findings.
 *
 * Run:  node scripts/audit/render-pages.js && node scripts/audit/check-claims.js
 *
 * This is a different kind of check from check-pages.js. That one asserts
 * that specific correct things are present; this one asserts that a list
 * of specific WRONG things is absent anywhere on the site. Every pattern
 * below corresponds to a claim that was genuinely on this site at some
 * point and had to be removed, or to one a future edit could plausibly
 * reintroduce.
 *
 * Patterns are deliberately narrow. A sweep that cries wolf gets ignored,
 * and a broad pattern here already produced two false positives: "Orders
 * over $500 require a signature" read as a shipping threshold, and "we
 * will not always be the cheapest" read as a price-superiority claim.
 * Both are the opposite of the thing being looked for.
 */
const fs = require('fs');
const path = require('path');

const pages = JSON.parse(fs.readFileSync(path.join(require('os').tmpdir(), 'gogetcards-rendered.json'), 'utf8'));

/** Visible text only: script and style contents are not read by a human. */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

const RED_FLAGS = [
  // Misrepresentation: figures with nothing behind them.
  [/\b\d[\d,]*\+?\s+(satisfied|happy|verified)?\s*(customers|collectors|buyers|orders delivered)\b/i,
    'customer/order count with no evidence behind it'],
  [/\b[45][.,]\d\s*(\/\s*5|stars?|★|out of 5)/i,
    'star rating with no review system behind it (FTC 16 CFR 465)'],
  [/\bbased on \d+ reviews?\b/i, 'review count with no review system'],

  // Misrepresentation: claims about the business's status.
  [/\b(official|authorized|licensed)\s+(retailer|partner|reseller|distributor)\s+of\b/i,
    'claims an official relationship with a publisher'],
  [/\bwe are the (cheapest|lowest|best)\b|\b(cheapest|lowest) prices? (anywhere|guaranteed|online)\b|\bprice match guarantee\b/i,
    'price-superiority claim'],

  // Misrepresentation: promises about outcomes nobody controls.
  [/\bguaranteed\s+(profit|return on|value|investment|hit|pull)\b/i, 'guarantees an outcome'],
  [/\bwill (increase|appreciate) in value\b/i, 'predicts future value'],

  // A template that printed a missing value. "within undefined business
  // days" went live once: every check passed because none of them looked
  // for the word itself.
  [/\b(undefined|NaN|\[object Object\])\b|\bnull business days?\b/,
    'a template printed a missing value (undefined/NaN/null)'],

  // Preorder dispatch window. Every surface reads the number from
  // config/shipping.js; these are the phrasings that drifted from it.
  [/\b(release day or the business day after|ships? (direct )?on release day\b(?! or within)|ships? release day\.)/i,
    'preorder dispatch window stated differently from the Shipping page'],

  // Payment and pricing accuracy.
  [/\b(PayPal|Klarna|Afterpay|Affirm|Sezzle)\b/i, 'names a payment method that is not offered'],
  [/\b(taxes|duties|VAT) (are )?included\b/i,
    'claims taxes are included, which the shipping policy contradicts'],

  // Shipping consistency. Narrow on purpose: a signature threshold and a
  // returns window are both "over $N" phrases that are not shipping prices.
  [/free (tracked )?(shipping|delivery)[^.]{0,40}over \$\d/i, 'stale free-shipping threshold'],
  [/shipping[^.]{0,25}(calculated|determined) at checkout/i,
    'defers a shipping cost that is now always free'],

  /* Claims of affiliation.
     The footer of every page disclaims affiliation with the publishers by
     name. A heading elsewhere that reads as "we ARE an official /
     authorized retailer" therefore contradicts the same page it sits on,
     which is exactly what a Merchant Center misrepresentation review is
     built to find — and unauthorised "official retailer" wording is also
     what the publishers themselves act on.

     Deliberately does NOT match "bought through authorized distribution"
     or "we buy from official distributors", which describe who the shop
     buys FROM rather than what it IS. */
  [/\b(official|authoris?ed)\s+(retailer|reseller|stockist|partner|distributor)\b(?!s)/i,
    'claims to BE an official or authorized retailer, which the footer disclaimer contradicts'],

  // Landing-page quality.
  [/lorem ipsum|\bplaceholder\b|\bTODO\b|\bFIXME\b|\bcoming soon\b|\bunder construction\b/i,
    'placeholder or unfinished content'],
  [/\bAs an AI\b|\bas a language model\b|\bI cannot provide\b/i, 'AI generation artifact'],
  [/\[insert |\{\{|\bXXX\b|\bYOUR_/, 'unfilled template token'],
];

let flags = 0;
for (const [name, html] of Object.entries(pages)) {
  const text = visibleText(html);
  for (const [pattern, reason] of RED_FLAGS) {
    const match = text.match(pattern);
    if (match) {
      flags++;
      const at = text.indexOf(match[0]);
      console.log(`FLAG  ${name.padEnd(18)} ${reason}`);
      console.log(`        ...${text.slice(Math.max(0, at - 45), at + match[0].length + 45).trim()}...`);
    }
  }
}

console.log(flags
  ? `\n${flags} flag(s) across ${Object.keys(pages).length} pages`
  : `\nNo red-flag claims on any of the ${Object.keys(pages).length} rendered pages.`);
process.exit(flags ? 1 : 0);
