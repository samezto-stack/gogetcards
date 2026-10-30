/**
 * Product URLs that moved, kept in code.
 *
 * WHY THIS EXISTS ALONGSIDE Product.previousSlugs. The model records a
 * rename automatically from now on, but that only helps for renames that
 * happen from now on. A URL that was renamed BEFORE that existed has no
 * history anywhere, and the only way to add one is to write to the
 * database — which means running a script against production.
 *
 * Listing it here instead means deploying is the whole job. No script, no
 * database access, no separate step to forget.
 *
 * Both are consulted: the database history first, then this. Neither can
 * shadow a live product, because a slug that resolves to a real product is
 * served before either is looked at.
 *
 * THE TARGET IS VERIFIED BEFORE REDIRECTING. If the right-hand slug does
 * not exist, the request 404s rather than bouncing the visitor to a second
 * dead page — a redirect chain that ends in nothing is worse than an
 * honest 404, for a person and for a crawler.
 *
 *     'old-slug-that-404s': 'slug-of-the-product-it-became',
 *
 * Bare slugs, no /products/ prefix, no leading slash.
 */
module.exports = {
  /* THE OP-17 PREORDER PAIR, LISTED IN BOTH DIRECTIONS ON PURPOSE.
   *
   * Both of these slugs ranked, and only one of them is a live product.
   * Rather than depend on remembering which, the pair is symmetric and the
   * route resolves it from the catalogue:
   *
   *   - a slug that IS a product is served before this file is consulted,
   *     so a live page can never redirect away from itself;
   *   - a slug that is NOT a product looks its partner up here, and the
   *     redirect only happens if that partner actually exists.
   *
   * So whichever one is live becomes the target automatically, and if a
   * rename ever swaps them the redirect follows without an edit. It cannot
   * loop: two dead slugs both fail the existence check and 404, and two
   * live slugs are each served directly. */
  'one-piece-op-17-tcg-the-world-s-strongest-warriors-booster-box-preorder':
    'one-piece-tcg-the-world-s-strongest-warriors-booster-box-op-17-preorder',
  'one-piece-tcg-the-world-s-strongest-warriors-booster-box-op-17-preorder':
    'one-piece-op-17-tcg-the-world-s-strongest-warriors-booster-box-preorder',
};
