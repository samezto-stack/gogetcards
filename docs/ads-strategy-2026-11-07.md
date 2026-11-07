# GoGetCards: Google Shopping strategy review and launch preparation, 2026-11-07

**Bottom line.** The five-campaign Standard Shopping structure is right, and I've kept it. The 35-product list isn't. I recommend **29 products**, not 35. Of ChatGPT's 35: **20 kept, 3 replaced, 11 held, 1 rejected**. Plus **9 additions**: 7 at launch and 2 Lorcana Troves for phase 2. (The OP-16 Master Case, which ChatGPT didn't propose, is also held.) The biggest problems were not in the product names:

1. **Purchase tracking is not live.** The production site loads no Google tag: `GOOGLE_ADS_ID` and `GA4_MEASUREMENT_ID` are unset, so no purchase is recorded today. Even once they're set, the tags load only after a visitor clicks "Accept" on the cookie banner, so many buyers will not be tracked. **Do not spend until both are resolved** (Report E, section E5).
2. **Checkout takes one product per order.** Adding a second product replaces the first (`routes/api.js`; the payment step sells one product at a time). A mixed cart can't happen. Several units of the same product can, up to a $1,199.76 line cap. So the $49.99 test can only measure same-product quantity, and the campaigns are built to measure exactly that.
3. **Eight proposed products are priced in a way that probably loses money.** Five are below official MSRP: three Pokémon booster boxes at $99.98 against a $161.64 MSRP, and two Lorcana displays at $99.98 against $143.76. Three more are more than 40% under every credible competitor: Lorwyn Play Booster Box, Reality Fracture Draft Night and the Bowman Chrome Mega Box. Advertising them scales the loss, and multi-unit orders multiply it. Prices this far under every retailer are also the pattern Google's misrepresentation review looks for on a new account. I held them; I did **not** change any price.
4. **Only 6 of the 29 products are in Google's feed today.** The feed has 15 hand-picked products, 11 of which are not ad candidates. I've deployed a change so the validated set goes to Google once you import one CSV, without removing anything Google already has.

No cost data, no Google Ads or Merchant Center access, and no order history were available to me, so I mark every margin figure **unverified**. Demand evidence is **TCGplayer completed sales**, a marketplace proxy, **not** Google search volume.

---

## What was checked, and against what

| Fact | Source | Confidence |
|---|---|---|
| Price, availability, GTIN, SKU, brand, image, stock | Live JSON-LD on all 143 product pages, fetched 2026-11-07 | High (what Google crawls) |
| Lowest credible US delivered price | `docs/gogetcards-final-pricing-review.csv` (named retailer + URL per product, 2026-11-06) | High/medium as marked per row |
| Today's re-check | TCGplayer search API, 2026-11-07: market price, lowest price incl. shipping, live listings, for 29 items | High |
| Demand | TCGplayer 30-day **units sold** and trend, observed 2026-11-06 (`docs/catalog-audit-2026-11-06.md`). TCGplayer's sales-history endpoints refused requests today, so items without a prior count say "not available"; none is estimated | Proxy, not Google demand |
| Sports demand | Release recency, hobby coverage, competitor stock. TCGplayer does not track sports sealed | Weak proxy |
| What Google receives | Live `/feed/google.xml`, plus each approved product run through the real `validators.validate` → `feedBuilder.build` | High |
| Merchant Center approval state | **Not available.** The integration is file-only (`providers/file.js`): Google fetches the feed, and nothing reads status back | n/a |
| Google Ads data (Keyword Planner, CPCs, search terms) | **Not available.** No Ads account access | n/a |
| Order history (units per order, AOV) | **Not available.** The database is unreachable from this environment | n/a |
| Product cost, Whop fees, shipping cost | **Not supplied** | n/a |

---

## REPORT A: Final advertising products

**Decision rules**, applied the same way to every product:
- **APPROVE**: correct identity and GTIN, in stock or a dated preorder, price advantage of about 20% or more against the lowest credible delivered competitor, demand evidence, and a price that plausibly covers cost.
- **HOLD**: the price is under ~70% of official MSRP (at or below normal distributor cost), or more than 40% under every competitor with no MSRP to check against (beyond your own 25–40% band, cost unverifiable), or demand is too thin or falling for its ticket size. Each HOLD says what would flip it to APPROVE.
- **REPLACE**: a stronger product in the same campaign takes its place.
- **REJECT**: structural; don't advertise at the current price.

Database `_id`s are not exposed by the site and the database is unreachable from here. The **SKU is the stable key**: it is the Merchant Center offer ID (`g:id`) for every product.

| Campaign | Product | SKU / MC offer ID | Price | Lowest competitor (delivered) | Advantage | Demand (TCGplayer 30-day units, trend) | In MC feed now | Stock (site) | Decision |
|---|---|---|---:|---:|---:|---|---|---:|---|
| Pokémon | Pokémon TCG 30th Celebration Booster Bundle Case<br>`pokemon-tcg-30th-celebration-booster-bundle-case` | GC-041 | $1,199.76 | $1,640.00 | 26.8% | 104, flat | no | 45 (in stock) | **APPROVE** |
| Pokémon | Pokémon TCG Phantasmal Flames Booster Box<br>`pokemon-tcg-phantasmal-flames-booster-box` | GC-015 | $249.95 | $369.95 | 32.4% | 107, flat | no | 43 (in stock) | **APPROVE** |
| Pokémon | Pokémon TCG 30th Celebration Pokémon Center Elite Trainer Box<br>`pokemon-tcg-30th-celebration-pokemon-center-elite-trainer-box` | GC-010 | $199.96 | $269.90 | 25.9% | 282, falling | no | 36 (in stock) | **APPROVE** |
| Pokémon | Pokémon TCG Delta Reign Booster Box (36 Packs) *(added)*<br>`pokemon-tcg-delta-reign-booster-box` | GC-003 | $149.97 | $219.94 | 31.8% | 2982, falling | no | 40 (in stock) | **APPROVE** |
| Pokémon | Pokémon TCG 30th Celebration Booster Bundle<br>`pokemon-tcg-30th-celebration-booster-bundle` | GC-011 | $49.99 | $64.47 | 22.5% | 6525, falling | yes | 41 (in stock) | **APPROVE** |
| Pokémon | Pokémon TCG Pitch Black Elite Trainer Box (9 Packs)<br>`pokemon-tcg-pitch-black-elite-trainer-box` | GC-073 | $49.99 | $72.50 | 31.0% | 597, flat | yes | 53 (in stock) | **APPROVE** |
| Pokémon | Pokémon TCG Delta Reign Elite Trainer Box (9 Packs) *(added)*<br>`pokemon-tcg-delta-reign-elite-trainer-box` | GC-031 | $49.99 | $86.48 | 42.2% | 3331, falling | no | 63 (in stock) | **APPROVE** |
| Pokémon | Pokémon TCG 30th Celebration Elite Trainer Box Case<br>`pokemon-tcg-30th-celebration-elite-trainer-box-case` | GC-033 | $749.85 | $1,049.96 | 28.6% | 92, falling | no | 50 (in stock) | **HOLD** |
| Pokémon | Pokémon TCG Chaos Rising Booster Box<br>`pokemon-tcg-chaos-rising-booster-box` | GC-025 | $99.98 | $181.97 | 45.1% | 415, flat | no | 53 (in stock) | **HOLD** |
| Pokémon | Pokémon TCG Perfect Order Booster Box (36 Packs)<br>`pokemon-tcg-perfect-order-booster-box` | GC-058 | $99.98 | $172.84 | 42.2% | 294, flat | no | 77 (in stock) | **HOLD** |
| Pokémon | Pokémon TCG Pitch Black Booster Box (36 Packs)<br>`pokemon-tcg-pitch-black-booster-box` | GC-016 | $99.98 | $177.77 | 43.8% | 789, falling | no | 68 (in stock) | **HOLD** |
| Pokémon | Pokémon TCG 30th Celebration Binder Collection<br>`pokemon-tcg-30th-celebration-binder-collection` | GC-049 | $49.99 | $94.89 | 47.3% | not available | no | 62 (in stock) | **REPLACE** |
| MTG | MTG The Hobbit Collector Booster Box (12 Packs)<br>`mtg-the-hobbit-collector-booster-box` | GC-023 | $399.92 | $596.00 | 32.9% | 456, falling | no | 52 (in stock) | **APPROVE** |
| MTG | MTG Marvel Super Heroes Collector Booster Box (12 Packs)<br>`mtg-marvel-super-heroes-collector-booster-box` | GC-037 | $299.94 | $449.99 | 33.3% | 82, flat | yes | 52 (in stock) | **APPROVE** |
| MTG | MTG Star Trek Collector Booster Box (12 Packs) *(added)*<br>`mtg-star-trek-collector-booster-box` | GC-007 | $299.94 | $419.99 | 28.6% | 1781, falling | no | 32 (preorder 2026-11-13) | **APPROVE** |
| MTG | MTG Reality Fracture Collector Booster Display (12 Packs)<br>`mtg-reality-fracture-collector-booster-display` | GC-004 | $249.95 | $375.00 | 33.3% | 1154, falling | no | 32 (in stock) | **APPROVE** |
| MTG | MTG The Hobbit Play Booster Box (30 Packs)<br>`mtg-the-hobbit-play-booster-box` | GC-032 | $99.98 | $129.99 | 23.1% | 708, falling | no | 51 (in stock) | **APPROVE** |
| MTG | MTG Secrets of Strixhaven Play Booster Box (30 Packs)<br>`mtg-secrets-of-strixhaven-play-booster-box` | GC-071 | $99.98 | $144.29 | 30.7% | 204, flat | no | 83 (in stock) | **APPROVE** |
| MTG | MTG Marvel Super Heroes Gift Bundle<br>`mtg-marvel-super-heroes-gift-bundle` | GC-092 | $49.99 | $74.99 | 33.3% | not available | no | 37 (in stock) | **APPROVE** |
| MTG | MTG Reality Fracture Draft Night<br>`mtg-reality-fracture-draft-night` | GC-060 | $49.99 | $84.00 | 40.5% | not available | no | 92 (in stock) | **HOLD** |
| MTG | MTG Secrets of Strixhaven Collector Booster Box (12 Packs)<br>`mtg-secrets-of-strixhaven-collector-booster-box` | GC-038 | $299.94 | $450.00 | 33.3% | 82, flat | no | 57 (in stock) | **REPLACE** |
| MTG | MTG Lorwyn Eclipsed Play Booster Box (30 Packs)<br>`mtg-lorwyn-eclipsed-play-booster-box` | GC-117 | $49.99 | $101.42 | 50.7% | 657, falling | no | 61 (in stock) | **REJECT** |
| One Piece | One Piece Card Game OP-13 Carrying On His Will Booster Box (English, 24 packs)<br>`one-piece-card-game-op-13-carrying-on-his-will-booster-box-english-24-packs` | GC-078 | $249.95 | $385.99 | 35.2% | 112, falling | no | 48 (in stock) | **APPROVE** |
| One Piece | One Piece Card Game OP-17 The World's Strongest Warriors Booster Box (English, 24 packs)<br>`one-piece-card-game-op-17-the-world-s-strongest-warriors-booster-box-english-24-packs` | GC-005 | $199.96 | $294.99 | 32.2% | 526, flat | yes | 30 (in stock) | **APPROVE** |
| One Piece | One Piece Card Game EB-03 One Piece Heroines Edition Booster Box (English, 24 packs)<br>`one-piece-card-game-eb-03-one-piece-heroines-edition-booster-box-english-24-packs` | GC-076 | $199.96 | $280.95 | 28.8% | 129, falling | no | 47 (in stock) | **APPROVE** |
| One Piece | One Piece Card Game OP-16 The Time of Battle Booster Box – English Edition (24 Packs)<br>`one-piece-card-game-op-16-the-time-of-battle-booster-box-english-24-packs` | GC-040 | $149.97 | $209.98 | 28.6% | 207, falling | no | 50 (in stock) | **APPROVE** |
| One Piece | One Piece Card Game EB-05 One Piece Heroines Edition Vol. 2 Booster Box (English, 24 packs)<br>`one-piece-card-game-eb-05-one-piece-heroines-edition-vol-2-booster-box-english-24-pac` | GC-017 | $149.97 | $240.95 | 37.8% | 2087, falling | no | 44 (in stock) | **APPROVE** |
| One Piece | One Piece Card Game OP-18 The Dominance of God Booster Box (English, 24 packs) *(added)*<br>`one-piece-card-game-op-18-the-dominance-of-god-booster-box-english-24-packs` | GC-008 | $149.97 | $239.97 | 37.5% | 260, falling | yes | 33 (preorder 2026-11-20) | **APPROVE** |
| One Piece | One Piece TCG OP-16 The Time of Battle Factory Sealed Master Case (12 Booster Boxes) – English Edition *(not proposed)*<br>`one-piece-tcg-op-16-the-time-of-battle-factory-sealed-master-case-12-booster-boxes-english-edition` | GC-151 | $1,199.76 | $2,252.99 | 46.7% | not available | yes | 9 (in stock) | **HOLD** |
| One Piece | One Piece Card Game OP-15 Adventure on Kami's Island Booster Box (English, 24 packs)<br>`one-piece-card-game-op-15-adventure-on-kami-s-island-booster-box-english-24-packs` | GC-039 | $149.97 | $243.00 | 38.3% | 74, flat | yes | 47 (in stock) | **HOLD** |
| Sports | 2026 Topps Cosmic Chrome Baseball Hobby Box (20 Packs) *(added)*<br>`2026-topps-cosmic-chrome-baseball-hobby-box` | GC-019 | $699.86 | $949.99 | 26.3% | not tracked (sports) | no | 69 (in stock) | **APPROVE** |
| Sports | 2025 Panini Prizm NFL Football Hobby Box (12 Packs)<br>`2025-panini-prizm-nfl-football-hobby-box` | GC-090 | $649.87 | $929.95 | 30.1% | not tracked (sports) | no | 48 (in stock) | **APPROVE** |
| Sports | 2026 Bowman Chrome Baseball Hobby Box (6 Packs)<br>`2026-bowman-chrome-baseball-hobby-box` | GC-043 | $399.92 | $574.95 | 30.4% | not tracked (sports) | no | 58 (in stock) | **APPROVE** |
| Sports | 2026 Topps Chrome Baseball Hobby Box (20 Packs)<br>`2026-topps-chrome-baseball-hobby-box` | GC-024 | $399.92 | $534.94 | 25.2% | not tracked (sports) | yes | 76 (in stock) | **APPROVE** |
| Sports | 2026 Topps Inception Football Hobby Box *(added)*<br>`2026-topps-inception-football-hobby-box` | GC-022 | $349.93 | $499.94 | 30.0% | not tracked (sports) | no | 54 (in stock) | **APPROVE** |
| Sports | 2025-26 Panini Prizm Basketball Hobby Box (12 Packs)<br>`2025-26-panini-prizm-basketball-hobby-box` | GC-046 | $199.96 | $259.95 | 23.1% | not tracked (sports) | no | 46 (in stock) | **APPROVE** |
| Sports | 2026-27 Topps Flagship Basketball Hobby Box (20 Packs) *(added)*<br>`2026-27-topps-flagship-basketball-hobby-box` | GC-020 | $149.97 | $209.94 | 28.6% | not tracked (sports) | no | 59 (in stock) | **APPROVE** |
| Sports | 2026 Bowman Chrome Baseball Mega Box (6 Packs)<br>`2026-bowman-chrome-baseball-mega-box` | GC-129 | $49.99 | $97.90 | 48.9% | not tracked (sports) | no | 36 (in stock) | **HOLD** |
| Sports | 2026 Topps Series 1 Baseball Hobby Box (20 Packs)<br>`2026-topps-series-1-baseball-hobby-box` | GC-096 | $149.97 | $209.95 | 28.6% | not tracked (sports) | no | 102 (in stock) | **REPLACE** |
| Lorcana | Disney Lorcana Hyperia City Illumineer's Trove *(added)*<br>`disney-lorcana-hyperia-city-illumineers-trove` | GC-106 | $49.99 | $70.49 | 29.1% | not available | no | 52 (in stock) | **APPROVE** |
| Lorcana | Disney Lorcana Attack of the Vine! Illumineer's Trove *(added)*<br>`disney-lorcana-attack-of-the-vine-illumineers-trove` | GC-105 | $49.99 | $84.46 | 40.8% | not available | no | 50 (in stock) | **APPROVE** |
| Lorcana | Disney Lorcana Attack of the Vine! Booster Display Box (24 Packs)<br>`disney-lorcana-attack-of-the-vine-booster-display-box` | GC-050 | $99.98 | $178.93 | 44.1% | 254, falling | no | 65 (in stock) | **HOLD** |
| Lorcana | Disney Lorcana Hyperia City Booster Display Box (24 Packs)<br>`disney-lorcana-hyperia-city-booster-display-box` | GC-051 | $99.98 | $127.94 | 21.9% | 2240, falling | no | 50 (in stock) | **HOLD** |
| Lorcana | Disney Lorcana Winterspell Illumineer's Trove<br>`disney-lorcana-winterspell-illumineers-trove` | GC-131 | $49.99 | $97.99 | 49.0% | not available | no | 23 (in stock) | **HOLD** |
| Lorcana | Disney Lorcana Wilds Unknown Illumineer's Trove<br>`disney-lorcana-wilds-unknown-illumineers-trove` | GC-130 | $49.99 | $100.99 | 50.5% | not available | no | 20 (in stock) | **HOLD** |

Full data per row (competitor source, research date, today's TCGplayer market and low, MSRP, price as % of MSRP, tier, reason): **`docs/gogetcards-ads-selection-2026-11-07.csv`**.

### Every decision, with its reason

| Product | Decision | Why |
|---|---|---|
| Pokémon TCG 30th Celebration Booster Bundle Case | APPROVE | 26.8% under the lowest credible delivered case price; 104 cases sold on TCGplayer in 30 days with a flat trend, the only case with steady demand. One unit per order (line cap). Launch gate: confirm the 45 cases are physically on hand and the boxed shipping cost. |
| Pokémon TCG Phantasmal Flames Booster Box | APPROVE | 32.4% under; TCGplayer market $386.61 today; 107 sold/30d, flat (a mature, out-of-allocation set). Price is above MSRP, so the margin is plausible. |
| Pokémon TCG 30th Celebration Pokémon Center Elite Trainer Box | APPROVE | 25.9% under; TCGplayer low today $272, market $256; 282 sold/30d. Correct PC-exclusive GTIN 196214158818 (the regular ETB is …801). Pokémon Center exclusive, so stock must be secondary-sourced: confirm the source. |
| Pokémon TCG Delta Reign Booster Box (36 Packs) | APPROVE | ADDED. Released Nov 6; 2,982 sold/30d; 31.8% under (TCGplayer low $201.90 today); 93% of MSRP, so the margin is plausible. The current set, where Pokémon search demand is concentrated now. |
| Pokémon TCG 30th Celebration Booster Bundle | APPROVE | The highest-demand item in the catalogue: 6,525 sold/30d, 280 live listings. 22.5% under the delivered low (today $67.49) and above the $26.94 MSRP, so the margin is plausible. Best $49.99 multi-unit test. |
| Pokémon TCG Pitch Black Elite Trainer Box (9 Packs) | APPROVE | 31% under; priced at the $49.99 MSRP, so the margin is plausible; 597 sold/30d, 226 listings. $49.99 test. |
| Pokémon TCG Delta Reign Elite Trainer Box (9 Packs) | APPROVE | ADDED. Released Nov 6 (release-week search peak); 3,331 sold/30d; 42% under the delivered low while priced at MSRP ($49.99), so the deep discount is a genuine retail price, not a loss. Stronger than the Binder on every criterion. |
| Pokémon TCG 30th Celebration Elite Trainer Box Case | HOLD | Price is fine (28.6% under) but the case market fell 29% in 30 days, so the advantage is eroding; $749.85 one-unit orders need proven conversion first. Add from the waiting list once the Bundle Case converts. |
| Pokémon TCG Chaos Rising Booster Box | HOLD | 45% under the market and 38% under the $161.64 MSRP. At $99.98 this is at or below typical distributor cost for a booster box, and above your own 25–40% band. Advertising it scales a probable loss, and deep below-MSRP pricing on a new Merchant Center account is a misrepresentation-review risk. Approve only once you confirm the landed cost. |
| Pokémon TCG Perfect Order Booster Box (36 Packs) | HOLD | 42% under the market, 38% under MSRP: same cost and trust risk as Chaos Rising. |
| Pokémon TCG Pitch Black Booster Box (36 Packs) | HOLD | 44% under the market, 38% under MSRP: same cost and trust risk as Chaos Rising. |
| Pokémon TCG 30th Celebration Binder Collection | REPLACE | 47% under a thin secondary market (11 listings today; no sales count available). The "market" is scarcity-inflated and MSRP is $31.99, so the advantage will not survive a retailer restock. Replaced by the Delta Reign ETB. |
| MTG The Hobbit Collector Booster Box (12 Packs) | APPROVE | 32.9% under (comp $596, medium confidence); 456 sold/30d. The market fell 19% in 30 days, so re-check the advantage weekly. |
| MTG Marvel Super Heroes Collector Booster Box (12 Packs) | APPROVE | 33.3% under; 82 sold/30d (modest, flat). A crossover brand with broader search demand than Strixhaven. Low bid. |
| MTG Star Trek Collector Booster Box (12 Packs) | APPROVE | ADDED. 28.6% under; 1,781 pre-sold on TCGplayer in 30 days; releases Nov 13, so the first launch weeks coincide with peak release search. Preorder until Nov 13, then in stock automatically: stock must actually arrive by then. |
| MTG Reality Fracture Collector Booster Display (12 Packs) | APPROVE | 33.3% under; 1,154 sold/30d, the strongest MTG collector demand. The market is falling 16%, so watch the advantage. |
| MTG The Hobbit Play Booster Box (30 Packs) | APPROVE | 23.1% under (just below your 25% target); 708 sold/30d. Margin likely thin at $99.98: confirm cost. |
| MTG Secrets of Strixhaven Play Booster Box (30 Packs) | APPROVE | 30.7% under; 204 sold/30d; TCGplayer market is the only MTG one rising (+2%). Margin likely thin: confirm cost. |
| MTG Marvel Super Heroes Gift Bundle | APPROVE | 33.3% under (TCGplayer low $69.80 today); 44 listings, no sales count. MTG $49.99 multi-unit test; margin unverified. |
| MTG Reality Fracture Draft Night | HOLD | 40.5% under: past the top of your 25–40% band, with an unknown MSRP, so the cost is unverified. Approve on cost confirmation. |
| MTG Secrets of Strixhaven Collector Booster Box (12 Packs) | REPLACE | 33.3% under but only 82 sold/30d on a set from April. Replaced by the Star Trek Collector Booster Box (1,781 pre-sold, releases Nov 13). |
| MTG Lorwyn Eclipsed Play Booster Box (30 Packs) | REJECT | The title, description, specs and feed are now consistent (30 packs, verified live). But $49.99 for a 30-pack Play Booster display is 51% under the $101.42 delivered low and roughly half of normal wholesale for that box. Every unit sold probably loses money, and multi-unit orders multiply the loss. Do not advertise. Review the price (not changed by me). |
| One Piece Card Game OP-13 Carrying On His Will Booster Box (English, 24 packs) | APPROVE | 35.2% under; 112 sold/30d; out-of-print set with no reprint found, so demand is steady. |
| One Piece Card Game OP-17 The World's Strongest Warriors Booster Box (English, 24 packs) | APPROVE | 32.2% under; 526 sold/30d, the only One Piece market rising. Already in Merchant Center. |
| One Piece Card Game EB-03 One Piece Heroines Edition Booster Box (English, 24 packs) | APPROVE | 28.8% under; 129 sold/30d. Shares the "Heroines" search demand with EB-05. |
| One Piece Card Game OP-16 The Time of Battle Booster Box – English Edition (24 Packs) | APPROVE | 28.6% under (TCGplayer low $207.49 today); 207 sold/30d. Correctly a single 24-pack box now (multipack 1, single image). |
| One Piece Card Game EB-05 One Piece Heroines Edition Vol. 2 Booster Box (English, 24 packs) | APPROVE | 2,087 sold/30d, the strongest One Piece product. 31% under even today's fallen TCGplayer low ($218.02). |
| One Piece Card Game OP-18 The Dominance of God Booster Box (English, 24 packs) | APPROVE | ADDED. Dated preorder (Nov 20, feed availability_date set); 37.5% under; 260 pre-sold/30d. Already in Merchant Center. Bid in its own preorder group; it moves to in-stock on release day by itself. |
| One Piece TCG OP-16 The Time of Battle Factory Sealed Master Case (12 Booster Boxes) – English Edition | HOLD | Not proposed, and correctly so. The $1,199.76 line cap forces $99.98 a box, cheaper than our own single box ($149.97) and 47% under the case market. Cost risk, unverified case demand, 9 in stock. |
| One Piece Card Game OP-15 Adventure on Kami's Island Booster Box (English, 24 packs) | HOLD | 38.3% under, but only 74 sold/30d on a set from April. The weakest demand of the six. Moved to the waiting list for OP-18. |
| 2026 Topps Cosmic Chrome Baseball Hobby Box (20 Packs) | APPROVE | ADDED. Released Nov 4; 26.3% under (comp $949.99, high confidence). High-ticket test (one unit per order). |
| 2025 Panini Prizm NFL Football Hobby Box (12 Packs) | APPROVE | 30.1% under (comp $929.95, high confidence), with football in season. Earlier research found conflicting dealer prices ($375–$1,000): re-check the comp before raising the bid. |
| 2026 Bowman Chrome Baseball Hobby Box (6 Packs) | APPROVE | 30.4% under (comp $574.95, high confidence); a prospect-driven flagship hobby product. No TCGplayer data for sports. |
| 2026 Topps Chrome Baseball Hobby Box (20 Packs) | APPROVE | 25.2% under (comp $534.94, high confidence); already in Merchant Center. |
| 2026 Topps Inception Football Hobby Box | APPROVE | ADDED. Released Nov 6, Topps direct sold out; 30% under (comp $499.94, high confidence); football in season. |
| 2025-26 Panini Prizm Basketball Hobby Box (12 Packs) | APPROVE | 23.1% under (Midwest Cards $259.95; Panini direct $299.95); basketball in season. Just below your 25% target. |
| 2026-27 Topps Flagship Basketball Hobby Box (20 Packs) | APPROVE | ADDED. Released Nov 5; Topps' first flagship NBA release (strong hobby coverage); 28.6% under (comp $209.94, high confidence). |
| 2026 Bowman Chrome Baseball Mega Box (6 Packs) | HOLD | 48.9% under: past your 40% band, below the usual mega-box retail price, with the cost unverified. Also, a $49.99 retail-format box mostly competes with big-box retail. Approve on cost confirmation. |
| 2026 Topps Series 1 Baseball Hobby Box (20 Packs) | REPLACE | 28.6% under, but a February release with prices drifting down and medium demand. Replaced by 2026-27 Topps Flagship Basketball Hobby at the same $149.97. |
| Disney Lorcana Hyperia City Illumineer's Trove | APPROVE | ADDED (phase 2). Current set (Oct 23) with the strongest Lorcana demand; at the $49.99 MSRP; 29% under the delivered low; 47 listings. |
| Disney Lorcana Attack of the Vine! Illumineer's Trove | APPROVE | ADDED (phase 2). At the $49.99 MSRP; 40.8% under ($84.46 low); 34 listings. |
| Disney Lorcana Attack of the Vine! Booster Display Box (24 Packs) | HOLD | 44% under the market and 30% under the $143.76 MSRP: probable below-cost pricing. Approve on cost confirmation. |
| Disney Lorcana Hyperia City Booster Display Box (24 Packs) | HOLD | 2,240 sold/30d, so the demand is real. But $99.98 is 70% of the $143.76 MSRP, about distributor cost, and only 20–22% under the market. Approve once the cost shows a positive margin. |
| Disney Lorcana Winterspell Illumineer's Trove | HOLD | At MSRP, but an out-of-print February set with 15 listings and no sales count. Sourcing at wholesale is doubtful now and demand is unverified. |
| Disney Lorcana Wilds Unknown Illumineer's Trove | HOLD | Same as Winterspell: an older May set, 23 listings, no sales count. |

---

## REPORT B: ChatGPT's recommendations against the evidence

**Agree**
- **Separate Standard Shopping campaigns by category.** Right for a new account with no conversion history: you get transparent search terms, per-category budgets, and no Performance Max black box. Keep Performance Max out until there are 30+ conversions a month per campaign.
- **Booster boxes over loose packs for One Piece.** Right, and stronger than stated. The catalogue's loose packs are $49.99 against a $7–$12 market (the $49.99 ladder floor). They must never be advertised.
- **Not advertising the OP-16 Master Case.** Right, for a reason not mentioned: the $1,199.76 line cap forces it to $99.98 a box, cheaper than our own single box and 47% under the case market.
- **Including some $49.99 products.** Right to test, not to exclude by reflex. But only where the price plausibly covers cost (see below).
- **Most box choices in One Piece, the MTG collector boxes, and the sports hobby boxes.**

**Disagree**
- **35 is not the right number.** Twelve of the 35 fail on cost, demand or competitiveness. 29 is the list that passes.
- **Three Pokémon booster boxes at $99.98** (Chaos Rising, Perfect Order, Pitch Black) are 38% under the $161.64 MSRP and 42–45% under the market. They are the "best deals" in the list, but almost certainly at or below acquisition cost. HOLD until you confirm the landed cost.
- **Lorwyn Eclipsed Play Booster Box at $49.99** is about half of normal wholesale for a 30-pack display (51% under the $101.42 delivered low). REJECT for ads. Separately, the title / description / specs inconsistency the brief asked about is fixed and verified live: all say 30 packs, which is correct for 2025+ Play Booster displays.
- **30th Celebration Binder Collection.** Its 47% "advantage" is measured against a scarcity-inflated market of 11 listings, with a $31.99 MSRP. REPLACED by the Delta Reign ETB (3,331 sold, priced at MSRP, released yesterday).
- **Secrets of Strixhaven Collector Box** (82 sold/30d, April set) → REPLACED by the **Star Trek Collector Booster Box** (1,781 pre-sold, releases Nov 13).
- **Topps Series 1 Hobby** (February release, prices drifting down) → REPLACED by **2026-27 Topps Flagship Basketball Hobby** (released Nov 5, same $149.97).
- **OP-15** (74 sold/30d) → HOLD; **OP-18** (dated Nov 20 preorder, 260 pre-sold) added.
- **Lorcana as a $20/day launch campaign.** $20/day buys roughly 25–40 clicks a day, about 10 orders a month at a 1–1.5% conversion rate. That's too few to judge, and both displays are priced at about distributor cost. Launch Lorcana in **phase 2**.
- **Category-level CPC ceilings** ($0.80–$1.20). Profitability is set by order value, not category: one $1.20 bid is ~8× over break-even on a $49.99 item and under it on a $649.87 one. Bid by **price tier** inside each category (Report C).

**Products I added:** Delta Reign Booster Box and Delta Reign ETB (released Nov 6), Star Trek Collector Booster Box (Nov 13), OP-18 Booster Box (Nov 20 preorder), 2026-27 Topps Flagship Basketball Hobby, 2026 Topps Inception Football Hobby, 2026 Topps Cosmic Chrome Baseball Hobby, and the Hyperia City and Attack of the Vine Illumineer's Troves (phase 2). The pattern: products in their release window, where exact-product search demand peaks, priced at or above MSRP so the discount against the secondary market is a genuine retail price rather than a loss.

**Strongest opportunity: One Piece.** All six boxes are 28–38% under liquid markets (EB-05 sold 2,087 in 30 days), every price is above Bandai MSRP so the margin is plausible, a release (OP-18) falls inside the test window, and the big-box Shopping competition is thinner than Pokémon's. This is an inference from marketplace data, not from Google auction data.

**Cheapest profitable acquisition, likely: sports hobby boxes, per order.** Five of seven are $349.93–$699.86, with 25–30% advantages against named hobby retailers (high-confidence comps). Break-even cost per click scales with order value, and the competing advertisers are a few specialist hobby stores, not Walmart, Target, GameStop and TCGplayer together. Pokémon has by far the most search demand but the most crowded auctions, and its highest-demand items are $49.99.

### The $49.99 multi-unit hypothesis

**Historical evidence:** none available to me. Export orders from the admin (units per order by product) and I'll compute the real distribution.

**What the code allows:**
- Same-product quantity only, up to 24 × $49.99.
- Every extra unit costs exactly another $49.99 (the plan ladder has no volume discount, so there's no price incentive to buy more).
- A customer arriving on a $49.99 product **cannot** add a second, different product to the same order. Any cross-sell has to become a second order, which the `new_customer` flag can measure.

**Break-even arithmetic.** CPA = cost per click ÷ conversion rate; break-even units per order = CPA ÷ ($49.99 × contribution margin).

| Margin before ads | CPC $0.30, CVR 1.5% → CPA $20 | CPC $0.50, CVR 1.5% → CPA $33 |
|---|---|---|
| 20% ($10.00 per unit) | needs **2.0** units/order | needs **3.3** units/order |
| 30% ($15.00 per unit) | needs **1.3** | needs **2.2** |

So a $49.99 product pays at Pokémon-auction CPCs only if buyers really take 2–3 units, or the margin is ≥30%. **Only $49.99 items priced at or above MSRP** are in the test (30th Booster Bundle, Pitch Black ETB, Delta Reign ETB, the two Troves), plus one with no MSRP to check (Marvel Gift Bundle). Those are the only ones where a 20–30% margin is plausible.

**How the test is measured.** Every product carries `custom_label_3` (price tier) and the conversion now sends **cart data** (offer ID, quantity, unit price). In Google Ads, compare `price_049` against the other tiers inside each campaign on: units per order (**Reports → Conversions with cart data**), AOV, CPA, and **contribution after ad cost per click**, which is the deciding metric.

**Decision rule.** After a `price_049` group reaches **300 clicks or 15 orders**, whichever comes first:
- keep it if measured units per order ≥ the break-even from the table at your real margin;
- otherwise cut its bid 30% and re-measure once;
- pause it if it still fails.

Do not judge it on ROAS alone. A $49.99 group can show a good ROAS and still lose money if the margin is thin.

---

## REPORT C: Budget allocation

| Campaign | Proposed | **Recommended at launch** | Why |
|---|---:|---:|---|
| Pokémon | $200 | **$150** | Largest demand, but 3 of its 10 proposed products are held for probable below-cost pricing, the 30th ETB isn't competitive (4.7%), and its strongest-demand items are $49.99, with the lowest break-even CPC. Still the largest single budget. |
| MTG | $140 | **$100** | 2 of 9 out (Lorwyn reject, Draft Night hold). Collector-box markets are falling 16–19%, eroding the advantage. The play boxes are $99.98, near cost. |
| One Piece | $80 | **$100** | Six boxes 28–38% under liquid markets, all above MSRP, OP-18 release in the window, thinner big-box competition. |
| Sports | $60 | **$125** | Highest AOV ($149.97–$699.86), high-confidence 23–30% advantages over named hobby retailers, football and basketball in season, three releases this week. Highest break-even CPC per click. |
| Lorcana | $20 | **$0 at launch → $25 in phase 2** | Too small to read at $20/day. Both displays are held for cost. Starts once tracking is proven, with the two Troves (plus the Hyperia display if its cost clears). |
| Reserve | — | **$25** | Unassigned. After 7 days, move it to the campaign with the best contribution per click. |
| **Total** | **$500** | **$500** | |

**Starting bids (Manual CPC, by price tier, set as product-group subdivisions on `custom_label_3`):**

| Tier (`custom_label_3`) | Products | Starting max CPC | Break-even CPC at 20% margin |
|---|---|---:|---|
| `price_049` | $49.99 | **$0.20** | $0.15 at 1 unit/order, $0.30 at 2 (CVR 1.5%) |
| `price_050_199` | $99.98–$199.96 | **$0.35** (MTG/Sports $0.40) | $0.30–$0.60 |
| `price_200_449` | $249.95–$399.92 | **$0.60** | $0.75–$1.35 |
| `price_450_plus` | $649.87–$1,199.76 | **$0.90** | $1.30–$2.40 (CVR assumed 1.0% at this ticket) |
| any tier, `custom_label_4 = preorder` | Star Trek CBB, OP-18 | **×0.8** of its tier | Revenue is delayed, cancellations are possible |

**How the bids were set.** Max CPC = contribution per order × conversion rate. 20% margin and a 1.5% conversion rate are **assumptions** (no cost or conversion data exists); a 1.0% rate is assumed at $450+. Replace both with your real numbers the day you have them. Bids start at ~50–70% of break-even and climb, because a new account with no history should start low and earn its way up.

**Break-even ROAS = 1 ÷ contribution margin.** At 15% that's 6.7; at 20%, 5.0; at 30%, 3.3. Set the target only from your real cost.

**Evaluation framework (weekly, per product group):**
1. Contribution after ads = Σ(order value × margin) − ad cost. **This is the decision metric, not ROAS.**
2. Raise a group's bid **+15%** when it's profitable and losing ≥20% impression share to rank. Cut **−20%** when its CPA is over break-even after ≥15 clicks per expected order.
3. Exclude a product (bid it at $0.01) after 2× its break-even CPA in spend with 0 orders.
4. Weekly search-term review → negatives.

**Negative keywords, all campaigns:** `japanese`, `korean`, `chinese`, `proxy`, `fake`, `custom`, `single card`, `singles`, `psa`, `graded`, `slab`, `code card`, `online code`, `ptcgo`, `live`, `price guide`, `value`, `worth`, `checklist`, `break`, `rip`, `opening`, `wallpaper`. Plus `pack` on box product groups where packs aren't sold, and `case` everywhere except the case product.

---

## REPORT D: Merchant Center submission status

**How submission works here.** Google fetches `https://gogetcards.com/feed/google.xml`. The Distribution channel is in **"selected"** mode: the live feed has 15 hand-picked items and 128 products are held back. I can't read Merchant Center, so **no product below is claimed approved**.

**What I changed (deployed):** in "selected" mode, any product tagged `ads-launch` is now always submitted, **in addition to** everything already selected. Nothing Google has already reviewed is removed. The admin button "Add the ads set (ads-launch) to Google" does the same visibly, and no longer unticks other products.

**What submits the 29:** importing `docs/gogetcards-ads-set-tags-2026-11-07.csv` (29 rows, `handle,tags`). It appends `ads-launch` to each product's existing tags and changes nothing else. Dry run through the real importer: **0 create, 29 update, 0 errors**. After import, the feed holds **38 items**: the 15 already there plus 23 new.

**Pre-submission validation** (each approved product run through the real validator and feed builder):
- **29/29 eligible, 0 errors.**
- Feed price equals live page price on all 29.
- All single units: no `multipack`, no composite pack image. The OP-16 box shows the single-box image.
- GTIN present on all 29.
- Availability: in stock, except Star Trek CBB (preorder, `availability_date` 2026-11-13) and OP-18 (2026-11-20).
- The two images from the second CDN (Delta Reign Booster Box, Star Trek CBB) are clean manufacturer renders with no overlays. Checked visually.

The remaining checks have to be done by you in Merchant Center: approval, the Shopping ads destination, policy diagnostics, crawled landing price and image.

| SKU / offer ID | Handle | Campaign label | Price tier label | Submitted price | Submitted availability | Feed status before your import | Merchant Center state |
|---|---|---|---|---:|---|---|---|
| GC-041 | `pokemon-tcg-30th-celebration-booster-bundle-case` | pokemon | price_450_plus | $1,199.76 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-015 | `pokemon-tcg-phantasmal-flames-booster-box` | pokemon | price_200_449 | $249.95 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-010 | `pokemon-tcg-30th-celebration-pokemon-center-elite-trainer-box` | pokemon | price_050_199 | $199.96 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-003 | `pokemon-tcg-delta-reign-booster-box` | pokemon | price_050_199 | $149.97 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-011 | `pokemon-tcg-30th-celebration-booster-bundle` | pokemon | price_049 | $49.99 | in_stock | **Already present** (hand-selected earlier) | Unverified: not readable from here |
| GC-073 | `pokemon-tcg-pitch-black-elite-trainer-box` | pokemon | price_049 | $49.99 | in_stock | **Already present** (hand-selected earlier) | Unverified: not readable from here |
| GC-031 | `pokemon-tcg-delta-reign-elite-trainer-box` | pokemon | price_049 | $49.99 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-023 | `mtg-the-hobbit-collector-booster-box` | mtg | price_200_449 | $399.92 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-037 | `mtg-marvel-super-heroes-collector-booster-box` | mtg | price_200_449 | $299.94 | in_stock | **Already present** (hand-selected earlier) | Unverified: not readable from here |
| GC-007 | `mtg-star-trek-collector-booster-box` | mtg | price_200_449 | $299.94 | preorder (date 2026-11-13) | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-004 | `mtg-reality-fracture-collector-booster-display` | mtg | price_200_449 | $249.95 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-032 | `mtg-the-hobbit-play-booster-box` | mtg | price_050_199 | $99.98 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-071 | `mtg-secrets-of-strixhaven-play-booster-box` | mtg | price_050_199 | $99.98 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-092 | `mtg-marvel-super-heroes-gift-bundle` | mtg | price_049 | $49.99 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-078 | `one-piece-card-game-op-13-carrying-on-his-will-booster-box-english-24-packs` | one_piece | price_200_449 | $249.95 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-005 | `one-piece-card-game-op-17-the-world-s-strongest-warriors-booster-box-english-24-packs` | one_piece | price_050_199 | $199.96 | in_stock | **Already present** (hand-selected earlier) | Unverified: not readable from here |
| GC-076 | `one-piece-card-game-eb-03-one-piece-heroines-edition-booster-box-english-24-packs` | one_piece | price_050_199 | $199.96 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-040 | `one-piece-card-game-op-16-the-time-of-battle-booster-box-english-24-packs` | one_piece | price_050_199 | $149.97 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-017 | `one-piece-card-game-eb-05-one-piece-heroines-edition-vol-2-booster-box-english-24-pac` | one_piece | price_050_199 | $149.97 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-008 | `one-piece-card-game-op-18-the-dominance-of-god-booster-box-english-24-packs` | one_piece | price_050_199 | $149.97 | preorder (date 2026-11-20) | **Already present** (hand-selected earlier) | Unverified: not readable from here |
| GC-019 | `2026-topps-cosmic-chrome-baseball-hobby-box` | sports | price_450_plus | $699.86 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-090 | `2025-panini-prizm-nfl-football-hobby-box` | sports | price_450_plus | $649.87 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-043 | `2026-bowman-chrome-baseball-hobby-box` | sports | price_200_449 | $399.92 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-024 | `2026-topps-chrome-baseball-hobby-box` | sports | price_200_449 | $399.92 | in_stock | **Already present** (hand-selected earlier) | Unverified: not readable from here |
| GC-022 | `2026-topps-inception-football-hobby-box` | sports | price_200_449 | $349.93 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-046 | `2025-26-panini-prizm-basketball-hobby-box` | sports | price_050_199 | $199.96 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-020 | `2026-27-topps-flagship-basketball-hobby-box` | sports | price_050_199 | $149.97 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-106 | `disney-lorcana-hyperia-city-illumineers-trove` | lorcana | price_049 | $49.99 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |
| GC-105 | `disney-lorcana-attack-of-the-vine-illumineers-trove` | lorcana | price_049 | $49.99 | in_stock | Not yet in feed: enters on import | Unverified: not readable from here |

**Already present (6):** GC-005, GC-008, GC-011, GC-024, GC-037, GC-073, with their existing offer IDs preserved.
**Enters on import (23):** the rest.
**Not submitted because of validation:** none of the 29.
**Held and rejected products:** deliberately not added. Those already in the feed (GC-039 OP-15, GC-151 OP-16 case) stay there as `catalog_only`.

**Last confirmed sync:** the live feed was fetched at 2026-11-07 (this session) with 15 items. Google's own fetch time and statuses are only visible in Merchant Center.

**In the feed today but worth your review** (I removed none; your call):

| SKU | Product | Issue |
|---|---|---|
| GC-052 | Reality Fracture Bundle | $49.99 is **11% above** the $44.99 competitor |
| GC-014 | Multiverse Reforged Commander Deck | $49.99 is **4% above** the $48.00 competitor |
| GC-119 | Marvel Jumpstart Booster Box | $49.99 is **48.5% under**, probably below cost |
| GC-151 | OP-16 Master Case | Cap-forced to $99.98 a box |

**Catalogue-wide (not in the feed, never advertise as priced):** single booster packs listed at $49.99 against a $7–$12 market (OP-15/16/17/18 packs, EB-05 pack, 30th Celebration pack), and items like the Poster Collection at $99.98 against $32.95. All of them come from the $49.99 minimum plan step. A $7 pack can't be sold below $49.99 through this checkout, so these should be sold as multi-pack listings or delisted. (No change made.)

---

## REPORT E: Google Ads campaign setup (to build paused)

I have no Google Ads access, so nothing was created. Build these exactly as written, **paused**:

| Setting | Value |
|---|---|
| Campaign names | `GGC – Shopping – Pokémon`, `GGC – Shopping – MTG`, `GGC – Shopping – One Piece`, `GGC – Shopping – Sports`, `GGC – Shopping – Lorcana` (created, left paused for phase 2) |
| Type | Standard Shopping (not Performance Max) |
| Merchant Center / feed | Your linked GMC account; country of sale **United States**; feed label **US** |
| Networks | Google Search only. **Untick Search partners** and **untick Display** for the test |
| Locations | United States, "Presence: people in or regularly in" |
| Budgets | $150 / $100 / $100 / $125 / $0 (Lorcana paused); $25 reserve not assigned |
| Bidding | **Manual CPC**. Move a campaign to **Target ROAS** only after ≥30 conversions in 30 days (Google's floor for Standard Shopping tROAS is 15; 30 makes it stable). Set the target at break-even ROAS × 1.2 |
| Campaign priority | All **Medium** (no overlap, so priorities don't matter) |
| Inventory filter | `custom_label_2 = <pokemon \| mtg \| one_piece \| sports \| lorcana>` |
| Product groups | All products → `custom_label_0`: **`ads_launch` (bid)** / **Everything else (Excluded)**. Inside `ads_launch` → `custom_label_3`: `price_049` / `price_050_199` / `price_200_449` / `price_450_plus` / everything else (excluded). Optionally subdivide each by `item ID` for product-level monitoring. Preorders: subdivide by `custom_label_4 = preorder` at ×0.8 |
| Included products | The APPROVE rows of Report A, per campaign |
| Excluded products | Everything not labelled `ads_launch`: the HOLD, REPLACE and REJECT rows and the other ~110 catalogue products. All are `catalog_only` |
| Labels in the feed | `custom_label_0` inclusion (`ads_launch` / `catalog_only`), `_1` single/multipack, `_2` campaign, `_3` price tier, `_4` availability. All derived in code except the one tag, so they can't be mistyped |
| Conversion action | "Purchase (website)": category Purchase, **value: use different values**, count **Every**, primary, click-through window 30 days, data-driven attribution. Use its ID and label for the env vars below |

### E5. Tracking: status and what's needed before the first dollar

**Verified in code:**
- The conversion fires only on the thank-you page, only for an order the signed partner callback created (`runThankYouPipeline`; HMAC + replay window), so **failed or unconfirmed payments never count**.
- `transaction_id` = order ID, plus a per-browser guard, so **reloads and repeat callbacks count once**.
- `value` = server-confirmed order total; `currency` = order currency.
- `+ztest` rehearsal orders are **suppressed** by design.
- `new_customer` is reported from account provisioning.

**Changed today (deployed):**
- The Ads conversion now carries **cart data** (`aw_merchant_id`, `aw_feed_country`, `aw_feed_language`, `items: [{id: <feed offer id>, quantity, price}]`) whenever `GOOGLE_MERCHANT_ID` is set.
- GA4 `item_id` now equals the feed offer ID (it was the URL slug, which matches nothing in Google's systems).
- The GA4 `purchase` is sent only to GA4, so it can't double up on the Ads tag.

**Not verified, and blocking:**
1. **The production env vars are unset.** The live homepage loads no Google tag. Set in Northflank: `GOOGLE_ADS_ID` (AW-…), `GOOGLE_ADS_PURCHASE_LABEL`, `GA4_MEASUREMENT_ID` (G-…), `GOOGLE_MERCHANT_ID` (digits).
2. **The consent gate is opt-in.** The Google tag (which is also the conversion linker) loads only after an explicit "Accept". A visitor who ignores the banner is never tagged, so their purchase can't be credited to the ad click. Expect a large under-count, and Smart Bidding will learn from it later. US law generally doesn't require opt-in. The usual setup is opt-out for US visitors, opt-in for the EU/UK, with Google Consent Mode v2. This is a privacy-policy decision, so I did **not** change it. Say the word and I'll implement it.
3. **No end-to-end test has been possible.** Test orders are suppressed by design, so the real test is **one genuine $49.99 purchase**, then a refund:
   - with Tag Assistant open, confirm `purchase` → `AW-…/label` carries the transaction ID, value 49.99, USD and `items[0].id` equal to the feed SKU;
   - confirm GA4 DebugView shows the same transaction ID;
   - confirm the conversion appears in Ads under **Goals → Conversions → diagnostics** within 24h;
   - then retract it with a conversion adjustment upload.
4. **GA4 referral attribution.** In GA4 Admin → Data streams → Configure tag settings → **List unwanted referrals**, add the partner payment host domains. Otherwise GA4 credits returning buyers to the payment host. (Ads attribution is unaffected: the click ID is a first-party cookie on gogetcards.com.)

---

## REPORT F: Technical implementation

**Files changed (commit on `main`, auto-deployed):**
- `services/distribution/feedBuilder.js`: new label scheme (`adLabels`, `priceTier`, `campaignOf`); `ads-launch` tag drives `custom_label_0`; superseded `launch-30` no longer read; selected mode always submits `ads-launch` products (additive).
- `services/distribution/providers/file.js`: emits `custom_label_2..4`.
- `routes/distribution.js`: "select launch" is now additive and uses `ads-launch`; `channel` is checked against an allowlist before it's used in a database field path (it was taken from the request body).
- `views/admin/distribution.ejs`: button and explanation updated.
- `server.js`: `GOOGLE_MERCHANT_ID` local (digits only).
- `routes/frontend.js`: thank-you looks up the feed offer ID (SKU) for the purchased product.
- `views/pages/thank-you.ejs`: cart data on the Ads conversion; GA4 purchase scoped to GA4 with the feed ID; per-browser guard on the Ads conversion.
- `test/adLabels.test.js` (new, 5 tests); `scripts/audit/check-feed.js` and `scripts/audit/check-routes.js` updated. The routes check had been failing before this change (the `variants` local wasn't mirrored); fixed.

**Data for you to import:** `docs/gogetcards-ads-set-tags-2026-11-07.csv` (29 rows). Then in Merchant Center, run **Feeds → your feed → Fetch now**.

**Database writes from here:** none (unreachable). **Prices changed:** none. **Free listings:** untouched.

**Checks:**
- `npm test` 68/68
- `npm run test:security` 30/30
- feed audit, route audit, module audit, page audit and claims audit: all pass
- every storefront template and all 71 admin view fixtures render
- the conversion snippet was rendered with a sample order: correct with cart data, correct without it, and nothing fires on a test order

**Remaining blockers, in order:**
1. Set the four tracking env vars.
2. Decide on the consent model.
3. Run one real purchase end to end.
4. Confirm landed cost on the 29, and physical stock on the high-ticket items: Bundle Case 45, Cosmic Chrome 69, Prizm NFL 48. These stock figures are hand-maintained and shown to shoppers.
5. Import the tags CSV and Fetch now.
6. Check each of the 29 in Merchant Center → Products for "Approved" on Shopping ads.
7. Build the campaigns paused, then authorise spend.

---

## Scaling: what $10,000/day requires

**Two hard limits.** At $500/day, $10k/day means **20× ROAS**, which is not a realistic Shopping outcome for a new store; 3–6× is the plausible range once optimised. And checkout caps every order at **one product, $1,199.76**.

Orders and spend needed for **$10,000/day revenue**:

| AOV | Orders/day | Clicks/day at 1.5% CVR | Spend at $0.50 CPC | ROAS | Spend at $0.80 CPC | ROAS |
|---:|---:|---:|---:|---:|---:|---:|
| $150 | 67 | 4,444 | $2,222 | 4.5 | $3,556 | 2.8 |
| $250 | 40 | 2,667 | $1,333 | 7.5 | $2,133 | 4.7 |
| $400 | 25 | 1,667 | $833 | 12.0 | $1,333 | 7.5 |

Break-even ROAS is 5.0 at a 20% margin. So $10k/day is **profitable** only with AOV ≳ $250, CPC ≲ $0.60 and a margin ≥ 20%. That means a high-ticket-heavy mix, roughly $1,300–$2,200/day of ad spend, and ~2,000–3,000 clicks a day. 29 products almost certainly can't supply that many clicks from exact-product searches. Getting there takes:
- a bigger qualified ad set (more products that pass these rules each week, especially new releases);
- inventory for ~1,000+ orders a month;
- eventually Performance Max on proven products.

These are scenarios, not forecasts.

**Scaling rules:**
- **Raise a budget** only when the campaign is limited by budget and its contribution after ads is positive over 7 days with ≥10 orders. Raise it **+20% at a time, no more than every 3–4 days**, to avoid resetting performance.
- **Winner:** ≥3 orders at a CPA under break-even. Give it its own `item ID` group and raise its bid +15%.
- **Pause a product:** 2× break-even CPA spent with 0 orders, or its price advantage falls under ~15% (re-check competitor prices weekly; several of these markets are falling 10–30% a month).
- **Move a product between bid groups:** automatic when its price changes (labels are derived).
- **Waiting list, add from it when** a slot frees up and its cost is confirmed: Chaos Rising, Perfect Order, Pitch Black boxes; Hyperia City and Attack of the Vine displays; ETB Case; OP-15; OP-12 ($199.96, 32% under); 2026-27 Flagship Basketball Jumbo ($299.94, 33% under).
- **$49.99 products are judged separately** on contribution per click with measured units per order (Report B), never pooled with high-ticket ROAS.
- **Automated bidding:** Target ROAS per campaign at ≥30 conversions/30 days, with conversion tracking verified and stable. Before that, Manual CPC.
- **New campaign:** split Sports by sport once any sport has ≥30 conversions/30 days. Add Performance Max only for proven products, running alongside Standard Shopping on a separate label, after 60 days.

---

## Is this the best strategy?

**Mostly yes, with my changes.** Category Standard Shopping, a curated ad set, price-tier bids and cart-data conversions are the right setup for a new account where you need control and clean data.

It is **not launch-ready today.** Purchase tracking isn't live and opt-in consent hides many buyers. Landed costs are unconfirmed, so margins, break-even CPCs and every bid above rest on assumptions.

The single most valuable thing you can send me is **landed cost per product, plus Whop's fee per order**. With that I can replace every assumption above with real break-even CPAs, ROAS targets and bids, and clear or reject the 12 holds (11 proposed + the OP-16 case).
