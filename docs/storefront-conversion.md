# Storefront conversion features

Seven additions to the shop front, each a plain server-rendered feature
that works without JavaScript where a link can do the job.

| Feature | Where |
|---|---|
| Release calendar at `/releases` (upcoming by month, undated last, last 60 days underneath, `?line=` filter, ItemList markup) | `routes/frontend.js`, `views/pages/releases.ejs`, `views/partials/release-row.ejs` |
| Collection filters (availability, line, type, language, price band) with counts from one `$facet` pipeline, every option a real link | `routes/frontend.js` collection route, `views/pages/collection.ejs` |
| Instant search under the header box (`GET /api/search`, rate limited, 8 results, keyboard navigable) | `routes/api.js`, `public/js/gogetcards.js`, `views/partials/header.ejs` |
| Pack tiers on pack-sold products: "4 for $49.99 · 8 for $99.98 · 12 for $149.97" chips that drive the stepper | `views/pages/product.ejs`, `public/js/gogetcards.js` |
| Case upsell: the case on a box page, the box on a case page, paired by set code or title | `services/caseOffer.js`, product route, `views/pages/product.ejs` |
| Shorter home page on phones (hero and trust bar compacted at 640px, nothing removed) | `public/css/gogetcards.css` |
| Concrete promise line on product cards ("Ships today · Factory sealed · Free shipping") from the real dispatch cutoff | `helpers/dispatch.js`, `views/partials/product-card.ejs` |

Rules kept: query values are coerced to strings and whitelisted before
they reach Mongo; regex input is escaped; the search endpoint is rate
limited; suggestions are built with `textContent`; prices shown for a
paired product are its own market price, never derived. The case offer
returns null rather than guess, because a wrong price next to the Buy
button is worse than no upsell.

Audits: `render-pages.js` has fixtures for `releases`, `releases(empty)`,
`collection(filters)`, `product(pack-of-4)` and `product(case-offer)`;
`check-routes.js` exercises `/releases` and keeps its preorder fixture
45 days in the future so it stays a preorder; `test/caseOffer.test.js`
covers the pairing.
