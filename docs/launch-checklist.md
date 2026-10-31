# GoGetCards launch checklist

Everything that has to exist outside this repository before gogetcards.com
can take an order, in the order it is needed. Each item names who does it:
**you** (an account, a secret, a decision) or **code** (done in this repo
once the input exists).

GoGetCards is a fork of zypheratcg. It shares the code and the operating
model (the storefront never touches a card; every payment is taken by a
partner site's Whop business) but **shares nothing else**: its own
database, its own secrets, its own Whop businesses, its own partner batch,
its own ad accounts. Reusing any zypheratcg value below is a bug, not a
shortcut.

## 1. Repository and hosting

- [ ] **you** — Create the empty private repository `samezto-stack/gogetcards`
      (no README). The three commits waiting locally are pushed to `main`.
- [ ] **you** — Create the web service on the host (Render or Railway, same
      as zypheratcg), build `npm ci`, start `node server.js`, Node 20+.
- [ ] **you** — Point `gogetcards.com` and `www.gogetcards.com` at it and
      let the host issue the certificate. `config/site.js` already treats
      `https://gogetcards.com` as the canonical origin.

## 2. Database

- [ ] **you** — A **separate MongoDB Atlas cluster** from zypheratcg, with a
      database user that has readWrite on one database. The connection
      string must end in the database name, e.g.
      `mongodb+srv://user:pass@gogetcards-cluster.xxxxx.mongodb.net/gogetcards`.
      `config/db.js` reads `MONGODB_URI`; the session store uses the same
      database.
- [ ] **code** — `npm run seed` loads the seven collections from
      `config/catalog.js` plus the policy pages. The sample products in
      `seed.js` are placeholders and should be deleted from the admin before
      launch, or `seed.js` trimmed first.

## 3. Environment variables

Generate every secret fresh (`openssl rand -hex 32`). The full annotated
list is `.env.example`; these are the ones that gate launch.

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `SITE_URL` | `https://gogetcards.com` |
| `MONGODB_URI` | the Atlas string from step 2 |
| `SESSION_SECRET` | fresh 64-hex secret |
| `ENCRYPTION_KEY` | fresh 32-character key (partner experience payloads) |
| `THANK_YOU_SIGNING_SECRET` | fresh secret, **identical on every GoGetCards partner site** |
| `PARTNER_EXPERIENCE_API_KEY` | fresh secret, identical on every GoGetCards partner site |
| `EMAIL_UNSUBSCRIBE_SECRET` | fresh secret |
| `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | a ZeptoMail mail agent for the gogetcards.com domain (SPF + DKIM verified), see `docs/email-setup.md` |
| `BARK_KEY` | optional, order push notifications to your phone |
| `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET` | a reCAPTCHA v3 key registered for gogetcards.com |
| `GOOGLE_ADS_ID`, `GOOGLE_ADS_PURCHASE_LABEL` | only once a GoGetCards Ads account exists; unset renders no tag |
| `META_PIXEL_ID`, `META_ACCESS_TOKEN` | only once a GoGetCards pixel exists |
| `TZ` | defaults to `Africa/Casablanca` in `config/site.js`; change there if the business clock differs |

## 4. Company facts (`config/company.js`)

- [ ] **you** — Trading name is set. Fill `legalName`, `registrationNumber`
      and `address` only with values Google can verify; they render in the
      footer, the contact page and Organization schema. The address in the
      file is still zypheratcg's El Segundo suite: replace or null it.
- [ ] **you** — Confirm `support@`, `returns@` and `privacy@gogetcards.com`
      exist and are read. Set `social` links only for profiles that exist.
- [ ] **you** — Return window and shipping figures in `config/shipping.js`
      and `config/preorder.js`: every policy page and trust line reads them.

## 5. Whop businesses and the partner batch

GoGetCards keeps zypheratcg's partner model but with **its own partner
sites and its own Whop businesses**. Nothing in `config/embedCheckout.js`
is shared: its host list starts empty.

- [ ] **you** — Decide the batch size and create the empty repositories for
      the new partner sites (one per site, as before).
- [ ] **code** — Each site is built from the partner template with the
      store origin, support address, thank-you URL and frame allow-list
      pointed at `https://gogetcards.com`, the Buy Box light theme, and the
      Whop Elements checkout. See `docs/whop-business-setup.md` for the
      per-business rules (transactional emails OFF, rename never recreate).
- [ ] **you** — One Whop business per partner site, plans loaded from the
      generated CSV, the two shared secrets above set on each site.
- [ ] **code** — Add each site's custom domain to `config/embedCheckout.js`
      once a real card has been put through it (onrender.com hosts frame
      without an entry).

## 6. Catalog

- [ ] **you** — Product list with title, line, configuration, price, stock
      or allocation, release date for preorders, GTIN/UPC where known, and
      photos (front, back, seal). Spec templates for every line are in the
      admin product form.
- [ ] **you** — Shipping rates per market in `config/shipping.js`; markets
      beyond the US need their own Whop plan ladder before they are enabled
      (`config/markets.js` explains the invariant).

## 7. Before the first real order

- [ ] **code** — `npm run test:security` and `node scripts/audit/render-pages.js`
      pass on the deployed commit.
- [ ] **you + code** — One real payment end to end: storefront → partner
      site → Whop → `/thank-you` → order appears in `/admin/orders`, the
      confirmation email arrives from `orders@gogetcards.com`, and the
      push notification fires. Refund it afterwards from Whop.
- [ ] **you** — Google Merchant Center and Search Console for the new domain
      (`docs/merchant-center-application.md`), after the policy pages carry
      real company facts.
