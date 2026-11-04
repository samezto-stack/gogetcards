/**
 * The one way to send a 404 page.
 *
 * Five places rendered pages/404 with a bare res.status(404).render(...),
 * so the layout filled in its defaults: <title>GoGetCards</title>, a
 * self-referencing canonical for a URL that does not exist, and
 * "index, follow". The status code was right, but everything a crawler
 * reads from the page said "index me". A 404 is noindex, has no
 * canonical, and says what it is in the title.
 */
module.exports = function notFound(res) {
  return res.status(404).render('pages/404', {
    pageTitle: 'Page not found',
    metaDescription: 'That page does not exist on GoGetCards. Browse the sealed catalogue or search for the product you were looking for.',
    robotsOverride: 'noindex, follow',
    canonicalUrl: null,
  });
};
