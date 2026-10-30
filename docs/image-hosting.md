# Image hosting: the evaluation, and the decision

**Decision: do not build a native media library. Keep the current
URL-referencing model, exploit the CDN's own transform API, and treat the
one real risk — third-party URL ownership — as a separate, smaller problem
with a separate, smaller fix.**

This document exists because "migrate images to our own infrastructure"
sounds obviously right and mostly is not, and because the parts of it that
*are* right are worth doing on their own.

---

## What the system does today

Products store URLs, not files:

```js
// models/Product.js
imageUrl: { type: String, default: '' },
images:   [{ type: String }],
```

There is no upload path anywhere in the codebase. An operator pastes a URL
into the product form and every template renders that string. The URLs in
production point at Shopify's CDN.

The application runs as a single Node web service on Render. It has no
object storage, no persistent disk, no image-processing dependency, and no
CDN in front of it. `public/` is served by Express itself.

Those four absences are the whole argument. Everything below follows from
them.

---

## The measurable defect, which is real

The same stored URL was rendered into every slot on the site:

| Surface | CSS slot | What it downloaded |
|---|---|---|
| Collection card | ~270px | the full original |
| Product page main image | ~570px | the full original |
| Product gallery thumbnail | 72px | the full original |
| Cart drawer line | 70px | the full original |
| Cart page line | 80px | the full original |
| Checkout line item | 64px | the full original |

A product photo uploaded at 2048px is roughly 60× the pixel area of a 270px
card. A twenty-product collection page fetched twenty of those. It is the
largest object on the page, it is in the Largest Contentful Paint path on
every product page, and it was being requested at the wrong size on every
single surface.

**This is the problem worth fixing, and it is not a hosting problem.** It
is a markup problem. It exists identically whether the bytes come from
Shopify's CDN or from a media library we build.

---

## Would a native media library fix it better?

Score the thirteen things the migration was supposed to improve, against
what would actually have to be built and run.

| Goal | Self-hosted media library | Keep URLs + use transforms |
|---|---|---|
| Automatic resizing | Needs `sharp` (native build on the deploy host) or an external service | CDN does it per-request via a URL parameter |
| AVIF/WebP | Needs an encode pipeline and a variant store | CDN content-negotiates per request |
| Responsive images | Needs generated variants and a manifest | `srcset` over the transform API |
| CDN control | Needs a CDN we do not have | Global edge network already in front |
| Caching | Express `static` from one region | Edge-cached at hundreds of PoPs |
| Core Web Vitals | Worse: single-region origin, cold starts | Better: correct sizes, edge delivery |
| Performance | Worse, for the same reason | Better |
| SEO | No effect either way; Google indexes the URL it is given | No effect either way |
| Image quality | Whatever we encode | Whatever we upload, resized properly |
| Metadata | Would gain an editor | Unchanged |
| Alt management | Would gain an editor | **Already solved elsewhere** — alt text is generated from the product record in the templates, not stored per-image |
| Future feed flexibility | Same URLs in the feed either way | Same |
| **Ownership of the file** | **Solved** | **Not solved** |

Eleven of thirteen are neutral or actively worse. Two are genuinely better,
and one of those two — ownership — is the only real argument for the
migration.

### What "build it properly" actually costs

To match what the CDN already does, this service would need: an object
store (Render disks pin the service to one instance and are not a CDN); an
encoder producing AVIF, WebP and JPEG at six widths, so seven variants per
image plus originals; a cache-key and invalidation scheme; a CDN in front,
because serving images from a single Node process in one region is slower
than what it replaced; a migration for every existing URL; and permanent
redirects from the old URLs so nothing that already links to them breaks.

That is a real system with a real failure surface, built to reproduce
something already provided for free — and the deploy host is a single
region with no edge, so the finished version would still be slower than
what it replaced on the metric that started this.

### The one thing a migration does solve

Product images live on a CDN belonging to stores this business does not
control. If one of those stores rotates its catalogue, closes, or deletes a
product, the image disappears.

That failure is worse than it sounds:

- Google fetches `image_link` with its own crawler, on its own schedule,
  separately from the landing page. A dead image is an item disapproval.
- The storefront reads the same URL, so the product page breaks too — but
  only after a browser cache expires, which is why the operator's own
  browser keeps showing a working page while Google sees a 404.
- Nothing on the site reveals it.

**This is a real risk and it is not solved by anything below.** It is
solved by re-hosting the files, which is a content operation, not an
architecture project. A media library is not required to do it — any host
under our own domain works, and the product form already accepts any URL.

---

## What was implemented instead

### 1. `helpers/productImage.js`

Produces `src`, `srcset` and `sizes` for a stored URL and a slot width.

- The transform is applied **only** to hosts documented to support it
  (`cdn.shopify.com`, `shopifycdn.com`). Everything else passes through
  untouched — guessing a transform syntax against an unknown CDN turns a
  working image into a 404.
- Existing query parameters are preserved, because Shopify asset URLs carry
  a `v=` cache-buster that must survive or every render becomes a cache
  miss.
- `srcset` is capped at 2× the slot. Beyond that the extra pixels are
  invisible on every display that exists.
- When the host is not transformable it returns **no** `srcset` at all,
  rather than a set whose candidates are all the same file — that would let
  the browser choose the widest descriptor and download *more* than before.

**Failure mode, stated deliberately:** if the CDN ignored `?width=`, every
descriptor would resolve to the original. The result is no saving and a
correct picture. It cannot produce a broken image, which is what makes it
safe to apply site-wide without testing every stored URL first.

> **Not verified from this environment.** The sandbox's network policy
> blocks `cdn.shopify.com`, so the transform parameters here are Shopify's
> documented behaviour (it is what Shopify's own themes emit via
> `image_url: width:`), not something measured. Confirm once against a real
> stored URL — open any product page, look at the network panel, and check
> that the fetched image's intrinsic width matches the requested one. If it
> does not, the site is exactly as fast as it was before and nothing is
> broken.

### 2. Every image slot now asks for its own size

`views/partials/product-card.ejs`, `views/pages/product.ejs` (main image and
gallery thumbnails), `views/partials/cart-drawer.ejs`,
`views/partials/cart-drawer-inner.ejs`, `views/pages/cart.ejs`,
`views/pages/checkout-step1.ejs`, `views/pages/thank-you.ejs`.

Two details that were easy to get wrong:

- **The gallery thumbnail swap.** `public/js/zyphera.js` set `mainImg.src`
  and nothing else. A `srcset` beats a `src`, so adding responsive images
  would have made every thumbnail click do nothing visible. The handler now
  swaps `srcset` first, from a matching `data-thumb-srcset`.
- **The checkout `onerror` fallback.** It swapped `src` to a placeholder.
  With a `srcset` present the broken image would have stayed. It now clears
  `srcset` first.

### 3. Feed images are deliberately left alone

`services/distribution/feedBuilder.js` sends the stored URL unchanged.
Google wants the largest available image and re-encodes it itself, so a
narrower transform would be strictly worse — and if a transform parameter
were ever rejected by the host, the cost would be an item disapproval
rather than a slow page. The upside is nil and the downside is the thing
this whole system exists to prevent.

### 4. The ownership risk is now visible rather than latent

Two mechanisms, neither of which existed before:

- `services/distribution/imageProbe.js` fetches each `image_link` with a
  ranged request and reports reachability, content type and dimensions —
  including the case of a CDN answering `200` with an HTML error page,
  which looks healthy to a status check and disapproves the item anyway.
  Run from the dashboard's **Check every image**.
- `validators.js` raises `image_third_party_host` on any image served from
  a host other than this site's own. It is `info` severity and scores zero,
  because today it is a fact rather than a fault. It exists so that when
  the day comes, the answer to "how long has this been like that?" is on
  the screen.

---

## When to revisit this

Build the media library when at least one of these is true:

1. **Images are being re-hosted anyway.** Once files must be uploaded
   somewhere, an upload UI stops being redundant work.
2. **The store outgrows one region.** Adding a CDN is the moment
   self-hosting stops costing performance, and the calculation above
   inverts.
3. **Per-image metadata is genuinely needed** — distinct alt text per
   gallery image, credits, licensing. Today alt text is derived from the
   product record and there is nothing per-image to store.

Until one of those is true, the migration buys ownership at the price of
performance, and ownership is available more cheaply by other means.
