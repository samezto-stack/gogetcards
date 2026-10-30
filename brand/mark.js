/* ── GoGetCards logomark ──────────────────────────────────
   The single source of truth for the brand mark. Every icon, favicon,
   touch icon and share image in the repo is generated from this file by
   scripts/generate-brand-assets.js, so none of them can drift apart.

   The mark: two trading cards, one filled card drawn over one outlined
   card tilted behind it. A pair of cards is the unit the whole store deals
   in (sealed boxes are stacks of exactly this), and the filled-over-outline
   arrangement is what keeps it readable as two cards in a single colour at
   16px, where two filled shapes would merge into one blob.

   Deliberately absent: gradients, glow, bevels, shadows, and any baked-in
   background. A mark has to work small, in one colour, and on an unknown
   background, and those are the things that stop it doing so.

   Geometry is on a 512 grid with the mark inset to roughly 104..408,
   leaving ~19% padding on every side so it never collides with a rounded
   icon mask or a tab's edge.
*/

const BRAND = '#0F2A4A';

/** Mark paths only, no <svg> wrapper. */
function markBody(fill = BRAND) {
  return [
    /* Back card: outline only, tilted. Rotated about its own centre so
       the tilt reads as a card fanned out from the stack, not a card
       sliding off the grid. */
    `<rect x="190" y="104" width="196" height="272" rx="22" fill="none" stroke="${fill}" stroke-width="30" transform="rotate(14 288 240)"/>`,
    // Front card: filled, upright.
    `<rect x="126" y="136" width="196" height="272" rx="22" fill="${fill}"/>`,
  ].join('\n  ');
}

/**
 * A complete SVG document.
 * @param {object} o
 * @param {string} [o.fill]  mark colour
 * @param {string} [o.bg]    background colour, or null for transparent
 * @param {number} [o.size]  pixel width/height attribute
 */
function markSvg({ fill = BRAND, bg = null, size = 512 } = {}) {
  const background = bg ? `\n  <rect width="512" height="512" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">${background}
  ${markBody(fill)}
</svg>`;
}

module.exports = { markBody, markSvg, BRAND };
