/**
 * Repairs the feed problems that are unambiguous, and refuses the rest.
 *
 * THE RULE THIS MODULE FOLLOWS: only fix things where there is exactly one
 * correct answer. Collapsing a double space is safe because no other
 * outcome was intended. Guessing a GTIN is not a fix, it is fabrication —
 * Google validates the check digit and resolves it against a real product,
 * so a plausible-looking one is a Misrepresentation finding rather than a
 * missing field. The same goes for inventing a brand or a description.
 *
 * Each fix reports what it changed and why, so applying them is a reviewable
 * action rather than a black box that quietly rewrites the catalogue.
 */

const validators = require('./validators');

const change = (field, from, to, why) => ({ field, from, to, why });

/**
 * Computes the fixes for one product without applying them.
 * @returns {{changes: object[], patch: object}} patch is a mongoose-ready $set
 */
function plan(product) {
  const changes = [];
  const patch = {};

  /* ── Whitespace and capitalisation ── */
  const rawTitle = product.title || '';
  const cleanTitle = rawTitle.replace(/\s+/g, ' ').trim();

  /* Shouted words, decided by validators.isShouted so the repair and the
     warning cannot disagree about what counts. Title Case rather than
     lower, because a product title is a name. Set codes and acronyms are
     left alone by that same function. */
  const decapped = cleanTitle.split(' ').map((w) => (
    validators.isShouted(w)
      ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      : w
  )).join(' ');

  /* Reported as ONE change rather than one per rule. Two entries showing
     an intermediate title that is never stored reads as two edits, and the
     review list is only useful if each line is a thing that happens. */
  if (decapped !== rawTitle) {
    const reasons = [];
    if (cleanTitle !== rawTitle) reasons.push('Collapsed repeated whitespace.');
    if (decapped !== cleanTitle) reasons.push('Google\'s editorial rules disapprove titles with gratuitous capitalisation; recognised acronyms and set codes were left alone.');
    changes.push(change('title', rawTitle, decapped, reasons.join(' ')));
    patch.title = decapped;
  }

  /* ── Brand normalisation ── */
  const currentBrand = product.brand || product.vendor || '';
  const canon = validators.canonicalBrand(currentBrand);
  if (canon && canon !== product.brand) {
    changes.push(change('brand', product.brand || '(from vendor: ' + currentBrand + ')', canon,
      'Google matches on the manufacturer name as it appears in its own catalogue; a near-miss spelling submits but competes as unmatched.'));
    patch.brand = canon;
  }

  /* ── Identifier formatting ── */
  if (product.gtin) {
    const stripped = String(product.gtin).replace(/[\s-]/g, '');
    if (stripped !== product.gtin) {
      changes.push(change('gtin', product.gtin, stripped,
        'A GTIN is digits only. Spaces and dashes copied from a barcode label make it fail validation.'));
      patch.gtin = stripped;
    }
  }
  if (product.mpn && product.mpn.trim() !== product.mpn) {
    changes.push(change('mpn', product.mpn, product.mpn.trim(), 'Trimmed surrounding whitespace.'));
    patch.mpn = product.mpn.trim();
  }

  /* ── Language normalisation ── */
  if (product.language) {
    const LANG = { en: 'English', eng: 'English', english: 'English', jp: 'Japanese', jpn: 'Japanese', japanese: 'Japanese', kr: 'Korean', korean: 'Korean', cn: 'Chinese', chinese: 'Chinese' };
    const norm = LANG[product.language.toLowerCase().trim()];
    if (norm && norm !== product.language) {
      changes.push(change('language', product.language, norm,
        'Stated as a full language name so it reads correctly on the product page and in the feed\'s product details.'));
      patch.language = norm;
    }
  }

  /* ── Image URLs ── */
  if (product.imageUrl) {
    const trimmed = product.imageUrl.trim();
    /* Protocol-relative URLs work in a browser and not in a feed: Google's
       crawler has no page context to inherit a scheme from. */
    const fixed = trimmed.startsWith('//') ? 'https:' + trimmed : trimmed;
    if (fixed !== product.imageUrl) {
      changes.push(change('imageUrl', product.imageUrl, fixed,
        fixed !== trimmed
          ? 'A protocol-relative URL has no scheme for Google\'s image crawler to inherit.'
          : 'Trimmed surrounding whitespace.'));
      patch.imageUrl = fixed;
    }
  }

  /* ── Google category ── */
  if (!product.merchant || !product.merchant.googleCategory) {
    const distribution = require('../../config/distribution');
    changes.push(change('merchant.googleCategory', '(unset)', distribution.defaults.googleCategoryId,
      `Set to ${distribution.defaults.googleCategoryPath}, the correct node for sealed trading card product. Leaving it unset makes Google guess, and it guesses "Toys" often enough to matter.`));
    patch['merchant.googleCategory'] = distribution.defaults.googleCategoryId;
  }

  return { changes, patch };
}

/**
 * What this module will NOT do, surfaced in the UI so the absence is a
 * stated policy rather than a gap somebody assumes is a bug.
 */
const REFUSED = [
  { what: 'Invent a GTIN', why: 'Google validates the check digit and resolves it against a real product. A plausible fabrication resolves to somebody else\'s item, which is a Misrepresentation finding rather than a missing field.' },
  { what: 'Invent a brand', why: 'A wrong manufacturer is worse than none: it matches the product to the wrong catalogue entry.' },
  { what: 'Write a description', why: 'Generated filler is thin content, and Google rates it as such. A short honest description outperforms a padded one.' },
  { what: 'Guess a release date', why: 'A preorder date is a promise to the customer. Guessing turns a missing field into a broken commitment.' },
  { what: 'Resize or re-encode images', why: 'Needs a native image pipeline this build deliberately avoids. See docs/image-hosting.md.' },
];

module.exports = { plan, REFUSED };
