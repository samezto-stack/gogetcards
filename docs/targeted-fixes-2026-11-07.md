# GoGetCards — targeted content fixes, 2026-11-07

Two things were wrong after the 143-product import: six box titles carried the wrong pack count, and collection cards dropped the variant name. The variant-card fix is **code, already deployed**. The six titles and two descriptions are **data**, delivered as one small import file — the database is not reachable from here, so you apply them the same way you applied the master file.

- **Import this:** `docs/gogetcards-targeted-fixes-2026-11-07.csv` — 8 rows, columns `handle, title, description, specs`. Dry run through the real importer: **0 create, 8 update, 0 errors.** Every row carries its current values for the columns it is not changing, so nothing is cleared. Only the title changes on the six boxes; only the description and specs change on the two bundles (and the PRB-02 box also gets a corrected description). No price, pack size, image, GTIN, stock, handle, canonical URL, label or availability is touched.

---

## 1. The six corrected titles

The configuration and specifications were already right (e.g. "12 Collector Boosters per box, 15 cards per pack"); only the title's pack count was wrong — it had taken the **cards-per-pack** number instead of the **packs-per-box** number.

| Product | Old title | New title | Verified config |
|---|---|---|---|
| MTG Lorwyn Eclipsed Collector Booster Box | … (15 Packs) | … **(12 Packs)** | Collector Booster Box = 12 packs |
| MTG Lorwyn Eclipsed Play Booster Box | … (14 Packs) | … **(30 Packs)** | Play Booster Box = 30 packs (your spec) |
| MTG Marvel Super Heroes Jumpstart Booster Box | … (20 Packs) | … **(24 Packs)** | Jumpstart Box = 24 packs, 20 cards each |
| MTG Teenage Mutant Ninja Turtles Collector Booster Box | … (15 Packs) | … **(12 Packs)** | Collector Booster Box = 12 packs |
| MTG Teenage Mutant Ninja Turtles Play Booster Box | … (14 Packs) | … **(30 Packs)** | Play Booster Box = 30 packs (your spec) |
| One Piece PRB-02 The Best Vol. 2 Booster Box | … (English, 24 packs) | … **(English, 20 packs)** | The Best premium box = 20 packs |

Because the H1, the SEO title, the Product JSON-LD and the Google feed title are all derived from the stored title in code, correcting the one stored title fixes all of them at once. The specifications and (for the five MTG boxes) the descriptions already stated the right number, so they agree once the title is fixed. **The handle is unchanged** on every one, including PRB-02 (its handle still ends `-24-packs`; renaming it would break the live URL, so it stays and only the displayed title and copy say 20).

**Pack counts verified against the manufacturer's standard box structure:** Collector Booster Box = 12, Jumpstart = 24 (20 cards per pack), One Piece premium booster box = 20. One flag for you: a current Magic **Play Booster box is usually 36 packs**, while your specification for both Play Booster boxes says **30**. I matched the title to your specification (30), since the title was the thing that disagreed with it; if your actual product is 36 packs, change the specification and title together — say the word and I will.

## 2. Catalogue-wide scan for the same error

I scanned all 143 products, comparing each title's pack count against its configuration's packs-per-box count. **The six above are the only pack-count contradictions.** One extra thing surfaced: the PRB-02 **description** still embedded the old "(English, 24 packs)" from its title and then said "20 packs per box" — an internal contradiction — so the targeted file also rewrites that description and its specification to read 20 cleanly. Nothing else in the catalogue has a packs-per-box / cards-per-pack mismatch, a boxes-per-case mismatch, or a title that disagrees with its specification.

## 3. The variant-display problem — root cause and fix (deployed)

**Cause:** the product page and the Google feed already build their title with `variants.displayTitle()`, which appends the distinguishing name (" — Mew", " — Night", " — Federation Fleet"). The shared **product card** did not — it used `packs.titleFor()`, which only adds "(Pack of N)". So on collection, search, featured and related grids, every member of a variant group showed the same generic name. The data was fine (the variant names are in the database, which is why the product pages were correct); only the card component ignored it.

**Fix (one shared component, no data change):** the card now uses `variants.displayTitle()`, the exact helper the page and feed use, exposed to templates as a local. The old hard 72-character truncation — which cut off exactly the distinguishing suffix on longer names — is gone; the title now wraps and is CSS-clamped to three lines so cards stay even. Alt text and the add-to-cart label use the same variant-aware title.

**Verified live** on `/collection/all`: "Pokémon TCG 30th Celebration Figure Collection — Mew" and "— Mewtwo"; all five "MTG Secrets of Strixhaven Commander Deck — Lorehold Spirit / Prismari Artistry / Quandrix Unlimited / Silverquill Influence / Witherbloom Pestilence"; Day/Night, Espeon/Umbreon, Greninja/Sylveon, International/Retail and the Star Trek decks and Scene Boxes all now read distinctly, and Collector's Edition decks are no longer confused with the regular ones. Structured data and the feed were already correct and are unchanged. Handles and canonical URLs are untouched.

## 4. The two improved descriptions

Both describe the manufacturer's standard product definition for that SKU type; I did not invent set-specific contents.

**MTG Reality Fracture Bundle** ($49.99, single unit — unchanged): "9 Reality Fracture Play Boosters, 30 basic lands (15 traditional foil and 15 non-foil), a traditional foil alt-art promo card, an oversized Spindown life counter and a card storage box. … the standard Bundle, not the Gift Bundle, so it does not include a Collector Booster." The specification now lists the same contents in place of the old bare "Bundle".

**MTG The Hobbit Gift Bundle** ($49.99, single unit — unchanged): "9 The Hobbit Play Boosters and 1 The Hobbit Collector Booster, 30 basic lands (15 traditional foil and 15 non-foil), a traditional foil alt-art promo card, an oversized Spindown life counter and a card storage box, all in gift packaging." It is explicitly distinguished from the ordinary MTG The Hobbit Bundle (a separate listing) by the added Collector Booster and gift presentation — which is exactly what a Gift Bundle adds across recent Magic sets.

**Unverified detail, reported rather than asserted:** the exact basic-land split (15 foil / 15 non-foil) and the promo-card identity are the standard modern-Magic Bundle configuration, not something I could confirm for these specific 2026 sets. If your actual product differs, tell me the real contents and I will adjust. The universal, verified quantities — 9 Play Boosters in the Bundle, plus 1 Collector Booster in the Gift Bundle — are stated with confidence.

## 5. Files and records

- **Deployed code** (committed, live): `views/partials/product-card.ejs` (variant-aware card title, no truncation), `server.js` (exposes `variants` to templates), `public/css/gogetcards.css` (3-line clamp), `services/productCsv.js` (import-time pack-count check + helpers), `test/productContent.test.js` (regression tests).
- **For you to import:** `docs/gogetcards-targeted-fixes-2026-11-07.csv` — updates 8 product records (6 titles, 2 descriptions+specs, PRB-02 also its description).
- The 143-product master file and every other product are untouched.

## 6. Safeguard added

The CSV importer now warns, on every future import, when a title's pack count does not match the configuration's packs-per-box count — the exact error that caused this — and flags it for review rather than rewriting anything. It also underpins the variant-display tests. Tests: **61 pass, 0 fail**; security suite **30 pass**; every template renders; the variant card verified live.

## 7. Needs your input

1. **Play Booster box pack count:** your spec says 30; the current Magic standard is 36. I matched the titles to your spec (30). Confirm 30, or I will set both to 36.
2. **Bundle land split and promo identity** for Reality Fracture and The Hobbit Gift Bundle: I used the standard modern-Magic configuration; confirm or correct the set-specific details.
3. Import `docs/gogetcards-targeted-fixes-2026-11-07.csv` when ready; the six titles and two descriptions correct themselves on the storefront, schema and feed on the next import and feed fetch. The variant-card fix is already live and needs nothing from you.
