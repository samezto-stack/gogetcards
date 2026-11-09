# GoGetCards — Meta Ads strategy review (independent second opinion)

Date: 2026-11-09 · No Meta campaign was created, edited or enabled during this review. No spend authorised.

**Verdict: TRACKING FIXES REQUIRED FIRST.** The strategy also needs revision, mainly the structure and the budget split. The short version is in section 13.

---

## 0. What was actually inspected, and what could not be

| Area | Status | How |
|---|---|---|
| Website tracking code (custom Node/EJS) | **Inspected** | Read `views/partials/analytics.ejs`, `services/metaCapi.js`, `services/orderPipeline/index.js`, `middleware/tracking.js`, `server.js` |
| Live site | **Inspected** | Fetched gogetcards.com: **no Meta Pixel loads** (no `connect.facebook.net`, no `fbq('init')`). |
| Catalog/feed | **Inspected** | Live Google feed: 37 products, USD, ids = SKU (`gc-031` etc.), custom labels present |
| Google Shopping results | From owner screenshots | 142 clicks, 252 MAD, 6 orders, $499.90 |
| **Meta ad account / Business portfolio / Events Manager** | **NOT inspected: no access** | All account questions in §3 are open and need to be checked by the owner (menu paths given) |
| Product costs / margins | **Not available** | Profitability uses labelled scenarios (§10) |

Nothing below about the Meta account is asserted as fact.

---

## 1. Tracking audit (section 8 of the brief): confirmed facts

| Item | Finding |
|---|---|
| Meta Pixel installed? | **Code exists, but it is NOT live.** `META_PIXEL_ID` is not set in production, so the pixel never renders. |
| When the pixel would load | **Only after the visitor clicks "Accept"** on the cookie banner. Most visitors never click it, so even with an ID set, most traffic would send nothing. (Google's tag was changed on 2026-11-07 to load unless the visitor declines; Meta was left gated.) |
| Browser events | **PageView only.** There is no ViewContent, AddToCart, InitiateCheckout or browser Purchase. |
| Conversions API | `services/metaCapi.js` exists. It sends **Purchase only**, and **only when the order's traffic source is "Facebook"**. It is inactive today because `META_PIXEL_ID` / `META_ACCESS_TOKEN` are not set. |
| CAPI payload quality | Sends value, currency, event_id = orderId and hashed email **only**. **Missing:** `fbp`, `fbc`, client IP, user agent, `event_source_url`, `external_id`, hashed phone/name/zip/country, `content_ids`, `contents` (id/quantity/price), `num_items`. Event Match Quality would be low. It uses Graph API **v19.0**, an old version that needs bumping. |
| Purchase only on real payment? | **Yes.** The CAPI call sits inside the order pipeline, which only runs behind the signed-callback verifier (HMAC + replay window). Test orders are suppressed. This part is right. |
| Dedup design | `event_id = orderId` is the correct key. A browser Purchase must send the same `eventID`; today there is no browser Purchase, so nothing double-counts, but nothing dedupes either. |
| Click attribution | `fbclid` is recognised for source reports and survives redirects. It is **not** turned into an `_fbc` value and not carried through the Whop payment round-trip to CAPI. |
| Domain verification | **No** `facebook-domain-verification` meta tag on the site. The owner must confirm in Business Settings → Brand safety → Domains (DNS TXT also works). |
| Catalog | No Meta catalog feed route exists, but Meta catalogs accept **Google-format XML feeds**, so `https://gogetcards.com/feed/google.xml` can be used directly. Its ids (SKUs) are already what the thank-you page reports to Google, so Meta events can use the same ids. **Caveat:** that feed currently contains only the 37 Google-ads products. |
| Currency | Orders are recorded in USD and CAPI sends the order currency. The ad account's billing currency (MAD or other) doesn't matter: Meta converts. |
| ZypheraTCG separation | The code only ever sends GoGetCards orders. The risk is on the Meta side: **do not put a ZypheraTCG pixel ID into GoGetCards' environment.** |

### Required changes before launch (engineering, about a day of work; not done yet, awaiting approval)
1. A **dedicated GoGetCards dataset (Pixel)** in the business portfolio, with its ID and a CAPI access token stored as Northflank env vars (never in code).
2. **Consent decision (owner):** load the Meta pixel the same way as the Google tag (on unless declined), **honour Global Privacy Control**, and add a working **"Do Not Sell or Share My Personal Information"** opt-out. The traffic is US-only, and US state laws (CCPA/CPRA and similar) are opt-out regimes for ad-sharing pixels. Without this change, most visitors are invisible to Meta.
3. Browser events, all with SKU `content_ids` matching the catalog:
   - **ViewContent** on product pages (value, currency).
   - **AddToCart** from the cart API response (id, quantity, price).
   - **InitiateCheckout** on checkout step 1 (cart value, all line ids).
   - **Purchase** on `/thank-you` with `eventID = orderId`, full `contents`, value and currency, and a `sessionStorage` guard against reloads (the same pattern as the Google conversion).
4. **CAPI upgrade:**
   - Send **every** real purchase, not just Facebook-sourced ones. Meta does its own attribution, and filtering on our last-touch source throws away view-through and cross-device data.
   - Add `fbp`/`fbc` (store `_fbp`/`_fbc` and `fbclid` on the CheckoutSession at step 1 so they survive the Whop redirect), plus IP, user agent, `event_source_url`, `external_id`, hashed contact fields, `contents`, `num_items` and `event_time` = paid time.
   - Bump the Graph API version.
   - Support `test_event_code` for Events Manager testing.
5. **Domain verification** meta tag via an env var.
6. **Meta catalog** pointing at the feed URL. Optionally add a separate Meta feed that includes more than the 37 Google-ads SKUs.
7. **End-to-end test** with Events Manager → Test Events:
   - one real-flow order, checking browser and server Purchase arrive with the same event_id and show as "Deduplicated"
   - value and currency correct
   - a mixed cart shows all items
   - a declined/cancelled payment produces **no** Purchase
   - Event Match Quality at least about 6/10

---

## 2. Google Shopping provisional result (computed, not extrapolated)

- Spend 252 MAD ≈ **$25.84** (at 9.7526 MAD/USD)
- 142 clicks, so CPC ≈ **$0.18**
- 6 orders, so conversion rate ≈ **4.2%**
- Revenue $499.90, so AOV ≈ **$83.32**, cost per order ≈ **$4.31**, ROAS ≈ **19×**

**Caveats:** this was 80 minutes, a single product (Delta Reign ETB) dominated, and two buyers came back later. Treat it as evidence of *demand and price appeal on high-intent search*, not as a benchmark for Meta.

**Why Meta will convert differently:**
- On Google, the buyer typed the product name. On Meta, the ad interrupts someone who wasn't shopping.
- Meta has to *create* the purchase decision, and it has to overcome trust in an unknown store.
- Expect a materially lower conversion rate and a higher cost per order than the Google sample. Plan for **cost per purchase several times higher**, and verify it rather than assuming.

---

## 3. Meta account questions (brief §3): open, owner to check

| # | Question | Where to check | Why it matters |
|---|---|---|---|
| 1 | Was the $10k spent for ZypheraTCG or GoGetCards? | Ads Manager → Campaigns → filter Lifetime and look at destination URLs | If it was ZypheraTCG, **none of its conversion learning transfers** to gogetcards.com |
| 2–4 | Objectives used; optimised for purchases? | Campaigns column "Objective" / ad set "Performance goal" | Tells us whether the account has run Sales campaigns |
| 5–7 | Existing pixel/dataset, and which domain fires it | Events Manager → Data sources → each dataset → Overview (URLs / domains) | **If it is ZypheraTCG's: create a new GoGetCards dataset. Don't reuse it.** |
| 8 | Account currency / time zone | Ad account settings | Billing only. Can't be changed later without a new ad account |
| 9 | Business portfolio verified? | Business settings → Security Center | Affects limits and recovery if restricted |
| 10 | Restrictions, payment issues, spending limit | Account Quality (business.facebook.com/accountquality) | Must be clean before launch |

**What the old history can legitimately give GoGetCards:**
- account age, payment and trust standing
- CPM/CTR ranges for TCG creatives (useful as rough benchmarks)

**What it cannot give:**
- purchase learning for this domain
- audiences built from ZypheraTCG customers. Don't create lookalikes from ZypheraTCG buyers for GoGetCards; that merges businesses' customer data.

---

## 4. Structure: options compared (brief §5)

The deciding constraint: **a new dataset with zero purchase history, at roughly $100–150/day.** Meta's learning phase wants about 50 optimisation events per ad set per week.

At the scenario cost-per-purchase of $25–50 (§10):
- **$150/day split three ways** (ChatGPT's plan) gives each ad set roughly 3–6 purchases a week, so **no ad set ever exits learning**, and the category comparison is noise.
- **$150/day in one ad set** gives about 21–42 a week, which is close.

| Option | Verdict |
|---|---|
| **A: one campaign, three category ad sets** | ❌ Splits too little data three ways. "Category comparison" at this volume isn't statistically readable, and each ad set restarts learning when edited. |
| **B: one broad Sales campaign, one ad set, Advantage+ audience, category creatives as separate ads** | ✅ **Recommended start.** All purchase signal goes into one learning pool. Category performance is still readable at **ad level** and from purchased `content_ids`. |
| **C: separate campaigns per category** | ❌ Worst fragmentation. Only makes sense at much higher spend. |
| **D: Advantage+ Sales (catalog)** | ⏳ **Phase 2.** It works best with a catalog matched to events and some purchase history. Switch or test once you have about 30–50 tracked purchases, or run it as a 30% split test from week 3. |

---

## 5. Audience (brief §6)

- **United States only. Check "Location: people living in"** and confirm no Advantage+ location expansion is on.
- **Advantage+ audience, broad.** Age minimum **18** as a hard control (the buyers are adults with cards; Pokémon also appeals to minors, who shouldn't be targeted). No upper limit.
  - Interest suggestions (Pokémon TCG, One Piece Card Game, Topps, Panini, Magic: The Gathering) can be added as *suggestions* only, not hard limits.
  - Meta's current guidance and most 2025–26 account data favour broad + creative-led targeting. Interest stacks don't reliably beat it, and a cold pixel gives no reason to expect otherwise.
- **No separate retargeting campaign at launch.** Site traffic is small, so the audiences would be tiny and overlap with prospecting, and Advantage+ already retargets inside the same ad set.
  - Add a separate retargeting ad set (10–15% of budget) when the 30-day website audience reaches several thousand people, or later via Advantage+ Sales' existing-customer cap.
- **Lookalikes:** only from **GoGetCards** purchasers, and only once there are a few hundred. Not now.
- **Placements:** Advantage+ placements, **excluding Audience Network** (low-intent clicks for physical goods).

---

## 6. Products for Meta (brief §14B): live prices from the feed, 2026-11-09

Selection logic for cold social traffic:
- visually recognisable products
- low entry price, or a clear collector hook
- in stock (no preorders in cold ads)
- not $400+ on day one: trust is the barrier on Meta, and a $400 first purchase from an unknown store is the hardest sale there is

| Product | Price | Category | Why |
|---|---:|---|---|
| Pokémon TCG Delta Reign Elite Trainer Box (9 Packs) | $49.99 | Pokémon | Proven on Google (109 clicks, most orders), current set, impulse price |
| Pokémon TCG Pitch Black Elite Trainer Box (9 Packs) | $49.99 | Pokémon | Second ETB at the same price; easy "add another" |
| Pokémon TCG 30th Celebration Booster Bundle | $49.99 | Pokémon | Anniversary product, broad nostalgia appeal (lapsed collectors on Meta) |
| Pokémon TCG Delta Reign Booster Box (36 Packs) | $149.97 | Pokémon | Higher AOV for serious buyers |
| Pokémon TCG Pitch Black Booster Box (36 Packs) | $99.98 | Pokémon | Strong value, but see the "too cheap" risk below |
| Pokémon TCG 30th Celebration Pokémon Center ETB | $199.96 | Pokémon | Premium collector item |
| One Piece OP-16 The Time of Battle Booster Box | $149.97 | One Piece | Current set, devoted audience |
| One Piece EB-05 Heroines Edition Vol. 2 | $149.97 | One Piece | Distinct art hook |
| One Piece OP-17 The World's Strongest Warriors | $199.96 | One Piece | Newest box |
| 2026 Bowman Chrome Baseball Mega Box | $49.99 | Sports | Low-entry sports test (the hobby box is still in GMC image review, so exclude it) |
| 2026-27 Topps Flagship Basketball Hobby Box | $149.97 | Sports | Mid-ticket hobby entry |
| MTG Hobbit Play Booster Box | $99.98 | MTG | Licensed set with crossover appeal; **swap in for sports if sports underdelivers** |

**Hold back from cold Meta ads initially:**
- $399.92–$699.86 hobby boxes and the $1,199.76 case (trust barrier). They stay on the site and in the catalog, so carts can still include them.
- Preorders (OP-18, Star Trek).

**"Too good to be true" risk.** Several prices (for example a 36-pack booster box at $99.98) are far below typical US retail. On Google that attracts clicks. On Meta it also attracts:
- "scam" comments
- Meta's own review for "unrealistic offers", which is a common cause of ad account restrictions

Mitigations:
- a real Facebook Page and Instagram with posts
- clear contact, return and shipping pages
- moderated comments
- creatives that look like a store, not a flash deal

**Reviews matter most:** enable Google Customer Reviews or a review platform as soon as the first orders arrive.

---

## 7. Creative plan (brief §7, §14C)

- **Volume:** one ad set with 6–9 ads. That's 2–3 concepts each for Pokémon / One Piece / sports-or-MTG, in two formats: a 4:5 static and a 9:16 video or carousel.
- **Price in creative:**
  - **Yes for the $49.99 items.** The price is the differentiator and filters out window-shoppers.
  - **For $150+ boxes:** lead with set name, box contents and "factory sealed", and put the price in the headline or first line of copy.
- **Sports:** a different style: premium, clean, "hobby box", the set and year prominent.
- **Real packaging photos and video only.** If you physically hold stock, a 10–15 s hand-held video of the sealed box will likely outperform renders. Don't claim to have stock in hand if orders are fulfilled through a supplier.
- **Allowed claims:** "factory sealed", "free US shipping", the actual price, "mix any products in one order".
- **Not allowed:**
  - "cheapest"
  - fake strike-through or "was" prices
  - countdowns or "only X left" unless real
  - invented reviews
  - "official / authorised retailer"
  - character art beyond the actual packaging, or logos used as if you were the brand

**Concepts** (headline / primary text / visual / CTA):

1. **Price-clear single product**
   - Headline: "Delta Reign Elite Trainer Box: $49.99"
   - Text: "Factory-sealed Pokémon TCG Elite Trainer Box, 9 booster packs. Free US shipping."
   - Visual: the box on a clean background with the price.
   - CTA: Shop Now
2. **"Build your order" carousel** (multi-unit / mixed cart)
   - Headline: "Mix any sealed Pokémon products in one order"
   - Text: "Elite Trainer Boxes, Booster Bundles and Booster Boxes. Free shipping on every order."
   - Visual: 4–6 cards with prices.
   - CTA: Shop Now
3. **Collector/set story** (One Piece)
   - Headline: "OP-16 The Time of Battle: sealed booster box"
   - Text: "24 packs, English edition, factory sealed. $149.97 with free US shipping."
   - Visual: the box plus a pack fan. Use the real configuration.
   - CTA: Shop Now
4. **Sports, premium style**
   - Headline: "2026 Bowman Chrome Mega Box"
   - Text: "Sealed 2026 Bowman Chrome Baseball. $49.99, free US shipping."
   - Visual: dark premium background.
   - CTA: Shop Now
5. **Catalog / dynamic carousel**, phase 2, once catalog and events match.

**Replace a creative when:**
- it has spent about 2× the target cost per purchase with no purchase, or
- it is clearly below the ad set's average CTR after about 3,000 impressions.

Add 2–3 new creatives every 7–10 days.

---

## 8. Bigger orders (brief §9)

- Each extra unit in an order adds its full margin with **no extra acquisition cost**. Free shipping only adds the marginal packing and postage cost. So bigger carts directly raise the cost per purchase you can afford.
- **Cheap, honest levers** (proposals, not built yet):
  - On the product page and cart drawer, a "Complete your order" row of 3 related in-stock $49.99 items from the same game.
  - Quantity selector made visible.
  - The free-shipping and "mix any products, up to $1,199.76" line kept in view.
- No new multipacks and no price changes.
- **Measure:** AOV and items per order for Meta-sourced orders versus others, plus the share of orders with more than one item.

---

## 9. Attribution

- Optimise for **Purchase** with **7-day click / 1-day view** (Meta's default).
- **Judge profit on 7-day click** and reconcile weekly against our own orders: `trafficSource = Facebook` (fbclid / Meta app user agents).
- Expect Meta to report more conversions than our last-touch data, because of view-through. The truth is in between, so make decisions on the conservative figure.

---

## 10. Profitability scenarios (actual costs unknown; owner to supply)

Contribution margin = price − product cost − payment fees − shipping/fulfilment − refund allowance, **before** advertising.

**Break-even ROAS** = 1 / margin: 15% → **6.7×** · 20% → **5.0×** · 25% → **4.0×** · 30% → **3.3×**

**Break-even cost per purchase** (= AOV × margin):

| AOV | 15% | 20% | 25% | 30% |
|---:|---:|---:|---:|---:|
| $50 | $7.50 | $10.00 | $12.50 | $15.00 |
| $83 (Google sample) | $12.50 | $16.70 | $20.80 | $25.00 |
| $150 | $22.50 | $30.00 | $37.50 | $45.00 |
| $250 | $37.50 | $50.00 | $62.50 | $75.00 |

**Implication:** at thin margins, Meta can only work if either:
- AOV is pushed well above $50 (multi-unit or mixed carts, $150 boxes), or
- the real margin on the cheap-acquired stock is high.

A $49.99 single-unit order with a 20% margin allows only **$10 per purchase**, which is hard on cold Meta traffic. **The owner should put real per-SKU costs into this table before launch.** It decides whether Meta is viable at all.

**Decisions:**
- **Target** cost per purchase ≤ 70% of break-even, which leaves room for overhead.
- **Kill line:** above break-even after enough data (§11).

---

## 11. Testing rules

- **Phase 1 (days 1–14):** one ad set at $100/day.
  - No edits for the first 72 h except creative swaps for clear losers (each edit can restart learning).
  - Review daily, decide every 3–4 days.
- **Evidence needed:**
  - A purchase-rate verdict needs about **20–30 purchases**, or spend of about 3× the break-even cost per purchase.
  - Until then, read CTR (link), cost per AddToCart and cost per InitiateCheckout as leading indicators.
- **Kill rules:**
  - Spend reaches 3× break-even cost per purchase with 0 purchases: pause and revise creative or offer.
  - 14 days at cost per purchase above break-even (7-day click, reconciled): stop Meta prospecting and keep only retargeting later.
- **Scale rules:**
  - Cost per purchase ≤ 70% of break-even over the last 7 days, with at least 15 purchases: raise the budget **20% every 3–4 days**.
  - Do not double the budget in one step.
- **Category expansion:**
  - Add MTG / Lorcana creatives (not new ad sets) once total purchases are 30 or more and one category is clearly profitable.
  - Test Advantage+ Sales with the catalog as a split from about 30–50 purchases.
- **Optimisation fallback:** if after 5–7 days fewer than about 5 purchases are tracked and delivery is starved, switch the optimisation event to **InitiateCheckout** temporarily. Never Traffic, never Engagement.
- **Old-account benchmarks:** if the $10k history is ZypheraTCG's, use its CPM/CTR only as a rough range. Its conversion rate and cost per order belonged to a different store, prices ($74.99 ladder) and offer, so they're not comparable.

---

## 12. Can Meta beat Google Shopping here?

**For acquiring customers efficiently right now: very unlikely.**
- Sealed TCG is a search-led, price-compared, product-specific purchase. Google Shopping puts your price next to competitors at the moment of intent, and that is exactly where aggressive pricing pays.
- On Meta, the low price is less visible and trust is the bottleneck.

**Meta's role:**
- reach and scale beyond search volume
- re-engaging visitors
- launching new sets (release-day hype works on social)
- eventually feeding repeat buyers

So treat Meta as a **permanent secondary channel that is earned with data**, not as a substitute while Google is down. **Getting Google Shopping serving again is still the highest-ROI task.**

On **$10k/day revenue:** it needs either Google at scale or Meta at scale, *plus* reliable inventory and fulfilment. That would be roughly 120 or more orders a day at an $83 AOV. Fulfilment capacity and reviews become the limit long before Meta's algorithm does.

---

## 13. Point-by-point on ChatGPT's proposal

| # | Proposal | Verdict | Why / alternative |
|---|---|---|---|
| 1 | $150/day | **MODIFY** | **$100/day for days 1–14 in one ad set** (about $1,400 maximum test). Raise to $150, then +20% steps, only after cost per purchase ≤ 70% of break-even with at least 15 purchases. A cold pixel and an untested trust gap justify a smaller first exposure; concentration matters more than total. |
| 2 | One Sales campaign | **AGREE** | Sales objective, website conversions. |
| 3 | Three category ad sets | **DISAGREE** | One ad set, Advantage+ audience; categories as separate *ads*. Compare at ad level and by purchased content_ids. |
| 4 | $65 / $50 / $35 | **DISAGREE** | Follows from 3; no fixed category split. To steer, adjust the ad mix, not budgets. |
| 5 | Optimise for purchases | **AGREE** | With an InitiateCheckout fallback if delivery is starved. Never Traffic or Engagement. |
| 6 | Broad / Advantage+ audience | **AGREE** | Age 18+ hard minimum, US "living in", no location expansion, Audience Network excluded. |
| 7 | Real product images, product-specific | **AGREE** | Plus a carousel for mixed carts. Price on the $49.99 creatives; premium style for sports. |
| 8 | $49.99 alongside higher-priced boxes | **MODIFY** | Yes for $49.99 to about $200. **Exclude $400+ hobby boxes and preorders from cold creatives** at first, because of trust. |
| 9 | Delay MTG and Lorcana | **MODIFY** | Lorcana: agree, wait. MTG: include **one** MTG creative (Hobbit Play Box) or swap it for sports. MTG's adult, established Meta audience may beat $400 sports boxes for a new store. |
| 10 | No small retargeting campaigns at start | **AGREE** | Add one retargeting ad set at 10–15% once the 30-day site audience is several thousand people. |
| 11 | Measure profit and AOV, not just ROAS | **AGREE (critical)** | Requires the owner's real per-SKU costs (§10). Weekly reconciliation against our own orders. |
| 12 | Start only after Pixel + CAPI validated | **AGREE (blocking)** | Today the pixel is not live, is consent-gated, only sends PageView, and CAPI is inactive and partial (§1). |

---

## 14. Final recommendation (A–F)

**A. Structure**
- 1 campaign, Sales objective, website conversion = Purchase.
- 1 ad set, Advantage+ audience, US people living in, age 18+.
- Advantage+ placements minus Audience Network.
- 7-day click / 1-day view attribution.
- $100/day.
- 6–9 ads: Pokémon ×3, One Piece ×2, Sports Mega box ×1–2, MTG Hobbit ×1, mixed-cart carousel ×1.
- Scale +20% per 3–4 days on rule.
- Phase 2: Advantage+ Sales with catalog, then a retargeting ad set.

**B. Shortlist:** §6.

**C. Creatives:** §7.

**D. Tracking readiness**

Confirmed facts:
- Pixel not live.
- Consent-gated.
- PageView only.
- CAPI inactive and partial.
- No domain verification tag.
- Purchase is correctly tied to the signed payment callback.
- event_id = orderId is the right dedup key.

Unverified (owner must check):
- Events Manager datasets and their domains.
- Domain verification status.
- Account quality and currency.

Required changes: §1 items 1–7.

**E. Budget:** ChatGPT $150/day → **this review $100/day** for a 14-day test with kill and scale rules. The difference is risk staging, not a different end-state; both plans reach $150+ if the data supports it.

**F. Launch readiness: TRACKING FIXES REQUIRED FIRST**

Launch requires:
1. A dedicated GoGetCards dataset, with the ID and CAPI token in the environment.
2. The consent decision and implementation (opt-out, GPC).
3. The four browser events plus Purchase with eventID.
4. The upgraded CAPI (all purchases, fbp/fbc, contents, user data).
5. Domain verified.
6. Catalog connected and ids matching.
7. A Test Events pass with deduplicated Purchase, correct value and USD, and mixed-cart contents.
8. Account Quality clean.
9. The owner's per-SKU cost table to set real break-even targets.
10. A Facebook Page and Instagram with basic presence, contact and returns info visible.
