# GoGetCards — catalogue, pricing and launch-set audit, 2026-11-06

Scope: all 142 live products on https://gogetcards.com, the Google Merchant Center feed, the 30 products originally chosen for advertising (tag `launch-30`), and the campaign plan for a $500/day test.

Method, so every number in this document can be traced:

- **Live pages**: every product page fetched today as Googlebot after the latest deploy, parsed for title, price, pack line, availability, release date, specs, description, images, meta and Product JSON-LD (142/142 returned 200).
- **Feed**: the live `/feed/google.xml` (9 items today) and a simulation that runs the repository's own validators and XML writer over all 142 pages, i.e. what the feed will send once the selection is set to the full catalogue.
- **Market prices**: TCGplayer market price for TCG products (122) and the lowest in-stock price at a named sports-card retailer for Topps/Panini (20), collected 2026-11-05/06 and recorded per product with source URL and a confidence grade in `docs/gogetcards-reprice-review.csv`.
- **Identifiers**: three research passes over the 74 products without a GTIN, recording a barcode only where the exact digits were read on a named page (results in section A and the appendix).
- **Demand and competition**: a research pass over 60 candidates (the 30 plus the 30 strongest others) recording TCGplayer seller counts, price trend, big-box availability and recent news. These are proxies, labelled as such; no sales figures are invented anywhere in this report.
- **Code**: the storefront, feed builder, validators, order cap and preorder logic read directly, and changed where a fix was safe (section F).

What this report does not do: it does not change any selling price (section B recommends only), it does not claim or predict Merchant Center approval (section G distinguishes "ready" from "approved"), and it does not state a UPC, a specification or a demand number that was not read from a source.

Table of contents: A catalogue audit · B pricing audit · C evaluation of the original 30 · D revised shortlist · E campaign recommendations · F changes implemented · G launch decision · Appendix.

---

## A. Catalogue audit (142 products)

### A1. What the catalogue is

| | Count |
|---|---|
| Products live | 142 (MTG 51, Pokémon 42, One Piece 19, Topps 18, Lorcana 10, Panini 2) |
| Language | English, all 142 (stated on every page and in the feed's product details) |
| Sold as a pack (price = pack price, title "(Pack of N)") | 62 (N = 2: 20, 3: 21, 4: 5, 5: 5, 6: 5, 7: 5, 9: 1) |
| In stock | 105 |
| Preorder, release date still ahead | 20 (all 11–20 November 2026) |
| Preorder flag still set after the release date ("released, awaiting stock") | 17 (released 4–6 November) |
| Sold out / hidden | 0 |
| With a GTIN on the page and in the feed | 68 (all check-digit valid) |
| Without a GTIN | 74 (Pokémon 41, One Piece 18, MTG 15) |
| Main image on your own domain (self-hosted or composite) | 66; 76 still load from Shopify CDNs |
| Products with one photo only | 80 |
| Compare-at ("was") prices | 0 |

### A2. Findings by check

Each check was run on all 142 pages. "Pass" means every page passed.

| Check | Result | Detail |
|---|---|---|
| Title accurate (brand, set, configuration, pack) | Pass on accuracy; **139 could be stronger** | No title misstates the product. `docs/gogetcards-titles-review.csv` proposes adding the configuration ("– 36 Packs, 10 Cards Per Pack") to 139 titles, which is what Shopping shoppers search for; import when convenient. Pack products already end "(Pack of N)". |
| Brand / vendor | Pass | One of six publishers; feed sends the canonical brand name Google matches on |
| Set / year | Pass | A Set row on every page; sports titles carry the season (2025-26, 2026) |
| Product type / configuration row | Pass | Configuration present on 142/142. Six carried sourcing notes ("Giant lists … please verify") — fix CSV supplied, see F |
| Language | Pass | English, once per page (the duplicate row is gone) |
| Description | **6 to fix** | Same six products: description still carries research notes and a retailer name. Everything else is clean, 160–900 characters, no stale preorder/pack sentences |
| Release date | Pass | Every preorder has a real date; none > 1 year ahead; all dates are publisher dates recorded in the import worksheet |
| Availability consistency (page, card, JSON-LD, feed) | Pass | 105 InStock / 37 PreOrder in both page and schema; the feed sends the same, with `availability_date` = release date (future) or today + 2 business days (released, awaiting) |
| Released but still flagged preorder | **17 need your action** | The flag is correct only while stock is genuinely on its way. The moment stock lands, untick Preorder; the page flips to In Stock and the feed follows at the next fetch |
| GTIN / MPN | **74 missing** | See A3. Items without an identifier are eligible but rank behind matched competitors; Merchant Center shows them as "limited performance", not disapproved |
| Image count / quality | Acceptable; **80 single-photo** | Every product has a main image ≥ 1000 px on a white background; pack products show the composite. 76 images are on Shopify CDNs the store does not control (feed warns "info") |
| Condition | Pass | `new` on all |
| Price consistency (headline, JSON-LD, feed, cart) | Pass | Pack price everywhere for the 62 packs; unit price for singles; `unit_pricing_measure` sent for packs |
| Compare-at price | Pass | None used, so nothing to substantiate |
| Feed eligibility (simulated, all 142) | **0 errors**, 78 warnings | Warnings: 74 `gtin_missing`, 17 `preorder_awaiting_stock`; 76 info-level `image_third_party_host`. After this pass, 0 "configuration not recognised" |
| URL / canonical / meta / H1 / JSON-LD | Pass | Canonical = URL, meta 114–199 chars, one H1, Product schema with price, availability, brand, sku, image, gtin where known |
| Mobile | Pass (sampled) | Pack, preorder and sports pages at 390 px: no horizontal scroll; price, pack line and buy button in the first screen |
| Order cap ≤ $1,199.76 per line | Pass | Quantity cap = min(allocation, floor(1199.76 ÷ price)) on all 142; "Limit N per customer" text is in units |

### A3. Identifiers: what the research found

GTINs are not required by Google for this category, but a matched product gets the Shopping product card (reviews, price comparison) and out-ranks an unmatched one for the same item. The 74 products without a GTIN were researched product-by-product; a barcode is recorded only where the exact digits were read on a named page.

Of the 74: **70 barcodes found** (high confidence 41, medium 17, low 1, conflicting sources 12); **4 not found** on any page read. Every found barcode passes the check-digit test.

The per-product results, with source URL, confidence, and an import note, are in `docs/gogetcards-gtin-research.csv`. Import only the rows you are comfortable with (import handle + gtin; everything else is untouched). Three things to know before importing:

- **"Conflict" on the 11 MTG decks and scene boxes is not doubt about the digits.** Wizards issues two valid codes for these: one per deck (seen on Amazon product pages) and one "assorted" code shared by every deck in the line (seen at distributors). The CSV carries the per-deck code, which is the right one for a listing that sells one named deck; the shared code is in the notes. Use the shared one only if your stock comes through a distributor who labels it that way.
- **Shared codes.** Seven pairs or sets of your products are genuinely sold under one barcode (UPC Day/Night, Espeon/Umbreon Battle Decks, Mew/Mewtwo Figure Collections, both ex Tin versions, the Collector's Edition Star Trek decks). Six of those sets are already variant-grouped on the site, so the feed sends `item_group_id` and Google accepts the shared code. **The Greninja ex Box and Sylveon ex Box are not grouped**: import the code for one of them only, or group them first, or Google suppresses one as a duplicate offer. The CSV says which rows this applies to.
- **"None"** (3 products: the 30th single booster pack, the Classic Collection pack that is only sold inside the UPC, the Delta Reign Pokémon Center ETB) and **"low"** (Pitch Black Pokémon Center ETB, seen only in a search snippet) have no code in the file.

### A4. Per-product table

Columns: Brand · live title · Set · Type · Language · Configuration (as shown) · Release · Availability (live) · GTIN · image count · Price · Pack · Feed · Action needed · handle. "OK" in Action means nothing to do for that product beyond the catalogue-wide items above.

| Brand | Title (live) | Set | Type | Lang | Configuration | Release | Availability (live) | GTIN | Imgs | Price | Pack | Feed | Action | Handle |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Lorcana | Disney Lorcana Attack of the Vine! Booster Display Box | Attack of the Vine! | Booster Box | English | Configuration: 24 booster packs per display; 12 cards per pack. 4 displays per case | — | In Stock | 4050368900425 | 1 | $149.97 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | disney-lorcana-attack-of-the-vine-booster-display-box |
| Lorcana | Disney Lorcana Attack of the Vine! Illumineers Trove (Pack of 2) | Attack of the Vine! | Illumineer’s Trove | English | Configuration: 8 booster packs (12 cards each), storage box, 6 card dividers, 6 damage-counter dice, lore counter (standard Trove configuration; one blog describes it differently, so verify on the box) | — | In Stock | 4050368900579 | 3 | $149.97 | 2 | eligible | research notes in description; title: add configuration | disney-lorcana-attack-of-the-vine-illumineers-trove |
| Lorcana | Disney Lorcana Attack of the Vine! Prerelease Box | Attack of the Vine! | Prerelease Box | English | Configuration: 6 Attack of the Vine! booster packs, 1 promo card, 4 damage-counter dice, paper deck box, rules pamphlet | — | In Stock | 4050368900883 | 1 | $49.99 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | disney-lorcana-attack-of-the-vine-prerelease-box |
| Lorcana | Disney Lorcana Hyperia City Booster Display Box (Pack of 2) | Hyperia City | Booster Box | English | Configuration: 24 booster packs per display; 12 cards per pack. 4 displays per case | — | In Stock | 4050368900982 | 3 | $249.95 | 2 | eligible | title: add configuration | disney-lorcana-hyperia-city-booster-display-box |
| Lorcana | Disney Lorcana Hyperia City Illumineers Trove | Hyperia City | Illumineer’s Trove | English | Configuration: 8 booster packs, storage box, 6 card dividers, 6 damage-counter dice, lore counter (ICv2) | — | In Stock | 4050368901132 | 1 | $49.99 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | disney-lorcana-hyperia-city-illumineers-trove |
| Lorcana | Disney Lorcana Hyperia City Prerelease Box (Pack of 3) | Hyperia City | Prerelease Box | English | Configuration: 6 Hyperia City booster packs, 1 random promo card, 4 damage-counter dice, paper deck box (Miniature Market; contents subject to change). Smoke & Mirrors also lists a Hyperia City map and a rules pamphlet | — | In Stock | 4050368901170 | 3 | $99.98 | 3 | eligible | research notes in description; title: add configuration | disney-lorcana-hyperia-city-prerelease-box |
| Lorcana | Disney Lorcana Wilds Unknown Booster Display Box | Wilds Unknown | Booster Box | English | Configuration: 24 booster packs per display; 12 cards per pack. 4 displays per case | — | In Stock | 4050368988874 | 1 | $199.96 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | disney-lorcana-wilds-unknown-booster-display-box |
| Lorcana | Disney Lorcana Wilds Unknown Illumineers Trove (Pack of 3) | Wilds Unknown | Illumineer’s Trove | English | Configuration: 8 booster packs, storage box, card dividers, 6 themed damage-counter dice (standard Trove configuration) | — | In Stock | 4050368988645 | 3 | $249.95 | 3 | eligible | title: add configuration | disney-lorcana-wilds-unknown-illumineers-trove |
| Lorcana | Disney Lorcana Winterspell Booster Display Box | Winterspell | Booster Box | English | Configuration: 24 booster packs per display; 12 cards per pack (6 commons, 3 uncommons, 2 rare+, 1 foil). 4 displays per case | — | In Stock | 4050368988812 | 1 | $199.96 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | disney-lorcana-winterspell-booster-display-box |
| Lorcana | Disney Lorcana Winterspell Illumineers Trove (Pack of 2) | Winterspell | Illumineer’s Trove | English | Configuration: 8 booster packs (12 cards each), storage box, 6 card dividers, 6 damage-counter dice, lore counter | — | In Stock | 4050368988409 | 3 | $149.97 | 2 | eligible | title: add configuration | disney-lorcana-winterspell-illumineers-trove |
| MTG | MTG Lorwyn Eclipsed Bundle | Lorwyn Eclipsed | Bundle | English | Configuration: 9 Play Boosters, 1 traditional foil Kinbinding promo, 30 basic lands (15 traditional foil, 15 non-foil), 2 reference cards, 1 spindown, 1 card-storage box | — | In Stock | 195166306292 | 1 | $49.99 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | mtg-lorwyn-eclipsed-bundle |
| MTG | MTG Lorwyn Eclipsed Collector Booster Box | Lorwyn Eclipsed | Collector Booster Box | English | Configuration: 12 Collector Boosters per box, 15 cards per pack | — | In Stock | 195166305356 | 1 | $349.93 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | mtg-lorwyn-eclipsed-collector-booster-box |
| MTG | MTG Lorwyn Eclipsed Draft Night (Pack of 2) | Lorwyn Eclipsed | Draft Night Box | English | Configuration: 12 Play Boosters, 1 Collector Booster, 90 non-foil basic lands, 10 non-foil double-sided tokens, 1 draft insert | — | In Stock | 195166305479 | 3 | $149.97 | 2 | eligible | title: add configuration | mtg-lorwyn-eclipsed-draft-night |
| MTG | MTG Lorwyn Eclipsed Play Booster Box (Pack of 3) | Lorwyn Eclipsed | Play Booster Box | English | Configuration: 30 Play Boosters per box, 14 cards per pack | — | In Stock | 195166305325 | 3 | $249.95 | 3 | eligible | title: add configuration | mtg-lorwyn-eclipsed-play-booster-box |
| MTG | MTG Marvel Super Heroes Bundle (Pack of 5) | Marvel Super Heroes | Bundle | English | Configuration: 9 Play Boosters, 15 traditional foil + 15 non-foil basic lands (incl. full-art city chaos), 2 reference cards, 1 traditional foil The Scarlet Witch promo, oversized spindown, card-storage box | — | In Stock | 195166315386 | 3 | $149.97 | 5 | eligible | title: add configuration | mtg-marvel-super-heroes-bundle |
| MTG | MTG Marvel Super Heroes Collector Booster Box | Marvel Super Heroes | Collector Booster Box | English | Configuration: 12 Collector Booster packs per box | — | In Stock | 195166314075 | 1 | $399.92 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | mtg-marvel-super-heroes-collector-booster-box |
| MTG | MTG Marvel Super Heroes Draft Night (Pack of 2) | Marvel Super Heroes | Draft Night Box | English | Configuration: 12 Play Boosters, 1 Collector Booster, 90 non-foil basic lands, 10 non-foil double-sided tokens, 1 draft insert | — | In Stock | 195166313139 | 3 | $149.97 | 2 | eligible | title: add configuration | mtg-marvel-super-heroes-draft-night |
| MTG | MTG Marvel Super Heroes Gift Bundle (Pack of 3) | Marvel Super Heroes | Gift Bundle | English | Configuration: 9 Play Boosters, 1 Collector Booster, 15 traditional foil + 15 non-foil basic lands (incl. full-art city calm), 2 reference cards, 1 traditional foil Daredevil, Man Without Fear promo, oversized spindown, card-storage box | — | In Stock | 195166315423 | 3 | $199.96 | 3 | eligible | title: add configuration | mtg-marvel-super-heroes-gift-bundle |
| MTG | MTG Marvel Super Heroes Jumpstart Booster Box (Pack of 2) | Marvel Super Heroes | Jumpstart Booster Box | English | Configuration: 24 Jumpstart Boosters per box, 20 cards per pack (51 possible themes; each pack has at least 1 new-to-Magic card and 1 full-art basic land) | — | In Stock | 195166313269 | 3 | $149.97 | 2 | eligible | title: add configuration | mtg-marvel-super-heroes-jumpstart-booster-box |
| MTG | MTG Marvel Super Heroes Play Booster Box | Marvel Super Heroes | Play Booster Box | English | Configuration: 30 Play Booster packs per box, 14 cards per pack | — | In Stock | 195166313603 | 1 | $99.98 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | mtg-marvel-super-heroes-play-booster-box |
| MTG | MTG Reality Fracture Bundle (Pack of 4) | Reality Fracture | Bundle | English | Configuration: Bundle | — | In Stock | 195166337173 | 3 | $149.97 | 4 | eligible | title: add configuration | mtg-reality-fracture-bundle |
| MTG | MTG Reality Fracture Collector Booster Display | Reality Fracture | Collector Booster Box | English | Configuration: 12 Collector Booster packs per box | — | In Stock | 195166337104 | 1 | $349.93 | 1 | eligible | 1 image; title: add configuration | mtg-reality-fracture-collector-booster-display |
| MTG | MTG Reality Fracture Draft Night (Pack of 3) | Reality Fracture | Draft Night Box | English | Configuration: 12 Reality Fracture Play Boosters, 1 Collector Booster, 90 lands, 10 double-sided tokens; Pick-Two Draft kit for 4 players (Stomping Grounds TCG) | — | In Stock | 195166337197 | 3 | $199.96 | 3 | eligible | title: add configuration | mtg-reality-fracture-draft-night |
| MTG | MTG Reality Fracture Multiverse Reforged Commander Deck (Pack of 4) | Reality Fracture | Commander Deck | English | Configuration: 100-card ready-to-play Commander deck, 18 new-to-Magic cards incl. 2 traditional foil mythic rares, 10 double-sided tokens, deck box, strategy insert, reference card (Stomping Grounds TCG) | — | In Stock | 195166337265 | 3 | $149.97 | 4 | eligible | title: add configuration | mtg-reality-fracture-multiverse-reforged-commander-deck |
| MTG | MTG Reality Fracture Play Booster Box | Reality Fracture | Play Booster Box | English | Configuration: 30 Play Booster packs per box, 14 cards per pack | — | In Stock | 195166336800 | 1 | $99.98 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | mtg-reality-fracture-play-booster-box |
| MTG | MTG Reality Fracture Prerelease Pack (Pack of 2) | Reality Fracture | Prerelease Pack | English | Configuration: 6 Play Boosters, 1 traditional foil promo card, 1 deck box, 1 spindown die | — | In Stock | 195166337241 | 3 | $49.99 | 2 | eligible | title: add configuration | mtg-reality-fracture-prerelease-pack |
| MTG | MTG Reality Fracture Secret Lair Bundle (Pack of 2) | Reality Fracture | Premium Bundle | English | Configuration: Collector Boosters + Play Boosters, 2 of 10 possible Secret Lair mythic rares, borderless basic lands, exclusive Spindown die, deck box (Shop of Magic). Listings commonly cite 6 Play + 2 Collector Boosters and 20 foil borderless lands, but counts vary | — | In Stock | 195166337210 | 3 | $249.95 | 2 | eligible | research notes in description; title: add configuration | mtg-reality-fracture-secret-lair-bundle |
| MTG | MTG Secrets of Strixhaven Bundle (Pack of 3) | Secrets of Strixhaven | Bundle | English | Configuration: 9 Play Boosters, 1 traditional foil Wisdom of Ages promo, 30 basic lands (15 traditional foil, 15 non-foil), 2 reference cards, 1 spindown, 1 card-storage box | — | In Stock | 195166318073 | 3 | $99.98 | 3 | eligible | title: add configuration | mtg-secrets-of-strixhaven-bundle |
| MTG | MTG Secrets of Strixhaven Codex Bundle | Secrets of Strixhaven | Bundle | English | Configuration: 6 Play Boosters, 2 Collector Boosters, 20 traditional foil basic lands, 2 traditional foil Codex Bundle promos, 2 reference cards, oversized spindown, card-storage box | — | In Stock | 195166318097 | 1 | $99.98 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | mtg-secrets-of-strixhaven-codex-bundle |
| MTG | MTG Secrets of Strixhaven Collector Booster Box | Secrets of Strixhaven | Collector Booster Box | English | Configuration: 12 Collector Booster packs per box | — | In Stock | 195166317311 | 1 | $449.91 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | mtg-secrets-of-strixhaven-collector-booster-box |
| MTG | MTG Secrets of Strixhaven Commander Deck [Lorehold Spirit] (Pack of 3) | Secrets of Strixhaven | Commander Deck | English | Configuration: 1 ready-to-play 100-card Commander deck: 1 traditional foil face commander (borderless), 1 traditional foil featured commander (borderless), 98 non-foil cards incl. new-to-Magic cards, double-sided tokens, deck box | — | In Stock | — | 3 | $99.98 | 3 | eligible | no GTIN; title: add configuration | mtg-secrets-of-strixhaven-commander-deck-lorehold-spirit |
| MTG | MTG Secrets of Strixhaven Commander Deck [Prismari Artistry] (Pack of 3) | Secrets of Strixhaven | Commander Deck | English | Configuration: 1 ready-to-play 100-card Commander deck: 1 traditional foil face commander (borderless), 1 traditional foil featured commander (borderless), 98 non-foil cards incl. new-to-Magic cards, double-sided tokens, deck box | — | In Stock | — | 3 | $99.98 | 3 | eligible | no GTIN; title: add configuration | mtg-secrets-of-strixhaven-commander-deck-prismari-artistry |
| MTG | MTG Secrets of Strixhaven Commander Deck [Quandrix Unlimited] (Pack of 3) | Secrets of Strixhaven | Commander Deck | English | Configuration: 1 ready-to-play 100-card Commander deck: 1 traditional foil face commander (borderless), 1 traditional foil featured commander (borderless), 98 non-foil cards incl. new-to-Magic cards, double-sided tokens, deck box | — | In Stock | — | 3 | $99.98 | 3 | eligible | no GTIN; title: add configuration | mtg-secrets-of-strixhaven-commander-deck-quandrix-unlimited |
| MTG | MTG Secrets of Strixhaven Commander Deck [Silverquill Influence] | Secrets of Strixhaven | Commander Deck | English | Configuration: 1 ready-to-play 100-card Commander deck: 1 traditional foil face commander (borderless), 1 traditional foil featured commander (borderless), 98 non-foil cards incl. new-to-Magic cards, double-sided tokens, deck box | — | In Stock | — | 1 | $49.99 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | mtg-secrets-of-strixhaven-commander-deck-silverquill-influence |
| MTG | MTG Secrets of Strixhaven Commander Deck [Witherbloom Pestilence] (Pack of 6) | Secrets of Strixhaven | Commander Deck | English | Configuration: 1 ready-to-play 100-card Commander deck: 1 traditional foil face commander (borderless), 1 traditional foil featured commander (borderless), 98 non-foil cards incl. new-to-Magic cards, double-sided tokens, deck box | — | In Stock | — | 3 | $249.95 | 6 | eligible | no GTIN; title: add configuration | mtg-secrets-of-strixhaven-commander-deck-witherbloom-pestilence |
| MTG | MTG Secrets of Strixhaven Play Booster Box (Pack of 2) | Secrets of Strixhaven | Play Booster Box | English | Configuration: 30 Play Booster packs per box, 14 cards per pack | — | In Stock | 195166316703 | 3 | $249.95 | 2 | eligible | title: add configuration | mtg-secrets-of-strixhaven-play-booster-box |
| MTG | MTG Star Trek Beam Me Up Bundle | Star Trek | Premium Bundle | English | Configuration: Play Boosters, 1 Collector Booster, 2 of 8 traditional foil Beam Me Up Bundle promo cards, basic lands (incl. full-art and foil), card box | November 13, 2026 | Preorder — not yet released | 195166334318 | 1 | $99.98 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | mtg-star-trek-beam-me-up-bundle |
| MTG | MTG Star Trek Bundle (Pack of 6) | Star Trek | Bundle | English | Configuration: 9 Play Boosters, 10 traditional foil + 10 non-foil basic lands (5 full-art each), foil alt-art promo card, oversized Spindown life counter, storage box, reference cards | November 13, 2026 | Preorder — not yet released | 195166334356 | 3 | $249.95 | 6 | eligible | title: add configuration | mtg-star-trek-bundle |
| MTG | MTG Star Trek Collector Booster Box | Star Trek | Collector Booster Box | English | Configuration: 12 Collector Booster packs per box, 15 cards per pack | November 13, 2026 | Preorder — not yet released | 195166334110 | 1 | $499.90 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | mtg-star-trek-collector-booster-box |
| MTG | MTG Star Trek Collectors Edition Commander Deck [Federation Fleet] | Star Trek | Collector’s Edition Commander Deck | English | Configuration: 100-card Commander deck: 1 surge foil borderless face commander + 99 surge foil cards, 10 double-sided tokens (surge foil on one side) | November 13, 2026 | Preorder — not yet released | — | 1 | $199.96 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | mtg-star-trek-collectors-edition-commander-deck-federation-fleet |
| MTG | MTG Star Trek Collectors Edition Commander Deck [Klingon Fury] | Star Trek | Collector’s Edition Commander Deck | English | Configuration: 100-card Commander deck: 1 surge foil borderless face commander + 99 surge foil cards, 10 double-sided tokens (surge foil on one side) | November 13, 2026 | Preorder — not yet released | — | 1 | $149.97 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | mtg-star-trek-collectors-edition-commander-deck-klingon-fury |
| MTG | MTG Star Trek Collectors Edition Commander Deck [Landing Party] | Star Trek | Collector’s Edition Commander Deck | English | Configuration: 100-card Commander deck: 1 surge foil borderless face commander + 99 surge foil cards, 10 double-sided tokens (surge foil on one side) | November 13, 2026 | Preorder — not yet released | — | 1 | $149.97 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | mtg-star-trek-collectors-edition-commander-deck-landing-party |
| MTG | MTG Star Trek Collectors Edition Commander Deck [We Are the Borg] | Star Trek | Collector’s Edition Commander Deck | English | Configuration: 100-card Commander deck: 1 surge foil borderless face commander + 99 surge foil cards, 10 double-sided tokens (surge foil on one side) | November 13, 2026 | Preorder — not yet released | — | 1 | $199.96 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | mtg-star-trek-collectors-edition-commander-deck-we-are-the-borg |
| MTG | MTG Star Trek Commander Deck [Federation Fleet] | Star Trek | Commander Deck | English | Configuration: 100-card ready-to-play Commander deck + 10 non-foil double-sided tokens | November 13, 2026 | Preorder — not yet released | — | 1 | $49.99 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | mtg-star-trek-commander-deck-federation-fleet |
| MTG | MTG Star Trek Commander Deck [Klingon Fury] | Star Trek | Commander Deck | English | Configuration: 100-card ready-to-play Commander deck + 10 non-foil double-sided tokens | November 13, 2026 | Preorder — not yet released | — | 1 | $49.99 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | mtg-star-trek-commander-deck-klingon-fury |
| MTG | MTG Star Trek Commander Deck [Landing Party] | Star Trek | Commander Deck | English | Configuration: 100-card ready-to-play Commander deck + 10 non-foil double-sided tokens | November 13, 2026 | Preorder — not yet released | — | 1 | $49.99 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | mtg-star-trek-commander-deck-landing-party |
| MTG | MTG Star Trek Commander Deck [We Are the Borg] (Pack of 4) | Star Trek | Commander Deck | English | Configuration: 100-card ready-to-play Commander deck + 10 non-foil double-sided tokens | November 13, 2026 | Preorder — not yet released | — | 3 | $249.95 | 4 | eligible | no GTIN; title: add configuration | mtg-star-trek-commander-deck-we-are-the-borg |
| MTG | MTG Star Trek Draft Night (Pack of 2) | Star Trek | Draft Night Box | English | Configuration: 12 Play Boosters, 1 Collector Booster, 90 basic lands, 10 non-foil double-sided tokens | November 13, 2026 | Preorder — not yet released | 195166336657 | 3 | $149.97 | 2 | eligible | title: add configuration | mtg-star-trek-draft-night |
| MTG | MTG Star Trek Play Booster Box | Star Trek | Play Booster Box | English | Configuration: 30 Play Booster packs per box, 14 cards per pack | November 13, 2026 | Preorder — not yet released | 195166333533 | 1 | $99.98 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | mtg-star-trek-play-booster-box |
| MTG | MTG Star Trek Prerelease Pack (Pack of 3) | Star Trek | Prerelease Pack | English | Configuration: 6 Play Boosters, 1 traditional foil rare or mythic rare, 1 deck box, 1 spindown die | November 13, 2026 | Preorder — not yet released | 195166336343 | 3 | $99.98 | 3 | eligible | title: add configuration | mtg-star-trek-prerelease-pack |
| MTG | MTG Star Trek Scene Box [Divergent Timeline] (Pack of 3) | Star Trek | Scene Box | English | Configuration: 3 Play Boosters, 6 traditional foil borderless scene cards, 6 art cards, 1 display easel | November 13, 2026 | Preorder — not yet released | — | 3 | $99.98 | 3 | eligible | no GTIN; title: add configuration | mtg-star-trek-scene-box-divergent-timeline |
| MTG | MTG Star Trek Scene Box [Enterprise-Q] (Pack of 3) | Star Trek | Scene Box | English | Configuration: 3 Play Boosters, 6 traditional foil borderless scene cards, 6 art cards, 1 display easel | November 13, 2026 | Preorder — not yet released | — | 3 | $99.98 | 3 | eligible | no GTIN; title: add configuration | mtg-star-trek-scene-box-enterprise-q |
| MTG | MTG Teenage Mutant Ninja Turtles Bundle (Pack of 3) | Teenage Mutant Ninja Turtles | Bundle | English | Configuration: 9 Play Boosters, 15 traditional foil + 15 non-foil basic lands (incl. 5 full-art rooftop each), 2 reference cards, 1 traditional foil promo, oversized spindown, card-storage box | — | In Stock | 195166308357 | 3 | $99.98 | 3 | eligible | title: add configuration | mtg-teenage-mutant-ninja-turtles-bundle |
| MTG | MTG Teenage Mutant Ninja Turtles Collector Booster Box | Teenage Mutant Ninja Turtles | Collector Booster Box | English | Configuration: 12 Collector Boosters per box, 15 cards per pack | — | In Stock | 195166308180 | 1 | $399.92 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | mtg-teenage-mutant-ninja-turtles-collector-booster-box |
| MTG | MTG Teenage Mutant Ninja Turtles Commander Deck (Pack of 3) | Teenage Mutant Ninja Turtles | Commander Deck | English | Configuration: 1 ready-to-play 100-card Commander deck: 1 traditional foil face commander + 5 traditional foil featured commanders (borderless), 94 non-foil cards, 10 double-sided tokens/punch-out counters, deck box | — | In Stock | 195166308333 | 3 | $99.98 | 3 | eligible | title: add configuration | mtg-teenage-mutant-ninja-turtles-commander-deck |
| MTG | MTG Teenage Mutant Ninja Turtles Play Booster Box | Teenage Mutant Ninja Turtles | Play Booster Box | English | Configuration: 30 Play Boosters per box, 14 cards per pack | — | In Stock | 195166308036 | 1 | $99.98 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | mtg-teenage-mutant-ninja-turtles-play-booster-box |
| MTG | MTG The Hobbit Bundle (Pack of 3) | The Hobbit | Bundle | English | Configuration: 9 Play Boosters, 4 traditional foil full-art seasonal Hobbit basic lands, 15 traditional foil + 15 non-foil basic lands, 1 traditional foil promo, 2 reference cards, 1 oversized spindown | — | In Stock | 195166321981 | 3 | $99.98 | 3 | eligible | title: add configuration | mtg-the-hobbit-bundle |
| MTG | MTG The Hobbit Collector Booster Box | The Hobbit | Collector Booster Box | English | Configuration: 12 Collector Booster packs per box | — | In Stock | 195166321905 | 1 | $549.89 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | mtg-the-hobbit-collector-booster-box |
| MTG | MTG The Hobbit Draft Night | The Hobbit | Draft Night Box | English | Configuration: 12 Play Boosters, 1 Collector Booster, 90 non-foil basic lands, 10 non-foil double-sided tokens, 1 draft insert | — | In Stock | 195166322056 | 1 | $99.98 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | mtg-the-hobbit-draft-night |
| MTG | MTG The Hobbit Gift Bundle (Pack of 2) | The Hobbit | Gift Bundle | English | Configuration: Gift Bundle | — | In Stock | 195166321974 | 3 | $149.97 | 2 | eligible | title: add configuration | mtg-the-hobbit-gift-bundle |
| MTG | MTG The Hobbit Play Booster Box (Pack of 2) | The Hobbit | Play Booster Box | English | Configuration: 30 Play Booster packs per box, 14 cards per pack | — | In Stock | 195166321851 | 3 | $249.95 | 2 | eligible | title: add configuration | mtg-the-hobbit-play-booster-box |
| One Piece | One Piece Card Game Double Pack Set Vol.13 [DP-13] (Pack of 3) |  | Double Pack Set | English | Configuration: 2 x OP-18 booster packs + 1 DON!! card (1 of 2 designs); packaging doubles as a card case. Display = 8 sets | November 20, 2026 | Preorder — not yet released | — | 3 | $199.96 | 3 | eligible | no GTIN; title: add configuration | one-piece-card-game-double-pack-set-vol-13-dp-13 |
| One Piece | One Piece Card Game EB-03 One Piece Heroines Edition Booster Box (English, 24 packs) |  | Booster Box | English | Configuration: 24 booster packs per box, 12 cards per pack; 12 boxes per case | — | In Stock | — | 1 | $249.95 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | one-piece-card-game-eb-03-one-piece-heroines-edition-booster-box-english-24-packs |
| One Piece | One Piece Card Game EB-05 One Piece Heroines Edition Vol. 2 Booster Box (English, 24 packs) |  | Booster Box | English | Configuration: 24 booster packs per box, 12 cards per pack; set has 75+2 card types; 12 boxes per case | — | In Stock | — | 1 | $249.95 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | one-piece-card-game-eb-05-one-piece-heroines-edition-vol-2-booster-box-english-24-pac |
| One Piece | One Piece Card Game EB-05 One Piece Heroines Edition Vol. 2 Booster Pack (English) (Pack of 6) |  | Booster Pack | English | Configuration: 1 booster pack, 12 cards; set has 75+2 card types | — | In Stock | 810199502779 | 3 | $49.99 | 6 | eligible | title: add configuration | one-piece-card-game-eb-05-one-piece-heroines-edition-vol-2-booster-pack-english |
| One Piece | One Piece Card Game OP-05 Awakening of the New Era Booster Box (English, 24 packs) |  | Booster Box | English | Configuration: 24 booster packs per box, 12 cards per pack; 12 boxes per case | — | In Stock | — | 1 | $949.81 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | one-piece-card-game-op-05-awakening-of-the-new-era-booster-box-english-24-packs |
| One Piece | One Piece Card Game OP-09 Emperors in the New World Booster Box (English, 24 packs) |  | Booster Box | English | Configuration: 24 booster packs per box, 12 cards per pack; 12 boxes per case | — | In Stock | — | 1 | $599.88 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | one-piece-card-game-op-09-emperors-in-the-new-world-booster-box-english-24-packs |
| One Piece | One Piece Card Game OP-11 A Fist of Divine Speed Booster Box (English, 24 packs) |  | Booster Box | English | Configuration: 24 booster packs per box, 12 cards per pack; 12 boxes per case | — | In Stock | — | 1 | $499.90 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | one-piece-card-game-op-11-a-fist-of-divine-speed-booster-box-english-24-packs |
| One Piece | One Piece Card Game OP-12 Legacy of the Master Booster Box (English, 24 packs) |  | Booster Box | English | Configuration: 24 booster packs per box, 12 cards per pack; 12 boxes per case | — | In Stock | — | 1 | $249.95 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | one-piece-card-game-op-12-legacy-of-the-master-booster-box-english-24-packs |
| One Piece | One Piece Card Game OP-13 Carrying On His Will Booster Box (English, 24 packs) |  | Booster Box | English | Configuration: 24 booster packs per box, 12 cards per pack; 12 boxes per case | — | In Stock | — | 1 | $399.92 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | one-piece-card-game-op-13-carrying-on-his-will-booster-box-english-24-packs |
| One Piece | One Piece Card Game OP-14 The Azure Sea's Seven Booster Box (English, 24 packs) |  | Booster Box | English | Configuration: 24 booster packs per box, 12 cards per pack; 12 boxes per case | — | In Stock | — | 1 | $249.95 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | one-piece-card-game-op-14-the-azure-sea-s-seven-booster-box-english-24-packs |
| One Piece | One Piece Card Game OP-15 Adventure on Kami's Island Booster Box (English, 24 packs) |  | Booster Box | English | Configuration: 24 booster packs per box, 12 cards per pack; 12 boxes per case | — | In Stock | — | 1 | $199.96 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | one-piece-card-game-op-15-adventure-on-kami-s-island-booster-box-english-24-packs |
| One Piece | One Piece Card Game OP-15 Adventure on Kami's Island Booster Pack (English) (Pack of 7) |  | Booster Pack | English | Configuration: 1 booster pack, 12 cards | — | In Stock | — | 3 | $49.99 | 7 | eligible | no GTIN; title: add configuration | one-piece-card-game-op-15-adventure-on-kami-s-island-booster-pack-english |
| One Piece | One Piece Card Game OP-16 The Time of Battle Booster Box (English, 24 packs) (Pack of 2) |  | Booster Box | English | Configuration: 24 booster packs per box, 12 cards per pack; 12 boxes per case; set has 126+1 card types | — | In Stock | — | 3 | $349.93 | 2 | eligible | no GTIN; title: add configuration | one-piece-card-game-op-16-the-time-of-battle-booster-box-english-24-packs |
| One Piece | One Piece Card Game OP-16 The Time of Battle Booster Pack (English) (Pack of 9) |  | Booster Pack | English | Configuration: 1 booster pack, 12 cards; set has 126+1 card types | — | In Stock | — | 3 | $49.99 | 9 | eligible | no GTIN; title: add configuration | one-piece-card-game-op-16-the-time-of-battle-booster-pack-english |
| One Piece | One Piece Card Game OP-17 The World's Strongest Warriors Booster Box (English, 24 packs) |  | Booster Box | English | Configuration: 24 booster packs per box, 12 cards per pack; 12 boxes per case | — | In Stock | — | 1 | $249.95 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | one-piece-card-game-op-17-the-world-s-strongest-warriors-booster-box-english-24-packs |
| One Piece | One Piece Card Game OP-17 The World's Strongest Warriors Booster Pack (English) (Pack of 7) |  | Booster Pack | English | Configuration: 1 booster pack, 12 cards | — | In Stock | — | 3 | $49.99 | 7 | eligible | no GTIN; title: add configuration | one-piece-card-game-op-17-the-world-s-strongest-warriors-booster-pack-english |
| One Piece | One Piece Card Game OP-18 The Dominance of God Booster Box (English, 24 packs) |  | Booster Box | English | Configuration: 24 booster packs per box, 12 cards per pack; 12 boxes per case; set has 127+1 card types | November 20, 2026 | Preorder — not yet released | — | 1 | $249.95 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | one-piece-card-game-op-18-the-dominance-of-god-booster-box-english-24-packs |
| One Piece | One Piece Card Game OP-18 The Dominance of God Booster Pack (English) (Pack of 5) |  | Booster Pack | English | Configuration: 1 booster pack, 12 cards; set has 127+1 card types | November 20, 2026 | Preorder — not yet released | — | 3 | $99.98 | 5 | eligible | no GTIN; title: add configuration | one-piece-card-game-op-18-the-dominance-of-god-booster-pack-english |
| One Piece | One Piece Card Game PRB-02 The Best Vol. 2 Booster Box (English, 20 packs) |  | Booster Box | English | Configuration: English box: 20 packs per box, 10 cards per pack | — | In Stock | — | 1 | $299.94 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | one-piece-card-game-prb-02-the-best-vol-2-booster-box-english-24-packs |
| Panini | 2025-26 Panini Prizm Basketball Hobby Box | Panini Prizm | Hobby Box | English | Configuration: 12 packs per box, 12 cards per pack | — | In Stock | 746134195204 | 1 | $199.96 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | 2025-26-panini-prizm-basketball-hobby-box |
| Panini | 2025 Panini Prizm NFL Football Hobby Box | Prizm Football | Hobby Box | English | Configuration: 12 packs per box, 12 cards per pack | — | In Stock | 746134187247 | 1 | $899.82 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | 2025-panini-prizm-nfl-football-hobby-box |
| Pokémon | Pokémon TCG 30th Celebration 2-Pack Blister | 30th Celebration | Blister Pack | English | Configuration: Per TCGplayer: 2 30th Celebration booster packs, 1 plastic coin, 1 foil Eevee promo (same description as the Knock Out Collection; listing data may be copy-pasted) | — | In Stock | — | 1 | $49.99 | 1 | eligible | no GTIN; research notes in description; 1 image; image on Shopify CDN | pokemon-tcg-30th-celebration-2-pack-blister |
| Pokémon | Pokémon TCG 30th Celebration Battle Deck [Espeon ex] (Pack of 2) | 30th Celebration | Battle Deck | English | Configuration: 1 ready-to-play 60-card Espeon ex deck, damage counters, plastic coin, deck box, double-sided playmat & strategy sheet, code card | — | In Stock | — | 3 | $49.99 | 2 | eligible | no GTIN; title: add configuration | pokemon-tcg-30th-celebration-battle-deck-espeon-ex |
| Pokémon | Pokémon TCG 30th Celebration Battle Deck [Umbreon ex] (Pack of 7) | 30th Celebration | Battle Deck | English | Configuration: 1 ready-to-play 60-card Umbreon ex deck, damage counters, plastic coin, deck box, double-sided playmat & strategy sheet, code card | — | In Stock | — | 3 | $149.97 | 7 | eligible | no GTIN; title: add configuration | pokemon-tcg-30th-celebration-battle-deck-umbreon-ex |
| Pokémon | Pokémon TCG 30th Celebration Binder Collection (Pack of 3) | 30th Celebration | Collection Box | English | Configuration: 1 thematic 9-pocket binder + 5 30th Celebration booster packs | — | In Stock | — | 3 | $249.95 | 3 | eligible | no GTIN; title: add configuration | pokemon-tcg-30th-celebration-binder-collection |
| Pokémon | Pokémon TCG 30th Celebration Booster Bundle (Pack of 3) | 30th Celebration | Booster Bundle | English | Configuration: 6 30th Celebration booster packs (no promo) | — | In Stock | — | 3 | $199.96 | 3 | eligible | no GTIN; title: add configuration | pokemon-tcg-30th-celebration-booster-bundle |
| Pokémon | Pokémon TCG 30th Celebration Booster Bundle Case | 30th Celebration | Case | English | Configuration: 25 x 30th Celebration Booster Bundle (6 packs each) | — | In Stock | — | 1 | $1199.76 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-30th-celebration-booster-bundle-case |
| Pokémon | Pokémon TCG 30th Celebration Booster Pack (Pack of 6) | 30th Celebration | Booster Pack | English | Configuration: 1 booster pack: 6 random holographic cards (each pack contains a Pikachu card) | — | In Stock | — | 3 | $49.99 | 6 | eligible | no GTIN | pokemon-tcg-30th-celebration-booster-pack |
| Pokémon | Pokémon TCG 30th Celebration Classic Collection Pack (Pack of 2) | 30th Celebration | Collection Box | English | Configuration: 1 special pack with 3 randomly selected etched Classic Collection cards | — | In Stock | — | 3 | $249.95 | 2 | eligible | no GTIN | pokemon-tcg-30th-celebration-classic-collection-pack |
| Pokémon | Pokémon TCG 30th Celebration Ditto Premium Collection (Pack of 2) | 30th Celebration | Premium Collection | English | Configuration: 8 30th Celebration booster packs, 1 Ditto promo card, 1 acrylic card display, TCG Live code card | November 6, 2026 | Preorder — released, awaiting stock | — | 3 | $249.95 | 2 | eligible | no GTIN; released, still flagged preorder; title: add configuration | pokemon-tcg-30th-celebration-ditto-premium-collection |
| Pokémon | Pokémon TCG 30th Celebration Ditto Premium Collection Case | 30th Celebration | Case | English | Configuration: 6 x 30th Celebration Ditto Premium Collection (each: 8 30th Celebration booster packs, 1 Ditto promo card, 1 acrylic card display, TCG Live code card) | November 6, 2026 | Preorder — released, awaiting stock | — | 1 | $849.83 | 1 | eligible | no GTIN; released, still flagged preorder; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-30th-celebration-ditto-premium-collection-case |
| Pokémon | Pokémon TCG 30th Celebration Elite Trainer Box | 30th Celebration | Elite Trainer Box | English | Configuration: 9 30th Celebration booster packs (each: 5 foil cards + 1 foil Energy + TCG Live code card), 1 full-art foil Nidorina promo, 16 foil Basic Energy, 65 sleeves, player's guide, 6 damage-counter dice, 1 coin-flip die, 1 plastic coin, collector's box with 6 dividers, TCG Live code card | — | In Stock | 196214158801 | 1 | $99.98 | 1 | eligible | 1 image; title: add configuration | pokemon-tcg-30th-celebration-elite-trainer-box |
| Pokémon | Pokémon TCG 30th Celebration Elite Trainer Box Case | 30th Celebration | Case | English | Configuration: 10 x 30th Celebration Elite Trainer Box (each: 9 30th Celebration booster packs (each: 5 foil cards + 1 foil Energy + TCG Live code card), 1 full-art foil Nidorina promo, 16 foil Basic Energy, 65 sleeves, player's guide, 6 damage-counter dice, 1 coin-flip die, 1 plastic coin, collector's box with 6 dividers, TCG Live code card) | — | In Stock | — | 1 | $1149.77 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-30th-celebration-elite-trainer-box-case |
| Pokémon | Pokémon TCG 30th Celebration ex Tin (International Version) [Greninja ex] | 30th Celebration | Tin | English | Configuration: International version: 1 foil Greninja ex promo, 4 30th Celebration booster packs | — | In Stock | — | 1 | $49.99 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-30th-celebration-ex-tin-greninja-ex-international-version |
| Pokémon | Pokémon TCG 30th Celebration ex Tin (Retail Version) [Greninja ex] (Pack of 6) | 30th Celebration | Tin | English | Configuration: Retail version: 1 foil Greninja ex promo, 5 30th Celebration booster packs | — | In Stock | — | 3 | $249.95 | 6 | eligible | no GTIN; title: add configuration | pokemon-tcg-30th-celebration-ex-tin-greninja-ex-retail-version |
| Pokémon | Pokémon TCG 30th Celebration ex Tin (International Version) [Sylveon ex] (Pack of 3) | 30th Celebration | Tin | English | Configuration: International version: 1 foil Sylveon ex promo, 4 30th Celebration booster packs | — | In Stock | — | 3 | $199.96 | 3 | eligible | no GTIN; title: add configuration | pokemon-tcg-30th-celebration-ex-tin-sylveon-ex-international-version |
| Pokémon | Pokémon TCG 30th Celebration ex Tin (Retail Version) [Sylveon ex] (Pack of 5) | 30th Celebration | Tin | English | Configuration: Retail version: 1 foil Sylveon ex promo, 5 30th Celebration booster packs | — | In Stock | — | 3 | $199.96 | 5 | eligible | no GTIN; title: add configuration | pokemon-tcg-30th-celebration-ex-tin-sylveon-ex-retail-version |
| Pokémon | Pokémon TCG 30th Celebration Figure Collection Case | 30th Celebration | Case | English | Configuration: Case of 6 Figure Collections (3 Mew, 3 Mewtwo). Each: 1 foil promo, 1 oversize foil card, 1 figure, 5 30th Celebration booster packs | November 6, 2026 | Preorder — released, awaiting stock | — | 1 | $699.86 | 1 | eligible | no GTIN; released, still flagged preorder; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-30th-celebration-figure-collection-case |
| Pokémon | Pokémon TCG 30th Celebration Figure Collection [Mew] (Pack of 2) | 30th Celebration | Figure Collection | English | Configuration: 5 30th Celebration booster packs, 1 foil Mew promo, 1 oversize foil Mew card, 1 Mew figure | November 6, 2026 | Preorder — released, awaiting stock | — | 3 | $249.95 | 2 | eligible | no GTIN; released, still flagged preorder; title: add configuration | pokemon-tcg-30th-celebration-figure-collection-mew |
| Pokémon | Pokémon TCG 30th Celebration Figure Collection [Mewtwo] (Pack of 2) | 30th Celebration | Figure Collection | English | Configuration: 5 30th Celebration booster packs, 1 foil Mewtwo promo, 1 oversize foil Mewtwo card, 1 Mewtwo figure | November 6, 2026 | Preorder — released, awaiting stock | — | 3 | $249.95 | 2 | eligible | no GTIN; released, still flagged preorder; title: add configuration | pokemon-tcg-30th-celebration-figure-collection-mewtwo |
| Pokémon | Pokémon TCG 30th Celebration Greninja ex Box (Pack of 5) | 30th Celebration | Collection Box | English | Configuration: 4 30th Celebration booster packs, 1 foil Greninja ex promo, 1 foil oversize Greninja ex card | — | In Stock | — | 3 | $149.97 | 5 | eligible | no GTIN; title: add configuration | pokemon-tcg-30th-celebration-greninja-ex-box |
| Pokémon | Pokémon TCG 30th Celebration Knock Out Collection (Pack of 3) | 30th Celebration | Collection Box | English | Configuration: 2 30th Celebration booster packs, 1 foil Eevee promo, 1 plastic coin | — | In Stock | — | 3 | $49.99 | 3 | eligible | no GTIN; title: add configuration | pokemon-tcg-30th-celebration-knock-out-collection |
| Pokémon | Pokémon TCG 30th Celebration Mini Tin Display | 30th Celebration | Tin Display | English | Configuration: 10 Mini Tins, one of each design; each tin: 2 30th Celebration booster packs, 1 sticker sheet, 1 art card, TCG Live code card | — | In Stock | — | 1 | $199.96 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-30th-celebration-mini-tin-display |
| Pokémon | Pokémon TCG 30th Celebration Pokemon Center Elite Trainer Box | 30th Celebration | Pokémon Center Elite Trainer Box | English | Configuration: 11 30th Celebration booster packs, 2 full-art foil Nidorina promos (one with Pokémon Center logo stamp), 16 foil Basic Energy, 65 sleeves, player's guide, 6 damage-counter dice, coin-flip die, plastic coin, box with 6 dividers, TCG Live code card | — | In Stock | — | 1 | $249.95 | 1 | eligible | no GTIN; 1 image; title: add configuration | pokemon-tcg-30th-celebration-pokemon-center-elite-trainer-box |
| Pokémon | Pokémon TCG 30th Celebration Poster Collection (Pack of 7) | 30th Celebration | Collection Box | English | Configuration: 3 30th Celebration booster packs, 3 foil promos (Articuno, Zapdos, Moltres), 1 double-sided poster 26.875&#34; x 39&#34; | — | In Stock | — | 3 | $149.97 | 7 | eligible | no GTIN; title: add configuration | pokemon-tcg-30th-celebration-poster-collection |
| Pokémon | Pokémon TCG 30th Celebration Sylveon ex Box (Pack of 4) | 30th Celebration | Collection Box | English | Configuration: 4 30th Celebration booster packs, 1 foil Sylveon ex promo, 1 foil oversize Sylveon ex card | — | In Stock | — | 3 | $149.97 | 4 | eligible | no GTIN; title: add configuration | pokemon-tcg-30th-celebration-sylveon-ex-box |
| Pokémon | Pokémon TCG 30th Celebration Tech Sticker Collection [Alolan Exeggutor] (Pack of 7) | 30th Celebration | Collection Box | English | Configuration: 3 30th Celebration booster packs, 1 foil Alolan Exeggutor promo, 1 tech sticker sheet | — | In Stock | — | 3 | $149.97 | 7 | eligible | no GTIN; title: add configuration | pokemon-tcg-30th-celebration-tech-sticker-collection-alolan-exeggutor |
| Pokémon | Pokémon TCG 30th Celebration Ultra-Premium Collection Case | 30th Celebration | Case | English | Configuration: 4 Ultra-Premium Collections (2 Day + 2 Night) | November 6, 2026 | Preorder — released, awaiting stock | — | 1 | $1199.76 | 1 | eligible | no GTIN; released, still flagged preorder; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-30th-celebration-ultra-premium-collection-case |
| Pokémon | Pokémon TCG 30th Celebration Ultra-Premium Collection [Day] | 30th Celebration | Ultra-Premium Collection | English | Configuration: 29 30th Celebration booster packs + 1 Classic Collection booster pack (3 etched Classic Collection cards), foil Pikachu promo, foil Espeon ex promo, playmat, 65 sleeves, deck box, metal Espeon coin, 6 damage-counter dice, acrylic card display, TCG Live code card | November 6, 2026 | Preorder — released, awaiting stock | — | 1 | $399.92 | 1 | eligible | no GTIN; released, still flagged preorder; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-30th-celebration-ultra-premium-collection-day |
| Pokémon | Pokémon TCG 30th Celebration Ultra-Premium Collection [Night] | 30th Celebration | Ultra-Premium Collection | English | Configuration: 29 30th Celebration booster packs + 1 Classic Collection booster pack (3 etched Classic Collection cards), foil Pikachu promo, foil Umbreon ex promo, playmat, 65 sleeves, deck box, metal Umbreon coin, 6 damage-counter dice, acrylic card display, TCG Live code card | November 6, 2026 | Preorder — released, awaiting stock | — | 1 | $399.92 | 1 | eligible | no GTIN; released, still flagged preorder; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-30th-celebration-ultra-premium-collection-night |
| Pokémon | Pokémon TCG Chaos Rising Booster Box | Chaos Rising | Booster Box | English | Configuration: 36 Mega Evolution—Chaos Rising booster packs | — | In Stock | — | 1 | $149.97 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-chaos-rising-booster-box |
| Pokémon | Pokémon TCG Delta Reign Booster Box | Delta Reign | Booster Box | English | Configuration: 36 booster packs, 10 cards per pack | November 6, 2026 | Preorder — released, awaiting stock | — | 1 | $199.96 | 1 | eligible | no GTIN; released, still flagged preorder; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-delta-reign-booster-box |
| Pokémon | Pokémon TCG Delta Reign Booster Bundle | Delta Reign | Booster Bundle | English | Configuration: 6 Delta Reign booster packs | November 6, 2026 | Preorder — released, awaiting stock | — | 1 | $49.99 | 1 | eligible | no GTIN; released, still flagged preorder; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-delta-reign-booster-bundle |
| Pokémon | Pokémon TCG Delta Reign Build & Battle Box (Pack of 4) | Delta Reign | Build & Battle Box | English | Configuration: 1 ready-to-play 40-card deck (includes 1 of 4 foil promo cards), 4 Delta Reign booster packs, 1 Pokémon TCG Live code card | November 6, 2026 | Preorder — released, awaiting stock | — | 3 | $149.97 | 4 | eligible | no GTIN; released, still flagged preorder; title: add configuration | pokemon-tcg-delta-reign-build-battle-box |
| Pokémon | Pokémon TCG Delta Reign Elite Trainer Box | Delta Reign | Elite Trainer Box | English | Configuration: 9 booster packs, 65 sleeves, 45 Energy cards, player's guide, 6 damage-counter dice, coin-flip die, 2 plastic condition markers, collector's box with 4 dividers, TCG Live code card | November 6, 2026 | Preorder — released, awaiting stock | — | 1 | $99.98 | 1 | eligible | no GTIN; released, still flagged preorder; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-delta-reign-elite-trainer-box |
| Pokémon | Pokémon TCG Delta Reign Pokémon Center Elite Trainer Box | Delta Reign | Pokémon Center Elite Trainer Box | English | Configuration: 11 booster packs (10 cards + 1 Basic Energy each), 65 sleeves, 45 Energy cards, player's guide, 6 damage-counter dice, coin-flip die, 2 plastic condition markers, box with 4 dividers, TCG Live code card | November 6, 2026 | Preorder — released, awaiting stock | — | 1 | $249.95 | 1 | eligible | no GTIN; released, still flagged preorder; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-delta-reign-pokemon-center-elite-trainer-box |
| Pokémon | Pokémon TCG Mega Evolution Booster Box | Mega Evolution | Booster Box | English | Configuration: 36 booster packs, 10 cards per pack | — | In Stock | — | 1 | $299.94 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-mega-evolution-booster-box |
| Pokémon | Pokémon TCG Perfect Order Booster Box | Perfect Order | Booster Box | English | Configuration: 36 booster packs, 10 cards per pack | — | In Stock | — | 1 | $149.97 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-perfect-order-booster-box |
| Pokémon | Pokémon TCG Phantasmal Flames Booster Box | Phantasmal Flames | Booster Box | English | Configuration: 36 Mega Evolution—Phantasmal Flames booster packs | — | In Stock | — | 1 | $349.93 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-phantasmal-flames-booster-box |
| Pokémon | Pokémon TCG Pitch Black Booster Box | Pitch Black | Booster Box | English | Configuration: 36 booster packs, 10 cards per pack | — | In Stock | — | 1 | $149.97 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-pitch-black-booster-box |
| Pokémon | Pokémon TCG Pitch Black Booster Bundle (Pack of 5) | Pitch Black | Booster Bundle | English | Configuration: 6 Mega Evolution—Pitch Black booster packs | — | In Stock | — | 3 | $99.98 | 5 | eligible | no GTIN; title: add configuration | pokemon-tcg-pitch-black-booster-bundle |
| Pokémon | Pokémon TCG Pitch Black Elite Trainer Box (Pack of 3) | Pitch Black | Elite Trainer Box | English | Configuration: 9 booster packs, 65 sleeves, 45 Energy cards, player's guide, 6 damage-counter dice, coin-flip die, 2 plastic condition markers, collector's box with 4 dividers, TCG Live code card | — | In Stock | — | 3 | $199.96 | 3 | eligible | no GTIN; title: add configuration | pokemon-tcg-pitch-black-elite-trainer-box |
| Pokémon | Pokémon TCG Pitch Black Pokemon Center Elite Trainer Box (Exclusive) | Pitch Black | Pokémon Center Elite Trainer Box | English | Configuration: 11 booster packs (10 cards + 1 Basic Energy each), 65 sleeves, 45 Energy cards, player's guide, 6 damage-counter dice, coin-flip die, 2 plastic condition markers, box with 4 dividers, TCG Live code card | — | In Stock | — | 1 | $99.98 | 1 | eligible | no GTIN; 1 image; image on Shopify CDN; title: add configuration | pokemon-tcg-pitch-black-pokemon-center-elite-trainer-box-exclusive |
| Topps | 2025-26 Topps Chrome Basketball Hobby Box | Topps Chrome | Hobby Box | English | Configuration: 20 packs per box, 4 cards per pack | — | In Stock | 887521149599 | 1 | $1199.76 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | 2025-26-topps-chrome-basketball-hobby-box |
| Topps | 2025-26 Topps Finest Basketball Hobby Box | Topps Finest | Hobby Box | English | Configuration: 6 packs per box, 10 cards per pack | — | In Stock | 887521153336 | 1 | $849.83 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | 2025-26-topps-finest-basketball-hobby-box |
| Topps | 2026-27 Topps Flagship Basketball Hobby Box | Topps Flagship | Hobby Box | English | Configuration: 20 packs per box, 12 cards per pack | November 5, 2026 | Preorder — released, awaiting stock | 887521165438 | 1 | $249.95 | 1 | eligible | released, still flagged preorder; 1 image; image on Shopify CDN; title: add configuration | 2026-27-topps-flagship-basketball-hobby-box |
| Topps | 2026-27 Topps Flagship Basketball Hobby Jumbo Box | Topps Flagship | Jumbo Hobby Box | English | Configuration: 10 packs per box, 28 cards per pack | November 5, 2026 | Preorder — released, awaiting stock | 887521165469 | 1 | $499.90 | 1 | eligible | released, still flagged preorder; 1 image; image on Shopify CDN; title: add configuration | 2026-27-topps-flagship-basketball-hobby-jumbo-box |
| Topps | 2026 Bowman Baseball Hobby Box | Bowman | Hobby Box | English | Configuration: 20 packs per box, 8 cards per pack | — | In Stock | 887521158119 | 1 | $399.92 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | 2026-bowman-baseball-hobby-box |
| Topps | 2026 Bowman Chrome Baseball Hobby Box | Bowman Chrome | Hobby Box | English | Configuration: Giant lists 6 packs per box, 10 cards per pack (please verify; earlier Bowman Chrome hobby boxes used a different pack setup) | — | In Stock | 887521163526 | 1 | $549.89 | 1 | eligible | research notes in description; 1 image; title: add configuration | 2026-bowman-chrome-baseball-hobby-box |
| Topps | 2026 Bowman Chrome Baseball Mega Box (Pack of 2) | Bowman Chrome | Mega Box | English | Configuration: Midwest lists 6 packs per box, 6 cards per pack (other retailers list different pack counts) | — | In Stock | 887521163601 | 3 | $149.97 | 2 | eligible | research notes in description; title: add configuration | 2026-bowman-chrome-baseball-mega-box |
| Topps | 2026 Topps Chrome Baseball Hobby Box | Topps Chrome | Hobby Box | English | Configuration: 20 packs per box, 4 cards per pack | — | In Stock | 887521159451 | 1 | $499.90 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | 2026-topps-chrome-baseball-hobby-box |
| Topps | 2026 Topps Chrome Baseball Jumbo Hobby Box | Topps Chrome | Jumbo Hobby Box | English | Configuration: 12 packs per box, 11 cards per pack | — | In Stock | 887521159482 | 1 | $749.85 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | 2026-topps-chrome-baseball-jumbo-hobby-box |
| Topps | 2026 Topps Chrome Football Hobby Box | Topps Chrome | Hobby Box | English | Configuration: 20 packs per box, 4 cards per pack, 1 autograph per box | — | In Stock | 887521167661 | 1 | $599.88 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | 2026-topps-chrome-football-hobby-box |
| Topps | 2026 Topps Chrome Football Mega Box | Topps Chrome | Mega Box | English | Configuration: 6 packs per box, 7 cards per pack | — | In Stock | 887521167845 | 1 | $99.98 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | 2026-topps-chrome-football-mega-box |
| Topps | 2026 Topps Cosmic Chrome Baseball Hobby Box | Cosmic Chrome | Hobby Box | English | Configuration: 20 packs per box, 4 cards per pack | November 4, 2026 | Preorder — released, awaiting stock | 887521159321 | 1 | $1049.79 | 1 | eligible | released, still flagged preorder; 1 image; image on Shopify CDN; title: add configuration | 2026-topps-cosmic-chrome-baseball-hobby-box |
| Topps | 2026 Topps Finest Baseball Hobby Box | Topps Finest | Hobby Box | English | Configuration: 6 packs per box, 10 cards per pack | — | In Stock | 887521157730 | 1 | $649.87 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | 2026-topps-finest-baseball-hobby-box |
| Topps | 2026 Topps Heritage Baseball Hobby Box | Topps Heritage | Hobby Box | English | Configuration: 20 packs per box, 8 cards per pack | — | In Stock | 887521155187 | 1 | $149.97 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | 2026-topps-heritage-baseball-hobby-box |
| Topps | 2026 Topps Heritage Football Hobby Box (Pack of 2) | Topps Heritage | Hobby Box | English | Configuration: 20 packs per box, 8 cards per pack | — | In Stock | 887521163755 | 3 | $249.95 | 2 | eligible | title: add configuration | 2026-topps-heritage-football-hobby-box |
| Topps | 2026 Topps Inception Football Hobby Box | Topps Inception | Hobby Box | English | Configuration: 1 pack per box, 7 cards per pack | November 6, 2026 | Preorder — released, awaiting stock | 887521161621 | 1 | $549.89 | 1 | eligible | released, still flagged preorder; 1 image; image on Shopify CDN; title: add configuration | 2026-topps-inception-football-hobby-box |
| Topps | 2026 Topps Museum Collection Baseball Hobby Box | Museum Collection | Hobby Box | English | Configuration: 1 pack per box, 8 cards per pack | November 11, 2026 | Preorder — not yet released | 887521157341 | 1 | $699.86 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | 2026-topps-museum-collection-baseball-hobby-box |
| Topps | 2026 Topps Series 1 Baseball Hobby Box | Topps Series 1 | Hobby Box | English | Configuration: 20 packs per box, 12 cards per pack, plus 1 promo pack | — | In Stock | 887521154678 | 1 | $199.96 | 1 | eligible | 1 image; image on Shopify CDN; title: add configuration | 2026-topps-series-1-baseball-hobby-box |

---

## B. Pricing audit (recommendations only; nothing changed on the site)

### B1. Where prices stand today, against November 2026 market

Market = TCGplayer market price (122 products) or the lowest in-stock price at a named sports-card retailer (20), per unit, recorded 5–6 November with URL and confidence in `docs/gogetcards-reprice-review.csv`. Unit price = your price ÷ pack size.

| Position of your unit price vs market | Products |
|---|---|
| Above market | 18 |
| 0–10% below | 43 |
| 10–20% below | 50 |
| 20% or more below | 31 |
| Median | 12.5% below |

So 111 of 142 sit inside the band a comparison shopper does not notice, and 18 are above market. The worst: 30th Celebration Figure Collection Mew +62%, 2025-26 Topps Chrome Basketball +60% (market is a sold-out list price, low confidence), Figure Collection Mewtwo +42%, Ditto Premium Collection +31%, Delta Reign Booster Bundle +23%, Delta Reign ETB +19%, Cosmic Chrome Baseball +11%, Flagship Basketball Jumbo +11%, Inception Football +10%, Star Trek Collector +9%, UPC Day +9%. The three you flagged, on these sources: One Piece OP-17 16% below, Reality Fracture Collector Display 6% below, Star Trek Collector Booster Box 9% above.

### B2. The recommendation

`docs/gogetcards-reprice.csv` (already delivered, not imported) puts every product 20.5–39.8% below its market unit price, median 29.2%, using the $49.99 ladder and the smallest pack size that fits:

| | Count |
|---|---|
| Price goes down | 92 |
| Price goes up (pack size changes so the unit price still falls) | 26 |
| Price unchanged | 24 |
| Pack size changes | 69 |
| Market confidence high / medium / low | 101 / 37 / 4 |

The four low-confidence rows (2025-26 Topps Chrome Basketball at $1,199.76, 2026 Topps Chrome Football hobby and mega, 2026 Topps Heritage Baseball) are preorder or sold-out everywhere, so "market" is a list price; check them against your cost before importing.

Reading the table: **Current price** is what the page shows (pack price, pack size); **Current unit** is per box; **Unit vs market** is today's gap; **Recommended** is the CSV's price and pack; **Below market** is the gap after import.

Two cautions that are yours to weigh, because cost of goods is not visible from here:

1. A price 30% below TCGplayer market on a product where distributors sell at 15% below market is a loss per unit. The CSV targets the market, not your cost; cap the discount at your margin floor before importing.
2. Pack-size changes alter the minimum order. Where the CSV raises a pack (for example 1 → 2 to hold the ladder), the headline price rises even though the unit price falls; that is visible to the shopper and should be deliberate.

### B3. Per-product pricing table

| Brand | Product | Current price | Current unit | Market (Nov 2026) | Market source | Conf. | Unit vs market | Recommended | Below market | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Lorcana | Disney Lorcana Attack of the Vine! Booster Display Box | $149.97 (pack 1) | $149.97 | $177.34 | tcgplayer_market | medium | -15% | $249.95 (pack 2) |  | Lowest listing $85 is far below market; listed median $214.62. |
| Lorcana | Disney Lorcana Attack of the Vine! Illumineers Trove (Pack of 2) | $149.97 (pack 2) | $74.98 | $83.1 | tcgplayer_market | high | -10% | $49.99 (pack 1) |  | Single trove (not case). Lowest listing $76.80. |
| Lorcana | Disney Lorcana Attack of the Vine! Prerelease Box | $49.99 (pack 1) | $49.99 | $63.39 | tcgplayer_market | high | -21% | $49.99 (pack 1) |  |  |
| Lorcana | Disney Lorcana Hyperia City Booster Display Box (Pack of 2) | $249.95 (pack 2) | $124.97 | $127.93 | tcgplayer_market | high | -2% | $99.98 (pack 1) |  | Booster display box = TCGplayer "Booster Box" (not case). |
| Lorcana | Disney Lorcana Hyperia City Illumineers Trove | $49.99 (pack 1) | $49.99 | $68.75 | tcgplayer_market | high | -27% | $49.99 (pack 1) |  |  |
| Lorcana | Disney Lorcana Hyperia City Prerelease Box (Pack of 3) | $99.98 (pack 3) | $33.33 | $42.27 | tcgplayer_market | high | -21% | $99.98 (pack 3) |  | Single box (not case). Lowest $38. |
| Lorcana | Disney Lorcana Wilds Unknown Booster Display Box | $199.96 (pack 1) | $199.96 | $226.37 | tcgplayer_market | high | -12% | $149.97 (pack 1) |  |  |
| Lorcana | Disney Lorcana Wilds Unknown Illumineers Trove (Pack of 3) | $249.95 (pack 3) | $83.32 | $101.03 | tcgplayer_market | high | -18% | $149.97 (pack 2) |  |  |
| Lorcana | Disney Lorcana Winterspell Booster Display Box | $199.96 (pack 1) | $199.96 | $238.77 | tcgplayer_market | high | -16% | $149.97 (pack 1) |  |  |
| Lorcana | Disney Lorcana Winterspell Illumineers Trove (Pack of 2) | $149.97 (pack 2) | $74.98 | $98.82 | tcgplayer_market | high | -24% | $149.97 (pack 2) |  | Single trove. Lowest $89.99. |
| MTG | MTG Lorwyn Eclipsed Bundle | $49.99 (pack 1) | $49.99 | $63.32 | tcgplayer_market | high | -21% | $49.99 (pack 1) |  |  |
| MTG | MTG Lorwyn Eclipsed Collector Booster Box | $349.93 (pack 1) | $349.93 | $408.18 | tcgplayer_market | high | -14% | $299.94 (pack 1) |  |  |
| MTG | MTG Lorwyn Eclipsed Draft Night (Pack of 2) | $149.97 (pack 2) | $74.98 | $87.31 | tcgplayer_market | high | -14% | $199.96 (pack 3) |  |  |
| MTG | MTG Lorwyn Eclipsed Play Booster Box (Pack of 3) | $249.95 (pack 3) | $83.32 | $101.79 | tcgplayer_market | high | -18% | $149.97 (pack 2) |  | Display (box), not case. Lowest $100. |
| MTG | MTG Marvel Super Heroes Bundle (Pack of 5) | $149.97 (pack 5) | $29.99 | $37.57 | tcgplayer_market | high | -20% | $49.99 (pack 2) |  | Regular bundle, not Gift Bundle ($70.61). |
| MTG | MTG Marvel Super Heroes Collector Booster Box | $399.92 (pack 1) | $399.92 | $456.22 | tcgplayer_market | high | -12% | $299.94 (pack 1) |  |  |
| MTG | MTG Marvel Super Heroes Draft Night (Pack of 2) | $149.97 (pack 2) | $74.98 | $85.15 | tcgplayer_market | high | -12% | $199.96 (pack 3) |  |  |
| MTG | MTG Marvel Super Heroes Gift Bundle (Pack of 3) | $199.96 (pack 3) | $66.65 | $70.61 | tcgplayer_market | high | -6% | $49.99 (pack 1) |  | Gift Bundle (not regular Bundle $37.57). |
| MTG | MTG Marvel Super Heroes Jumpstart Booster Box (Pack of 2) | $149.97 (pack 2) | $74.98 | $95.35 | tcgplayer_market | high | -21% | $149.97 (pack 2) |  |  |
| MTG | MTG Marvel Super Heroes Play Booster Box | $99.98 (pack 1) | $99.98 | $104.43 | tcgplayer_market | high | -4% | $149.97 (pack 2) |  |  |
| MTG | MTG Reality Fracture Bundle (Pack of 4) | $149.97 (pack 4) | $37.49 | $43.82 | tcgplayer_market | high | -14% | $99.98 (pack 3) |  | Regular Bundle, not the Secret Lair Bundle (market $117.17). |
| MTG | MTG Reality Fracture Collector Booster Display | $349.93 (pack 1) | $349.93 | $372.24 | tcgplayer_market | high | -6% | $249.95 (pack 1) |  | Lowest $370. |
| MTG | MTG Reality Fracture Draft Night (Pack of 3) | $199.96 (pack 3) | $66.65 | $74.07 | tcgplayer_market | high | -10% | $49.99 (pack 1) |  |  |
| MTG | MTG Reality Fracture Multiverse Reforged Commander Deck (Pack of 4) | $149.97 (pack 4) | $37.49 | $48.44 | tcgplayer_market | high | -23% | $99.98 (pack 3) |  |  |
| MTG | MTG Reality Fracture Play Booster Box | $99.98 (pack 1) | $99.98 | $119.49 | tcgplayer_market | high | -16% | $149.97 (pack 2) |  |  |
| MTG | MTG Reality Fracture Prerelease Pack (Pack of 2) | $49.99 (pack 2) | $25.00 | $29.26 | tcgplayer_market | high | -15% | $99.98 (pack 5) |  | Single prerelease pack (not case). |
| MTG | MTG Reality Fracture Secret Lair Bundle (Pack of 2) | $249.95 (pack 2) | $124.97 | $117.17 | tcgplayer_market | medium | +7% | $149.97 (pack 2) |  | Market 117.17 but lowest listing $15 among 102 listings (likely outlier/mislisted); verify |
| MTG | MTG Secrets of Strixhaven Bundle (Pack of 3) | $99.98 (pack 3) | $33.33 | $42.79 | tcgplayer_market | high | -22% | $99.98 (pack 3) |  | Standard bundle, not Codex Bundle. |
| MTG | MTG Secrets of Strixhaven Codex Bundle | $99.98 (pack 1) | $99.98 | $127.94 | tcgplayer_market | medium | -22% | $99.98 (pack 1) |  | Lowest listing $14.99 is an outlier; listed median $167.19. |
| MTG | MTG Secrets of Strixhaven Collector Booster Box | $449.91 (pack 1) | $449.91 | $494.99 | tcgplayer_market | high | -9% | $349.93 (pack 1) |  | Lowest $488.95. |
| MTG | MTG Secrets of Strixhaven Commander Deck [Lorehold Spirit] (Pack of 3) | $99.98 (pack 3) | $33.33 | $38.77 | tcgplayer_market | high | -14% | $49.99 (pack 2) |  |  |
| MTG | MTG Secrets of Strixhaven Commander Deck [Prismari Artistry] (Pack of 3) | $99.98 (pack 3) | $33.33 | $42.87 | tcgplayer_market | high | -22% | $99.98 (pack 3) |  |  |
| MTG | MTG Secrets of Strixhaven Commander Deck [Quandrix Unlimited] (Pack of 3) | $99.98 (pack 3) | $33.33 | $38.92 | tcgplayer_market | high | -14% | $49.99 (pack 2) |  |  |
| MTG | MTG Secrets of Strixhaven Commander Deck [Silverquill Influence] | $49.99 (pack 1) | $49.99 | $65.26 | tcgplayer_market | high | -23% | $49.99 (pack 1) |  | Regular deck; no collector's edition found. |
| MTG | MTG Secrets of Strixhaven Commander Deck [Witherbloom Pestilence] (Pack of 6) | $249.95 (pack 6) | $41.66 | $61.88 | tcgplayer_market | high | -33% | $149.97 (pack 4) |  |  |
| MTG | MTG Secrets of Strixhaven Play Booster Box (Pack of 2) | $249.95 (pack 2) | $124.97 | $145.36 | tcgplayer_market | high | -14% | $99.98 (pack 1) |  |  |
| MTG | MTG Star Trek Beam Me Up Bundle | $99.98 (pack 1) | $99.98 | $126.44 | tcgplayer_market | high | -21% | $99.98 (pack 1) |  |  |
| MTG | MTG Star Trek Bundle (Pack of 6) | $249.95 (pack 6) | $41.66 | $49.17 | tcgplayer_market | high | -15% | $99.98 (pack 3) |  | Regular Bundle, not Beam Me Up Bundle ($126.44). |
| MTG | MTG Star Trek Collector Booster Box | $499.90 (pack 1) | $499.90 | $457.1 | tcgplayer_market | high | +9% | $299.94 (pack 1) |  |  |
| MTG | MTG Star Trek Collectors Edition Commander Deck [Federation Fleet] | $199.96 (pack 1) | $199.96 | $202.94 | tcgplayer_market | high | -1% | $149.97 (pack 1) |  |  |
| MTG | MTG Star Trek Collectors Edition Commander Deck [Klingon Fury] | $149.97 (pack 1) | $149.97 | $192.47 | tcgplayer_market | medium | -22% | $149.97 (pack 1) |  | Market well above lowest listing ($90.00). |
| MTG | MTG Star Trek Collectors Edition Commander Deck [Landing Party] | $149.97 (pack 1) | $149.97 | $174.17 | tcgplayer_market | high | -14% | $249.95 (pack 2) |  |  |
| MTG | MTG Star Trek Collectors Edition Commander Deck [We Are the Borg] | $199.96 (pack 1) | $199.96 | $204.9 | tcgplayer_market | high | -2% | $149.97 (pack 1) |  | Lowest $189. |
| MTG | MTG Star Trek Commander Deck [Federation Fleet] | $49.99 (pack 1) | $49.99 | $59.9 | tcgplayer_market | high | -17% | $149.97 (pack 4) |  |  |
| MTG | MTG Star Trek Commander Deck [Klingon Fury] | $49.99 (pack 1) | $49.99 | $59.67 | tcgplayer_market | high | -16% | $149.97 (pack 4) |  |  |
| MTG | MTG Star Trek Commander Deck [Landing Party] | $49.99 (pack 1) | $49.99 | $57.2 | tcgplayer_market | high | -13% | $149.97 (pack 4) |  |  |
| MTG | MTG Star Trek Commander Deck [We Are the Borg] (Pack of 4) | $249.95 (pack 4) | $62.49 | $66.18 | tcgplayer_market | high | -6% | $49.99 (pack 1) |  | Regular edition. |
| MTG | MTG Star Trek Draft Night (Pack of 2) | $149.97 (pack 2) | $74.98 | $93.65 | tcgplayer_market | high | -20% | $199.96 (pack 3) |  |  |
| MTG | MTG Star Trek Play Booster Box | $99.98 (pack 1) | $99.98 | $114.72 | tcgplayer_market | high | -13% | $149.97 (pack 2) |  |  |
| MTG | MTG Star Trek Prerelease Pack (Pack of 3) | $99.98 (pack 3) | $33.33 | $32.57 | tcgplayer_market | high | +2% | $49.99 (pack 2) |  |  |
| MTG | MTG Star Trek Scene Box [Divergent Timeline] (Pack of 3) | $99.98 (pack 3) | $33.33 | $34.99 | tcgplayer_market | high | -5% | $49.99 (pack 2) |  | Lowest $29.21. |
| MTG | MTG Star Trek Scene Box [Enterprise-Q] (Pack of 3) | $99.98 (pack 3) | $33.33 | $37.74 | tcgplayer_market | high | -12% | $49.99 (pack 2) |  |  |
| MTG | MTG Teenage Mutant Ninja Turtles Bundle (Pack of 3) | $99.98 (pack 3) | $33.33 | $42.76 | tcgplayer_market | high | -22% | $99.98 (pack 3) |  | Standard bundle, not Pizza Bundle. |
| MTG | MTG Teenage Mutant Ninja Turtles Collector Booster Box | $399.92 (pack 1) | $399.92 | $431.65 | tcgplayer_market | high | -7% | $299.94 (pack 1) |  |  |
| MTG | MTG Teenage Mutant Ninja Turtles Commander Deck (Pack of 3) | $99.98 (pack 3) | $33.33 | $42.98 | tcgplayer_market | high | -22% | $99.98 (pack 3) |  | Only TMNT commander deck on TCGplayer. |
| MTG | MTG Teenage Mutant Ninja Turtles Play Booster Box | $99.98 (pack 1) | $99.98 | $103.63 | tcgplayer_market | high | -4% | $149.97 (pack 2) |  |  |
| MTG | MTG The Hobbit Bundle (Pack of 3) | $99.98 (pack 3) | $33.33 | $44.53 | tcgplayer_market | high | -25% | $99.98 (pack 3) |  | Standard bundle, not Gift Bundle. |
| MTG | MTG The Hobbit Collector Booster Box | $549.89 (pack 1) | $549.89 | $577.04 | tcgplayer_market | high | -5% | $399.92 (pack 1) |  |  |
| MTG | MTG The Hobbit Draft Night | $99.98 (pack 1) | $99.98 | $112.6 | tcgplayer_market | high | -11% | $149.97 (pack 2) |  | Single (not case). Lowest $94. |
| MTG | MTG The Hobbit Gift Bundle (Pack of 2) | $149.97 (pack 2) | $74.98 | $87.36 | tcgplayer_market | high | -14% | $199.96 (pack 3) |  |  |
| MTG | MTG The Hobbit Play Booster Box (Pack of 2) | $249.95 (pack 2) | $124.97 | $131.26 | tcgplayer_market | high | -5% | $99.98 (pack 1) |  |  |
| One Piece | One Piece Card Game Double Pack Set Vol.13 [DP-13] (Pack of 3) | $199.96 (pack 3) | $66.65 | $69.87 | tcgplayer_market | medium | -5% | $49.99 (pack 1) |  | Only 4 listings; single set, not the Display. |
| One Piece | One Piece Card Game EB-03 One Piece Heroines Edition Booster Box (English, 24 packs) | $249.95 (pack 1) | $249.95 | $289.26 | tcgplayer_market | medium | -14% | $199.96 (pack 1) |  | EB-03 (original, not Vol.2 $244.60). Lowest listing $87.97 is anomalous; market price used |
| One Piece | One Piece Card Game EB-05 One Piece Heroines Edition Vol. 2 Booster Box (English, 24 packs) | $249.95 (pack 1) | $249.95 | $244.6 | tcgplayer_market | medium | +2% | $149.97 (pack 1) |  | Lowest listing $64 vs market $244.60 (outlier listings present). |
| One Piece | One Piece Card Game EB-05 One Piece Heroines Edition Vol. 2 Booster Pack (English) (Pack of 6) | $49.99 (pack 6) | $8.33 | $8.01 | tcgplayer_market | high | +4% | $49.99 (pack 8) |  |  |
| One Piece | One Piece Card Game OP-05 Awakening of the New Era Booster Box (English, 24 packs) | $949.81 (pack 1) | $949.81 | $989.48 | tcgplayer_market | medium | -4% | $699.86 (pack 1) |  | Wide spread: lowest listing $349.97, listed median $1275. |
| One Piece | One Piece Card Game OP-09 Emperors in the New World Booster Box (English, 24 packs) | $599.88 (pack 1) | $599.88 | $635.71 | tcgplayer_market | medium | -6% | $449.91 (pack 1) |  | Lowest listing $150 anomalous vs market. |
| One Piece | One Piece Card Game OP-11 A Fist of Divine Speed Booster Box (English, 24 packs) | $499.90 (pack 1) | $499.90 | $533.07 | tcgplayer_market | medium | -6% | $349.93 (pack 1) |  | Lowest listing $99.94 vs market $533.07 (outlier listings present). |
| One Piece | One Piece Card Game OP-12 Legacy of the Master Booster Box (English, 24 packs) | $249.95 (pack 1) | $249.95 | $292.23 | tcgplayer_market | high | -14% | $199.96 (pack 1) |  |  |
| One Piece | One Piece Card Game OP-13 Carrying On His Will Booster Box (English, 24 packs) | $399.92 (pack 1) | $399.92 | $417.72 | tcgplayer_market | medium | -4% | $299.94 (pack 1) |  | Lowest listing $72 is an outlier; listed median $597.21. |
| One Piece | One Piece Card Game OP-14 The Azure Sea's Seven Booster Box (English, 24 packs) | $249.95 (pack 1) | $249.95 | $257.15 | tcgplayer_market | medium | -3% | $199.96 (pack 1) |  | Lowest listing $9.99 anomalous; market price used. |
| One Piece | One Piece Card Game OP-15 Adventure on Kami's Island Booster Box (English, 24 packs) | $199.96 (pack 1) | $199.96 | $249.05 | tcgplayer_market | high | -20% | $149.97 (pack 1) |  |  |
| One Piece | One Piece Card Game OP-15 Adventure on Kami's Island Booster Pack (English) (Pack of 7) | $49.99 (pack 7) | $7.14 | $7.67 | tcgplayer_market | high | -7% | $49.99 (pack 9) |  | Not the Dash Pack or Sleeved pack. |
| One Piece | One Piece Card Game OP-16 The Time of Battle Booster Box (English, 24 packs) (Pack of 2) | $349.93 (pack 2) | $174.97 | $207.5 | tcgplayer_market | medium | -16% | $149.97 (pack 1) |  | Lowest listing $42 is an outlier; listed median $247.97. |
| One Piece | One Piece Card Game OP-16 The Time of Battle Booster Pack (English) (Pack of 9) | $49.99 (pack 9) | $5.55 | $7.12 | tcgplayer_market | high | -22% | $49.99 (pack 9) |  | Unsleeved pack (sleeved $10.84). |
| One Piece | One Piece Card Game OP-17 The World's Strongest Warriors Booster Box (English, 24 packs) | $249.95 (pack 1) | $249.95 | $296.33 | tcgplayer_market | high | -16% | $199.96 (pack 1) |  |  |
| One Piece | One Piece Card Game OP-17 The World's Strongest Warriors Booster Pack (English) (Pack of 7) | $49.99 (pack 7) | $7.14 | $8.76 | tcgplayer_market | high | -18% | $49.99 (pack 8) |  | Unsleeved booster pack. |
| One Piece | One Piece Card Game OP-18 The Dominance of God Booster Box (English, 24 packs) | $249.95 (pack 1) | $249.95 | $240.62 | tcgplayer_market | high | +4% | $149.97 (pack 1) |  |  |
| One Piece | One Piece Card Game OP-18 The Dominance of God Booster Pack (English) (Pack of 5) | $99.98 (pack 5) | $20.00 | $24.56 | tcgplayer_market | medium | -19% | $49.99 (pack 3) |  | Unsleeved pack; only 4 listings (lowest $23.79). Box market $240.62 implies ~$10/pack; pac |
| One Piece | One Piece Card Game PRB-02 The Best Vol. 2 Booster Box (English, 20 packs) | $299.94 (pack 1) | $299.94 | $367.72 | tcgplayer_market | high | -18% | $249.95 (pack 1) |  |  |
| Panini | 2025-26 Panini Prizm Basketball Hobby Box | $199.96 (pack 1) | $199.96 | $259.95 | retailer:Midwest Cards | medium | -23% | $199.96 (pack 1) |  | Not on TCGplayer (sports). Midwest Cards in stock, GTIN 746134195204 matches. Giant Sports |
| Panini | 2025 Panini Prizm NFL Football Hobby Box | $899.82 (pack 1) | $899.82 | $934.95 | retailer:Giant Sports Cards | medium | -4% | $649.87 (pack 1) |  | Not on TCGplayer (sports). GTIN 746134187247 matches. Lowest IN-STOCK verified price; sold |
| Pokémon | Pokémon TCG 30th Celebration 2-Pack Blister | $49.99 (pack 1) | $49.99 | $58.2 | tcgplayer_market | medium | -14% | $149.97 (pack 4) |  | TCGplayer market price present but 0 live listings; may be stale. |
| Pokémon | Pokémon TCG 30th Celebration Battle Deck [Espeon ex] (Pack of 2) | $49.99 (pack 2) | $25.00 | $29.6 | tcgplayer_market | high | -16% | $99.98 (pack 5) |  |  |
| Pokémon | Pokémon TCG 30th Celebration Battle Deck [Umbreon ex] (Pack of 7) | $149.97 (pack 7) | $21.42 | $28.9 | tcgplayer_market | high | -26% | $99.98 (pack 5) |  | Single deck (not set of 2). |
| Pokémon | Pokémon TCG 30th Celebration Binder Collection (Pack of 3) | $249.95 (pack 3) | $83.32 | $94.9 | tcgplayer_market | high | -12% | $149.97 (pack 2) |  |  |
| Pokémon | Pokémon TCG 30th Celebration Booster Bundle (Pack of 3) | $199.96 (pack 3) | $66.65 | $63.71 | tcgplayer_market | high | +5% | $49.99 (pack 1) |  |  |
| Pokémon | Pokémon TCG 30th Celebration Booster Bundle Case | $1199.76 (pack 1) | $1199.76 | $1827.9 | tcgplayer_market | high | -34% | $1199.76 (pack 1) |  |  |
| Pokémon | Pokémon TCG 30th Celebration Booster Pack (Pack of 6) | $49.99 (pack 6) | $8.33 | $10.94 | tcgplayer_market | high | -24% | $49.99 (pack 6) |  | English (ME), not Japanese M6a. |
| Pokémon | Pokémon TCG 30th Celebration Classic Collection Pack (Pack of 2) | $249.95 (pack 2) | $124.97 | $231.75 | tcgplayer_market | medium | -46% | $149.97 (pack 1) |  | Market $231.75; lowest listing $70 (34 listings) - wide spread. |
| Pokémon | Pokémon TCG 30th Celebration Ditto Premium Collection (Pack of 2) | $249.95 (pack 2) | $124.97 | $95.47 | tcgplayer_market | high | +31% | $149.97 (pack 2) |  |  |
| Pokémon | Pokémon TCG 30th Celebration Ditto Premium Collection Case | $849.83 (pack 1) | $849.83 | $1054.63 | tcgplayer_market | medium | -19% | $749.85 (pack 1) |  | Lowest listing $635.01 well below market. |
| Pokémon | Pokémon TCG 30th Celebration Elite Trainer Box | $99.98 (pack 1) | $99.98 | $104.57 | tcgplayer_market | high | -4% | $149.97 (pack 2) |  | Standard ETB (not Pokemon Center ETB $260.22). |
| Pokémon | Pokémon TCG 30th Celebration Elite Trainer Box Case | $1149.77 (pack 1) | $1149.77 | $1163.32 | tcgplayer_market | high | -1% | $799.84 (pack 1) |  | Retail ETB case. Lowest $1044.97. |
| Pokémon | Pokémon TCG 30th Celebration ex Tin (International Version) [Greninja ex] | $49.99 (pack 1) | $49.99 | $55.9 | tcgplayer_market | medium | -11% | $149.97 (pack 4) |  | International version (Retail version is a separate product at $64.98). Only 6 listings; l |
| Pokémon | Pokémon TCG 30th Celebration ex Tin (Retail Version) [Greninja ex] (Pack of 6) | $249.95 (pack 6) | $41.66 | $64.98 | tcgplayer_market | medium | -36% | $49.99 (pack 1) |  | Retail Version (International is $55.90). Lowest listing $12.95 vs market $64.98, wide spr |
| Pokémon | Pokémon TCG 30th Celebration ex Tin (International Version) [Sylveon ex] (Pack of 3) | $199.96 (pack 3) | $66.65 | $73.1 | tcgplayer_market | medium | -9% | $49.99 (pack 1) |  | International version (Retail $58.87). Only 3 listings, lowest $94.39. |
| Pokémon | Pokémon TCG 30th Celebration ex Tin (Retail Version) [Sylveon ex] (Pack of 5) | $199.96 (pack 5) | $39.99 | $58.87 | tcgplayer_market | high | -32% | $149.97 (pack 4) |  |  |
| Pokémon | Pokémon TCG 30th Celebration Figure Collection Case | $699.86 (pack 1) | $699.86 | $732.7 | tcgplayer_market | high | -4% | $499.90 (pack 1) |  |  |
| Pokémon | Pokémon TCG 30th Celebration Figure Collection [Mew] (Pack of 2) | $249.95 (pack 2) | $124.97 | $77.26 | tcgplayer_market | high | +62% | $49.99 (pack 1) |  |  |
| Pokémon | Pokémon TCG 30th Celebration Figure Collection [Mewtwo] (Pack of 2) | $249.95 (pack 2) | $124.97 | $87.82 | tcgplayer_market | high | +42% | $199.96 (pack 3) |  | Lowest $83. |
| Pokémon | Pokémon TCG 30th Celebration Greninja ex Box (Pack of 5) | $149.97 (pack 5) | $29.99 | $43.39 | tcgplayer_market | high | -31% | $99.98 (pack 3) |  |  |
| Pokémon | Pokémon TCG 30th Celebration Knock Out Collection (Pack of 3) | $49.99 (pack 3) | $16.66 | $21.15 | tcgplayer_market | high | -21% | $49.99 (pack 3) |  |  |
| Pokémon | Pokémon TCG 30th Celebration Mini Tin Display | $199.96 (pack 1) | $199.96 | $232.58 | tcgplayer_market | medium | -14% | $149.97 (pack 1) |  | Lowest listing $24.99 is likely a mislisted single tin; listed median $249.97. |
| Pokémon | Pokémon TCG 30th Celebration Pokemon Center Elite Trainer Box | $249.95 (pack 1) | $249.95 | $260.22 | tcgplayer_market | high | -4% | $199.96 (pack 1) |  | PC exclusive (retail ETB $104.57). |
| Pokémon | Pokémon TCG 30th Celebration Poster Collection (Pack of 7) | $149.97 (pack 7) | $21.42 | $31.84 | tcgplayer_market | high | -33% | $49.99 (pack 2) |  |  |
| Pokémon | Pokémon TCG 30th Celebration Sylveon ex Box (Pack of 4) | $149.97 (pack 4) | $37.49 | $44.86 | tcgplayer_market | high | -16% | $99.98 (pack 3) |  | ex Box, not the ex Tin. |
| Pokémon | Pokémon TCG 30th Celebration Tech Sticker Collection [Alolan Exeggutor] (Pack of 7) | $149.97 (pack 7) | $21.42 | $34.56 | tcgplayer_market | high | -38% | $49.99 (pack 2) |  |  |
| Pokémon | Pokémon TCG 30th Celebration Ultra-Premium Collection Case | $1199.76 (pack 1) | $1199.76 | $1362.95 | tcgplayer_market | high | -12% | $949.81 (pack 1) |  | Case. Lowest $1340. |
| Pokémon | Pokémon TCG 30th Celebration Ultra-Premium Collection [Day] | $399.92 (pack 1) | $399.92 | $367.74 | tcgplayer_market | high | +9% | $249.95 (pack 1) |  |  |
| Pokémon | Pokémon TCG 30th Celebration Ultra-Premium Collection [Night] | $399.92 (pack 1) | $399.92 | $426.45 | tcgplayer_market | high | -6% | $299.94 (pack 1) |  |  |
| Pokémon | Pokémon TCG Chaos Rising Booster Box | $149.97 (pack 1) | $149.97 | $182.68 | tcgplayer_market | high | -18% | $249.95 (pack 2) |  |  |
| Pokémon | Pokémon TCG Delta Reign Booster Box | $199.96 (pack 1) | $199.96 | $217.17 | tcgplayer_market | high | -8% | $149.97 (pack 1) |  | Full box (not half). Lowest $205. |
| Pokémon | Pokémon TCG Delta Reign Booster Bundle | $49.99 (pack 1) | $49.99 | $40.79 | tcgplayer_market | high | +23% | $49.99 (pack 2) |  |  |
| Pokémon | Pokémon TCG Delta Reign Build & Battle Box (Pack of 4) | $149.97 (pack 4) | $37.49 | $46.29 | tcgplayer_market | high | -19% | $99.98 (pack 3) |  | Single box, not display. |
| Pokémon | Pokémon TCG Delta Reign Elite Trainer Box | $99.98 (pack 1) | $99.98 | $83.87 | tcgplayer_market | high | +19% | $199.96 (pack 3) |  | Standard ETB, not the Pokemon Center ETB ($265.75). |
| Pokémon | Pokémon TCG Delta Reign Pokémon Center Elite Trainer Box | $249.95 (pack 1) | $249.95 | $265.75 | tcgplayer_market | high | -6% | $199.96 (pack 1) |  | PC exclusive (retail ETB $83.91). Lowest $199.01. |
| Pokémon | Pokémon TCG Mega Evolution Booster Box | $299.94 (pack 1) | $299.94 | $299.77 | tcgplayer_market | high | +0% | $199.96 (pack 1) |  | Standard 36-pack booster box, not Enhanced or Half box. |
| Pokémon | Pokémon TCG Perfect Order Booster Box | $149.97 (pack 1) | $149.97 | $172.09 | tcgplayer_market | high | -13% | $249.95 (pack 2) |  |  |
| Pokémon | Pokémon TCG Phantasmal Flames Booster Box | $349.93 (pack 1) | $349.93 | $386.94 | tcgplayer_market | high | -10% | $249.95 (pack 1) |  |  |
| Pokémon | Pokémon TCG Pitch Black Booster Box | $149.97 (pack 1) | $149.97 | $175.39 | tcgplayer_market | high | -14% | $249.95 (pack 2) |  |  |
| Pokémon | Pokémon TCG Pitch Black Booster Bundle (Pack of 5) | $99.98 (pack 5) | $20.00 | $39.32 | tcgplayer_market | high | -49% | $49.99 (pack 2) |  | Single bundle (not case). |
| Pokémon | Pokémon TCG Pitch Black Elite Trainer Box (Pack of 3) | $199.96 (pack 3) | $66.65 | $69.97 | tcgplayer_market | high | -5% | $49.99 (pack 1) |  | Standard ETB (not Pokemon Center ETB $119.03). |
| Pokémon | Pokémon TCG Pitch Black Pokemon Center Elite Trainer Box (Exclusive) | $99.98 (pack 1) | $99.98 | $119.03 | tcgplayer_market | high | -16% | $149.97 (pack 2) |  |  |
| Topps | 2025-26 Topps Chrome Basketball Hobby Box | $1199.76 (pack 1) | $1199.76 | $749.99 | retailer:Columbia Sports Cards | low | +60% | $549.89 (pack 1) |  | Sports cards not on TCGplayer. Lowest verified US retailer listing, but OUT OF STOCK every |
| Topps | 2025-26 Topps Finest Basketball Hobby Box | $849.83 (pack 1) | $849.83 | $974.95 | retailer:Giant Sports Cards | medium | -13% | $699.86 (pack 1) |  | Sports card product, not on TCGplayer; lowest in-stock price verified via retailer's Shopi |
| Topps | 2026-27 Topps Flagship Basketball Hobby Box | $249.95 (pack 1) | $249.95 | $274.95 | retailer:Giant Sports Cards | medium | -9% | $199.96 (pack 1) |  | Not on TCGplayer. Giant (GTIN 887521165438 matches) and Midwest Cards both $274.95 in stoc |
| Topps | 2026-27 Topps Flagship Basketball Hobby Jumbo Box | $499.90 (pack 1) | $499.90 | $449.94 | retailer:Columbia Sports Cards | medium | +11% | $299.94 (pack 1) |  | Not on TCGplayer. In stock. Others: 941 Sports Cards $449.95, Awesome Card Shop $479.75, G |
| Topps | 2026 Bowman Baseball Hobby Box | $399.92 (pack 1) | $399.92 | $424.95 | retailer:Giant Sports Cards | medium | -6% | $299.94 (pack 1) |  | Sports card product, not on TCGplayer; lowest in-stock price verified via retailer's Shopi |
| Topps | 2026 Bowman Chrome Baseball Hobby Box | $549.89 (pack 1) | $549.89 | $584.95 | retailer:Giant Sports Cards | medium | -6% | $399.92 (pack 1) |  | Not on TCGplayer. GTIN matches. Lowest in-stock verified (Awesome Card Shop $594.75 in sto |
| Topps | 2026 Bowman Chrome Baseball Mega Box (Pack of 2) | $149.97 (pack 2) | $74.98 | $84.95 | retailer:Midwest Cards | medium | -12% | $199.96 (pack 3) |  | Not on TCGplayer. Midwest Cards in stock; price is per single box. |
| Topps | 2026 Topps Chrome Baseball Hobby Box | $499.90 (pack 1) | $499.90 | $539.95 | retailer:Giant Sports Cards | medium | -7% | $399.92 (pack 1) |  | Not on TCGplayer. Lowest in-stock verified (Awesome Card Shop $559.75). Cheaper listings o |
| Topps | 2026 Topps Chrome Baseball Jumbo Hobby Box | $749.85 (pack 1) | $749.85 | $809.95 | retailer:Giant Sports Cards | medium | -7% | $549.89 (pack 1) |  | Sports card product, not on TCGplayer; lowest in-stock price verified via retailer's Shopi |
| Topps | 2026 Topps Chrome Football Hobby Box | $599.88 (pack 1) | $599.88 | $599.94 | retailer:Diamond Cards Online | low | -0% | $399.92 (pack 1) |  | Not on TCGplayer. Pre-sell (release ~2026-11-18), GTIN 887521167661 matches. Awesome Card  |
| Topps | 2026 Topps Chrome Football Mega Box | $99.98 (pack 1) | $99.98 | $109.95 | retailer:Midwest Cards | low | -9% | $149.97 (pack 2) |  | Not on TCGplayer. Midwest Cards PRE-ORDER (release Dec 2, 2026); not yet released, so no m |
| Topps | 2026 Topps Cosmic Chrome Baseball Hobby Box | $1049.79 (pack 1) | $1049.79 | $949.99 | retailer:Columbia Sports Cards | medium | +11% | $649.87 (pack 1) |  | Not on TCGplayer. In stock. Others: Giant $1059.95, Cardiacs $1099.95, Sports Room PDX $10 |
| Topps | 2026 Topps Finest Baseball Hobby Box | $649.87 (pack 1) | $649.87 | $685.75 | retailer:The Awesome Card Shop | medium | -5% | $499.90 (pack 1) |  | Sports card product, not on TCGplayer; lowest in-stock price verified via retailer's Shopi |
| Topps | 2026 Topps Heritage Baseball Hobby Box | $149.97 (pack 1) | $149.97 | $159.99 | retailer:Time Travelers | low | -6% | $99.98 (pack 1) |  | Not on TCGplayer. GTIN matches but every verified retailer listing is sold out: Time Trave |
| Topps | 2026 Topps Heritage Football Hobby Box (Pack of 2) | $249.95 (pack 2) | $124.97 | $149.95 | retailer:Giant Sports Cards | medium | -17% | $99.98 (pack 1) |  | Not on TCGplayer. Giant (GTIN 887521163755 matches) and Midwest Cards both $149.95 in stoc |
| Topps | 2026 Topps Inception Football Hobby Box | $549.89 (pack 1) | $549.89 | $499.94 | retailer:Columbia Sports Cards | medium | +10% | $349.93 (pack 1) |  | Not on TCGplayer. In stock. Others: Cardiacs $549.95, Awesome $574.75, Sports Room PDX $57 |
| Topps | 2026 Topps Museum Collection Baseball Hobby Box | $699.86 (pack 1) | $699.86 | $699.95 | retailer:Giant Sports Cards | medium | -0% | $499.90 (pack 1) |  | Sports card product, not on TCGplayer; lowest in-stock price verified via retailer's Shopi |
| Topps | 2026 Topps Series 1 Baseball Hobby Box | $199.96 (pack 1) | $199.96 | $209.95 | retailer:Giant Sports Cards | medium | -5% | $149.97 (pack 1) |  | Not on TCGplayer. GTIN matches. Lowest in-stock verified (941 Sports Cards $219.95; The Ca |

---

## C. The original 30, re-evaluated

The 30 were chosen by a model from a worksheet before the store had live pages, prices or a feed. This pass scores them on what is now observable. Ten factors, each stated so you can disagree with one and re-run it (`scores.json` carries every factor per product):

| Factor | Points | What earns them |
|---|---|---|
| Price position today | 0–3 | unit price ≥20% below market 3 · ≥10% 2 · ≤0% 1 · above market 0 |
| Price position after the pending reprice | 0–3 | ≥30% below 3 · ≥20% 2 · less 1 |
| Availability | 0–3 | in stock 3 · released, awaiting stock 1 · not yet released 0 |
| Identifier | 0–2 | GTIN live 2 · GTIN found in this research 1 · none 0 |
| Demand proxy | 0–4 | high 4 · medium 2 · low 0 · not assessed 2 (TCGplayer 30-day units sold and listings, release recency, reprint news; see appendix) |
| Competition proxy | 0–3 | low 3 · medium 1.5 · high 0 · not assessed 1.5 (big-box retailers listing it at MSRP = high) |
| Big-box undercut | −2 or 0 | −2 where a big-box retailer sells it, buyable now (not sold out, marketplace or preorder), below your unit price *after* the pending reprice |
| Order value | 0–2 | unit price ≥ $150 2 · ≥ $60 1 · below 0 (a $1 click on a $40 item rarely pays) |
| Sold as a single | 0–1 | single 1 · pack 0 (a multipack ad shows the pack price and clicks worse) |
| Image on your domain | 0–1 | own-hosted or composite 1 · Shopify CDN 0 |
| Market-price confidence | 0–1 | high 1 · else 0 |

Maximum 23. Verdicts for an in-stock product: **Keep** ≥ 15; **Keep, after reprice** 12–14.5 where today's price is the weak factor; **Drop** below 12. For a product not yet in stock (released-awaiting or unreleased): **Hold** if it would reach 12 with the availability points it earns on arrival, otherwise **Drop**.

What the demand and competition columns are: proxies gathered 6 November (TCGplayer 30-day units sold, listing counts and price trend, read from TCGplayer's own search and price-history endpoints; whether Target/Walmart/Amazon/GameStop/Best Buy/Pokémon Center list the item and at what price, from search results the same day; release recency and reprint news). They are not sales figures for this store; TCGplayer has no sealed sports boxes, so the Topps/Panini demand grade is an estimate from the set's profile and dealer activity; eBay was unreachable from this environment. Where a signal was not assessed the cell says n/a and the factor takes its neutral value.

### C1. Summary of verdicts

Of the 30: **17 keep as they are**, **2 keep once repriced**, **10 hold** (released-but-awaiting or unreleased; most also need the reprice), **1 drop**. The original list was not wrong about demand: 22 of the 30 score high on the demand proxy. It was blind to price position and to timing, which is why a third of it cannot run on day one.

**Keep (run from day one):**

- MTG Reality Fracture Multiverse Reforged Commander Deck (Pack of 4) (score 18.5; unit $37.49, -23% vs market, -31% after reprice; 1447 sold on TCGplayer in 30 days)
- MTG The Hobbit Collector Booster Box (score 18.5; unit $549.89, -5% vs market, -31% after reprice; 456 sold on TCGplayer in 30 days)
- One Piece Card Game OP-17 The World's Strongest Warriors Booster Box (score 18.5; unit $249.95, -16% vs market, -32% after reprice; 526 sold on TCGplayer in 30 days)
- MTG Reality Fracture Collector Booster Display (score 18; unit $349.93, -6% vs market, -33% after reprice; 1154 sold on TCGplayer in 30 days)
- Pokémon TCG 30th Celebration Pokemon Center Elite Trainer Box (score 17.5; unit $249.95, -4% vs market, -23% after reprice; 282 sold on TCGplayer in 30 days)
- Pokémon TCG Chaos Rising Booster Box (score 17.5; unit $149.97, -18% vs market, -32% after reprice; 415 sold on TCGplayer in 30 days)
- MTG Reality Fracture Play Booster Box (score 17; unit $99.98, -16% vs market, -37% after reprice; 2623 sold on TCGplayer in 30 days)
- 2026 Topps Chrome Baseball Hobby Box (score 16.5; unit $499.90, -7% vs market, -26% after reprice)
- MTG The Hobbit Play Booster Box (Pack of 2) (score 16.5; unit $124.97, -5% vs market, -24% after reprice; 708 sold on TCGplayer in 30 days)
- One Piece Card Game OP-15 Adventure on Kami's Island Booster Box (score 16.5; unit $199.96, -20% vs market, -40% after reprice; 74 sold on TCGplayer in 30 days)
- MTG Marvel Super Heroes Collector Booster Box (score 16; unit $399.92, -12% vs market, -34% after reprice; 82 sold on TCGplayer in 30 days)
- Pokémon TCG 30th Celebration Elite Trainer Box (score 16; unit $99.98, -4% vs market, -28% after reprice; 5786 sold on TCGplayer in 30 days)
- Pokémon TCG Phantasmal Flames Booster Box (score 16; unit $349.93, -10% vs market, -35% after reprice; 107 sold on TCGplayer in 30 days)
- MTG Secrets of Strixhaven Collector Booster Box (score 15.5; unit $449.91, -9% vs market, -29% after reprice; 82 sold on TCGplayer in 30 days)
- One Piece Card Game EB-05 One Piece Heroines Edition Vol. 2 Booster Box (score 15.5; unit $249.95, +2% vs market, -39% after reprice; 2087 sold on TCGplayer in 30 days)
- Pokémon TCG Pitch Black Booster Box (score 15; unit $149.97, -14% vs market, -29% after reprice; 789 sold on TCGplayer in 30 days)
- One Piece Card Game OP-16 The Time of Battle Booster Box (Pack of 2) (score 14.5; unit $174.97, -16% vs market, -28% after reprice; 207 sold on TCGplayer in 30 days)

**Keep, after the reprice** (today's price is at or above market; the CSV fixes it):

- Pokémon TCG Mega Evolution Booster Box (score 14; unit $299.94, +0% vs market, -33% after reprice; 33 sold on TCGplayer in 30 days)
- Pokémon TCG 30th Celebration Booster Bundle (Pack of 3) (score 13; unit $66.65, +5% vs market, -22% after reprice; 6525 sold on TCGplayer in 30 days)

**Hold** (right products, wrong moment: the flag says awaiting stock or the release is 11–20 November; add each the day its flag clears, after repricing where marked):

- One Piece Card Game OP-18 The Dominance of God Booster Box (score 15; unit $249.95, +4% vs market, -38% after reprice; 260 sold on TCGplayer in 30 days) — reprice, add when stock lands
- 2026 Topps Cosmic Chrome Baseball Hobby Box (score 14.5; unit $1049.79, +11% vs market, -32% after reprice) — reprice, add when stock lands
- Pokémon TCG Delta Reign Booster Box (score 14; unit $199.96, -8% vs market, -31% after reprice; 2982 sold on TCGplayer in 30 days) — reprice, add when stock lands
- Pokémon TCG 30th Celebration Ultra-Premium Collection [Day] (score 13; unit $399.92, +9% vs market, -32% after reprice; 476 sold on TCGplayer in 30 days) — reprice, add when stock lands
- Pokémon TCG 30th Celebration Ultra-Premium Collection [Night] (score 13; unit $399.92, -6% vs market, -30% after reprice; 571 sold on TCGplayer in 30 days) — reprice, add when stock lands
- MTG Star Trek Collector Booster Box (score 13; unit $499.90, +9% vs market, -34% after reprice; 1781 sold on TCGplayer in 30 days) — reprice, add when stock lands
- 2026 Topps Inception Football Hobby Box (score 12.5; unit $549.89, +10% vs market, -30% after reprice) — reprice, add when stock lands
- Pokémon TCG Delta Reign Pokémon Center Elite Trainer Box (score 11.5; unit $249.95, -6% vs market, -25% after reprice; 125 sold on TCGplayer in 30 days) — reprice, add when stock lands
- MTG Star Trek Beam Me Up Bundle (score 15.5; unit $99.98, -21% vs market, -21% after reprice; 479 sold on TCGplayer in 30 days) — add when stock lands
- MTG Star Trek Play Booster Box (score 14; unit $99.98, -13% vs market, -35% after reprice; 2410 sold on TCGplayer in 30 days) — add when stock lands

**Drop:**

- Pokémon TCG Delta Reign Elite Trainer Box (score 9; unit $99.98, +19% vs market, -20% after reprice; 3331 sold on TCGplayer in 30 days). Best Buy lists it at $49.99 MSRP on release day; even the repriced unit ($66.65 in a pack of 3) is a third above that, and the TCGplayer preorder price fell 36% in a month. A shopper comparing on Shopping sees the MSRP listing first.

Three things the scoring surfaced that the original selection could not see:

1. **The 30th Celebration Ultra-Premium Collections** (ranks 1 and 2) are the highest-interest items in the catalogue and the worst-timed: released today, stock not in, TCGplayer preorder price down 36% in a month, GameStop at $379.99 against your $399.92. They are right to advertise, at $249.95/$299.94, the day the boxes arrive.
2. **Pokémon is where big-box MSRP competition bites.** Delta Reign ETB, the 30th Booster Bundle and the Pokémon Center ETBs all have a retailer at or near MSRP in the comparison; your price is competitive only against the secondary market, which is where the shopper lands once the retailer is sold out. Expect the Pokémon groups to have the highest CPC and the most volatile ROAS.
3. **MTG and Topps are the cleanest launch stock**: in stock, GTIN on every item, no big-box at MSRP, order values $100–$550. They carry the test while the Pokémon preorders land.

### C2. Product-by-product

| # | Brand | Product | Unit price | Market | vs market now | After reprice | Availability | GTIN | Demand | Competition | Big-box in stock | Score /23 | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Pokémon | Pokémon TCG 30th Celebration Ultra-Premium Collection [Day] | $399.92 | $367.74 | +9% | $249.95 (-32%) | Preorder: released, awaiting stock | found | high | high | GameStop ($379.99, unavailable), Best Buy (marketplace $449.99-649.99), Walmart ($400-500), Amazon (listing) | 13 | Hold: reprice, add when stock lands |
| 2 | Pokémon | Pokémon TCG 30th Celebration Ultra-Premium Collection [Night] | $399.92 | $426.45 | -6% | $299.94 (-30%) | Preorder: released, awaiting stock | found | high | high | GameStop ($379.99 styles-may-vary, unavailable), Best Buy (marketplace), Walmart ($400-500), Amazon (listing) | 13 | Hold: reprice, add when stock lands |
| 3 | Pokémon | Pokémon TCG Delta Reign Booster Box | $199.96 | $217.17 | -8% | $149.97 (-31%) | Preorder: released, awaiting stock | found | high | high | Pokemon Center ($161.64, sold out), Amazon (listing), Best Buy (ETB $49.99 listing), GameStop (ETB listing) | 14 | Hold: reprice, add when stock lands |
| 4 | MTG | MTG Reality Fracture Collector Booster Display | $349.93 | $372.24 | -6% | $249.95 (-33%) | In Stock | yes | high | high | Best Buy ($319.99 listed), GameStop ($429.99, unavailable), Amazon (listing) | 18 | Keep |
| 5 | One Piece | One Piece Card Game OP-17 The World's Strongest Warriors Booster Box (English, 24 packs) | $249.95 | $296.33 | -16% | $199.96 (-32%) | In Stock | found | high | medium | Amazon (marketplace $199.99-223.99), Best Buy ($223.99 English / $139.99 Japanese) | 18.5 | Keep |
| 6 | Pokémon | Pokémon TCG 30th Celebration Elite Trainer Box | $99.98 | $104.57 | -4% | $74.98 (-28%) | In Stock | yes | high | high | GameStop ($99.99, unavailable), Best Buy (marketplace), Walmart (marketplace $127-190), Amazon (unavailable), Pokemon Center ($59.99 PC version, sold out) | 16 | Keep |
| 7 | MTG | MTG Star Trek Collector Booster Box | $499.90 | $457.10 | +9% | $299.94 (-34%) | Preorder: not yet released | yes | high | high | Best Buy ($479.99 preorder), Walmart ($491.99 preorder), GameStop ($699.99), Amazon (preorder) | 13 | Hold: reprice, add when stock lands |
| 8 | One Piece | One Piece Card Game OP-18 The Dominance of God Booster Box (English, 24 packs) | $249.95 | $240.62 | +4% | $149.97 (-38%) | Preorder: not yet released | found | high | low | — | 15 | Hold: reprice, add when stock lands |
| 9 | MTG | MTG Reality Fracture Play Booster Box | $99.98 | $119.49 | -16% | $74.98 (-37%) | In Stock | yes | high | high | Walmart (~$135), GameStop ($170), Amazon (listing), Best Buy (listing) | 17 | Keep |
| 10 | Pokémon | Pokémon TCG 30th Celebration Pokemon Center Elite Trainer Box | $249.95 | $260.22 | -4% | $199.96 (-23%) | In Stock | found | high | medium | Pokemon Center ($59.99, sold out), Walmart (marketplace listing), Amazon (marketplace listing) | 17.5 | Keep |
| 11 | Pokémon | Pokémon TCG 30th Celebration Booster Bundle (Pack of 3) | $66.65 | $63.71 | +5% | $49.99 (-22%) | In Stock | found | high | high | Pokemon Center ($26.94 MSRP, sold out), Walmart (marketplace $117.98), Amazon (listings) | 13 | Keep, after reprice |
| 12 | MTG | MTG Star Trek Beam Me Up Bundle | $99.98 | $126.44 | -21% | $99.98 (-21%) | Preorder: not yet released | yes | high | medium | GameStop (Star Trek bundle listing), Amazon (Star Trek preorder page) | 15.5 | Hold: add when stock lands |
| 13 | MTG | MTG Star Trek Play Booster Box | $99.98 | $114.72 | -13% | $74.98 (-35%) | Preorder: not yet released | yes | high | high | Best Buy ($199.99 preorder), Walmart ($124.99 preorder), Amazon (preorder), GameStop (listing) | 14 | Hold: add when stock lands |
| 14 | MTG | MTG Reality Fracture Multiverse Reforged Commander Deck (Pack of 4) | $37.49 | $48.44 | -23% | $33.33 (-31%) | In Stock | yes | high | medium | Amazon (likely, not verified), Walmart (likely, not verified) | 18.5 | Keep |
| 15 | Pokémon | Pokémon TCG Phantasmal Flames Booster Box | $349.93 | $386.94 | -10% | $249.95 (-35%) | In Stock | found | medium | low | Walmart ($329.95, OOS), Best Buy ($549.99), GameStop ($239.99, unavailable), Pokemon Center ($161.64, sold out), Amazon (unavailable) | 16 | Keep |
| 16 | Pokémon | Pokémon TCG Pitch Black Booster Box | $149.97 | $175.39 | -14% | $124.97 (-29%) | In Stock | found | high | high | Best Buy ($160.99 listed), Pokemon Center ($161.64, sold out), GameStop ($249.99, unavailable), Amazon (listing) | 15 | Keep |
| 17 | One Piece | One Piece Card Game EB-05 One Piece Heroines Edition Vol. 2 Booster Box (English, 24 packs) | $249.95 | $244.60 | +2% | $149.97 (-39%) | In Stock | found | high | medium | Best Buy ($489.54 marketplace, in stock), Walmart ($295.88), Amazon (listings) | 15.5 | Keep |
| 19 | Topps | 2026 Topps Cosmic Chrome Baseball Hobby Box | $1049.79 | $949.99 | +11% | $649.87 (-32%) | Preorder: released, awaiting stock | yes | high | medium | — | 14.5 | Hold: reprice, add when stock lands |
| 22 | Topps | 2026 Topps Inception Football Hobby Box | $549.89 | $499.94 | +10% | $349.93 (-30%) | Preorder: released, awaiting stock | yes | medium | medium | — | 12.5 | Hold: reprice, add when stock lands |
| 23 | MTG | MTG The Hobbit Collector Booster Box | $549.89 | $577.04 | -5% | $399.92 (-31%) | In Stock | yes | high | medium | GameStop ($749.99 / $849.99), Amazon (listing), Best Buy (listing) | 18.5 | Keep |
| 24 | Topps | 2026 Topps Chrome Baseball Hobby Box | $499.90 | $539.95 | -7% | $399.92 (-26%) | In Stock | yes | high | medium | — | 16.5 | Keep |
| 25 | Pokémon | Pokémon TCG Chaos Rising Booster Box | $149.97 | $182.68 | -18% | $124.97 (-32%) | In Stock | found | high | medium | Walmart ($194.99), Best Buy (marketplace $225-283), Pokemon Center ($161.64, sold out), Amazon (listing), GameStop (bundle/ETB listings) | 17.5 | Keep |
| 26 | Pokémon | Pokémon TCG Mega Evolution Booster Box | $299.94 | $299.77 | +0% | $199.96 (-33%) | In Stock | found | low | low | Best Buy ($160.99, sold out), Walmart (marketplace $299.95), Pokemon Center (sold out), Amazon (listing) | 14 | Keep, after reprice |
| 31 | Pokémon | Pokémon TCG Delta Reign Elite Trainer Box | $99.98 | $83.87 | +19% | $66.65 (-20%) | Preorder: released, awaiting stock | found | high | high | Best Buy ($49.99 MSRP, release 11/06), GameStop ($89.99), Pokemon Center (PC ETB $59.99, OOS), Amazon (unavailable) | 9 | Drop / replace |
| 32 | MTG | MTG The Hobbit Play Booster Box (Pack of 2) | $124.97 | $131.26 | -5% | $99.98 (-24%) | In Stock | yes | high | medium | Best Buy ($145-190), GameStop ($169.99), Amazon (listing) | 16.5 | Keep |
| 35 | Pokémon | Pokémon TCG Delta Reign Pokémon Center Elite Trainer Box | $249.95 | $265.75 | -6% | $199.96 (-25%) | Preorder: released, awaiting stock | no | medium | medium | Pokemon Center ($59.99, out of stock) | 11.5 | Hold: reprice, add when stock lands |
| 37 | MTG | MTG Marvel Super Heroes Collector Booster Box | $399.92 | $456.22 | -12% | $299.94 (-34%) | In Stock | yes | medium | high | GameStop ($479.99, above MSRP), Amazon (listing), Walmart (listing) | 16 | Keep |
| 38 | MTG | MTG Secrets of Strixhaven Collector Booster Box | $449.91 | $494.99 | -9% | $349.93 (-29%) | In Stock | yes | medium | medium | Best Buy (~$690), Walmart ($549.99), GameStop (listing), Amazon (listing) | 15.5 | Keep |
| 39 | One Piece | One Piece Card Game OP-15 Adventure on Kami's Island Booster Box (English, 24 packs) | $199.96 | $249.05 | -20% | $149.97 (-40%) | In Stock | found | medium | medium | Best Buy ($406.99 English marketplace), Walmart ($104.99 listing, stock unverified), Amazon (listings) | 16.5 | Keep |
| 40 | One Piece | One Piece Card Game OP-16 The Time of Battle Booster Box (English, 24 packs) (Pack of 2) | $174.97 | $207.50 | -16% | $149.97 (-28%) | In Stock | found | medium | medium | Amazon (Japanese-edition listings only) | 14.5 | Keep |

---

## D. Revised shortlist

Built from the same scores over all 142 products: everything scoring ≥ 12 that is in stock or released-and-awaiting, best first, capped at 30. It is not forced to 30 and it is not forced to keep the original list; products from the other 112 enter on the same scoring.

The revised list has 30 products: 17 from the original 30 and 13 new entrants. Brand split: MTG 10, Pokémon 8, Topps 5, One Piece 4, Panini 2, Lorcana 1. Average unit price $400; 25 singles, 5 packs. All are in stock except 3 released this week with stock awaited (Pokémon TCG 30th Celebration Ultra-Premium Collection Case; 2026-27 Topps Flagship Basketball Hobby Box; 2026 Topps Cosmic Chrome Baseball Hobby Box), which enter when their flag clears.

**New entrants and why:**

- Pokémon TCG 30th Celebration Booster Bundle Case (score 21): -34% vs market after reprice, demand high, competition low; 104 sold/30d on TCGplayer.
- 2026 Bowman Chrome Baseball Hobby Box (score 18.5): -32% vs market after reprice, demand high, competition medium; sports: no TCGplayer data, demand estimated from set profile.
- 2025 Panini Prizm NFL Football Hobby Box (score 17.5): -30% vs market after reprice, demand high, competition medium; sports: no TCGplayer data, demand estimated from set profile.
- 2026 Topps Chrome Football Hobby Box (score 17.5): -33% vs market after reprice, demand high, competition medium; sports: no TCGplayer data, demand estimated from set profile.
- MTG Lorwyn Eclipsed Play Booster Box (Pack of 3) (score 17.5): -26% vs market after reprice, demand high, competition medium; 657 sold/30d on TCGplayer.
- Pokémon TCG 30th Celebration Elite Trainer Box Case (score 17.5): -31% vs market after reprice, demand high, competition medium; 92 sold/30d on TCGplayer.
- 2025-26 Panini Prizm Basketball Hobby Box (score 17): -23% vs market after reprice, demand high, competition high; sports: no TCGplayer data, demand estimated from set profile.
- One Piece Card Game EB-03 One Piece Heroines Edition Booster Box (score 17): -31% vs market after reprice, demand medium, competition low; 129 sold/30d on TCGplayer.
- MTG Secrets of Strixhaven Play Booster Box (Pack of 2) (score 16.5): -31% vs market after reprice, demand medium, competition medium; 204 sold/30d on TCGplayer.
- Pokémon TCG 30th Celebration Ultra-Premium Collection Case (score 16.5): -30% vs market after reprice, demand high, competition medium; 93 sold/30d on TCGplayer.
- Disney Lorcana Hyperia City Booster Display Box (Pack of 2) (score 15): -22% vs market after reprice, demand high, competition high; 2240 sold/30d on TCGplayer.
- MTG Marvel Super Heroes Play Booster Box (score 15): -28% vs market after reprice, demand high, competition high; 539 sold/30d on TCGplayer.
- 2026-27 Topps Flagship Basketball Hobby Box (score 14.5): -27% vs market after reprice, demand high, competition medium; sports: no TCGplayer data, demand estimated from set profile.

**Original products not on it (13):** MTG Star Trek Beam Me Up Bundle (not yet released); One Piece Card Game OP-18 The Dominance of God Booster Box (not yet released); One Piece Card Game OP-16 The Time of Battle Booster Box (Pack of 2) (score 14.5); MTG Star Trek Play Booster Box (not yet released); Pokémon TCG Delta Reign Booster Box (awaiting stock); Pokémon TCG Mega Evolution Booster Box (score 14); Pokémon TCG 30th Celebration Booster Bundle (Pack of 3) (score 13); Pokémon TCG 30th Celebration Ultra-Premium Collection [Day] (awaiting stock); Pokémon TCG 30th Celebration Ultra-Premium Collection [Night] (awaiting stock); MTG Star Trek Collector Booster Box (not yet released); 2026 Topps Inception Football Hobby Box (awaiting stock); Pokémon TCG Delta Reign Pokémon Center Elite Trainer Box (awaiting stock); Pokémon TCG Delta Reign Elite Trainer Box (awaiting stock). The released-but-awaiting and unreleased ones re-enter on their day; see section C.

Two cautions on the top of the list. The 30th Celebration Booster Bundle Case ($1,199.76 against a TCGplayer low of $1,650) scores first on price and demand, but a $1,200 case is a narrow audience on Shopping and the research flagged the case count as needing confirmation against the box; run it in campaign 1 with its own bid. The sports hobby boxes (Bowman Chrome, Prizm Football and Basketball, Chrome Football) have no TCGplayer data, so their demand grade is an estimate from set profile and dealer activity, not an observed sales count.

How to use it: campaign 1 (section E) advertises this list. Tag the products `launch-30` in the catalogue (or whatever tag you choose; the feed maps any `launch-30`/`launch_30` tag to `custom_label_0 = launch_30`) and remove the tag from the dropped ones. The feed and the campaign product group follow the tag; nothing else has to change.

Products on hold (unreleased or awaiting stock) should enter campaign 1 the day their flag is cleared; the scoring already ranks them, so the order is known.

### D1. Ranked list

| Rank | Brand | Product | In launch-30? | Unit price | After reprice | Availability | GTIN | Demand | Competition | Score /23 | Why |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Pokémon | Pokémon TCG 30th Celebration Booster Bundle Case | no | $1199.76 | $1199.76 (-34%) | In Stock | found | high | low | 21 | 30%+ below market after reprice, in stock, low competition, $150+ order value |
| 2 | Topps | 2026 Bowman Chrome Baseball Hobby Box | no | $549.89 | $399.92 (-32%) | In Stock | yes | high | medium | 18.5 | 30%+ below market after reprice, in stock, GTIN, $150+ order value |
| 3 | MTG | MTG Reality Fracture Multiverse Reforged Commander Deck (Pack of 4) | yes | $37.49 | $33.33 (-31%) | In Stock | yes | high | medium | 18.5 | 30%+ below market after reprice, in stock, GTIN |
| 4 | MTG | MTG The Hobbit Collector Booster Box | yes | $549.89 | $399.92 (-31%) | In Stock | yes | high | medium | 18.5 | 30%+ below market after reprice, in stock, GTIN, $150+ order value |
| 5 | One Piece | One Piece Card Game OP-17 The World's Strongest Warriors Booster Box (English, 24 packs) | yes | $249.95 | $199.96 (-32%) | In Stock | found | high | medium | 18.5 | 30%+ below market after reprice, in stock, $150+ order value |
| 6 | MTG | MTG Reality Fracture Collector Booster Display | yes | $349.93 | $249.95 (-33%) | In Stock | yes | high | high | 18 | 30%+ below market after reprice, in stock, GTIN, $150+ order value |
| 7 | Panini | 2025 Panini Prizm NFL Football Hobby Box | no | $899.82 | $649.87 (-30%) | In Stock | yes | high | medium | 17.5 | 30%+ below market after reprice, in stock, GTIN, $150+ order value |
| 8 | Topps | 2026 Topps Chrome Football Hobby Box | no | $599.88 | $399.92 (-33%) | In Stock | yes | high | medium | 17.5 | 30%+ below market after reprice, in stock, GTIN, $150+ order value |
| 9 | MTG | MTG Lorwyn Eclipsed Play Booster Box (Pack of 3) | no | $83.32 | $74.98 (-26%) | In Stock | yes | high | medium | 17.5 | 20%+ below market after reprice, in stock, GTIN |
| 10 | Pokémon | Pokémon TCG 30th Celebration Elite Trainer Box Case | no | $1149.77 | $799.84 (-31%) | In Stock | found | high | medium | 17.5 | 30%+ below market after reprice, in stock, $150+ order value |
| 11 | Pokémon | Pokémon TCG 30th Celebration Pokemon Center Elite Trainer Box | yes | $249.95 | $199.96 (-23%) | In Stock | found | high | medium | 17.5 | 20%+ below market after reprice, in stock, $150+ order value |
| 12 | Pokémon | Pokémon TCG Chaos Rising Booster Box | yes | $149.97 | $124.97 (-32%) | In Stock | found | high | medium | 17.5 | 30%+ below market after reprice, in stock |
| 13 | Panini | 2025-26 Panini Prizm Basketball Hobby Box | no | $199.96 | $199.96 (-23%) | In Stock | yes | high | high | 17 | 20%+ below market after reprice, in stock, GTIN, $150+ order value |
| 14 | MTG | MTG Reality Fracture Play Booster Box | yes | $99.98 | $74.98 (-37%) | In Stock | yes | high | high | 17 | 30%+ below market after reprice, in stock, GTIN |
| 15 | One Piece | One Piece Card Game EB-03 One Piece Heroines Edition Booster Box (English, 24 packs) | no | $249.95 | $199.96 (-31%) | In Stock | found | medium | low | 17 | 30%+ below market after reprice, in stock, low competition, $150+ order value |
| 16 | Topps | 2026 Topps Chrome Baseball Hobby Box | yes | $499.90 | $399.92 (-26%) | In Stock | yes | high | medium | 16.5 | 20%+ below market after reprice, in stock, GTIN, $150+ order value |
| 17 | MTG | MTG Secrets of Strixhaven Play Booster Box (Pack of 2) | no | $124.97 | $99.98 (-31%) | In Stock | yes | medium | medium | 16.5 | 30%+ below market after reprice, in stock, GTIN |
| 18 | MTG | MTG The Hobbit Play Booster Box (Pack of 2) | yes | $124.97 | $99.98 (-24%) | In Stock | yes | high | medium | 16.5 | 20%+ below market after reprice, in stock, GTIN |
| 19 | One Piece | One Piece Card Game OP-15 Adventure on Kami's Island Booster Box (English, 24 packs) | yes | $199.96 | $149.97 (-40%) | In Stock | found | medium | medium | 16.5 | 30%+ below market after reprice, in stock, $150+ order value |
| 20 | Pokémon | Pokémon TCG 30th Celebration Ultra-Premium Collection Case | no | $1199.76 | $949.81 (-30%) | Preorder: released, awaiting stock | found | high | medium | 16.5 | 30%+ below market after reprice, $150+ order value |
| 21 | MTG | MTG Marvel Super Heroes Collector Booster Box | yes | $399.92 | $299.94 (-34%) | In Stock | yes | medium | high | 16 | 30%+ below market after reprice, in stock, GTIN, $150+ order value |
| 22 | Pokémon | Pokémon TCG 30th Celebration Elite Trainer Box | yes | $99.98 | $74.98 (-28%) | In Stock | yes | high | high | 16 | 20%+ below market after reprice, in stock, GTIN |
| 23 | Pokémon | Pokémon TCG Phantasmal Flames Booster Box | yes | $349.93 | $249.95 (-35%) | In Stock | found | medium | low | 16 | 30%+ below market after reprice, in stock, low competition, $150+ order value |
| 24 | MTG | MTG Secrets of Strixhaven Collector Booster Box | yes | $449.91 | $349.93 (-29%) | In Stock | yes | medium | medium | 15.5 | 20%+ below market after reprice, in stock, GTIN, $150+ order value |
| 25 | One Piece | One Piece Card Game EB-05 One Piece Heroines Edition Vol. 2 Booster Box (English, 24 packs) | yes | $249.95 | $149.97 (-39%) | In Stock | found | high | medium | 15.5 | 30%+ below market after reprice, in stock, $150+ order value |
| 26 | Lorcana | Disney Lorcana Hyperia City Booster Display Box (Pack of 2) | no | $124.97 | $99.98 (-22%) | In Stock | yes | high | high | 15 | 20%+ below market after reprice, in stock, GTIN |
| 27 | MTG | MTG Marvel Super Heroes Play Booster Box | no | $99.98 | $74.98 (-28%) | In Stock | yes | high | high | 15 | 20%+ below market after reprice, in stock, GTIN |
| 28 | Pokémon | Pokémon TCG Pitch Black Booster Box | yes | $149.97 | $124.97 (-29%) | In Stock | found | high | high | 15 | 20%+ below market after reprice, in stock |
| 29 | Topps | 2026-27 Topps Flagship Basketball Hobby Box | no | $249.95 | $199.96 (-27%) | Preorder: released, awaiting stock | yes | high | medium | 14.5 | 20%+ below market after reprice, GTIN, $150+ order value |
| 30 | Topps | 2026 Topps Cosmic Chrome Baseball Hobby Box | yes | $1049.79 | $649.87 (-32%) | Preorder: released, awaiting stock | yes | high | medium | 14.5 | 30%+ below market after reprice, GTIN, $150+ order value |

---

## E. Campaign recommendations ($500/day test, then scale)

Nothing below is a promise of results. It is the structure that lets a $500/day test produce a clean answer in 14 days about which products and which price points earn their clicks, and that scales without rebuilding.

### E1. What has to be true before the first dollar

| Gate | State today | Who |
|---|---|---|
| Merchant Center review passed | **Under review**; nothing in this audit guarantees approval | Google |
| Feed lists the whole catalogue | Live feed carries **9 of 142** items (Distribution → selection still a hand-picked set) | You: set selection to "all" |
| Google Ads conversion tracking | `GOOGLE_ADS_ID` / `GOOGLE_ADS_PURCHASE_LABEL` not set in the Northflank environment, so the purchase tag renders nothing | You: set both; code is already in place (`views/partials/analytics.ejs`) |
| GA4 | `GA4_MEASUREMENT_ID` not set | You |
| Business address verified | El Segundo suite address must match the Payments profile | You |
| 17 released-but-flagged preorders | Pages and feed say "awaiting stock" with a dated availability; correct as long as it is true | You: untick Preorder as each lands |
| Prices | Current prices are 0–19% below market on the launch set; repricing CSV ready at 20–40% below | You: import when approved |

### E2. Campaign architecture

**Campaign 1 — Standard Shopping, "Launch set" (≈ $350/day).**
Product group built from `custom_label_0 = launch_30` (the feed already sends it), then subdivided by brand (`product_type` first level: The Pokémon Company / Wizards of the Coast / Bandai / Topps) so each brand gets its own bid and its own budget share, and by `custom_label_1` (single vs multipack) so pack-priced listings can be bid lower or paused. Standard Shopping, not Performance Max, for the first 30 days: it shows search terms and lets you add negatives, which Performance Max hides. The whole point of the test is to learn.

**Campaign 2 — Standard Shopping, "Catalogue" (≈ $100/day).**
`custom_label_0 = catalog_only`, one product group per brand, a low bid cap. It exists to catch cheap long-tail clicks on the other 112 products and to find sleepers for the next launch set. Set priority Low so campaign 1 wins any overlap.

**Campaign 3 — Search, brand defence + exact product names (≈ $50/day).**
Exact-match "gogetcards" and the 10 highest-scoring product names ("one piece op-17 booster box", "pokemon 30th celebration ultra premium collection"), landing on the product page. Cheap, high intent, and it is where a price 20%+ below market wins outright.

Hold Performance Max until there are 30+ conversions in 30 days; before that it cannot learn and will spend on the brand terms you already own.

### E3. Bidding

Weeks 1–2: **Manual CPC** (or Maximise Clicks with a max CPC cap) so spend spreads across products rather than piling into whatever converts first. Starting bid caps, from typical sealed-product CPCs in this category (an estimate, not an observation):

| Group | Max CPC | Reason |
|---|---|---|
| Pokémon boxes / UPCs | $0.90 | Highest query volume, most big-box competition |
| MTG Collector boxes | $1.20 | Highest order value, buyers compare prices |
| One Piece | $0.80 | Fewer big-box competitors, strong price advantage |
| Topps / Panini hobby boxes | $1.00 | Order values $500–$1,200 justify it |
| Multipacks (`custom_label_1 = multipack`) | 60% of the group's cap | Ad shows the pack price; click-through is lower |

Week 3 onward: move campaign 1 to **Target ROAS** only once it has 30 conversions; set the target at break-even ROAS × 1.3 (see E5).

### E4. Negatives, exclusions, tracking

- Negative keywords from day 1: `single`, `singles`, `psa`, `graded`, `proxy`, `fake`, `japanese` (unless the product is Japanese), `pack opening`, `free`, `wholesale`, `code`, `codes`.
- Exclude the 20 not-yet-released preorders from campaign 1 until the week of release (filter: `availability = preorder`); they can carry an ad but every click is a buyer who must pay today for something weeks away.
- Conversion action: Purchase, value = order total, counted once, 30-day click window; import GA4 purchase as secondary. The site fires both tags only after the signed partner callback, so the value is real revenue.
- Enhanced conversions: on (the checkout has the email).
- UTM: the analytics partial already captures `utm_*` on the order; check the Orders screen's source column after the first day.

### E5. Economics: what the numbers have to be

Your cost of goods is not in the codebase, so break-even is given as a formula with scenarios. **Fill in the real margin before setting a target.**

Break-even ROAS = 1 ÷ gross margin (after payment fees and shipping).

| Gross margin after fees & shipping | Break-even ROAS | tROAS to run at (×1.3) | At $500/day, revenue needed/day |
|---|---|---|---|
| 10% | 10.0 | 13.0 | $5,000 |
| 15% | 6.7 | 8.7 | $3,350 |
| 20% | 5.0 | 6.5 | $2,500 |
| 25% | 4.0 | 5.2 | $2,000 |

Reference points, so the table is usable: average launch-set order value today is about $280 (unit price × typical quantity 1; packs raise it). At a $1.00 CPC and $500/day you buy ~500 clicks; at a 1.0% conversion rate that is 5 orders ≈ $1,400/day (ROAS 2.8); at 2.0% it is 10 orders ≈ $2,800/day (ROAS 5.6). Sealed-product Shopping conversion rates of 1–2% are typical for a new store with a price advantage; below 1% the test should be stopped and the price or the product set changed, not the budget.

Pricing 20–40% below market (the pending CSV) is what moves conversion rate, not bids. The three products you flagged (OP-17 at 13%, Reality Fracture Collector at 6%, Star Trek Collector at +12% above) are exactly the ones a price-comparison shopper skips.

### E6. Scaling to $10,000/day: conditions, not a promise

Spend can be raised 20% every 3–4 days while ROAS stays above target and the budget is being exhausted. $500 → $10,000 is about 16 such steps, or 7–9 weeks, if every step holds. Each step needs:

1. **Stock.** At $10k/day and ROAS 5 that is $50k/day of sealed product, 150–250 boxes a day. Allocation limits on hobby boxes make that impossible on Topps/Panini; it is realistic only on Pokémon and One Piece with a distributor relationship that scales. The order cap ($1,199.76 per line) protects you from one buyer taking an allocation, but it also caps revenue per order.
2. **Catalogue breadth.** Thirty products saturate at a few thousand dollars a day of spend; the step above ~$3k/day needs the full catalogue feeding campaign 2 and a second launch set.
3. **Conversion rate holding** as impression share grows into weaker auctions. Expect ROAS to fall as spend rises; plan the step size on marginal ROAS, not average.
4. **Merchant Center account health**: shipping-time accuracy and the preorder flags matter more at scale because item disapprovals turn into account warnings. Keep the Distribution readiness panel at 0 errors.

If any condition fails, hold spend; do not buy through it.


---

## F. Changes implemented (this pass, all on `main` and deployed)

Verified after deploy by re-fetching all 142 product pages, the feed and the health endpoint. Test suites: `npm test` 52/52, `npm run test:security` 30/30, `npm audit` 0.

| Commit | Change | Why | Verification |
|---|---|---|---|
| 546e9d4 | Preorder state follows the owner's flag, not the calendar; "released, awaiting stock" state on page, cards, feed and schema; stale "Preorder. Expected release …" and "Sold in packs of N" sentences stripped from descriptions at render; duplicate spec rows (Language twice) removed | Issue 1 and 2 of your list: contradictory availability and duplicated specs | All 142 pages: one Language row, availability row matches schema (105 InStock / 37 PreOrder) |
| 97ef54b | Product JSON-LD uses the same cleaned description as the page | A crawler saw the stale sentence after the page stopped showing it | 0 pages with the stale sentence in schema |
| 5534ca9 | Regular 30th Celebration ETB has its own photo; Pokémon Center ETB keeps the PC photo | Two products shared one image | Both pages checked |
| 1d653d0 | `docs/gogetcards-reprice.csv` and `-review.csv`: every product 20.5–39.8% below Nov 2026 market, with clean descriptions and specs | Your pricing instruction; **not applied to the live site** | Importer dry run: 142 updates, 0 errors |
| 61db426 | Feed readiness detector recognises Hobby/Jumbo/Mega boxes, Ultra-Premium and Figure Collections, Troves, prerelease kits, Build & Battle, Commander/Draft Night/Jumpstart decks, blisters | 31 products showed "configuration not recognised" in the Distribution readiness panel | Feed simulation over 142 products: 0 `tcg_type_unknown`; new test covers one of each shape |
| 61db426 | `docs/gogetcards-descriptions-fix.csv` (6 rows) | Six live descriptions and Configuration specs still carry sourcing notes ("Giant lists … please verify", "Midwest lists …", "Per TCGplayer:", "(Shop of Magic). Listings commonly cite …") | Importer dry run: 6 updates, 0 errors; prices untouched |

What was checked and found already correct (no change needed):

- **Multipack consistency, 62 pack products**: title ends "(Pack of N)" with the right N; headline price, JSON-LD price and feed price are the pack price; pack line "Sold as a pack of N · about $X per unit"; composite pack image is the main image, og:image and first schema image; meta description names the pack; no single carries pack text.
- **Order cap**: every product's quantity cap is `min(allocation, floor($1,199.76 ÷ price))`; the "Limit N per customer" text is in units (packs × N), the hidden quantity cap is in packs. Max line value on all 142 products ≤ $1,199.76.
- **Canonical, meta description (114–199 chars), one H1, Product JSON-LD with price, availability, brand, sku, image**: all 142.
- **Mobile (390 px)**: pack, preorder and sports product pages render without horizontal scroll; price, pack line and buy button above the fold.
- **No compare-at prices** anywhere (no strike-through "savings" claims to substantiate).
- **No sold-out products**; 17 "released, awaiting stock" preorders show a dated availability (release + 2 business days) rather than a past date.

Not changed, by instruction: selling prices, stock behaviour, "N remaining" counts, the preorder flags (only you know when stock lands).


---

## G. Launch decision

**Ready to advertise: not yet. Ready for Merchant Center review: yes, with the items below.** "Ready" here means the catalogue, pages, policies and feed satisfy what the product data specification and the Shopping policies ask for and I could verify from outside; approval is Google's decision and nothing in this audit guarantees it.

### G1. GMC readiness, item by item

| Requirement | State | Evidence |
|---|---|---|
| Accurate availability on page = feed | Met | 142/142 page availability matches JSON-LD; feed simulation sends the same values |
| Preorder disclosure (payment now, date, slip, cancel) | Met | Six-point terms on every preorder page, Preorder Policy, FAQ, Shipping; one dispatch window everywhere |
| Price on page = feed, currency, no hidden costs | Met | Pack price is the headline, JSON-LD and feed price; free shipping declared; USD |
| Landing page functional, mobile, no interstitials | Met | 142/142 return 200; mobile checked; cookie banner is non-blocking |
| Returns, shipping, contact, business identity visible | Met, one open item | Returns/Refund, Shipping, Contact, About, footer address and schema; **address must match the Payments profile** (unverifiable from here) |
| Product identifiers | Partial | 68 with valid GTIN; 74 without (eligible, "limited performance") |
| Images: white background, ≥ 800 px, no overlay text | Met | Composite pack images 1600 px; singles ≥ 1000 px; no promotional text |
| Feed completeness | **Not met** | Live feed carries 9 of 142. Distribution → selection must be set to the full catalogue |
| Conversion tracking | **Not met** | No gtag on the live site; `GOOGLE_ADS_ID`, `GOOGLE_ADS_PURCHASE_LABEL`, `GA4_MEASUREMENT_ID` unset |
| Claims that must be true | Your confirmation | "Sourced through authorized distribution", "Ships within 1 business day", "Tracked & insured worldwide", "14-day returns", "refunded in full with no time limit" (authenticity), "Direct from distributor". Each is on the homepage, About or the product pages; each is a Misrepresentation finding if a reviewer or a customer shows it false |

### G2. Do these, in this order

1. Confirm the El Segundo address is the operating address on the Google Payments profile, or change `config/company.js`.
2. Set the Distribution selection to the whole catalogue; check the readiness panel shows 0 errors (it shows warnings for the 74 GTINs and the 17 awaiting-stock preorders, which is correct).
3. Untick Preorder on the 17 released products as their stock lands (this week).
4. Import `docs/gogetcards-descriptions-fix.csv` (6 rows) and, when you have decided on prices, `docs/gogetcards-reprice.csv`; optionally `docs/gogetcards-titles.csv` and the GTIN rows you accept from `docs/gogetcards-gtin-research.csv`.
5. Set the three tracking variables in Northflank; confirm the purchase tag fires on a test order before the first ad day.
6. Build the three campaigns in section E with `custom_label_0`/`custom_label_1`; start at $500/day with the section D list.

### G3. The decision on the 30

Advertise the section D list, not the original 30 as it stands. 17 of the original products run from day one; 2 run once repriced; 10 are held until their stock lands (8 of those also need the reprice); 1 is dropped. 13 products from the rest of the catalogue earn a place on the same scoring, led by the Topps/Panini hobby boxes and MTG play boxes, which are in stock, carry GTINs and face no big-box seller at MSRP.

The single biggest lever is not which 30 but the price: today 111 of 142 products sit 0–20% below market, which a comparison shopper does not notice; the pending CSV moves every product 20–40% below, which they do. Import it (after checking it against your cost floor) before the first ad day, or the test measures the wrong thing.

Start date: the day the feed lists the whole catalogue, the conversion tag is live, and the 17 awaiting-stock flags have been cleared or confirmed. Until then, Merchant Center review can proceed; advertising should not.

### G4. What I would not do

- Do not advertise the 20 unreleased preorders before their release week; every click asks a stranger to pay now for a later delivery.
- Do not turn on Performance Max first; you lose the search-term data the test exists to produce.
- Do not price below your margin floor to reach a discount percentage; the CSV targets the market, not your cost.
- Do not raise the budget on a day the ROAS is below break-even; the fix is the product set or the price, not more spend.


---


## Appendix

### GTIN research, product by product

| Product | GTIN found | Confidence | Source |
|---|---|---|---|
| One Piece Card Game Double Pack Set Vol.13 [DP-13] (Pack of 3) | 810199506692 | high | [www.gtsdistribution.com](https://www.gtsdistribution.com/card-games/one-piece-tcg-double-pack-set-volume-13-(dp-13)-(8ct).asp) |
| One Piece Card Game EB-03 One Piece Heroines Edition Booster Box (English, 24 packs) | 810158837225 | high | [topshelfco.ca](https://topshelfco.ca/products/one-piece-eb-03-heroines-edition-booster-box.json) |
| One Piece Card Game OP-05 Awakening of the New Era Booster Box (English, 24 packs) | 810059783546 | high | [topshelfco.ca](https://topshelfco.ca/products/one-piece-op-05-awakening-of-the-new-era-booster-box.json) |
| One Piece Card Game OP-09 Emperors in the New World Booster Box (English, 24 packs) | 810059787315 | high | [www.gamenerdz.com](https://www.gamenerdz.com/one-piece-tcg-emperors-in-the-new-world-booster-box-op-09) |
| One Piece Card Game OP-11 A Fist of Divine Speed Booster Box (English, 24 packs) | 810059789463 | high | [www.gamenerdz.com](https://www.gamenerdz.com/one-piece-tcg-a-fist-of-divine-speed-booster-box-op-11) |
| One Piece Card Game OP-12 Legacy of the Master Booster Box (English, 24 packs) | 810158830943 | high | [www.gamenerdz.com](https://www.gamenerdz.com/one-piece-tcg-legacy-of-the-master-booster-box-op-12) |
| One Piece Card Game OP-13 Carrying On His Will Booster Box (English, 24 packs) | 810158833524 | high | [www.gamenerdz.com](https://www.gamenerdz.com/one-piece-tcg-carrying-on-his-will-booster-box-op-13) |
| One Piece Card Game OP-14 The Azure Sea's Seven Booster Box (English, 24 packs) | 810158836396 | high | [www.gamenerdz.com](https://www.gamenerdz.com/one-piece-tcg-the-azure-sea-s-seven-booster-box-op-14) |
| One Piece Card Game OP-15 Adventure on Kami's Island Booster Box (English, 24 packs) | 810158838444 | high | [gtsdistribution.com](https://gtsdistribution.com/card-games/one-piece-tcg-(title-tba)-booster-(op-15-eb04)-(24ct).asp) |
| One Piece Card Game OP-15 Adventure on Kami's Island Booster Pack (English) (Pack of 7) | 810158838437 | high | [www.asmodee.co.uk](https://www.asmodee.co.uk/products/bcl2835213-one-piece-card-game-booster-pack-op-15-eb-04) |
| One Piece Card Game OP-16 The Time of Battle Booster Box (English, 24 packs) (Pack of 2) | 810199500300 | high | [www.gamenerdz.com](https://www.gamenerdz.com/one-piece-tcg-the-time-of-battle-booster-box-op-16) |
| One Piece Card Game OP-17 The World's Strongest Warriors Booster Box (English, 24 packs) | 810199501970 | high | [www.gamenerdz.com](https://www.gamenerdz.com/one-piece-tcg-the-world-s-strongest-warriors-booster-box-op-17) |
| One Piece Card Game OP-17 The World's Strongest Warriors Booster Pack (English) (Pack of 7) | 810199501963 | high | [www.asmodee.co.uk](https://www.asmodee.co.uk/products/bcl2863367-one-piece-card-game-booster-pack-op-17) |
| One Piece Card Game OP-18 The Dominance of God Booster Box (English, 24 packs) | 810199503806 | high | [www.midwestcards.com](https://www.midwestcards.com/products/one-piece-tcg-op-18-booster-box) |
| One Piece Card Game PRB-02 The Best Vol. 2 Booster Box (English, 20 packs) | 810158833463 | high | [www.gamenerdz.com](https://www.gamenerdz.com/one-piece-tcg-one-piece-card-the-best-vol-2-premium-booster-box-prb-02) |
| Pokémon TCG 30th Celebration Battle Deck [Espeon ex] (Pack of 2) | 196214147270 | high | [pocketmonsters.net](https://pocketmonsters.net/news/9330) |
| Pokémon TCG 30th Celebration Battle Deck [Umbreon ex] (Pack of 7) | 196214147270 | high | [pocketmonsters.net](https://pocketmonsters.net/news/9330) |
| Pokémon TCG 30th Celebration Booster Bundle (Pack of 3) | 196214158849 | high | [pocketmonsters.net](https://pocketmonsters.net/news/9330) |
| Pokémon TCG 30th Celebration Booster Bundle Case | 10196214158846 | high | [pocketmonsters.net](https://pocketmonsters.net/news/9330) |
| Pokémon TCG 30th Celebration Ditto Premium Collection (Pack of 2) | 196214158368 | high | [pocketmonsters.net](https://pocketmonsters.net/news/9330) |
| Pokémon TCG 30th Celebration Ditto Premium Collection Case | 10196214158365 | high | [pocketmonsters.net](https://pocketmonsters.net/news/9330) |
| Pokémon TCG 30th Celebration Greninja ex Box (Pack of 5) | 196214158726 | high | [otakumart.co.nz](https://otakumart.co.nz/products/30th-celebration-greninja-ex-box-pokemon-tcg) |
| Pokémon TCG 30th Celebration Knock Out Collection (Pack of 3) | 196214152397 | high | [www.pokeboxusa.com](https://www.pokeboxusa.com/products/30th-celebration-knock-out-collection) |
| Pokémon TCG 30th Celebration Mini Tin Display | 196214159099 | high | [pocketmonsters.net](https://pocketmonsters.net/news/9330) |
| Pokémon TCG 30th Celebration Poster Collection (Pack of 7) | 196214158757 | high | [www.gamenerdz.com](https://www.gamenerdz.com/pokemon-30th-celebration-poster-collection) |
| Pokémon TCG 30th Celebration Sylveon ex Box (Pack of 4) | 196214158726 | high | [otakumart.co.nz](https://otakumart.co.nz/products/30th-celebration-sylveon-ex-box-pokemon-tcg) |
| Pokémon TCG 30th Celebration Tech Sticker Collection [Alolan Exeggutor] (Pack of 7) | 196214158771 | high | [otakumart.co.nz](https://otakumart.co.nz/products/30th-celebration-tech-sticker-collection-alolan-exeggutor-pokemon-tcg) |
| Pokémon TCG 30th Celebration Ultra-Premium Collection Case | 10196214158693 | high | [pocketmonsters.net](https://pocketmonsters.net/news/9330) |
| Pokémon TCG 30th Celebration Ultra-Premium Collection [Day] | 196214158696 | high | [pocketmonsters.net](https://pocketmonsters.net/news/9330) |
| Pokémon TCG 30th Celebration Ultra-Premium Collection [Night] | 196214158696 | high | [pocketmonsters.net](https://pocketmonsters.net/news/9330) |
| Pokémon TCG 30th Celebration ex Tin (Retail Version) [Greninja ex] (Pack of 6) | 196214146266 | high | [trainerlegacy.tcgsync.com](https://trainerlegacy.tcgsync.com/products/30th-celebration-ex-tin-greninja-ex-retail-version) |
| Pokémon TCG 30th Celebration ex Tin (Retail Version) [Sylveon ex] (Pack of 5) | 196214146266 | high | [trainerlegacy.tcgsync.com](https://trainerlegacy.tcgsync.com/products/30th-celebration-ex-tin-sylveon-ex-retail-version) |
| Pokémon TCG Chaos Rising Booster Box | 196214154186 | high | [www.midwestcards.com](https://www.midwestcards.com/pokemon-non-sports-cards/pokemon-mega-evolution-chaos-rising-booster-box/) |
| Pokémon TCG Delta Reign Booster Box | 196214165854 | high | [www.diamondcardsonline.com](https://www.diamondcardsonline.com/pokemon-mega-evolution-delta-reign-booster-box/) |
| Pokémon TCG Delta Reign Booster Bundle | 196214165823 | high | [www.pokeboxusa.com](https://www.pokeboxusa.com/products/delta-reign-booster-bundle) |
| Pokémon TCG Delta Reign Elite Trainer Box | 196214165809 | high | [giantsportscards.com](https://giantsportscards.com/products/pokemon-mega-evolution-delta-reign-elite-trainer-box) |
| Pokémon TCG Mega Evolution Booster Box | 196214136120 | high | [www.midwestcards.com](https://www.midwestcards.com/pokemon-non-sports-cards/pokemon-mega-evolution-me1-booster-box/) |
| Pokémon TCG Perfect Order Booster Box | 196214150461 | high | [www.gamenerdz.com](https://www.gamenerdz.com/pokemon-mega-evolution-perfect-order-booster-box) |
| Pokémon TCG Pitch Black Booster Box | 196214157514 | high | [www.pokeboxusa.com](https://www.pokeboxusa.com/products/pitch-black-booster-box) |
| Pokémon TCG Pitch Black Booster Bundle (Pack of 5) | 196214157484 | high | [www.pokeboxusa.com](https://www.pokeboxusa.com/products/pitch-black-booster-bundle) |
| Pokémon TCG Pitch Black Elite Trainer Box (Pack of 3) | 196214157422 | high | [pokeboxusa.com](https://pokeboxusa.com/products/pitch-black-elite-trainer-box) |
| MTG Star Trek Collectors Edition Commander Deck [Federation Fleet] | 195166336015 | medium | [facetofacegames.com](https://facetofacegames.com/products/star-trek-commander-commander-deck-collectors-edition-federation-fleet) |
| MTG Star Trek Collectors Edition Commander Deck [Klingon Fury] | 195166336015 | medium | [facetofacegames.com](https://facetofacegames.com/products/star-trek-commander-commander-deck-collectors-edition-klingon-fury) |
| MTG Star Trek Collectors Edition Commander Deck [Landing Party] | 195166336015 | medium | [facetofacegames.com](https://facetofacegames.com/products/star-trek-commander-commander-deck-collectors-edition-landing-party) |
| MTG Star Trek Collectors Edition Commander Deck [We Are the Borg] | 195166336015 | medium | [facetofacegames.com](https://facetofacegames.com/products/star-trek-commander-commander-deck-collectors-edition-we-are-the-borg) |
| One Piece Card Game EB-05 One Piece Heroines Edition Vol. 2 Booster Box (English, 24 packs) | 810199502786 | medium | [www.gtsdistribution.com](https://www.gtsdistribution.com/card-games/one-piece-tcg-extra-booster-(eb-05)-(24ct).asp) |
| One Piece Card Game OP-16 The Time of Battle Booster Pack (English) (Pack of 9) | 810199500294 | medium | [www.asmodee.co.uk](https://www.asmodee.co.uk/products/bcl2850164-one-piece-card-game-booster-pack-op-16) |
| One Piece Card Game OP-18 The Dominance of God Booster Pack (English) (Pack of 5) | 810199503790 | medium | [www.asmodee.co.uk](https://www.asmodee.co.uk/products/bcl2882602-one-piece-card-game-booster-pack-op-18) |
| Pokémon TCG 30th Celebration 2-Pack Blister | 196214152281 | medium | [www.bescards.com](https://www.bescards.com/products/pokemon-30th-celebration-2-booster-blister-eevee) |
| Pokémon TCG 30th Celebration Binder Collection (Pack of 3) | 196214158672 | medium | [otakumart.co.nz](https://otakumart.co.nz/products/30th-celebration-binder-collection-pokemon-tcg) |
| Pokémon TCG 30th Celebration Elite Trainer Box Case | 10196214158808 | medium | [www.pokeboxusa.com](https://www.pokeboxusa.com/collections/pokemon-30th-celebrations/products/30th-celebration-elite-trainer-box-case) |
| Pokémon TCG 30th Celebration Figure Collection Case | 10196214158853 | medium | [www.pokeboxusa.com](https://www.pokeboxusa.com/products/30th-celebration-figure-collection-case) |
| Pokémon TCG 30th Celebration Figure Collection [Mew] (Pack of 2) | 196214158856 | medium | [otakumart.co.nz](https://otakumart.co.nz/products/30th-celebration-figure-collection-mew-pokemon-tcg) |
| Pokémon TCG 30th Celebration Figure Collection [Mewtwo] (Pack of 2) | 196214158856 | medium | [otakumart.co.nz](https://otakumart.co.nz/products/30th-celebration-figure-collection-mewtwo-pokemon-tcg) |
| Pokémon TCG 30th Celebration Pokemon Center Elite Trainer Box | 196214158818 | medium | [www.pricecharting.com](https://www.pricecharting.com/game/pokemon-30th-celebration/elite-trainer-box-pokemon-center) |
| Pokémon TCG 30th Celebration ex Tin (International Version) [Greninja ex] | 196214146259 | medium | [www.dacardworld.com](https://www.dacardworld.com/gaming/pokemon-30th-celebration-tin) |
| Pokémon TCG 30th Celebration ex Tin (International Version) [Sylveon ex] (Pack of 3) | 196214146259 | medium | [www.dacardworld.com](https://www.dacardworld.com/gaming/pokemon-30th-celebration-tin) |
| Pokémon TCG Delta Reign Build & Battle Box (Pack of 4) | 196214165793 | medium | [www.dacardworld.com](https://www.dacardworld.com/gaming/pokemon-mega-evolution-delta-reign-build-and-battle-box) |
| MTG Secrets of Strixhaven Commander Deck [Lorehold Spirit] (Pack of 3) | 195166323763 | conflict | [www.amazon.com](https://www.amazon.com/dp/B0G887STC9) |
| MTG Secrets of Strixhaven Commander Deck [Prismari Artistry] (Pack of 3) | 195166323725 | conflict | [www.amazon.com](https://www.amazon.com/dp/B0G87JBK84) |
| MTG Secrets of Strixhaven Commander Deck [Quandrix Unlimited] (Pack of 3) | 195166324050 | conflict | [www.amazon.com](https://www.amazon.com/dp/B0G874G6HD) |
| MTG Secrets of Strixhaven Commander Deck [Silverquill Influence] | 195166323701 | conflict | [www.amazon.com](https://www.amazon.com/dp/B0G8742ZNG) |
| MTG Secrets of Strixhaven Commander Deck [Witherbloom Pestilence] (Pack of 6) | 195166323749 | conflict | [www.amazon.com](https://www.amazon.com/dp/B0G86Z17Y8) |
| MTG Star Trek Commander Deck [Federation Fleet] | 195166338811 | conflict | [www.amazon.com](https://www.amazon.com/dp/B0H6H5PT8N) |
| MTG Star Trek Commander Deck [Klingon Fury] | 195166338910 | conflict | [www.amazon.com](https://www.amazon.com/dp/B0H6H7QSSD) |
| MTG Star Trek Commander Deck [Landing Party] | 195166338835 | conflict | [www.amazon.com](https://www.amazon.com/dp/B0H6GXL5PR) |
| MTG Star Trek Commander Deck [We Are the Borg] (Pack of 4) | 195166338927 | conflict | [www.amazon.com](https://www.amazon.com/dp/B0H6GTL14Z) |
| MTG Star Trek Scene Box [Divergent Timeline] (Pack of 3) | 195166338262 | conflict | [www.amazon.com](https://www.amazon.com/dp/B0H6GZS4P6) |
| MTG Star Trek Scene Box [Enterprise-Q] (Pack of 3) | 195166338330 | conflict | [www.amazon.com](https://www.amazon.com/dp/B0H6GY31HT) |
| Pokémon TCG 30th Celebration Booster Pack (Pack of 6) | — | none | — |
| Pokémon TCG 30th Celebration Classic Collection Pack (Pack of 2) | — | none | — |
| Pokémon TCG Delta Reign Pokémon Center Elite Trainer Box | — | none | — |
| Pokémon TCG Phantasmal Flames Booster Box | 196214143364 | conflict | [www.diamondcardsonline.com](https://www.diamondcardsonline.com/pokemon-mega-evolution-phantasmal-flames-booster-box/) |
| Pokémon TCG Pitch Black Pokemon Center Elite Trainer Box (Exclusive) | — | low | — |

### Demand and competition proxies (60 products)

| Product | TCGplayer listings | 30-day units sold | Price trend (30d) | Big-box listings seen | Demand | Competition | Note |
|---|---|---|---|---|---|---|---|
| 2026 Topps Chrome Baseball Hobby Box | n/a | n/a | n/a | — | high | medium | Released July 22, 2026 (old, ~3.5 months). Observed dealer prices: Diamond Cards $334.94 (pre-sell page), Stoc |
| 2026 Topps Cosmic Chrome Baseball Hobby Box | n/a | n/a | n/a | — | high | medium | Brand-new: released Nov 4, 2026. High-end product; dealer prices cluster $1,040-1,130, above the market_usd of |
| 2026 Topps Inception Football Hobby Box | n/a | n/a | n/a | — | medium | medium | Releases today, Nov 6, 2026 (preorders opened Oct 5). Topps direct $369.99 sold out -> secondary at ~$580-600. |
| MTG Marvel Super Heroes Collector Booster Box | 77 | 82 | flat | GameStop ($479.99, above MSRP); Amazon (listing); Walmart (listing) | medium | high | Released June 26, 2026 (old). TCG market flat over 30d (458.60 -> 456.22). No reprint announced. |
| MTG Reality Fracture Collector Booster Display | 98 | 1154 | falling | Best Buy ($319.99 listed); GameStop ($429.99, unavailable); Amazon (listing) | high | high | New: released Oct 2, 2026 (35 days). TCG market falling -16% over 30d (441.96 -> 372.24); 1,154 boxes sold on  |
| MTG Reality Fracture Multiverse Reforged Commander Deck (Pack of 4) | 87 | 1447 | falling | Amazon (likely, not verified); Walmart (likely, not verified) | high | medium | New set (Oct 2, 2026). TCG market 51.49 -> 48.72 (-5%); 1,447 decks sold on TCGplayer in 30d (observed). Unit  |
| MTG Reality Fracture Play Booster Box | 92 | 2623 | falling | Walmart (~$135); GameStop ($170); Amazon (listing); Best Buy (listing) | high | high | New set (Oct 2, 2026). TCG market falling -16% (141.59 -> 119.49); 2,623 boxes sold in 30d (observed). |
| MTG Secrets of Strixhaven Collector Booster Box | 78 | 82 | flat | Best Buy (~$690); Walmart ($549.99); GameStop (listing); Amazon (listing) | medium | medium | Released Apr 24, 2026 (old). TCG flat (499.62 -> 494.99); 82 sold/30d. Collector box driven by Japanese silver |
| MTG Star Trek Beam Me Up Bundle | 17 | 479 | falling | GameStop (Star Trek bundle listing); Amazon (Star Trek preorder page) | high | medium | Upcoming: releases Nov 13, 2026. TCG preorder market fell 154 -> 126.44 (-18%) but still 26% above MSRP; 479 p |
| MTG Star Trek Collector Booster Box | 42 | 1781 | falling | Best Buy ($479.99 preorder); Walmart ($491.99 preorder); GameStop ($699.99); Amazon (preorder) | high | high | Upcoming Nov 13, 2026. TCG preorder market -31% (664.02 -> 457.34); 1,781 pre-sold/30d (observed). Signed Head |
| MTG Star Trek Play Booster Box | 42 | 2410 | falling | Best Buy ($199.99 preorder); Walmart ($124.99 preorder); Amazon (preorder); GameStop (listing) | high | high | Upcoming: Nov 13, 2026. Preorder market falling fast (152.33 -> 114.74, -25%); 2,410 boxes pre-sold on TCG in  |
| MTG The Hobbit Collector Booster Box | 141 | 456 | falling | GameStop ($749.99 / $849.99); Amazon (listing); Best Buy (listing) | high | medium | Released Aug 14, 2026 (84 days, old). TCG market falling -19% (715.30 -> 577.04); 456 sold/30d (observed). LOT |
| MTG The Hobbit Play Booster Box (Pack of 2) | 124 | 708 | falling | Best Buy ($145-190); GameStop ($169.99); Amazon (listing) | high | medium | Released Aug 14, 2026. TCG falling -14% (153.05 -> 131.18); 708 sold/30d (observed). |
| One Piece Card Game EB-05 One Piece Heroines Edition Vol. 2 Booster Bo | 71 | 2087 | falling | Best Buy ($489.54 marketplace, in stock); Walmart ($295.88); Amazon (listings) | high | medium | New: English release Oct 30, 2026 (7 days). TCG market fell -32% (361.64 -> 244.94) as supply landed; 2,087 bo |
| One Piece Card Game OP-15 Adventure on Kami's Island Booster Box (Engl | 52 | 74 | flat | Best Buy ($406.99 English marketplace); Walmart ($104.99 listing, stock unverified); Amazon (listings) | medium | medium | Released Apr 3, 2026 (old). TCG flat (256.31 -> 249.05); only 74 sold/30d (observed). Store $199.96 is 20% und |
| One Piece Card Game OP-16 The Time of Battle Booster Box (English, 24  | 52 | 207 | falling | Amazon (Japanese-edition listings only) | medium | medium | Released June 12, 2026 (old). TCG -7% (223.48 -> 207.50); 207 sold/30d (observed). |
| One Piece Card Game OP-17 The World's Strongest Warriors Booster Box ( | 58 | 526 | flat | Amazon (marketplace $199.99-223.99); Best Buy ($223.99 English / $139.99 Japanese) | high | medium | Released Aug 28, 2026 (70 days). TCG market slightly rising (291.33 -> 296.33, +1.7%); 526 sold/30d (observed) |
| One Piece Card Game OP-18 The Dominance of God Booster Box (English, 2 | 31 | 260 | falling | — | high | low | Upcoming: English release Nov 20, 2026. TCG preorder market fell -33% (360.69 -> 240.53); 260 pre-sold/30d (ob |
| Pokémon TCG 30th Celebration Booster Bundle (Pack of 3) | 293 | 6525 | falling | Pokemon Center ($26.94 MSRP, sold out); Walmart (marketplace $117.98); Amazon (listings) | high | high | Released Oct 2, 2026 (35 days). TCG -9% (69.92 -> 63.78); 6,525 bundles sold/30d (observed, highest in this li |
| Pokémon TCG 30th Celebration Elite Trainer Box | 543 | 5786 | falling | GameStop ($99.99, unavailable); Best Buy (marketplace); Walmart (marketplace $127-190); Amazon (unavailable); Pokemon Ce | high | high | Released Sep 16, 2026 (51 days). TCG falling -27% (143.01 -> 104.69); 5,786 sold/30d (observed). Japanese repr |
| Pokémon TCG 30th Celebration Pokemon Center Elite Trainer Box | 167 | 282 | falling | Pokemon Center ($59.99, sold out); Walmart (marketplace listing); Amazon (marketplace listing) | high | medium | Released mid-Sept 2026. TCG -9% (286.62 -> 259.80); 282 sold/30d (observed). Store $249.95 under TCG market. |
| Pokémon TCG 30th Celebration Ultra-Premium Collection [Day] | 70 | 476 | falling | GameStop ($379.99, unavailable); Best Buy (marketplace $449.99-649.99); Walmart ($400-500); Amazon (listing) | high | high | Releases today Nov 6, 2026. TCG preorder market collapsed -36% (563.30 -> 360.24); 476 sold/30d (observed). |
| Pokémon TCG 30th Celebration Ultra-Premium Collection [Night] | 59 | 571 | falling | GameStop ($379.99 styles-may-vary, unavailable); Best Buy (marketplace); Walmart ($400-500); Amazon (listing) | high | high | Releases today Nov 6, 2026. TCG preorder market -41% (710.62 -> 421.96); 571 sold/30d (observed). Price still  |
| Pokémon TCG Chaos Rising Booster Box | 164 | 415 | flat | Walmart ($194.99); Best Buy (marketplace $225-283); Pokemon Center ($161.64, sold out); Amazon (listing); GameStop (bund | high | medium | Released May 22, 2026 (old). TCG flat (186.97 -> 182.68); 415 sold/30d (observed). No reprint announced. |
| Pokémon TCG Delta Reign Booster Box | 55 | 2982 | falling | Pokemon Center ($161.64, sold out); Amazon (listing); Best Buy (ETB $49.99 listing); GameStop (ETB listing) | high | high | Releases today Nov 6, 2026. TCG preorder market -17% (261.10 -> 216.80); 2,982 boxes pre-sold/30d (observed). |
| Pokémon TCG Delta Reign Elite Trainer Box | 117 | 3331 | falling | Best Buy ($49.99 MSRP, release 11/06); GameStop ($89.99); Pokemon Center (PC ETB $59.99, OOS); Amazon (unavailable) | high | high | Releases today Nov 6, 2026. TCG preorder market -36% (130.18 -> 83.87); 3,331 pre-sold/30d (observed). |
| Pokémon TCG Delta Reign Pokémon Center Elite Trainer Box | 56 | 125 | falling | Pokemon Center ($59.99, out of stock) | medium | medium | Releases Nov 6, 2026. TCG preorder market -47% (497.51 -> 265.75); 125 sold/30d (observed). TCG lowest $199.01 |
| Pokémon TCG Mega Evolution Booster Box | 34 | 33 | flat | Best Buy ($160.99, sold out); Walmart (marketplace $299.95); Pokemon Center (sold out); Amazon (listing) | low | low | Released Sep 2025 (old). TCG flat (304.11 -> 299.77); only 33 sold/30d (observed). Guides flag reprint risk fo |
| Pokémon TCG Phantasmal Flames Booster Box | 84 | 107 | flat | Walmart ($329.95, OOS); Best Buy ($549.99); GameStop ($239.99, unavailable); Pokemon Center ($161.64, sold out); Amazon  | medium | low | Released Nov 2025 (~1 year old). TCG flat (392.96 -> 386.94); 107 sold/30d (observed). Up ~22% since release p |
| Pokémon TCG Pitch Black Booster Box | 207 | 789 | falling | Best Buy ($160.99 listed); Pokemon Center ($161.64, sold out); GameStop ($249.99, unavailable); Amazon (listing) | high | high | Released July 17, 2026 (old). TCG -6% (187.53 -> 175.39); 789 sold/30d (observed). Mega Darkrai ex headline; n |
| 2025 Panini Prizm NFL Football Hobby Box | n/a | n/a | n/a | Amazon (Prizm Black only) | high | medium | Released ~Feb 2, 2026 (old). Conflicting dealer prices ($375-$1,000). |
| 2025-26 Panini Prizm Basketball Hobby Box | n/a | n/a | n/a | Panini America direct ($299.95 sale / $399.95); Best Buy ($349.99); Walmart Business (~$261.77); Amazon (listings) | high | high | Released July 31, 2026 (old). Dealer prices $450-530 at presale; now $260-350 at big-box. 3 autos/box. |
| 2026 Bowman Chrome Baseball Hobby Box | n/a | n/a | n/a | Amazon (listing) | high | medium | Released Sep 9, 2026 (old). Two autos/box; prospect-driven demand. |
| 2026 Topps Chrome Football Hobby Box | n/a | n/a | n/a | — | high | medium | Upcoming/just-released (Diamond lists Nov 18, 2026; other pages show April 2026 - conflicting). Store at parit |
| 2026 Topps Series 1 Baseball Hobby Box | n/a | n/a | n/a | Walmart ($199.99-205, marketplace "from $172.99"); GameStop (value box only) | medium | high | Released Feb 2026 (old). Price drifting down since release. |
| 2026-27 Topps Flagship Basketball Hobby Box | n/a | n/a | n/a | — | high | medium | Brand-new: released Nov 5, 2026. First Topps flagship NBA release; strong hobby attention (SI coverage). |
| Disney Lorcana Attack of the Vine! Booster Display Box | 36 | 254 | falling | Walmart ($229.99); Best Buy (marketplace $400); Amazon (unavailable) | medium | medium | Released July 24, 2026 (old). TCG -10% (197.25 -> 177.34); 254 sold/30d (observed). |
| Disney Lorcana Hyperia City Booster Display Box (Pack of 2) | 68 | 2240 | falling | Walmart ($189); Best Buy ($219.99); GameStop ($249.99, unavailable); Amazon (listing) | high | high | New: released Oct 23, 2026 (14 days). TCG market -41% (215.28 -> 127.69) as supply arrived; 2,240 boxes sold/3 |
| Disney Lorcana Wilds Unknown Booster Display Box | 32 | 79 | flat | Walmart ($239.95) | low | low | Released May 15, 2026 (old). TCG flat (233.19 -> 226.37); 79 sold/30d (observed). No restock announced. |
| Disney Lorcana Winterspell Booster Display Box | 31 | 59 | falling | Amazon (display listing) | low | low | Released Feb 20, 2026 (old). TCG -9% (262.19 -> 238.77); only 59 sold/30d (observed). |
| MTG Lorwyn Eclipsed Collector Booster Box | 73 | 57 | flat | Walmart ($369-379); GameStop ($499.99, unavailable); Amazon (listing) | low | medium | Released Jan 23, 2026 (old). TCG flat (417.27 -> 408.18); only 57 sold/30d (observed). |
| MTG Lorwyn Eclipsed Play Booster Box (Pack of 3) | 141 | 657 | falling | Best Buy ($149.99); Walmart ($174.98); GameStop ($159.99, unavailable); Amazon (listing) | high | medium | Released Jan 23, 2026 (old, still in print). TCG -11% (113.92 -> 101.79); 657 sold/30d (observed). |
| MTG Marvel Super Heroes Play Booster Box | 127 | 539 | flat | Walmart ($119.95); Best Buy ($189.99); Amazon (listing) | high | high | Released June 26, 2026 (old). TCG -5% (109.45 -> 104.43); 539 sold/30d (observed). |
| MTG Secrets of Strixhaven Play Booster Box (Pack of 2) | 54 | 204 | flat | GameStop ($139.99, unavailable); Amazon (listings) | medium | medium | Released Apr 24, 2026 (old). TCG slightly rising (142.14 -> 145.36, +2%); 204 sold/30d (observed). |
| MTG Star Trek Collectors Edition Commander Deck [We Are the Borg] | 21 | 118 | falling | — | medium | low | Upcoming Nov 13, 2026. TCG preorder market -35% (317.69 -> 204.90); 118 pre-sold/30d (observed). Borg is the m |
| MTG Teenage Mutant Ninja Turtles Collector Booster Box | 58 | 53 | flat | Best Buy ($449.99 / $569.99); GameStop ($424.99); Amazon (unavailable) | low | medium | Released Mar 6, 2026 (old). TCG flat (432.40 -> 431.65); only 53 sold/30d (observed). |
| MTG Teenage Mutant Ninja Turtles Play Booster Box | 112 | 236 | flat | Walmart (~$100); GameStop ($159.99, unavailable); Amazon (listing) | medium | high | Released Mar 6, 2026 (old). TCG -4% (107.94 -> 103.63); 236 sold/30d (observed). |
| One Piece Card Game EB-03 One Piece Heroines Edition Booster Box (Engl | 74 | 129 | falling | — | medium | low | Released Feb 20, 2026 (old). TCG -11% (323.50 -> 289.26); 129 sold/30d (observed). Not a reprint set. |
| One Piece Card Game OP-05 Awakening of the New Era Booster Box (Englis | 39 | 16 | falling | — | low | low | Released 2023 (old, out of print, no reprint found). TCG -6% (1053.09 -> 989.48); only 16 sold/30d (observed)  |
| One Piece Card Game OP-09 Emperors in the New World Booster Box (Engli | 46 | 9 | flat | — | low | low | Released Mar 2025 (old). TCG flat (642.60 -> 635.71); only 9 sold/30d (observed). |
| One Piece Card Game OP-13 Carrying On His Will Booster Box (English, 2 | 90 | 112 | falling | — | medium | medium | Released Nov 7, 2025 (old). TCG -5% (440.08 -> 417.72); 112 sold/30d (observed). No reprint found. |
| One Piece Card Game OP-14 The Azure Sea's Seven Booster Box (English,  | 66 | 65 | flat | GameStop (packs only) | low | medium | Released Jan 16, 2026 (old). TCG -4% (268.06 -> 257.15); 65 sold/30d (observed). |
| One Piece Card Game PRB-02 The Best Vol. 2 Booster Box (English, 20 pa | 55 | 33 | flat | — | low | low | Released Oct 3, 2025 (old). TCG -3% (377.69 -> 367.72); only 33 sold/30d (observed). Store $299.94 well under  |
| Pokémon TCG 30th Celebration Booster Bundle Case | 23 | 104 | flat | — | high | low | Set released Oct 2, 2026. TCG flat (1833.39 -> 1827.90); 104 cases sold/30d (observed). Store $1,199.76 is far |
| Pokémon TCG 30th Celebration Classic Collection Pack (Pack of 2) | 35 | 30 | falling | — | low | low | TCG -26% (311.83 -> 231.75); 30 sold/30d (observed). Unit $124.98 (pack of 2) is ~46% under TCG market - verif |
| Pokémon TCG 30th Celebration Elite Trainer Box Case | 48 | 92 | falling | — | high | medium | Set released Sep 16, 2026. TCG -29% (1642.56 -> 1163.32); 92 cases sold/30d (observed). Per-ETB equivalent (~$ |
| Pokémon TCG 30th Celebration Ultra-Premium Collection Case | 30 | 93 | falling | — | high | medium | UPC releases Nov 6, 2026. TCG case preorder market -42% (2341.93 -> 1363.55); 93 cases sold/30d (observed). St |
| Pokémon TCG Perfect Order Booster Box | 148 | 294 | flat | Best Buy (marketplace $230-233); GameStop ($237.49, unavailable); Pokemon Center ($161.64, sold out); Amazon (listing) | medium | medium | Released Mar 27, 2026 (old). TCG flat (172.75 -> 172.09); 294 sold/30d (observed). Price down ~26% since relea |
| Pokémon TCG Pitch Black Elite Trainer Box (Pack of 3) | 229 | 597 | flat | GameStop (listing); Amazon (listing); Pokemon Center (PC ETB $59.99) | high | high | Released July 17, 2026 (old). TCG flat/slightly up (68.48 -> 69.97); 597 sold/30d (observed). |
| Pokémon TCG Pitch Black Pokemon Center Elite Trainer Box (Exclusive) | 207 | 144 | flat | Pokemon Center ($59.99, OOS) | medium | medium | Released July 17, 2026 (old). TCG flat (120.14 -> 119.03); 144 sold/30d (observed). Store $99.98 under TCG low |

Sources: TCGplayer search and price-history APIs read 2026-11-06 (listings, units sold, trend are observed values); big-box entries are from search-engine results the same day, not live stock checks, and are estimates; eBay was unreachable from this environment.

### Files delivered

| File | What it is | How to use |
|---|---|---|
| `docs/catalog-audit-2026-11-06.md` | This report | — |
| `docs/gogetcards-reprice.csv` | Price, pack size, clean description and specs for all 142 at 20–40% below market | Review against cost; import via Admin → Products → Import (handle matches update in place) |
| `docs/gogetcards-reprice-review.csv` | Market price, source URL, confidence, old/new gap per product | Reference for the CSV above |
| `docs/gogetcards-descriptions-fix.csv` | Clean description + specs for the 6 products carrying sourcing notes | Import now; no price column, prices untouched |
| `docs/gogetcards-gtin-research.csv` | Barcodes found for the 74 products without one, with source and confidence | Import the rows you accept (handle + gtin) |
| `docs/gogetcards-titles.csv` / `-review.csv` | Configuration-bearing titles for 139 products | Optional; import when convenient |
| `docs/gogetcards-images.csv` | Self-hosted images for 3 imageless products and the regular 30th ETB | Import if not already done |
| `scores.json` (scratch, reproduced in sections C/D) | Every scoring factor per product | Re-run `score.py` with different weights if you disagree with one |