# Applying to Google Merchant Center

Written for Zyphera TCG specifically, against the account state as of this
commit. Work top to bottom. Steps 1–3 happen before you open Merchant
Center at all, and skipping them is the usual reason a first submission
fails.

Two things to understand before starting, because they change how careful
you need to be:

1. **Misrepresentation suspends without warning.** Most policy problems get
   a notice and a seven-day window to fix them. Misrepresentation does not —
   detection and suspension are the same event, products come out of
   Shopping immediately, and the appeal is slower than doing it right the
   first time. Every "risk" flagged below is a misrepresentation risk.
2. **A violation in any enabled marketing method suspends the whole
   account.** Enabling something you cannot support does not fail
   quietly in that one place. This is why Step 6 matters more than it
   looks.

---

## Step 1 — Finish the product data (30 minutes, before anything else)

Go to **Admin → Distribution**.

- [ ] **Enter GTINs.** Products → each product → GTIN. Missing GTIN is not
      a rejection, but it drops the item into Merchant Center's "limited
      performance" bucket and it ranks behind every competitor matched to
      the same catalogue entry. Verified for the two OP-17 SKUs:
      - Booster Box (24 packs) — `810199501970`
      - Booster Case (12 boxes) — `810199501987`
      These are the **English** editions. Japanese print runs carry
      different JAN codes; a GTIN that resolves to the wrong product is
      worse than an absent one.
- [ ] **Press "Check every image".** One request per image. An image that
      404s for Google's crawler disapproves the item, and it is invisible
      from your own browser if the file is cached. This is the single most
      common silent disapproval.
- [ ] **Press "Apply safe fixes to all".** Whitespace, shouted titles,
      brand spellings, protocol-relative image URLs, the Google category.
      It will not invent a GTIN, brand, description or release date, and
      says so on the page.
- [ ] **Clear every blocking error.** The Catalogue panel's "Blocked" count
      must be 0 for the products you intend to advertise. Nothing with a
      blocking error is ever transmitted, so a blocked product is not a
      risk — it is simply absent, which is its own problem.
- [ ] **Set release dates on every preorder.** Google accepts the preorder
      availability value only with an `availability_date`. Without one the
      item is disapproved.
- [ ] **Press "Dry run".** Same validation, same ordering, nothing sent.
      Read the result before you connect anything.

---

## Step 2 — Decide what gets advertised, and read the risk section first

This is not a formality. See **Risk 1** below before choosing.

**Admin → Distribution → Which products go to Google.**

If any product routes buyers to a different domain at checkout, it must not
be advertised. Set the channel to **"Send only the products I choose"** and
tick only products that check out on `zypheratcg.com`.

If every product checks out on your own domain, leave it on **"Send
everything, except what I exclude"**.

---

## Step 3 — Confirm the things Google cross-checks

Merchant Center's review is largely a consistency check: a reviewer
compares your site against itself, and against what Google already knows.

- [ ] **Business address matches everywhere.** The site now publishes
      `2321 Rosecrans Ave, Ste 5200, El Segundo, CA 90245` in the footer of
      every page, on the contact page, and in the Organization schema. It
      must match the address on your **Google Payments profile** exactly.
      A mismatch between site and payments profile is a more common
      suspension cause than an address a reviewer merely finds
      unimpressive.
- [ ] **Contact routes actually work.** Send a test message through
      `/contact` and confirm it arrives in Admin → Messages. Email
      `support@zypheratcg.com` from an outside address and confirm it is
      received. Reviewers test these. A published address that bounces is
      worse than no address at all.
- [ ] **Policy pages resolve.** Refund, shipping, privacy, terms. All 14
      trust pages are hardcoded and link to each other; the audit suite
      asserts it, but click three of them anyway.
- [ ] **Prices match.** The price on the product page, in the schema, and
      in the feed all derive from one field, so they cannot disagree — but
      confirm the currency reads USD to a logged-out visitor.

---

## Step 4 — Create the account

1. Go to **merchantcenter.google.com** and sign in with the Google account
   that should own this. Use an account you will still control in two
   years; transferring ownership later is possible but tedious.
2. Enter the business name exactly as it appears on the site: **Zyphera
   TCG**. Not a variation, not a legal entity you have not registered.
3. Enter the business address from Step 3.
4. **Where do your customers check out?** Answer **"On my website"**. This
   is the question Risk 1 is about — answer it truthfully, and if the
   honest answer is not "on my website" for some products, exclude those
   products in Step 2 rather than answering differently.
5. Complete the **Google Payments profile** when prompted. Same address.

---

## Step 5 — Verify and claim the domain

Two separate operations that sound like one:

- **Verify** proves you have administrative access to `zypheratcg.com`.
- **Claim** ties that URL to this Merchant Center account. Only one account
  can hold the claim.

Merchant Center Next offers five verification methods: your e-commerce
platform, email, an HTML tag, an HTML file upload, or Google Tag Manager /
Google Analytics. **Google Search Console is no longer offered as a
verification method in Merchant Center Next.**

Recommended for this site: **HTML tag**. It goes in `views/layout.ejs`'s
`<head>`, ships with the next deploy, and stays put.

> **If the domain is already claimed by another account**, you will need a
> claim transfer, which takes **7 days** unless the current claimant
> releases it voluntarily. Check this early rather than discovering it on
> launch day.

---

## Step 6 — Marketing methods (formerly "Destinations")

This is the part you asked about. Short answer: **enable Shopping ads and
free listings, disable everything local, and treat Display as optional.**

| Marketing method | Enable? | Why |
|---|---|---|
| **Performance Max / Shopping ads** | **Yes** | What you actually want. Paid, strictest review. |
| **Free listings** | **Yes** | Same policy bar as Shopping ads, so it adds no review risk you are not already taking. Free traffic on the organic Shopping tab. There is no reason to turn this off. |
| **Free local listings** | **No** | Requires a physical store customers can walk into, a Google Business Profile, and an in-store inventory feed. You have a suite in a multi-tenant office building, not a shop. Enabling it asserts a storefront that does not exist. |
| **Local inventory ads** | **No** | Same as above, paid. Same risk. |
| **Display ads / dynamic remarketing** | **Optional** | Normal, low risk. Only useful if you run Display or PMax remarketing. Harmless if enabled and unused, so enable it only when you have a campaign that needs it. |
| **YouTube Shopping** | **N/A** | Requires channel eligibility thresholds. Nothing to do until you have a channel that qualifies. |
| **Buy on Google** | **N/A** | Retired in the US. |

### Are the others "risky to keep"?

Not in the way the question implies — there is no destination that carries a
*different* policy standard. Shopping ads policies govern all of them.

The risk is narrower and more specific: **two of them make a factual claim
about your business that is not true.** Free local listings and local
inventory ads both assert "customers can buy this in a physical store at
this address." That is the claim, not the ad format. Your address is a
registered office in a multi-tenant building; a reviewer who checks — and
local listings get checked, because they show a storefront to people who
might drive there — finds no shop. That is a misrepresentation finding, and
it takes the whole account down, not just the local listings.

Display ads make no such claim. It is a distribution surface, nothing more.
Enable it when you have a use for it.

So the rule is not "fewer methods are safer." It is: **enable what you can
substantiate.** Free listings you can substantiate. A storefront you
cannot.

---

## Step 7 — Connect the feed

Do **not** upload an XML file. The Distribution Hub pushes directly through
the Merchant API, which means inventory, price and availability updates
propagate without anyone remembering to re-upload anything.

1. Create an OAuth client in Google Cloud Console (type: **Web
   application**).
2. Add the redirect URI shown on **Admin → Distribution**:
   `https://zypheratcg.com/admin/distribution/connect/callback`
3. Paste the client ID and secret into Distribution → Save credentials.
   The secret is encrypted before storage.
4. **Authorise with Google**, then pick the merchant account.
5. **Sync now.**
6. Set **Sync automatically**, every 6 hours. Google expires a product
   roughly 30 days after it was last submitted, so a catalogue that stops
   syncing disappears from Shopping one item at a time over a month, and
   the first symptom is an unexplained traffic drop. Unchanged products are
   skipped, so a frequent schedule costs almost no quota.

The file exports (XML / CSV / JSON) exist for inspecting what would be sent
and for channels with no API integration. They are not the Google path.

---

## Step 8 — Link Google Ads and launch

1. Merchant Center → **Linked accounts** → link the Google Ads account.
2. Accept the link from inside Google Ads.
3. Build the campaign. **Do not launch until the products show "Active" in
   Merchant Center**, not merely "Pending". Pending items in a live
   campaign spend nothing and teach you nothing.

---

## The three things most likely to get Zyphera suspended

Ranked by actual probability, not by how alarming they sound.

### Risk 1 — Checkout that leaves your domain (highest, and unresolved)

**Google's position:** if a product page sends the customer to another site
to pay, that is a third-party checkout mismatch, and it falls under
misrepresentation — the no-warning category.

**Where you stand:**

- The **Whop embed is fine.** `/checkout/whop` renders Whop's checkout
  component inside your own page, on your own domain, with your own URL in
  the address bar. That is the same pattern as embedding Stripe. Not a
  problem.
- The **partner-experience rotator is the problem.** `checkoutMode` and the
  partner-redirect routes can send a buyer from a Zyphera product page to a
  different domain entirely. If a reviewer clicks an advertised product and
  lands on another site to pay, that is precisely the violation described
  above.

**What to do — pick one:**

- **(a) Advertise only the products that check out on `zypheratcg.com`.**
  Use "Send only the products I choose" (Step 2) and tick nothing that
  routes to a partner domain. This is the low-effort option and it is
  sufficient.
- **(b) Keep the partner routing off for advertised products entirely.**

I have not changed any checkout, partner-experience or rotator code —
that logic is off-limits by your instruction, and this is a flag rather
than a fix. But it is the one item on this page that can suspend the
account on day one, so decide it deliberately before submitting.

### Risk 2 — Preorders described as something they are not

You sell mostly unreleased product. Google accepts preorders, but:

- Every preorder needs a real `availability_date`. The Distribution Hub
  blocks any preorder without one, so this is handled — as long as you set
  the dates rather than excluding the products to silence the error.
- The landing page must say it is a preorder, visibly, above the fold. It
  does.
- A release date that slips must be **updated**, not left. A preorder whose
  date has passed reads as a stale listing; the panel warns on this.

### Risk 3 — Claims the site cannot back

Two are still live and I did not rewrite them, because only you know
whether they are true:

- Announcement bar: **"Tracked & insured worldwide."** If parcels are not
  actually insured, this is a promise a customer can hold you to.
- FAQ: **"We photograph orders before dispatch."** Same.

Neither is a Merchant Center policy violation. Both are consumer-protection
exposure, and both are the kind of detail a reviewer reads. If they are
true, keep them — they are good trust signals. If not, say so and they come
out in a minute.

Already fixed this session: the product page called Zyphera an **"Official
Distributor"** while the footer of the same page disclaimed affiliation
with The Pokémon Company, Nintendo, Konami, Wizards of the Coast, Hasbro
and Bandai by name. A page contradicting its own footer is exactly what a
misrepresentation review is built to find. It now reads "Distributor
Sourced".

---

## After submission

- **Review takes 3–5 business days** for a new account, sometimes longer
  for a first submission in a category with counterfeit exposure, which
  sealed TCG is.
- **Check Merchant Center → Diagnostics daily** for the first two weeks.
  Item-level disapprovals are normal and fixable. Account-level notices are
  not routine and should be dealt with the same day.
- **Do not resubmit an appeal repeatedly.** Each appeal on an unchanged
  site makes the next one slower. Fix the cited issue, verify it on the
  live site, then appeal once.
- **Keep the sync running.** Products expire ~30 days after last
  submission.

---

## What is genuinely still weak

Stated plainly so nothing here reads as a claim of perfection:

| Item | Status |
|---|---|
| Partner-checkout routing | **Unresolved.** Risk 1. Your decision. |
| GTINs on products | Two verified and supplied; the rest of the catalogue has none |
| `legalName` / registration number | Null, correctly — sole trader is acceptable to Google, claiming an entity you have not registered is not |
| Phone number | Not published. Google's bar is two working contact methods; email + contact form meets it |
| "Tracked & insured", "we photograph orders" | Unverified operational claims, Risk 3 |
| Product images | Hosted on a CDN you do not control. See `docs/image-hosting.md` |

---

## Sources

- [Misrepresentation — Merchant Center Help](https://support.google.com/merchants/answer/6150127)
- [Marketing methods (previously "Destinations")](https://support.google.com/merchants/answer/15624454)
- [Local inventory ads and free local listings policies](https://support.google.com/merchants/answer/3271956)
- [About online store URL verification](https://support.google.com/merchants/answer/11586344)
- [Excluded destination attribute](https://support.google.com/merchants/answer/6324486)
