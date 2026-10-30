/* ── Zyphera logomark ─────────────────────────────────────
   The single source of truth for the brand mark. Every icon, favicon,
   touch icon and share image in the repo is generated from this file by
   scripts/generate-brand-assets.js, so none of them can drift apart.

   The mark: a Z built as three separate cards. A Z is already three
   strokes, so reading them as a stack of cards costs no extra detail —
   which is what keeps it legible at 16px where the previous neon mark
   turned to mush. The gaps between the pieces are the idea, not padding:
   they are what stops it being a generic bold Z.

   Deliberately absent: gradients, glow, bevels, shadows, and any baked-in
   background. Those are the things that made the old mark read as
   generated, and they are also the things that stop a mark working small,
   in one colour, or on an unknown background.

   Geometry is on a 512 grid with the mark inset to 104..408, leaving
   ~19% padding on every side so it never collides with a rounded icon
   mask or a tab's edge.
*/

const VIOLET = '#7C3AED';

/** Mark paths only, no <svg> wrapper. */
function markBody(fill = VIOLET) {
  return [
    // Top card
    `<rect x="104" y="104" width="304" height="74" rx="10" fill="${fill}"/>`,
    /* Diagonal card. Its ends are cut horizontally so they sit parallel
       to the bars above and below, which is what makes the three pieces
       read as a stack rather than as one broken letter. */
    `<polygon points="284,192 408,192 228,320 104,320" fill="${fill}"/>`,
    // Bottom card
    `<rect x="104" y="334" width="304" height="74" rx="10" fill="${fill}"/>`,
  ].join('\n  ');
}

/**
 * A complete SVG document.
 * @param {object} o
 * @param {string} [o.fill]  mark colour
 * @param {string} [o.bg]    background colour, or null for transparent
 * @param {number} [o.size]  pixel width/height attribute
 */
function markSvg({ fill = VIOLET, bg = null, size = 512 } = {}) {
  const background = bg ? `\n  <rect width="512" height="512" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">${background}
  ${markBody(fill)}
</svg>`;
}

module.exports = { markBody, markSvg, VIOLET };
