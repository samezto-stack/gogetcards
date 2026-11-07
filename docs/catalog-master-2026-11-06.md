# GoGetCards — final master catalogue import, 2026-11-06/07

**Deliverable:** `docs/gogetcards-final-master-import-2026-11-06.csv` — one full-catalogue file (143 rows: 142 existing products updated in place, 1 product recreated), replacing every CSV proposed earlier. Nothing has been imported; the live catalogue is unchanged.

**Importer dry run (the repository's own planner, `services/productCsv.plan`, against today's live catalogue):** 142 update · 1 create · 0 errors · 0 unknown columns · 0 duplicate handles. Feed simulation over the 143 products as they will be after import: 0 errors.

## 1. Numbers

| | Before | After import |
|---|---|---|
| Products | 142 | 143 (OP-16 master case recreated) |
| Retailer-created multipacks | 62 | 33 |
| Prices changed | — | 108 |
| Products with a GTIN | 68 | 134 (66 newly verified) |
| Above the lowest credible offer | 18 (previous audit, vs TCGplayer market) | 8 (vs lowest credible *delivered* offer) |
| 0–10% below | 43 | 9 |
| 10–20% below | 50 | 9 |
| 20–25% below | — | 12 |
| 25–30% below | — | 34 |
| 30–40% below | — | 50 |
| More than 40% below | — | 21 |
| No market reference found | — | 0 |
| Rows needing your decision before import | — | 47 (see `approval_required` in the pricing review) |
| Launch shortlist | 30 | 30 + 24 waiting |

## How this file was built, and what it will do

**Source of truth.** Every one of the 142 live products was re-read from the live site on 6 November after the latest deploy (title, price, pack size, stored photo, description, specification rows, availability, release date, GTIN, SKU, brand, language, set code). Collections, tags and variant grouping came from the catalogue worksheet the store was imported from, cross-checked against the live pages (142/142 titles, types and SKUs agree). The database host is not reachable from this environment, so the live pages are the catalogue as the importer will find it; if you have edited a product in the admin since 6 November, that edit is what the row will overwrite in the columns listed below.

**Importer semantics (read from `services/productCsv.js`).** A row whose `handle` matches an existing product updates it; only the columns present in the file are written, and a present-but-blank cell clears that field. The master file therefore carries exactly these 19 columns and no others: `handle, title, vendor, product_type, price, pack_size, image_url, images, description, specs, collections, tags, gtin, brand, language, set_code, preorder, release_date, available`. Everything else on a product is untouched by the import: stock counts, allocation limits, compare-at prices, badges, featured flags, SKUs, MPNs, editions, variant grouping, stock-hold settings, market prices and Merchant overrides. Importing the file twice produces the same result (handles match, nothing is created a second time).

**The $49.99 ladder is a checkout constraint, not a pricing preference.** The partner checkout charges whole rungs of $49.99 (24 rungs, maximum $1,199.76 per line), so every listed price must be a multiple of $49.99. That is the single structural reason any retailer multipack survives in this file: a product whose single-unit market price is below about $62 cannot be sold singly at a price that is competitive, because the lowest possible listed price is $49.99. Where that applies the file keeps the smallest pack whose per-unit price lands at least 25% below the lowest credible offer, and the review file says so product by product. If the partner adds lower rungs, every one of those packs can become a single.

**What "lowest credible delivered price" means here.** For each product the research recorded the cheapest currently buyable offer for the exact product (same set, configuration, language, sealed) from TCGplayer's live listings (price plus that seller's shipping) and from established US retailers with the item in stock, with URL and date. Sold-out, preorder-only (unless the product itself is a preorder), marketplace, Japanese-edition and case/pack mismatches were excluded. The comparison figure is the delivered price, because GoGetCards ships free.

**Profitability is unverified.** Acquisition costs were not supplied, so every row's contribution-margin status reads "unverified". The pricing review shows the advantage against the market; it cannot show whether a price clears your cost. Before import, check the rows flagged "deeper than the 25–40% target" and every owner-fixed price against your invoice cost, payment fees (about 3%), the free-shipping cost you absorb, and a returns allowance.


## 2. One Piece OP-16: the booster box and the restored master case

**Booster box** (`/products/one-piece-card-game-op-16-the-time-of-battle-booster-box-english-24-packs`, handle unchanged): pack of 2 at $349.93 → **one box at $149.97**. Title: *One Piece Card Game OP-16 The Time of Battle Booster Box – English Edition (24 Packs)*. The picture that showed two boxes was never a stored photo: it was the composite the storefront generates for any pack-sold product, so setting `pack_size` to 1 removes it from the page, the schema, the feed and the cards automatically. The one stored photo (the single English box, verified by eye) becomes the main image. The stored description and specs are rewritten to the single unit; the `multipack` feed attribute and the per-unit pricing attributes stop being sent because they are derived from `pack_size`. The verified box UPC 810199500300 is added. Research: lowest credible delivered price $209.98 (high confidence), so $149.97 is 28.6% below it.

**Master case** (`/products/one-piece-tcg-op-16-the-time-of-battle-factory-sealed-master-case-12-booster-boxes-english-edition`): the record was **permanently deleted** (the admin deletes with `findByIdAndDelete`; the product model has no archive or soft-delete state, no other product carries the slug in its rename history, and `config/redirects.js` has no entry for it), so it is **recreated** with the exact original handle and your exact title, at $1,199.76, product type *Factory Sealed Master Case*, 12 booster boxes × 24 packs × 12 cards, English, set OP-16, available, `preorder` false. Feed id: the product is created without a SKU on purpose, so its Merchant Center offer id is the slug — which is also what the deleted listing's id was if it predated the store's SKU scheme (every product that survived the catalogue import carries a GC-nnn SKU; the case was deleted before that import, so the slug is the only id it can have had). Identifier: the case UPC **810199500317** was read on three fetched pages (Dave & Adam's barcode line, Flipside Gaming product JSON, Pastime Sports product JSON "Sealed Case (12 Boxes)") and is imported. Stock is deliberately left at 0 (the importer does not write stock unless the column is present, and inventing a count would be a false scarcity claim): the page shows no count, the buy button works, and the order cap limits one case per line; set the real count in the admin. Image: a hosted composite of the verified single box with a ×12 badge, served at `/images/products/one-piece-tcg-op-16-the-time-of-battle-factory-sealed-master-case-12-booster-boxes-english-edition.webp` (deployed and returning 200). It states the quantity unmistakably but it is not a photograph of the carton; replace it with your own photo of a sealed case when you have one.

**What the old URL does today:** HTTP 404 with `noindex, follow`, no redirect, not in the sitemap, not in the feed (the live feed carries 9 items and none of them is the case). After import the route serves the product (200), the sitemap lists it automatically (it lists every product), canonical equals the URL, Product JSON-LD is emitted, and the feed includes it once the Distribution selection covers it (section 5). **Google index / Ads:** no search I can run from here shows the old URL still indexed, and Google Ads and Merchant Center are not accessible from this environment. Check Search Console (Pages → Not found) and Google Ads (Shopping product groups / final URLs for `op-16` and `master-case`) and pause any ad whose final URL is the case until the import is done; the restored page, not a redirect, is the correct destination. Dead-click sources I could check: no internal link on the site points at the old URL, and no partner callback references it.


## 3. Multipacks: 62 → 33

Of the 62 retailer-created multipacks, **29 become single retail units** (your 27, the OP-16 box, and 1 more where a single unit can be priced on the ladder at 20%+ below the lowest offer) and **33 remain packs**, every one for the same reason: the single unit's market price is below $62.49, so $49.99, the lowest price the checkout can charge, would be at or above market. For 20 of the retained packs the pack is made **smaller** (never larger); for the rest the current pack is kept and the row is flagged for a decision. Each retained pack keeps the composite image, the "(Pack of N)" title suffix and the per-unit line, so the quantity is unmistakable, and the feed sends `multipack`. Full table: `docs/gogetcards-multipack-review.csv`.

| Retained pack | Before | After | Unit price | Why |
|---|---|---|---|---|
| Disney Lorcana Hyperia City Prerelease Box | 3 × @ $99.98 | 2 × @ $49.99 | $25.00 | single unit cannot be priced on the $49.99 ladder below the $40.98 market: pack of 2 retained (39% below per unit) |
| MTG Marvel Super Heroes Bundle | 5 × @ $149.97 | 2 × @ $49.99 | $25.00 | single unit cannot be priced on the $49.99 ladder below the $35.95 market: pack of 2 retained (30% below per unit) |
| MTG Reality Fracture Bundle | 4 × @ $149.97 | 3 × @ $99.98 | $33.33 | single unit cannot be priced on the $49.99 ladder below the $44.99 market: pack of 3 retained (26% below per unit) |
| MTG Reality Fracture Multiverse Reforged Commander Deck | 4 × @ $149.97 | 3 × @ $99.98 | $33.33 | single unit cannot be priced on the $49.99 ladder below the $48.00 market: pack of 3 retained (31% below per unit) |
| MTG Reality Fracture Prerelease Pack | 2 × @ $49.99 | 2 × @ $49.99 | $25.00 | single unit cannot be priced on the $49.99 ladder below the $34.59 market: pack of 2 retained (28% below per unit) |
| MTG Secrets of Strixhaven Bundle | 3 × @ $99.98 | 2 × @ $49.99 | $25.00 | single unit cannot be priced on the $49.99 ladder below the $43.90 market: pack of 2 retained (43% below per unit) |
| MTG Secrets of Strixhaven Commander Deck | 3 × @ $99.98 | 2 × @ $49.99 | $25.00 | single unit cannot be priced on the $49.99 ladder below the $39.35 market: pack of 2 retained (36% below per unit) |
| MTG Secrets of Strixhaven Commander Deck | 3 × @ $99.98 | 2 × @ $49.99 | $25.00 | single unit cannot be priced on the $49.99 ladder below the $34.99 market: pack of 2 retained (29% below per unit) |
| MTG Secrets of Strixhaven Commander Deck | 3 × @ $99.98 | 2 × @ $49.99 | $25.00 | single unit cannot be priced on the $49.99 ladder below the $34.99 market: pack of 2 retained (29% below per unit) |
| MTG Secrets of Strixhaven Commander Deck | 6 × @ $249.95 | 3 × @ $99.98 | $33.33 | single unit cannot be priced on the $49.99 ladder below the $49.99 market: pack of 3 retained (33% below per unit) |
| MTG Star Trek Bundle | 6 × @ $249.95 | 3 × @ $99.98 | $33.33 | single unit cannot be priced on the $49.99 ladder below the $49.81 market: pack of 3 retained (33% below per unit) |
| MTG Star Trek Prerelease Pack | 3 × @ $99.98 | 2 × @ $49.99 | $25.00 | single unit cannot be priced on the $49.99 ladder below the $33.20 market: pack of 2 retained (25% below per unit) |
| MTG Star Trek Scene Box | 3 × @ $99.98 | 3 × @ $49.99 | $16.66 | single unit cannot be priced on the $49.99 ladder below the $24.99 market: pack of 3 retained (33% below per unit) |
| MTG Star Trek Scene Box | 3 × @ $99.98 | 3 × @ $49.99 | $16.66 | single unit cannot be priced on the $49.99 ladder below the $24.99 market: pack of 3 retained (33% below per unit) |
| MTG Teenage Mutant Ninja Turtles Bundle | 3 × @ $99.98 | 2 × @ $49.99 | $25.00 | single unit cannot be priced on the $49.99 ladder below the $39.99 market: pack of 2 retained (37% below per unit) |
| MTG Teenage Mutant Ninja Turtles Commander Deck | 3 × @ $99.98 | 3 × @ $99.98 | $33.33 | single unit cannot be priced on the $49.99 ladder below the $53.13 market: pack of 3 retained (37% below per unit) |
| MTG The Hobbit Bundle | 3 × @ $99.98 | 3 × @ $99.98 | $33.33 | single unit cannot be priced on the $49.99 ladder below the $47.94 market: pack of 3 retained (30% below per unit) |
| One Piece Card Game EB-05 One Piece Heroines Edition Vol. 2 Booster Pack (English) | 6 × @ $49.99 | 6 × @ $49.99 | $8.33 | no pack of 6 or smaller reaches 20% below the $7.95 market on the ladder; current configuration kept, needs a decision (a larger pack was no |
| One Piece Card Game OP-15 Adventure on Kami's Island Booster Pack (English) | 7 × @ $49.99 | 7 × @ $49.99 | $7.14 | no pack of 7 or smaller reaches 20% below the $7.75 market on the ladder; current configuration kept, needs a decision (a larger pack was no |
| One Piece Card Game OP-16 The Time of Battle Booster Pack (English) | 9 × @ $49.99 | 9 × @ $49.99 | $5.55 | single unit cannot be priced on the $49.99 ladder below the $7.12 market: pack of 9 retained (22% below per unit) |
| One Piece Card Game OP-17 The World's Strongest Warriors Booster Pack (English) | 7 × @ $49.99 | 7 × @ $49.99 | $7.14 | no pack of 7 or smaller reaches 20% below the $8.55 market on the ladder; current configuration kept, needs a decision (a larger pack was no |
| One Piece Card Game OP-18 The Dominance of God Booster Pack (English) | 5 × @ $99.98 | 5 × @ $99.98 | $20.00 | no pack of 5 or smaller reaches 20% below the $11.99 market on the ladder; current configuration kept, needs a decision (a larger pack was n |
| Pokémon TCG 30th Celebration Battle Deck | 2 × @ $49.99 | 2 × @ $49.99 | $25.00 | single unit cannot be priced on the $49.99 ladder below the $31.85 market: pack of 2 retained (22% below per unit) |
| Pokémon TCG 30th Celebration Battle Deck | 7 × @ $149.97 | 3 × @ $49.99 | $16.66 | single unit cannot be priced on the $49.99 ladder below the $26.64 market: pack of 3 retained (37% below per unit) |
| Pokémon TCG 30th Celebration Booster Pack | 6 × @ $49.99 | 6 × @ $49.99 | $8.33 | no pack of 6 or smaller reaches 20% below the $10.24 market on the ladder; current configuration kept, needs a decision (a larger pack was n |
| Pokémon TCG 30th Celebration ex Tin (Retail Version) | 5 × @ $199.96 | 4 × @ $149.97 | $37.49 | single unit cannot be priced on the $49.99 ladder below the $58.49 market: pack of 4 retained (36% below per unit) |
| Pokémon TCG 30th Celebration Greninja ex Box | 5 × @ $149.97 | 3 × @ $99.98 | $33.33 | single unit cannot be priced on the $49.99 ladder below the $44.73 market: pack of 3 retained (25% below per unit) |
| Pokémon TCG 30th Celebration Knock Out Collection | 3 × @ $49.99 | 3 × @ $49.99 | $16.66 | single unit cannot be priced on the $49.99 ladder below the $23.00 market: pack of 3 retained (28% below per unit) |
| Pokémon TCG 30th Celebration Poster Collection | 7 × @ $149.97 | 5 × @ $99.98 | $20.00 | single unit cannot be priced on the $49.99 ladder below the $32.95 market: pack of 5 retained (39% below per unit) |
| Pokémon TCG 30th Celebration Sylveon ex Box | 4 × @ $149.97 | 3 × @ $99.98 | $33.33 | single unit cannot be priced on the $49.99 ladder below the $44.98 market: pack of 3 retained (26% below per unit) |
| Pokémon TCG 30th Celebration Tech Sticker Collection [Alolan Exeggutor] | 7 × @ $149.97 | 2 × @ $49.99 | $25.00 | single unit cannot be priced on the $49.99 ladder below the $34.77 market: pack of 2 retained (28% below per unit) |
| Pokémon TCG Delta Reign Build & Battle Box | 4 × @ $149.97 | 3 × @ $99.98 | $33.33 | single unit cannot be priced on the $49.99 ladder below the $47.99 market: pack of 3 retained (31% below per unit) |
| Pokémon TCG Pitch Black Booster Bundle | 5 × @ $99.98 | 2 × @ $49.99 | $25.00 | single unit cannot be priced on the $49.99 ladder below the $38.95 market: pack of 2 retained (36% below per unit) |

## 4. Pricing

Rule applied to every product without an owner price: **single unit, on the $49.99 ladder, at the rung whose advantage over the lowest credible delivered offer falls in 25–40%** (20–50% accepted when the ladder's spacing leaves nothing in the narrower window); never above the current price; never a larger pack. Owner prices (your 27 + the two OP-16 prices) are used exactly as given. Acquisition cost was not supplied, so every row's margin status is *unverified* and the deep-discount rows (more than 40% below) are flagged for a cost check rather than assumed profitable.

### 4a. Your 29 fixed prices against the market

| Product | Your price | Lowest credible delivered | Advantage | Confidence | Note |
|---|---|---|---|---|---|
| One Piece Card Game Double Pack Set Vol.13 [DP-13] | $49.99 | $29.99 | -66.7% | medium | ABOVE the lowest credible offer by 67% |
| Pokémon TCG 30th Celebration Classic Collection Pack | $99.98 | $76.50 | -30.7% | medium | ABOVE the lowest credible offer by 31%; nearest ladder price at 20%+ below is $49.99 (35% below) |
| Pokémon TCG 30th Celebration Figure Collection | $99.98 | $77.99 | -28.2% | medium | ABOVE the lowest credible offer by 28%; nearest ladder price at 20%+ below is $49.99 (36% below) |
| Pokémon TCG 30th Celebration Figure Collection | $99.98 | $89.95 | -11.2% | medium | ABOVE the lowest credible offer by 11%; nearest ladder price at 20%+ below is $49.99 (44% below) |
| Pokémon TCG 30th Celebration Ditto Premium Collection | $99.98 | $97.49 | -2.6% | high | ABOVE the lowest credible offer by 3%; nearest ladder price at 20%+ below is $49.99 (49% below) |
| MTG Reality Fracture Secret Lair Bundle | $99.98 | $116.99 | 14.5% | high | only 15% below the lowest credible offer; nearest ladder price at 20%+ below is $49.99 (57% below) |
| Disney Lorcana Hyperia City Booster Display Box (24 Packs) | $99.98 | $127.94 | 21.9% | high | inside 20–25% or above 40% |
| Pokémon TCG 30th Celebration Booster Bundle | $49.99 | $64.47 | 22.5% | high | inside 20–25% or above 40% |
| MTG The Hobbit Play Booster Box (30 Packs) | $99.98 | $129.99 | 23.1% | high | inside 20–25% or above 40% |
| MTG Star Trek Commander Deck | $49.99 | $66.24 | 24.5% | medium | inside 20–25% or above 40% |
| One Piece Card Game OP-16 The Time of Battle Booster Box – English Edi | $149.97 | $209.98 | 28.6% | high | meets the 25–40% target |
| MTG Secrets of Strixhaven Play Booster Box (30 Packs) | $99.98 | $144.29 | 30.7% | high | meets the 25–40% target |
| Pokémon TCG Pitch Black Elite Trainer Box (9 Packs) | $49.99 | $72.50 | 31.0% | high | meets the 25–40% target |
| MTG Marvel Super Heroes Gift Bundle | $49.99 | $74.99 | 33.3% | high | meets the 25–40% target |
| MTG The Hobbit Gift Bundle | $49.99 | $74.99 | 33.3% | medium | meets the 25–40% target |
| 2026 Topps Heritage Football Hobby Box (20 Packs) | $99.98 | $155.90 | 35.9% | high | meets the 25–40% target |
| MTG Reality Fracture Draft Night | $49.99 | $84.00 | 40.5% | high | 40% below: deeper than the 25-40% target; confirm cost |
| Disney Lorcana Attack of the Vine! Illumineer's Trove | $49.99 | $84.46 | 40.8% | high | 41% below: deeper than the 25-40% target; confirm cost |
| MTG Marvel Super Heroes Draft Night | $49.99 | $84.95 | 41.2% | high | 41% below: deeper than the 25-40% target; confirm cost |
| MTG Lorwyn Eclipsed Draft Night | $49.99 | $86.99 | 42.5% | medium | 43% below: deeper than the 25-40% target; confirm cost |
| MTG Star Trek Draft Night | $49.99 | $92.55 | 46.0% | medium | 46% below: deeper than the 25-40% target; confirm cost |
| One Piece TCG OP-16 The Time of Battle Factory Sealed Master Case (12  | $1,199.76 | $2,252.99 | 46.7% | high | 47% below: deeper than the 25-40% target; confirm cost |
| Pokémon TCG 30th Celebration ex Tin (International Version) | $49.99 | $94.39 | 47.0% | low | 47% below: deeper than the 25-40% target; confirm cost; low-confidence comparison |
| Pokémon TCG 30th Celebration Binder Collection | $49.99 | $94.89 | 47.3% | medium | 47% below: deeper than the 25-40% target; confirm cost |
| MTG Marvel Super Heroes Jumpstart Booster Box (20 Packs) | $49.99 | $96.99 | 48.5% | high | 48% below: deeper than the 25-40% target; confirm cost |
| 2026 Bowman Chrome Baseball Mega Box (6 Packs) | $49.99 | $97.90 | 48.9% | high | 49% below: deeper than the 25-40% target; confirm cost |
| Disney Lorcana Winterspell Illumineer's Trove | $49.99 | $97.99 | 49.0% | high | 49% below: deeper than the 25-40% target; confirm cost |
| Disney Lorcana Wilds Unknown Illumineer's Trove | $49.99 | $100.99 | 50.5% | medium | 51% below: deeper than the 25-40% target; confirm cost |
| MTG Lorwyn Eclipsed Play Booster Box (14 Packs) | $49.99 | $101.42 | 50.7% | high | 51% below: deeper than the 25-40% target; confirm cost |

The four you asked about specifically, re-verified against the lowest currently buyable offer rather than TCGplayer market:

- **Pokémon TCG 30th Celebration Figure Collection**: your $99.98 vs lowest credible $77.99 (medium): -28.2%. ABOVE the lowest credible offer by 28%; nearest ladder price at 20%+ below is $49.99 (36% below). Kept at $99.98 in the file; marked `approval_required`.
- **Pokémon TCG 30th Celebration Figure Collection**: your $99.98 vs lowest credible $89.95 (medium): -11.2%. ABOVE the lowest credible offer by 11%; nearest ladder price at 20%+ below is $49.99 (44% below). Kept at $99.98 in the file; marked `approval_required`.
- **Pokémon TCG 30th Celebration Ditto Premium Collection**: your $99.98 vs lowest credible $97.49 (high): -2.6%. ABOVE the lowest credible offer by 3%; nearest ladder price at 20%+ below is $49.99 (49% below). Kept at $99.98 in the file; marked `approval_required`.
- **MTG Reality Fracture Secret Lair Bundle**: your $99.98 vs lowest credible $116.99 (high): 14.5%. only 15% below the lowest credible offer; nearest ladder price at 20%+ below is $49.99 (57% below). Kept at $99.98 in the file; marked `approval_required`.

### 4b. Rows that need a decision

28 recommended rows could not reach the target on the ladder or sit outside it; each carries the reason and, where one exists, the nearest ladder price at 20%+ below:

| Product | File price | Lowest credible | Advantage | Alternative | Reason |
|---|---|---|---|---|---|
| Disney Lorcana Attack of the Vine! Booster Display Box (24 P | $99.98 (×1) | $178.93 | 44.1% | — | 44% below: deeper than the 25-40% target; confirm cost |
| Disney Lorcana Attack of the Vine! Prerelease Box | $49.99 (×1) | $60.98 | 18.0% | — | single kept at the $49.99 ladder floor: only 18% below the $60.98 market; a pack was not created, per instruction; only 18% below the lowest credible  |
| MTG Lorwyn Eclipsed Bundle | $49.99 (×1) | $59.99 | 16.7% | — | single kept at the $49.99 ladder floor: only 17% below the $59.99 market; a pack was not created, per instruction; only 17% below the lowest credible  |
| MTG Marvel Super Heroes Play Booster Box (30 Packs) | $99.98 (×1) | $105.90 | 5.6% | $49.99 | no ladder rung lands between 10% and 50% below market; needs a decision; only 6% below the lowest credible offer; nearest ladder price at 20%+ below i |
| MTG Reality Fracture Play Booster Box (30 Packs) | $99.98 (×1) | $121.00 | 17.4% | $49.99 | ladder coarseness: only 17% below is possible on a single unit; the next rung down would be 59% below (likely under cost); only 17% below the lowest c |
| MTG Secrets of Strixhaven Bundle | $49.99 (×2) | $43.90 | 43.1% | — | single unit cannot be priced on the $49.99 ladder below the $43.90 market: pack of 2 retained (43% below per unit); 43% below: deeper than the 25-40%  |
| MTG Secrets of Strixhaven Commander Deck | $49.99 (×1) | $49.99 | 0.0% | — | single unit at the $49.99 ladder floor would be at or above the $49.99 market; current price kept, needs a decision; only 0% below the lowest credible |
| MTG Star Trek Collectors Edition Commander Deck | $49.99 (×1) | $94.00 | 46.8% | — | 47% below: deeper than the 25-40% target; confirm cost; low-confidence comparison |
| MTG Star Trek Collectors Edition Commander Deck | $99.98 (×1) | $179.99 | 44.5% | — | 44% below: deeper than the 25-40% target; confirm cost |
| MTG Star Trek Commander Deck | $49.99 (×1) | $49.99 | 0.0% | — | single unit at the $49.99 ladder floor would be at or above the $49.99 market; current price kept, needs a decision; only 0% below the lowest credible |
| MTG Star Trek Commander Deck | $49.99 (×1) | $49.99 | 0.0% | — | single unit at the $49.99 ladder floor would be at or above the $49.99 market; current price kept, needs a decision; only 0% below the lowest credible |
| MTG Star Trek Commander Deck | $49.99 (×1) | $49.99 | 0.0% | — | single unit at the $49.99 ladder floor would be at or above the $49.99 market; current price kept, needs a decision; only 0% below the lowest credible |
| MTG Star Trek Play Booster Box (30 Packs) | $99.98 (×1) | $114.89 | 13.0% | $49.99 | ladder coarseness: only 13% below is possible on a single unit; the next rung down would be 56% below (likely under cost); only 13% below the lowest c |
| MTG Teenage Mutant Ninja Turtles Play Booster Box (14 Packs) | $99.98 (×1) | $106.99 | 6.6% | $49.99 | no ladder rung lands between 10% and 50% below market; needs a decision; only 7% below the lowest credible offer; nearest ladder price at 20%+ below i |
| MTG The Hobbit Draft Night | $99.98 (×1) | $108.98 | 8.3% | $49.99 | no ladder rung lands between 10% and 50% below market; needs a decision; only 8% below the lowest credible offer; nearest ladder price at 20%+ below i |
| One Piece Card Game EB-05 One Piece Heroines Edition Vol. 2  | $49.99 (×6) | $7.95 | -4.8% | — | no pack of 6 or smaller reaches 20% below the $7.95 market on the ladder; current configuration kept, needs a decision (a larger pack was not used, pe |
| One Piece Card Game OP-15 Adventure on Kami's Island Booster | $49.99 (×7) | $7.75 | 7.9% | — | no pack of 7 or smaller reaches 20% below the $7.75 market on the ladder; current configuration kept, needs a decision (a larger pack was not used, pe |
| One Piece Card Game OP-17 The World's Strongest Warriors Boo | $49.99 (×7) | $8.55 | 16.5% | — | no pack of 7 or smaller reaches 20% below the $8.55 market on the ladder; current configuration kept, needs a decision (a larger pack was not used, pe |
| One Piece Card Game OP-18 The Dominance of God Booster Pack  | $99.98 (×5) | $11.99 | -66.8% | — | no pack of 5 or smaller reaches 20% below the $11.99 market on the ladder; current configuration kept, needs a decision (a larger pack was not used, p |
| Pokémon TCG 30th Celebration 2-Pack Blister | $49.99 (×1) | $58.20 | 14.1% | — | single kept at the $49.99 ladder floor: only 14% below the $58.20 market; a pack was not created, per instruction; only 14% below the lowest credible  |
| Pokémon TCG 30th Celebration Booster Pack | $49.99 (×6) | $10.24 | 18.6% | — | no pack of 6 or smaller reaches 20% below the $10.24 market on the ladder; current configuration kept, needs a decision (a larger pack was not used, p |
| Pokémon TCG 30th Celebration Elite Trainer Box | $99.98 (×1) | $104.92 | 4.7% | $49.99 | no ladder rung lands between 10% and 50% below market; needs a decision; only 5% below the lowest credible offer; nearest ladder price at 20%+ below i |
| Pokémon TCG Chaos Rising Booster Box | $99.98 (×1) | $181.97 | 45.1% | — | 45% below: deeper than the 25-40% target; confirm cost |
| Pokémon TCG Delta Reign Booster Bundle (6 Packs) | $49.99 (×1) | $46.87 | -6.7% | — | single unit at the $49.99 ladder floor would be at or above the $46.87 market; current price kept, needs a decision; ABOVE the lowest credible offer b |
| Pokémon TCG Delta Reign Elite Trainer Box (9 Packs) | $49.99 (×1) | $86.48 | 42.2% | — | 42% below: deeper than the 25-40% target; confirm cost |
| Pokémon TCG Perfect Order Booster Box (36 Packs) | $99.98 (×1) | $172.84 | 42.2% | — | 42% below: deeper than the 25-40% target; confirm cost |
| Pokémon TCG Pitch Black Booster Box (36 Packs) | $99.98 (×1) | $177.77 | 43.8% | — | 44% below: deeper than the 25-40% target; confirm cost |
| Pokémon TCG Pitch Black Pokémon Center Elite Trainer Box (Ex | $99.98 (×1) | $115.50 | 13.4% | $49.99 | ladder coarseness: only 13% below is possible on a single unit; the next rung down would be 57% below (likely under cost); only 13% below the lowest c |

7 rows rest on a low-confidence comparison (preorder-only or thin listings): the price stands, but re-check those before relying on the advantage figure. Full detail for all 143: `docs/gogetcards-final-pricing-review.csv` (old/new quantity and price, lowest competitor, market reference, MSRP where published, source URL and date, confidence, advantage, override source, margin status, objective met, approval required).


## 5. Identifiers, availability, Merchant Center, tracking

**GTINs.** 68 products already carried one. Of the 74 without, 66 codes are imported: each was read on a manufacturer or distributor page or on two independent retailer pages for the exact product, passes the check digit, and is either unique to the product or a manufacturer assortment code on products that are already variant-grouped (UPC Day/Night, Espeon/Umbreon Battle Decks, Mew/Mewtwo Figure Collections, both ex Tin versions, Star Trek Collector's Edition decks now use their per-deck codes). 9 are **held**: MTG Star Trek Collectors Edition Commander De (review-medium); MTG Star Trek Scene Box (review-conflict); MTG Star Trek Scene Box (review-conflict); Pokémon TCG 30th Celebration Booster Pack (none); Pokémon TCG 30th Celebration Classic Collecti (none); Pokémon TCG 30th Celebration Greninja ex Box (review-shared); Pokémon TCG 30th Celebration Sylveon ex Box (review-shared); Pokémon TCG Delta Reign Pokémon Center Elite  (none); Pokémon TCG Pitch Black Pokémon Center Elite  (none). The Greninja/Sylveon ex Boxes share one assortment code and are not variant-grouped on the site: group them in the admin first, then import the code. Phantasmal Flames resolved to the 36-pack box code 196214143364 (196214143357 is the single pack). The Star Trek Scene Boxes have two sources disagreeing on which per-box code is which, so neither is imported. Nothing is marked `identifier_exists=false`. Full list: `docs/gogetcards-gtin-review.csv`.

**Availability.** The file keeps every product's current `preorder` flag and `release_date` (nothing is lost; 37 preorders keep their dates). The 17 released-but-still-flagged products stay flagged, because only you know whether their stock has arrived: the page says "released, awaiting stock" and the feed sends `preorder` with a dated availability, which is Google's accepted shape for a released item on order; the moment stock lands, untick Preorder (the feed then says `in_stock`). One product, 2026 Topps Heritage Football, carried a stale `preorder` **tag** while its flag was off; the tag alone would have made the feed send PREORDER for an in-stock item, so the file drops it. `backorder` is not something this storefront can express (the model has in-stock, preorder and sold-out), so no product is set to it.

**Feed completeness (blocker 1).** The live feed carries 9 of 142 because Distribution → Google is in *selected* mode and only 9 products have *Send to Google* ticked. After import, open Admin → Distribution, set the selection mode to **All** (the radio at the top of the Google panel; `POST /distribution/selection-mode`), and the feed includes every product that passes validation, the master case included. Keep one feed; advertising is chosen by `custom_label_0` (`launch_30` from the `launch-30` tag, which the file sets on the 30 shortlisted products and removes from the rest), not by separate feeds. The simulated feed after import sends: id (SKU, or slug for the case), title, description, link, image_link, price, availability (+ availability_date for preorders), brand, gtin where imported, condition new, product_type, multipack only for the remaining packs, shipping (free), custom_label_0/1.

**Conversion tracking (blocker 2).** Still missing: the live HTML carries no gtag, so `GOOGLE_ADS_ID`, `GOOGLE_ADS_PURCHASE_LABEL` and `GA4_MEASUREMENT_ID` are not set in Northflank. The implementation is ready and correct for your requirements: the purchase conversion fires only on the thank-you page of an order that came back through the signed partner callback (so a failed or unsigned payment never fires), with `transaction_id` = the order id (Google de-duplicates refreshes and repeat visits), value = the server-calculated total in USD, test orders excluded, and the GA4 purchase event uses the same transaction id. Supply the three variables; nothing else is needed.

**Other compliance checks.** Prices and quantities agree across page, schema, cart, checkout and feed by construction (one stored price, pack size 1 or N, every surface derives from it). Shipping, cancellation and returns pages are the ones audited on 4 November and unchanged. Business identity: the El Segundo address still needs your confirmation against the Payments profile. No compare-at prices, no strike-through discounts and no invented stock counts are introduced (the file does not touch `stock` or `compare_price`). Handles and canonical URLs are preserved for all 142; the case uses its original handle.


## 6. Advertising shortlist, rebuilt on the final prices

Scored on the file's prices and pack sizes: price advantage vs the lowest credible delivered offer (0–4), availability (0–3), GTIN after import (0–2), demand proxy (0–4, TCGplayer 30-day units/listings/trend from the 6 November research; sports estimated from set profile), competition (0–3), big-box undercut (−2), order value (0–2), single unit (0–1), own-hosted image (0–1), comparison confidence (0–1). Eligibility: score ≥ 12, single unit, in stock or released-awaiting, listed price ≥ $99.98 (a $49.99 single cannot absorb a ~$60–70 cost per purchase at a $1 CPC and 1.5% conversion unless its margin is far above this category's norm), advantage ≥ 20%. 30 qualify; 24 are on the waiting list. The `launch-30` tag in the master file marks exactly these 30.

| # | Product | Price | Advantage | Availability | GTIN | Demand / competition | Score |
|---|---|---|---|---|---|---|---|
| 1 | 2026 Bowman Chrome Baseball Hobby Box (6 Packs) | $399.92 | 30% | In Stock | yes | high / medium | 19.5 |
| 2 | Pokémon TCG 30th Celebration Booster Bundle Case | $1,199.76 | 27% | In Stock | yes | high / low | 19 |
| 3 | 2025 Panini Prizm NFL Football Hobby Box (12 Packs) | $649.87 | 30% | In Stock | yes | high / medium | 18.5 |
| 4 | One Piece Card Game EB-05 One Piece Heroines Edition Vol. 2  | $149.97 | 38% | In Stock | yes | high / medium | 18.5 |
| 5 | One Piece Card Game OP-17 The World's Strongest Warriors Boo | $199.96 | 32% | In Stock | yes | high / medium | 18.5 |
| 6 | MTG Reality Fracture Collector Booster Display (12 Packs) | $249.95 | 33% | In Stock | yes | high / high | 18 |
| 7 | Pokémon TCG Phantasmal Flames Booster Box | $249.95 | 32% | In Stock | yes | medium / low | 18 |
| 8 | 2026 Topps Chrome Baseball Hobby Box (20 Packs) | $399.92 | 25% | In Stock | yes | high / medium | 17.5 |
| 9 | MTG The Hobbit Collector Booster Box (12 Packs) | $399.92 | 33% | In Stock | yes | high / medium | 17.5 |
| 10 | Pokémon TCG 30th Celebration Elite Trainer Box Case | $749.85 | 29% | In Stock | yes | high / medium | 17.5 |
| 11 | Pokémon TCG 30th Celebration Pokémon Center Elite Trainer Bo | $199.96 | 26% | In Stock | yes | high / medium | 17.5 |
| 12 | Pokémon TCG Chaos Rising Booster Box | $99.98 | 45% | In Stock | yes | high / medium | 17.5 |
| 13 | One Piece Card Game EB-03 One Piece Heroines Edition Booster | $199.96 | 29% | In Stock | yes | medium / low | 17 |
| 14 | 2026 Topps Chrome Football Hobby Box (20 Packs) | $449.91 | 25% | In Stock | yes | high / medium | 16.5 |
| 15 | One Piece Card Game OP-13 Carrying On His Will Booster Box ( | $249.95 | 35% | In Stock | yes | medium / medium | 16.5 |
| 16 | One Piece Card Game OP-15 Adventure on Kami's Island Booster | $149.97 | 38% | In Stock | yes | medium / medium | 16.5 |
| 17 | Disney Lorcana Wilds Unknown Booster Display Box (24 Packs) | $149.97 | 32% | In Stock | yes | low / low | 16 |
| 18 | Disney Lorcana Winterspell Booster Display Box (24 Packs) | $149.97 | 36% | In Stock | yes | low / low | 16 |
| 19 | Pokémon TCG Mega Evolution Booster Box (36 Packs) | $199.96 | 34% | In Stock | yes | low / low | 16 |
| 20 | Pokémon TCG Pitch Black Booster Box (36 Packs) | $99.98 | 44% | In Stock | yes | high / high | 16 |
| 21 | 2026-27 Topps Flagship Basketball Hobby Box (20 Packs) | $149.97 | 29% | Preorder — released, a | yes | high / medium | 15.5 |
| 22 | 2026 Topps Cosmic Chrome Baseball Hobby Box (20 Packs) | $699.86 | 26% | Preorder — released, a | yes | high / medium | 15.5 |
| 23 | Disney Lorcana Attack of the Vine! Booster Display Box (24 P | $99.98 | 44% | In Stock | yes | medium / medium | 15.5 |
| 24 | MTG Secrets of Strixhaven Collector Booster Box (12 Packs) | $299.94 | 33% | In Stock | yes | medium / medium | 15.5 |
| 25 | MTG Secrets of Strixhaven Play Booster Box (30 Packs) | $99.98 | 31% | In Stock | yes | medium / medium | 15.5 |
| 26 | MTG The Hobbit Play Booster Box (30 Packs) | $99.98 | 23% | In Stock | yes | high / medium | 15.5 |
| 27 | One Piece Card Game OP-16 The Time of Battle Booster Box – E | $149.97 | 29% | In Stock | yes | medium / medium | 15.5 |
| 28 | Pokémon TCG 30th Celebration Ultra-Premium Collection Case | $999.80 | 27% | Preorder — released, a | yes | high / medium | 15.5 |
| 29 | Pokémon TCG Perfect Order Booster Box (36 Packs) | $99.98 | 42% | In Stock | yes | medium / medium | 15.5 |
| 30 | 2025-26 Panini Prizm Basketball Hobby Box (12 Packs) | $199.96 | 23% | In Stock | yes | high / high | 15 |

Waiting list (next in line, or campaign 2): MTG Marvel Super Heroes Collector Booster Box ($299.94, 33%); One Piece Card Game OP-05 Awakening of the Ne ($699.86, 30%); One Piece Card Game OP-09 Emperors in the New ($449.91, 26%); One Piece Card Game PRB-02 The Best Vol. 2 Bo ($249.95, 27%); Pokémon TCG Delta Reign Booster Box (36 Packs ($149.97, 32%); 2026 Topps Inception Football Hobby Box ($349.93, 30%); MTG Teenage Mutant Ninja Turtles Collector Bo ($299.94, 30%); 2026 Topps Series 1 Baseball Hobby Box (20 Pa ($149.97, 29%); Disney Lorcana Hyperia City Booster Display B ($99.98, 22%); Pokémon TCG 30th Celebration Ultra-Premium Co ($249.95, 35%); MTG Lorwyn Eclipsed Collector Booster Box (15 ($299.94, 26%); Pokémon TCG 30th Celebration Ultra-Premium Co ($299.94, 27%); One Piece Card Game OP-14 The Azure Sea's Sev ($199.96, 22%); MTG Lorwyn Eclipsed Play Booster Box (14 Pack ($49.99, 51%); MTG Reality Fracture Multiverse Reforged Comm ($99.98, 31%); One Piece Card Game OP-18 The Dominance of Go ($149.97, 38%); Pokémon TCG Pitch Black Elite Trainer Box (9  ($49.99, 31%); MTG Reality Fracture Play Booster Box (30 Pac ($99.98, 17%); MTG Star Trek Collectors Edition Commander De ($99.98, 44%); Pokémon TCG 30th Celebration Booster Bundle ($49.99, 22%); Pokémon TCG 30th Celebration Elite Trainer Bo ($99.98, 5%); Pokémon TCG Delta Reign Elite Trainer Box (9  ($49.99, 42%); MTG Marvel Super Heroes Play Booster Box (30  ($99.98, 6%); MTG Star Trek Collector Booster Box (12 Packs ($299.94, 29%).

**The OP-16 pair.** The master case ($1,199.76) has no demand data and no in-stock case research yet beyond the box price, so it is not on the launch list; list it in campaign 2 with its own bid. The OP-16 box at $149.97 scores 15.5 and sits on the waiting list (medium demand, 207 sold/30d on TCGplayer, medium competition).

**$49.99 singles.** Your Group A products are now the cheapest listings in their categories but are excluded from campaign 1 on margin: at an estimated $0.80–1.20 CPC and 1.5% conversion the cost per purchase is $55–80, more than a $49.99 order can carry. They belong in campaign 2 (catalogue, low bid cap) and in the free listings, where the price does the work.

**$500/day structure (unchanged in shape, re-assigned):** Campaign 1 Standard Shopping on `custom_label_0 = launch_30`, subdivided by brand, ≈ $350/day, Manual CPC caps Pokémon $0.90 / MTG $1.20 / One Piece $0.80 / sports $1.00 for two weeks, then tROAS at break-even × 1.3 once 30 conversions exist. Campaign 2 Standard Shopping on `catalog_only`, ≈ $100/day, low bids, priority Low. Campaign 3 Search, brand + exact product names, ≈ $50/day. Break-even ROAS = 1 ÷ contribution margin (6.7 at 15%, 4.0 at 25%); at a $280 average order and 1–2% conversion the test lands between ROAS 2.8 and 5.6, so the price advantage and the margin, not the bids, decide whether it pays. $10,000/day remains conditional on stock (150–250 boxes a day at ROAS 5), catalogue breadth and marginal ROAS holding; it is not promised.


## 7. Validation performed

- Importer dry run with a lookup built from the live catalogue: 142 update, 1 create, 0 errors, 0 unknown columns, 0 duplicate handles; re-running the same file plans the same 142 updates and matches the case by handle (no second create).
- Fixed prices: all 18 Group A rows at $49.99 × 1, all 9 Group B rows at $99.98 × 1, OP-16 box $149.97 × 1, master case $1,199.76 × 1.
- No title or description contains "Pack of N"; no description or specification row contains a retailer name or research note; every row has a main image, a description and (for preorders) a release date; no price is off the $49.99 ladder; every product's maximum line value is ≤ $1,199.76.
- GTINs: every imported code passes the check digit; no two products outside a variant group share a code.
- Feed simulation (repository validators, selection = all): 0 errors on 143; availability in_stock 105 / preorder 38 (37 existing + none new; the case is in stock).
- Live checks: both OP-16 URLs probed (box 200, case 404 until import), case image URL 200 after deploy, site health 200.
- Not verifiable from here: acquisition costs and margins, real stock counts, whether your case inventory is in the sealed Bandai shipper (the description says so; confirm before publishing), Google Ads final URLs, Merchant Center product ids and index status, the Payments-profile address.

## 8. Files

| File | Purpose |
|---|---|
| `docs/gogetcards-final-master-import-2026-11-06.csv` | **The import.** 143 rows, 19 columns. Admin → Products → Import, review the plan (142 update / 1 create), confirm. |
| `docs/gogetcards-final-pricing-review.csv` | Every product: old/new quantity and price, lowest competitor, market, MSRP, source, date, confidence, advantage, override source, alternative, margin status, objective, approval flag. |
| `docs/gogetcards-multipack-review.csv` | The 62 original packs: converted or retained, reason, image, title, final quantity and price. |
| `docs/gogetcards-final-launch-shortlist.csv` | Ranked shortlist + waiting list with campaign assignment, evidence, CPC and break-even estimates (labelled). |
| `docs/gogetcards-gtin-review.csv` | The 74 products researched: code, confidence, re-verification, decision, source. |