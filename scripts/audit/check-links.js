/* Finds URLs linked more than once from the same page under DIFFERENT
 * anchor text.
 *
 * Run:  node scripts/audit/check-links.js   (needs a server on PORT, default 5300)
 *
 * WHY THIS EXISTS, AND WHAT IT IS NOT
 * ----------------------------------
 * This is a tidiness and usability check, not a policy one. To be precise
 * about a claim that prompted it:
 *
 *   - Google MERCHANT CENTER has no policy about internal links or anchor
 *     text. Its policies cover misrepresentation, product data quality,
 *     restricted items and whether checkout works. Nothing here can cause
 *     a Merchant Center rejection.
 *
 *   - Google SEARCH is where the real (mild) effect lives. Linking the
 *     same URL several times from one page is completely normal and is not
 *     penalised — every site links its logo and its nav to the homepage.
 *     The nuance is that Google has long been understood to weight the
 *     FIRST link's anchor text when a page links the same target more than
 *     once, so the later ones contribute little anchor-text signal.
 *
 * The genuine cost is to the reader: two differently-labelled links sitting
 * near each other, pointing at the same page, read as two destinations.
 * "Free shipping on all orders" next to "Shipping & Delivery" in the same
 * footer is the case that prompted this.
 *
 * ALLOWED patterns below are the ones that are normal web design and are
 * deliberately kept. Everything else is reported.
 */
const http = require('http');

const PORT = process.env.PORT || 5300;
const PAGES = ['/', '/about', '/contact', '/faq', '/shipping', '/preorder-policy', '/cart'];

/* Legitimate cases, kept on purpose:
 *
 *   /                 the logo and a "Home" nav item. Universal.
 *   /collection/*     header nav is space-constrained ("MTG"), the footer
 *                     spells it out ("Magic: The Gathering"), and a
 *                     breadcrumb legitimately uses a short label ("Shop").
 *   /about, /contact  the header and the footer are separate navigation
 *                     regions; a short header label and a fuller footer one
 *                     is conventional.
 *
 * In-prose contextual links are also allowed: a sentence linking "what each
 * one does" to the cookie policy is good writing, and rewriting prose to
 * match a nav label would make it worse. They are detected by the anchor
 * text not appearing in any nav element.
 */
const ALLOWED = [/^\/$/, /^\/collection\//, /^\/about$/, /^\/contact$/];

const get = (p) => new Promise((r) => http.get({ port: PORT, path: p }, (res) => {
  let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => r(b));
}).on('error', () => r('')));

(async () => {
  let problems = 0;
  for (const url of PAGES) {
    const html = await get(url);
    if (!html) { console.log(`FAIL  ${url}: no response (is a server running on ${PORT}?)`); problems++; continue; }

    /* Only links inside nav-like containers count. A prose link and a nav
       link to the same page is fine; two NAV links to it under different
       labels is the thing worth catching. */
    const navRegions = [...html.matchAll(/<(nav|ul)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => m[2]).join('\n');

    const map = new Map();
    for (const m of navRegions.matchAll(/<a\b[^>]*href="(\/[^"#]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const href = m[1];
      const text = m[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!text || href.startsWith('/admin')) continue;
      if (ALLOWED.some((rx) => rx.test(href))) continue;
      if (!map.has(href)) map.set(href, new Set());
      map.get(href).add(text);
    }

    const dupes = [...map.entries()].filter(([, texts]) => texts.size > 1);
    if (dupes.length) {
      problems += dupes.length;
      console.log(`FAIL  ${url}`);
      dupes.forEach(([h, t]) => console.log(`        ${h}  <-  ${[...t].map((x) => JSON.stringify(x)).join('  |  ')}`));
    } else {
      console.log(`pass  ${url}`);
    }
  }
  console.log(problems
    ? `\n${problems} URL(s) linked from navigation under more than one label`
    : '\nNo navigation link points at the same URL under two different labels.');
  process.exit(problems ? 1 : 0);
})();
