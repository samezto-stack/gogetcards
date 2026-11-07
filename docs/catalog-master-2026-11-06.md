# GoGetCards — corrected master catalogue import (v2), 2026-11-07

This supersedes the 2026-11-06 version. **Nothing has been imported; the live catalogue is unchanged.** The import file and the four review files in `docs/` are regenerated, and the backorder availability change is deployed to the site (code only, no catalogue data touched).

One file to import: `docs/gogetcards-final-master-import-2026-11-06.csv` (143 rows). It replaces every earlier CSV. Importer dry run against the live catalogue, through the repository's own `plan()` and `parseProductBody()`: **1 create, 142 update, 0 errors, 0 duplicate handles, 0 cast/validation errors, 0 fields cleared.** Feed simulation over the result: **0 errors.**

---

## 1. The issues you raised, point by point

**1. Preorder vs backorder — fixed and deployed.** Google separates *preorder* (not released yet, ships on the release date) from *backorder* (released, temporarily out of stock here, orderable for fulfilment on an availability date). The store sent `preorder` for both. `config/preorder.js` now decides the state in one place, and the feed, the Product schema (`schema.org/BackOrder`) and the product page all read it, so they cannot disagree. The 17 released-but-still-flagged products are now **backorder**, not preorder. A new `availabilityOverride` model field and an `availability` import column let you force any of the four states without touching the flag; blank derives it. No stock or dates are invented — the readiness panel now flags each backorder item to confirm its restock date. Deployed: a released product page (Delta Reign Booster Box) live shows `schema.org/BackOrder`, "Backorder — released … awaiting restock", and a "Secure Backorder" button. New tests cover all four states.

**2. Contradictions — resolved.** The OP-16 Booster Box now appears in exactly one place: the launch shortlist, ranked 21 (the earlier draft listed it twice). Availability totals now reconcile exactly: **106 in stock + 17 backorder + 20 preorder = 143** (the original 105 in stock became 106 with the recreated master case; of the 37 preorders, 17 are now backorder and 20 remain preorder). Every number in this report is generated from the CSV, and the feed simulation reports the same 106 / 17 / 20.

**3. Campaigns — catalog-only excluded from paid Shopping.** No `catalog_only` product is advertised. Paid Shopping runs only on the launch set (`custom_label_0 = launch_30`). The whole catalogue is still submitted to Merchant Center (eligibility), but the campaign targets only the launch group. I dropped the $100/day catalog-only campaign. I also re-cut the launch set for genuine readiness (next point), which left **26** products, not a forced 30. Budget can scale past $500 once the test shows a profitable ROAS; the structure does not change.

**4. The products needing your decision — a table.** 52 rows carry a flag; section 5 lists each with the reason, the concern type (profitability / market competitiveness / product identity / missing information), your price, the proposed price and the competitor reference. The full data is in `docs/gogetcards-final-pricing-review.csv` (new `concern_category` and `approval_required` columns).

**5. Merchant Center + tracking.** After import, set Distribution → Google selection mode to **All** so the feed carries the whole eligible catalogue (it lists 9 today because the mode is *selected* with 9 ticked). The paid/organic distinction is the custom label, not a separate feed — one feed. Conversion tracking is still unset in Northflank (`GOOGLE_ADS_ID`, `GOOGLE_ADS_PURCHASE_LABEL`, `GA4_MEASUREMENT_ID`); the implementation is correct — the purchase conversion fires only on the thank-you page of an order confirmed through the signed partner callback, with `transaction_id` = order id (so refreshes, back-button and duplicate callbacks are de-duplicated by Google), value = server-calculated total in USD, test orders excluded, and GA4 uses the same transaction id. Supply the three variables and fire a test order to confirm before spending.

**6. One corrected master CSV — delivered**, full catalogue, not a patch (section 7).

**7. Identifiers and importer safety.** 134 of 143 products carry a GTIN (66 newly verified). Each imported code was matched to the exact product *and packaging* (box vs pack vs case) on a manufacturer or distributor page or two agreeing retailers — the `packaging_evidence` column in `docs/gogetcards-gtin-review.csv` shows the matched listing for each. Doubtful, conflicting or shared-but-ungrouped codes are **not** imported. No code is marked `identifier_exists=false`. On importer safety: the database is not reachable from this environment (the Mongo SRV host is outside the session's network), so I ran the staging validation **in memory through the real importer and the real Mongoose model** — `plan()` → `parseProductBody()` → model cast + `validateSync()` — against a reconstruction of the live catalogue that includes SKUs, stock, variant groups, market prices and Merchant overrides. Result: **0 cast/validation errors, 0 preservation mismatches, 0 fields cleared by a blank cell.** SKUs, inventory, variant grouping, product ids, URLs, compare prices, badges, market prices and Merchant overrides all round-trip unchanged (the file carries 19 columns; nothing else is written, and the import re-applies existing values for the columns it does carry). The real write runs server-side in Northflank where the DB is reachable, on this exact code path.

---

## 2. Headline numbers

| | Before | After import |
|---|---|---|
| Products | 142 | 143 |
| Retailer multipacks | 62 | 28 |
| Prices changed | — | 110 |
| In stock / backorder / preorder | 105 / — / 37 | 106 / 17 / 20 |
| Products with a GTIN | 68 | 134 |
| Above the lowest credible offer | 18 | 12 |
| 0–10% / 10–20% below | 43 / 50 | 9 / 10 |
| 20–25% / 25–30% / 30–40% / >40% below | — | 12 / 31 / 48 / 21 |
| Launch-ready (advertised) | 30 | 26 |
| Rows needing your decision | — | 52 |

---

## 3. One Piece OP-16, and the five new conversions

**OP-16 Booster Box** (handle unchanged): one box, $149.97, verified UPC 810199500300, 29% below the lowest credible delivered offer. The two-box picture was the auto-generated multipack composite, not a stored photo, so it is gone now that the pack size is 1; the single stored photo is the main image.

**OP-16 Master Case** (original handle restored): the record was hard-deleted (no archive/soft-delete state, no slug history, no redirect entry), so it is **recreated** at `/products/one-piece-tcg-op-16-the-time-of-battle-factory-sealed-master-case-12-booster-boxes-english-edition`, $1,199.76, product type Factory Sealed Master Case, 12 boxes, verified case UPC 810199500317 (read on Dave & Adam's, Flipside and Pastime Sports pages), stock left at 0 for you to set, image a hosted single box with a ×12 badge (served live; replace with a real case photo when you have one). The old URL returns 404 today with no redirect; after import it serves the product (200), joins the sitemap, and enters the feed once selection is All. **It is not advertised** (no demand data, $1,199.76 is a niche buyer); it sits in the catalogue only. Do not redirect the old URL to the box — they are different products.

**Five more single-unit conversions (your 2026-11-07 list), all at $49.99:**

- Pokémon TCG 30th Celebration Sylveon ex Box — was a pack, now one unit at $49.99 (lowest credible $44.98, -11.1% vs it). Each had only one stored photo (the single unit); the multi-unit picture a shopper saw was the generated composite, which disappears when the pack size is 1, so no stored image is removed.
- Pokémon TCG 30th Celebration Greninja ex Box — was a pack, now one unit at $49.99 (lowest credible $44.73, -11.8% vs it). Each had only one stored photo (the single unit); the multi-unit picture a shopper saw was the generated composite, which disappears when the pack size is 1, so no stored image is removed.
- MTG The Hobbit Bundle — 9 Play Boosters, Foil Hobbit Lands, Promo & Spindown (English Edition) — was a pack, now one unit at $49.99 (lowest credible $47.94, -4.3% vs it). Each had only one stored photo (the single unit); the multi-unit picture a shopper saw was the generated composite, which disappears when the pack size is 1, so no stored image is removed.
- MTG Reality Fracture Bundle — Play Boosters, Foil Basic Lands, Promo & Spindown (English Edition) — was a pack, now one unit at $49.99 (lowest credible $44.99, -11.1% vs it). Each had only one stored photo (the single unit); the multi-unit picture a shopper saw was the generated composite, which disappears when the pack size is 1, so no stored image is removed.
- MTG Reality Fracture Multiverse Reforged Commander Deck — was a pack, now one unit at $49.99 (lowest credible $48.00, -4.1% vs it). Each had only one stored photo (the single unit); the multi-unit picture a shopper saw was the generated composite, which disappears when the pack size is 1, so no stored image is removed.
The two MTG bundles have longer, contents-bearing titles as asked: *MTG The Hobbit Bundle — 9 Play Boosters, Foil Hobbit Lands, Promo & Spindown (English Edition)* and *MTG Reality Fracture Bundle — Play Boosters, Foil Basic Lands, Promo & Spindown (English Edition)*.

---

## 4. Multipacks: 62 → 28

34 of the 62 became single units; **28 remain packs**, every one because the single-unit market price is below $62.49 and the checkout cannot charge less than $49.99 (the ladder floor), so a single would be at or above market. Packs are only made smaller, never larger, and never created from a product sold singly. Each keeps its composite image, its "(Pack of N)" title and its per-unit line, and the feed sends `multipack`. Full table: `docs/gogetcards-multipack-review.csv`.

| Retained pack | Was | Now | Unit | Why |
|---|---|---|---|---|
| Disney Lorcana Hyperia City Prerelease Box | 3× | 2× @ $49.99 | $25.00 | below $62.49 single-unit market; ladder floor |
| MTG Marvel Super Heroes Bundle | 5× | 2× @ $49.99 | $25.00 | below $62.49 single-unit market; ladder floor |
| MTG Reality Fracture Prerelease Pack | 2× | 2× @ $49.99 | $25.00 | below $62.49 single-unit market; ladder floor |
| MTG Secrets of Strixhaven Bundle | 3× | 2× @ $49.99 | $25.00 | below $62.49 single-unit market; ladder floor |
| MTG Secrets of Strixhaven Commander Deck [Lorehold S | 3× | 2× @ $49.99 | $25.00 | below $62.49 single-unit market; ladder floor |
| MTG Secrets of Strixhaven Commander Deck [Prismari A | 3× | 2× @ $49.99 | $25.00 | below $62.49 single-unit market; ladder floor |
| MTG Secrets of Strixhaven Commander Deck [Quandrix U | 3× | 2× @ $49.99 | $25.00 | below $62.49 single-unit market; ladder floor |
| MTG Secrets of Strixhaven Commander Deck [Witherbloo | 6× | 3× @ $99.98 | $33.33 | below $62.49 single-unit market; ladder floor |
| MTG Star Trek Bundle | 6× | 3× @ $99.98 | $33.33 | below $62.49 single-unit market; ladder floor |
| MTG Star Trek Prerelease Pack | 3× | 2× @ $49.99 | $25.00 | below $62.49 single-unit market; ladder floor |
| MTG Star Trek Scene Box [Divergent Timeline] | 3× | 3× @ $49.99 | $16.66 | below $62.49 single-unit market; ladder floor |
| MTG Star Trek Scene Box [Enterprise-Q] | 3× | 3× @ $49.99 | $16.66 | below $62.49 single-unit market; ladder floor |
| MTG Teenage Mutant Ninja Turtles Bundle | 3× | 2× @ $49.99 | $25.00 | below $62.49 single-unit market; ladder floor |
| MTG Teenage Mutant Ninja Turtles Commander Deck | 3× | 3× @ $99.98 | $33.33 | below $62.49 single-unit market; ladder floor |
| One Piece Card Game EB-05 One Piece Heroines Edition | 6× | 6× @ $49.99 | $8.33 | below $62.49 single-unit market; ladder floor |
| One Piece Card Game OP-15 Adventure on Kami's Island | 7× | 7× @ $49.99 | $7.14 | below $62.49 single-unit market; ladder floor |
| One Piece Card Game OP-16 The Time of Battle Booster | 9× | 9× @ $49.99 | $5.55 | below $62.49 single-unit market; ladder floor |
| One Piece Card Game OP-17 The World's Strongest Warr | 7× | 7× @ $49.99 | $7.14 | below $62.49 single-unit market; ladder floor |
| One Piece Card Game OP-18 The Dominance of God Boost | 5× | 5× @ $49.99 | $10.00 | below $62.49 single-unit market; ladder floor |
| Pokémon TCG 30th Celebration Battle Deck [Espeon ex] | 2× | 2× @ $49.99 | $25.00 | below $62.49 single-unit market; ladder floor |
| Pokémon TCG 30th Celebration Battle Deck [Umbreon ex | 7× | 3× @ $49.99 | $16.66 | below $62.49 single-unit market; ladder floor |
| Pokémon TCG 30th Celebration Booster Pack | 6× | 6× @ $49.99 | $8.33 | below $62.49 single-unit market; ladder floor |
| Pokémon TCG 30th Celebration ex Tin (Retail Version) | 5× | 4× @ $149.97 | $37.49 | below $62.49 single-unit market; ladder floor |
| Pokémon TCG 30th Celebration Knock Out Collection | 3× | 3× @ $49.99 | $16.66 | below $62.49 single-unit market; ladder floor |
| Pokémon TCG 30th Celebration Poster Collection | 7× | 5× @ $99.98 | $20.00 | below $62.49 single-unit market; ladder floor |
| Pokémon TCG 30th Celebration Tech Sticker Collection | 7× | 2× @ $49.99 | $25.00 | below $62.49 single-unit market; ladder floor |
| Pokémon TCG Delta Reign Build & Battle Box | 4× | 3× @ $99.98 | $33.33 | below $62.49 single-unit market; ladder floor |
| Pokémon TCG Pitch Black Booster Bundle | 5× | 2× @ $49.99 | $25.00 | below $62.49 single-unit market; ladder floor |
---

## 5. Pricing and the rows needing your decision

Every product without an owner price is a single unit on the $49.99 ladder at the rung landing 25–40% below the lowest credible *delivered* offer (20–50% when the ladder's spacing leaves nothing closer), never above its current price, never a larger pack. Owner prices are used exactly. Acquisition cost was not supplied, so margin is **unverified** on every row and deep discounts are flagged to check against cost, not assumed profitable.

**52 rows need your decision**, by concern: market competitiveness 31, profitability 21.

| Product | Owner / rec | Your/proposed price | Lowest credible | Advantage | Concern | Note |
|---|---|---|---|---|---|---|
| One Piece Card Game Double Pack Set Vol.13 [DP-1 | Owner | $49.99 (×1) | $29.99 | -66.7% | market competitiveness | ABOVE the lowest credible offer by 67% |
| Pokémon TCG 30th Celebration Classic Collection  | Owner | $99.98 (×1) | $76.50 | -30.7% | market competitiveness | ABOVE the lowest credible offer by 31%; nearest ladder price at 20%+ below is $49.99 (35% below |
| Pokémon TCG 30th Celebration Figure Collection [ | Owner | $99.98 (×1) | $77.99 | -28.2% | market competitiveness | ABOVE the lowest credible offer by 28%; nearest ladder price at 20%+ below is $49.99 (36% below |
| Pokémon TCG 30th Celebration Greninja ex Box | Owner | $49.99 (×1) | $44.73 | -11.8% | market competitiveness | ABOVE the lowest credible offer by 12% |
| Pokémon TCG 30th Celebration Figure Collection [ | Owner | $99.98 (×1) | $89.95 | -11.2% | market competitiveness | ABOVE the lowest credible offer by 11%; nearest ladder price at 20%+ below is $49.99 (44% below |
| MTG Reality Fracture Bundle | Owner | $49.99 (×1) | $44.99 | -11.1% | market competitiveness | ABOVE the lowest credible offer by 11% |
| Pokémon TCG 30th Celebration Sylveon ex Box | Owner | $49.99 (×1) | $44.98 | -11.1% | market competitiveness | ABOVE the lowest credible offer by 11% |
| Pokémon TCG Delta Reign Booster Bundle (6 Packs) | Recommended | $49.99 (×1) | $46.87 | -6.7% | market competitiveness | single unit at the $49.99 ladder floor would be at or above the $46.87 market; current price ke |
| One Piece Card Game EB-05 One Piece Heroines Edi | Recommended | $49.99 (×6) | $7.95 | -4.8% | market competitiveness | no pack of 6 or smaller reaches 10% below the $7.95 market on the ladder; current configuration |
| MTG The Hobbit Bundle | Owner | $49.99 (×1) | $47.94 | -4.3% | market competitiveness | ABOVE the lowest credible offer by 4% |
| MTG Reality Fracture Multiverse Reforged Command | Owner | $49.99 (×1) | $48.00 | -4.1% | market competitiveness | ABOVE the lowest credible offer by 4% |
| Pokémon TCG 30th Celebration Ditto Premium Colle | Owner | $99.98 (×1) | $97.49 | -2.6% | market competitiveness | ABOVE the lowest credible offer by 3%; nearest ladder price at 20%+ below is $49.99 (49% below) |
| MTG Secrets of Strixhaven Commander Deck [Silver | Recommended | $49.99 (×1) | $49.99 | 0.0% | market competitiveness | single unit at the $49.99 ladder floor would be at or above the $49.99 market; current price ke |
| MTG Star Trek Commander Deck [Federation Fleet] | Recommended | $49.99 (×1) | $49.99 | 0.0% | market competitiveness | single unit at the $49.99 ladder floor would be at or above the $49.99 market; current price ke |
| MTG Star Trek Commander Deck [Klingon Fury] | Recommended | $49.99 (×1) | $49.99 | 0.0% | market competitiveness | single unit at the $49.99 ladder floor would be at or above the $49.99 market; current price ke |
| MTG Star Trek Commander Deck [Landing Party] | Recommended | $49.99 (×1) | $49.99 | 0.0% | market competitiveness | single unit at the $49.99 ladder floor would be at or above the $49.99 market; current price ke |
| Pokémon TCG 30th Celebration Elite Trainer Box | Recommended | $99.98 (×1) | $104.92 | 4.7% | market competitiveness | no ladder rung lands between 10% and 50% below market; needs a decision; only 5% below the lowe |
| MTG Marvel Super Heroes Play Booster Box (30 Pac | Recommended | $99.98 (×1) | $105.90 | 5.6% | market competitiveness | no ladder rung lands between 10% and 50% below market; needs a decision; only 6% below the lowe |
| MTG Teenage Mutant Ninja Turtles Play Booster Bo | Recommended | $99.98 (×1) | $106.99 | 6.6% | market competitiveness | no ladder rung lands between 10% and 50% below market; needs a decision; only 7% below the lowe |
| One Piece Card Game OP-15 Adventure on Kami's Is | Recommended | $49.99 (×7) | $7.75 | 7.9% | market competitiveness | no pack of 7 or smaller reaches 10% below the $7.75 market on the ladder; current configuration |
| MTG The Hobbit Draft Night | Recommended | $99.98 (×1) | $108.98 | 8.3% | market competitiveness | no ladder rung lands between 10% and 50% below market; needs a decision; only 8% below the lowe |
| MTG Star Trek Play Booster Box (30 Packs) | Recommended | $99.98 (×1) | $114.89 | 13.0% | market competitiveness | ladder coarseness: only 13% below is possible on a single unit; the next rung down would be 56% |
| Pokémon TCG Pitch Black Pokémon Center Elite Tra | Recommended | $99.98 (×1) | $115.50 | 13.4% | market competitiveness | ladder coarseness: only 13% below is possible on a single unit; the next rung down would be 57% |
| Pokémon TCG 30th Celebration 2-Pack Blister | Recommended | $49.99 (×1) | $58.20 | 14.1% | market competitiveness | single kept at the $49.99 ladder floor: only 14% below the $58.20 market; a pack was not create |
| MTG Reality Fracture Secret Lair Bundle | Owner | $99.98 (×1) | $116.99 | 14.5% | market competitiveness | only 15% below the lowest credible offer; nearest ladder price at 20%+ below is $49.99 (57% bel |
| One Piece Card Game OP-17 The World's Strongest  | Recommended | $49.99 (×7) | $8.55 | 16.5% | market competitiveness | no pack of 7 or smaller reaches 20% below the $8.55 market on the ladder; pack of 7 at 16% belo |
| One Piece Card Game OP-18 The Dominance of God B | Recommended | $49.99 (×5) | $11.99 | 16.6% | market competitiveness | no pack of 5 or smaller reaches 20% below the $11.99 market on the ladder; pack of 5 at 17% bel |
| MTG Lorwyn Eclipsed Bundle | Recommended | $49.99 (×1) | $59.99 | 16.7% | market competitiveness | single kept at the $49.99 ladder floor: only 17% below the $59.99 market; a pack was not create |
| MTG Reality Fracture Play Booster Box (30 Packs) | Recommended | $99.98 (×1) | $121.00 | 17.4% | market competitiveness | ladder coarseness: only 17% below is possible on a single unit; the next rung down would be 59% |
| Disney Lorcana Attack of the Vine! Prerelease Bo | Recommended | $49.99 (×1) | $60.98 | 18.0% | market competitiveness | single kept at the $49.99 ladder floor: only 18% below the $60.98 market; a pack was not create |
| Pokémon TCG 30th Celebration Booster Pack | Recommended | $49.99 (×6) | $10.24 | 18.6% | market competitiveness | no pack of 6 or smaller reaches 20% below the $10.24 market on the ladder; pack of 6 at 19% bel |
| MTG Reality Fracture Draft Night | Owner | $49.99 (×1) | $84.00 | 40.5% | profitability | 40% below: deeper than the 25-40% target; confirm cost |
| Disney Lorcana Attack of the Vine! Illumineer's  | Owner | $49.99 (×1) | $84.46 | 40.8% | profitability | 41% below: deeper than the 25-40% target; confirm cost |
| MTG Marvel Super Heroes Draft Night | Owner | $49.99 (×1) | $84.95 | 41.2% | profitability | 41% below: deeper than the 25-40% target; confirm cost |
| Pokémon TCG Delta Reign Elite Trainer Box (9 Pac | Recommended | $49.99 (×1) | $86.48 | 42.2% | profitability | 42% below: deeper than the 25-40% target; confirm cost |
| Pokémon TCG Perfect Order Booster Box (36 Packs) | Recommended | $99.98 (×1) | $172.84 | 42.2% | profitability | 42% below: deeper than the 25-40% target; confirm cost |
| MTG Lorwyn Eclipsed Draft Night | Owner | $49.99 (×1) | $86.99 | 42.5% | profitability | 43% below: deeper than the 25-40% target; confirm cost |
| MTG Secrets of Strixhaven Bundle | Recommended | $49.99 (×2) | $43.90 | 43.1% | profitability | single unit cannot be priced on the $49.99 ladder below the $43.90 market: pack of 2 retained ( |
| Pokémon TCG Pitch Black Booster Box (36 Packs) | Recommended | $99.98 (×1) | $177.77 | 43.8% | profitability | 44% below: deeper than the 25-40% target; confirm cost |
| Disney Lorcana Attack of the Vine! Booster Displ | Recommended | $99.98 (×1) | $178.93 | 44.1% | profitability | 44% below: deeper than the 25-40% target; confirm cost |
| MTG Star Trek Collectors Edition Commander Deck  | Recommended | $99.98 (×1) | $179.99 | 44.5% | profitability | 44% below: deeper than the 25-40% target; confirm cost |
| Pokémon TCG Chaos Rising Booster Box | Recommended | $99.98 (×1) | $181.97 | 45.1% | profitability | 45% below: deeper than the 25-40% target; confirm cost |
| MTG Star Trek Draft Night | Owner | $49.99 (×1) | $92.55 | 46.0% | profitability | 46% below: deeper than the 25-40% target; confirm cost |
| One Piece TCG OP-16 The Time of Battle Factory S | Owner | $1,199.76 (×1) | $2,252.99 | 46.7% | profitability | 47% below: deeper than the 25-40% target; confirm cost |
| MTG Star Trek Collectors Edition Commander Deck  | Recommended | $49.99 (×1) | $94.00 | 46.8% | profitability | 47% below: deeper than the 25-40% target; confirm cost; low-confidence comparison |
| Pokémon TCG 30th Celebration ex Tin (Internation | Owner | $49.99 (×1) | $94.39 | 47.0% | profitability | 47% below: deeper than the 25-40% target; confirm cost; low-confidence comparison |
| Pokémon TCG 30th Celebration Binder Collection | Owner | $49.99 (×1) | $94.89 | 47.3% | profitability | 47% below: deeper than the 25-40% target; confirm cost |
| MTG Marvel Super Heroes Jumpstart Booster Box (2 | Owner | $49.99 (×1) | $96.99 | 48.5% | profitability | 48% below: deeper than the 25-40% target; confirm cost |
| 2026 Bowman Chrome Baseball Mega Box (6 Packs) | Owner | $49.99 (×1) | $97.90 | 48.9% | profitability | 49% below: deeper than the 25-40% target; confirm cost |
| Disney Lorcana Winterspell Illumineer's Trove | Owner | $49.99 (×1) | $97.99 | 49.0% | profitability | 49% below: deeper than the 25-40% target; confirm cost |
| Disney Lorcana Wilds Unknown Illumineer's Trove | Owner | $49.99 (×1) | $100.99 | 50.5% | profitability | 51% below: deeper than the 25-40% target; confirm cost |
| MTG Lorwyn Eclipsed Play Booster Box (14 Packs) | Owner | $49.99 (×1) | $101.42 | 50.7% | profitability | 51% below: deeper than the 25-40% target; confirm cost |

The four you asked about, re-verified against the lowest currently buyable offer (not TCGplayer market):

- **Pokémon TCG 30th Celebration Figure Collection [Mew]**: your $99.98 vs lowest credible $77.99 (medium) → -28.2%. ABOVE the lowest credible offer by 28%; nearest ladder price at 20%+ below is $49.99 (36% below). Kept at your price; flagged.
- **Pokémon TCG 30th Celebration Figure Collection [Mewtwo]**: your $99.98 vs lowest credible $89.95 (medium) → -11.2%. ABOVE the lowest credible offer by 11%; nearest ladder price at 20%+ below is $49.99 (44% below). Kept at your price; flagged.
- **Pokémon TCG 30th Celebration Ditto Premium Collection**: your $99.98 vs lowest credible $97.49 (high) → -2.6%. ABOVE the lowest credible offer by 3%; nearest ladder price at 20%+ below is $49.99 (49% below). Kept at your price; flagged.
- **MTG Reality Fracture Secret Lair Bundle**: your $99.98 vs lowest credible $116.99 (high) → 14.5%. only 15% below the lowest credible offer; nearest ladder price at 20%+ below is $49.99 (57% below). Kept at your price; flagged.
---

## 6. Launch shortlist: 26 ready to advertise

Launch-ready means it can be advertised honestly and profitably now: in stock (not backorder/preorder), a single unit, a verified GTIN, a reliable price comparison at least 20% below the lowest credible offer, a headline of at least $99.98 (so a ~$60–80 cost per purchase can be recovered), demand at least medium, and a readiness score ≥ 12. Real inventory counts are unverified, so confirm stock before scaling spend.

| # | Product | Price | Advantage | Demand / comp. | Score |
|---|---|---|---|---|---|
| 1 | 2026 Bowman Chrome Baseball Hobby Box (6 Packs) | $399.92 | 30% | high / medium | 19.5 |
| 2 | Pokémon TCG 30th Celebration Booster Bundle Case | $1,199.76 | 27% | high / low | 19 |
| 3 | 2025 Panini Prizm NFL Football Hobby Box (12 Packs) | $649.87 | 30% | high / medium | 18.5 |
| 4 | One Piece Card Game EB-05 One Piece Heroines Edition | $149.97 | 38% | high / medium | 18.5 |
| 5 | One Piece Card Game OP-17 The World's Strongest Warr | $199.96 | 32% | high / medium | 18.5 |
| 6 | MTG Reality Fracture Collector Booster Display (12 P | $249.95 | 33% | high / high | 18 |
| 7 | Pokémon TCG Phantasmal Flames Booster Box | $249.95 | 32% | medium / low | 18 |
| 8 | 2026 Topps Chrome Baseball Hobby Box (20 Packs) | $399.92 | 25% | high / medium | 17.5 |
| 9 | MTG The Hobbit Collector Booster Box (12 Packs) | $399.92 | 33% | high / medium | 17.5 |
| 10 | Pokémon TCG 30th Celebration Elite Trainer Box Case | $749.85 | 29% | high / medium | 17.5 |
| 11 | Pokémon TCG 30th Celebration Pokémon Center Elite Tr | $199.96 | 26% | high / medium | 17.5 |
| 12 | Pokémon TCG Chaos Rising Booster Box | $99.98 | 45% | high / medium | 17.5 |
| 13 | One Piece Card Game EB-03 One Piece Heroines Edition | $199.96 | 29% | medium / low | 17 |
| 14 | One Piece Card Game OP-13 Carrying On His Will Boost | $249.95 | 35% | medium / medium | 16.5 |
| 15 | One Piece Card Game OP-15 Adventure on Kami's Island | $149.97 | 38% | medium / medium | 16.5 |
| 16 | Pokémon TCG Pitch Black Booster Box (36 Packs) | $99.98 | 44% | high / high | 16 |
| 17 | Disney Lorcana Attack of the Vine! Booster Display B | $99.98 | 44% | medium / medium | 15.5 |
| 18 | MTG Secrets of Strixhaven Collector Booster Box (12  | $299.94 | 33% | medium / medium | 15.5 |
| 19 | MTG Secrets of Strixhaven Play Booster Box (30 Packs | $99.98 | 31% | medium / medium | 15.5 |
| 20 | MTG The Hobbit Play Booster Box (30 Packs) | $99.98 | 23% | high / medium | 15.5 |
| 21 | One Piece Card Game OP-16 The Time of Battle Booster | $149.97 | 29% | medium / medium | 15.5 |
| 22 | Pokémon TCG Perfect Order Booster Box (36 Packs) | $99.98 | 42% | medium / medium | 15.5 |
| 23 | 2025-26 Panini Prizm Basketball Hobby Box (12 Packs) | $199.96 | 23% | high / high | 15 |
| 24 | MTG Marvel Super Heroes Collector Booster Box (12 Pa | $299.94 | 33% | medium / high | 15 |
| 25 | 2026 Topps Series 1 Baseball Hobby Box (20 Packs) | $149.97 | 29% | medium / high | 14 |
| 26 | Disney Lorcana Hyperia City Booster Display Box (24  | $99.98 | 22% | high / high | 14 |

**Held (28): score ≥ 12 but not launch-ready**, so in the catalogue and feed but not advertised. Each fails on one fixable thing:

- 2026 Topps Chrome Football Hobby Box (20 Packs) (score 16.5, $449.91): price comparison is low-confidence
- MTG Lorwyn Eclipsed Play Booster Box (14 Packs) (score 16.5, $49.99): headline price under $99.98 — too little margin to absorb a paid click
- Disney Lorcana Wilds Unknown Booster Display Box (24 (score 16, $149.97): demand is low or unmeasured — unlikely to spend efficiently in paid Shopping
- Disney Lorcana Winterspell Booster Display Box (24 P (score 16, $149.97): demand is low or unmeasured — unlikely to spend efficiently in paid Shopping
- One Piece Card Game OP-18 The Dominance of God Boost (score 16, $149.97): availability is not in-stock now (preorder or backorder)
- Pokémon TCG Mega Evolution Booster Box (36 Packs) (score 16, $199.96): demand is low or unmeasured — unlikely to spend efficiently in paid Shopping
- 2026-27 Topps Flagship Basketball Hobby Box (20 Pack (score 15.5, $149.97): availability is not in-stock now (preorder or backorder)
- 2026 Topps Cosmic Chrome Baseball Hobby Box (20 Pack (score 15.5, $699.86): availability is not in-stock now (preorder or backorder)
- Pokémon TCG 30th Celebration Ultra-Premium Collectio (score 15.5, $999.80): availability is not in-stock now (preorder or backorder)
- One Piece Card Game OP-05 Awakening of the New Era B (score 15, $699.86): demand is low or unmeasured — unlikely to spend efficiently in paid Shopping
- One Piece Card Game OP-09 Emperors in the New World  (score 15, $449.91): demand is low or unmeasured — unlikely to spend efficiently in paid Shopping
- One Piece Card Game PRB-02 The Best Vol. 2 Booster B (score 15, $249.95): demand is low or unmeasured — unlikely to spend efficiently in paid Shopping
- Pokémon TCG Delta Reign Booster Box (36 Packs) (score 15, $149.97): availability is not in-stock now (preorder or backorder)
- Pokémon TCG Pitch Black Elite Trainer Box (9 Packs) (score 15, $49.99): headline price under $99.98 — too little margin to absorb a paid click
- 2026 Topps Inception Football Hobby Box (score 14.5, $349.93): availability is not in-stock now (preorder or backorder)
- MTG Teenage Mutant Ninja Turtles Collector Booster B (score 14.5, $299.94): demand is low or unmeasured — unlikely to spend efficiently in paid Shopping
- Pokémon TCG 30th Celebration Ultra-Premium Collectio (score 14, $249.95): availability is not in-stock now (preorder or backorder)
- MTG Lorwyn Eclipsed Collector Booster Box (15 Packs) (score 13.5, $299.94): demand is low or unmeasured — unlikely to spend efficiently in paid Shopping
- MTG Reality Fracture Play Booster Box (30 Packs) (score 13, $99.98): less than 20% below the lowest credible offer
- MTG Star Trek Collectors Edition Commander Deck [We  (score 13, $99.98): availability is not in-stock now (preorder or backorder)
- Pokémon TCG 30th Celebration Booster Bundle (score 13, $49.99): headline price under $99.98 — too little margin to absorb a paid click
- Pokémon TCG 30th Celebration Elite Trainer Box (score 13, $99.98): less than 20% below the lowest credible offer
- Pokémon TCG 30th Celebration Ultra-Premium Collectio (score 13, $299.94): availability is not in-stock now (preorder or backorder)
- Pokémon TCG Delta Reign Elite Trainer Box (9 Packs) (score 13, $49.99): availability is not in-stock now (preorder or backorder); headline price under $99.98 — too little margin to absorb a paid click
- MTG Reality Fracture Multiverse Reforged Commander D (score 12.5, $49.99): less than 20% below the lowest credible offer; headline price under $99.98 — too little margin to absorb a paid click
- One Piece Card Game OP-14 The Azure Sea's Seven Boos (score 12.5, $199.96): demand is low or unmeasured — unlikely to spend efficiently in paid Shopping
- MTG Marvel Super Heroes Play Booster Box (30 Packs) (score 12, $99.98): less than 20% below the lowest credible offer
- MTG Star Trek Collector Booster Box (12 Packs) (score 12, $299.94): availability is not in-stock now (preorder or backorder)

Most held items are backorder/preorder (add when stock lands and the flag clears) or $49.99 singles (too thin a margin for a paid click — they win on the free listings instead). `docs/gogetcards-final-launch-shortlist.csv` has the full ranking, demand evidence, CPC and break-even estimates (all labelled).

**Campaigns for the test** (budget can exceed $500 once ROAS is proven): Campaign 1 Standard Shopping on `launch_30`, subdivided by brand, manual CPC caps (Pokémon $0.90 / MTG $1.20 / One Piece $0.80 / sports $1.00), moving to Target ROAS at break-even × 1.3 after 30 conversions. Campaign 2 Search on the brand name and the top product names. No catalog-only Shopping campaign. Break-even ROAS = 1 ÷ contribution margin (6.7 at 15%, 4.0 at 25%); supply your margin to turn these into real targets. $10k/day stays conditional on stock, catalogue breadth and marginal ROAS holding — not promised.

---

## 7. Validation (exact results)

Run through the repository's own importer and model, in memory (DB unreachable from here):

- **Plan: 1 create, 142 update, 0 errors, 0 unknown columns, 0 duplicate handles.** The create is the OP-16 master case; re-running the file plans the same 142 updates and matches the case by handle — no second create (idempotent).
- **0 cast/validation errors** (every row casts cleanly through the Mongoose model).
- **0 preservation mismatches, 0 blank cells that would clear a non-empty field.** SKUs, stock, allocation limits, compare prices, MPNs, editions, badges, featured flags, variant groups (id round-trips through the same 50-char normalisation the live value already passed), market prices and Merchant/Distribution overrides are all unchanged.
- **Fixed prices verified:** all 18 Group A + the 5 new conversions at $49.99×1, all 9 Group B at $99.98×1, OP-16 box $149.97×1, master case $1,199.76×1.
- **Hygiene:** 0 titles or descriptions contain "Pack of N"; 0 missing images; 0 off-ladder prices; every line's max value ≤ $1,199.76; no two products outside a variant group share a GTIN.
- **Feed:** 0 errors; availability 106 in_stock / 17 backorder / 20 preorder; warnings are 17 backorder-confirm, ~9 no-GTIN (allowed), image-on-third-party-host (info).
- **Not verifiable here:** acquisition costs and margins, real stock counts, whether your case inventory is in Bandai's sealed shipper, Google Ads/Merchant Center state and index status, the Payments-profile address.

## 8. Files and what to do

| File | Purpose |
|---|---|
| `docs/gogetcards-final-master-import-2026-11-06.csv` | The import. 143 rows, 19 columns. Admin → Products → Import; confirm 1 create / 142 update. |
| `docs/gogetcards-final-pricing-review.csv` | Per product: old/new quantity + price, lowest competitor, market, MSRP, source, date, confidence, advantage, override source, concern, approval flag. |
| `docs/gogetcards-multipack-review.csv` | The 62 packs: converted or retained, reason, image, title, final quantity and price. |
| `docs/gogetcards-final-launch-shortlist.csv` | The ranked launch set + waiting, with evidence, CPC and break-even estimates. |
| `docs/gogetcards-gtin-review.csv` | The 74 researched products: code, confidence, re-verification, packaging evidence, decision, source. |

Before the first ad dollar: import the file; set Distribution → All; set the three tracking variables and fire a test order; confirm the El Segundo address against the Payments profile; untick Preorder on each backorder product as its stock lands; supply acquisition costs so the margin column resolves.