/**
 * The case for a box, and the box for a case.
 *
 * A booster box page that can say "or buy the case: 12 boxes, $X, $Y per
 * box" sells cases, which is where the margin is, without a second
 * product form, a bundle engine or any new data: the case is already a
 * product of its own. This finds it by name. Both products are one set
 * in one format family, so after the format words are stripped ("booster
 * box", "case", "display", counts) the box's title words are all in the
 * case's title. A set code on both decides it outright.
 *
 * Pure: takes the product and candidates the route already fetched, and
 * returns null rather than guessing. A wrong pairing would put a wrong
 * price next to the Buy button, which is worse than no upsell.
 */

const STOP = new Set(['box', 'boxes', 'booster', 'boosters', 'elite', 'trainer', 'etb', 'hobby', 'play', 'collector', 'collectors',
  'display', 'case', 'cases', 'factory', 'sealed', 'pack', 'packs', 'of', 'the', 'a', 'and', 'bundle', 'bundles', 'jumbo',
  'tcg', 'card', 'cards', 'game', 'english', 'edition', 'ver', 'version', 'preorder', 'x', 'master', 'sealed']);

function words(title) {
  return String(title || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/)
    .filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w));
}

function isCase(p) {
  return /\bcase\b/i.test(p.productType || '') || /\bcase\b/i.test(p.title || '');
}

/** Boxes in a case, from its specs or its title; null when unknown. */
function boxesIn(caseProduct) {
  for (const s of caseProduct.specs || []) {
    if (/per case|boxes/i.test(s.label || '')) {
      const n = parseInt(String(s.value || '').replace(/[^\d]/g, ''), 10);
      if (n > 1 && n <= 60) return n;
    }
  }
  const m = /(\d{1,2})\s*(?:-|\s)?\s*(?:box|boxes|etbs?|bundles?|displays?|units?)\b/i.exec(caseProduct.title || '');
  if (m) { const n = parseInt(m[1], 10); if (n > 1 && n <= 60) return n; }
  return null;
}

function matches(box, candidate) {
  if (box.setCode && candidate.setCode) return box.setCode.toLowerCase() === candidate.setCode.toLowerCase();
  const b = words(box.title);
  if (!b.length) return false;
  const c = new Set(words(candidate.title));
  return b.every((w) => c.has(w));
}

/**
 * @returns {null | { kind: 'case', product, boxes, perBox, savingsPct } | { kind: 'box', product }}
 */
function pairFor(product, candidates) {
  if (!product || !Array.isArray(candidates)) return null;
  const others = candidates.filter((c) => c && String(c._id) !== String(product._id) && c.available !== false);
  if (isCase(product)) {
    const box = others.find((c) => !isCase(c) && matches(c, product));
    return box ? { kind: 'box', product: box } : null;
  }
  const cs = others.find((c) => isCase(c) && matches(product, c));
  if (!cs) return null;
  const boxes = boxesIn(cs);
  const perBox = boxes ? Math.round(cs.price / boxes) : null;
  const savingsPct = boxes && product.price > 0 && perBox < product.price ? Math.round(((product.price - perBox) / product.price) * 100) : 0;
  return { kind: 'case', product: cs, boxes, perBox, savingsPct };
}

module.exports = { pairFor, boxesIn, isCase, words };
