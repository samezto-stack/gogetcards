# Security Audit — GoGetCards

**Date:** 2026-10-20
**Scope:** Full application — frontend, backend, admin dashboard, APIs,
authentication, checkout/payment integration, database operations, third-party
dependencies, and security configuration.
**Trigger:** An automated scanner found and exploited a stored XSS in the admin
dashboard's traffic-sources panel. This audit was commissioned to find the root
cause, check for the same and other classes of vulnerability everywhere, fix
what was confirmed, and add regression tests.

All fixes below are deployed to `main`. Verification for each is noted.

---

## 1. Summary

| Severity | Found | Fixed | Residual |
|----------|-------|-------|----------|
| Critical | 2 | 2 | 0 |
| High | 4 | 4 | 0 |
| Medium | 5 | 5 | 0 |
| Low / Info | 4 | 4 | 1 (documented) |

**Verified secure (no change needed):** admin route authorization, customer
order access (no IDOR), NoSQL-injection resistance on auth/order/login paths,
the payment-confirmation HMAC verifier, absence of hardcoded secrets, and
customer-facing form output encoding.

The one residual item is a **tested follow-up** (nonce-based strict CSP), not an
open vulnerability — see §6.

---

## 2. The original vulnerability (root cause)

**Stored XSS — admin dashboard traffic-sources panel.** `CRITICAL`

- **Entry point:** `?utm_source=<payload>` on any public page.
  `middleware/tracking.js` stored an unrecognised `utm_source` verbatim
  (`return query.utm_source`).
- **Sink 1 (data embed):** `routes/admin.js` passed
  `JSON.stringify(trafficSources)` into an inline `<script>` via
  `<%- trafficSources %>` (`views/admin/dashboard.ejs`). `JSON.stringify` does
  **not** escape `</script>`, so a stored value containing
  `</script><script>…</script>` closed the data script tag and injected live
  markup that ran in the authenticated admin session.
- **Sink 2 (render):** the same name was later written to `innerHTML` unescaped.

**Fix (three layers, deployed in commits `52db997`, `f3904b7`, `2eaa08b`):**
1. **Input** — `middleware/tracking.js` sanitises an unknown `utm_source`
   (strips markup/control chars, de-arrays, caps at 80).
2. **Embed** — new `helpers/jsonForScript.js` escapes `< > &` and U+2028/2029 to
   `\uXXXX`; a `</script>` breakout is impossible while the JSON still
   round-trips. Exposed as `app.locals.jsonForScript` and used by every inline
   data embed.
3. **Render** — the traffic panel HTML-escapes the label and coerces counts to
   numbers before `innerHTML`.

Plus a one-off cleanup (`scripts/clean-xss-events.js`) to sanitise historical
poisoned `Event` rows (run on the host where `MONGODB_URI` is set).

**Verified:** `test/security/jsonForScript.test.js`,
`test/security/tracking.test.js`, and the static scan in
`test/security/static-scan.test.js`.

---

## 3. Confirmed findings and fixes

### 3.1 Dependency vulnerabilities — `CRITICAL`/`HIGH`
`npm audit` reported 9 (1 critical `proxy-addr` IP-spoof, high `axios`
SSRF/redirect + prototype-pollution, `nodemailer`, `compression` DoS,
`brace-expansion` DoS, plus `qs`/`ip-address`).
**Fix:** `npm audit fix` (non-breaking) for 8; `nodemailer` 8→10 (major) for the
last, verified the app uses only the stable `createTransport`/`sendMail` API.
**Verified:** `npm audit` → **0 vulnerabilities**; `services/mail` loads on v10.
**Files:** `package.json`, `package-lock.json`.

### 3.2 Admin login brute-force — `HIGH`
`/admin/login` had no rate limiting and 2FA is disabled, making it an unlimited
password-guessing oracle.
**Fix:** `loginLimiter` (10 attempts / 15 min per IP, failures only).
**Files:** `routes/admin.js`.

### 3.3 Session secret fallback — `HIGH`
`secret: process.env.SESSION_SECRET || 'gogetcards-dev-secret'` — if the env var
were ever unset, every cookie would be signed with a value published in this
repo, allowing admin-session forgery.
**Fix:** `resolveSessionSecret()` uses the env var, else a strong random
per-boot secret (never a known literal) and warns. Fails *safe*, not closed, so
a missing env var cannot take the live store offline.
**Verified:** static scan asserts no literal fallback remains.
**Files:** `server.js`.

### 3.4 CSP disabled — `HIGH` (defence in depth)
`helmet({ contentSecurityPolicy: false })` — nothing contained an XSS if one
slipped through (as one did).
**Fix:** enabled the non-breaking directives `base-uri 'self'`,
`object-src 'none'`, `frame-ancestors 'self'`. A strict `script-src` is the
larger win and is scheduled as a tested follow-up (§6).
**Files:** `server.js`.

### 3.5 Session fixation — `MEDIUM`
No session regeneration on login; a pre-set session id could be elevated.
**Fix:** `req.session.regenerate()` before writing `adminId`.
**Files:** `routes/admin.js`.

### 3.6 Cookie attributes — `MEDIUM`
No `sameSite`; `saveUninitialized: true`.
**Fix:** `sameSite: 'lax'` (CSRF defence), `saveUninitialized: false`.
**Files:** `server.js`.

### 3.7 Unthrottled email/abuse endpoints — `MEDIUM`
Magic-link sign-in (email-bombing), contact and lead-capture forms had no rate
limit.
**Fix:** `signInLimiter` (8/15 min) and `publicFormLimiter` (20/10 min).
**Files:** `routes/account.js`, `routes/frontend.js`.

### 3.8 Login operator-injection hardening — `MEDIUM`
`User.findOne({ email: email.toLowerCase() })` would have thrown (not injected)
on an object-valued `email`, but the input was not explicitly coerced.
**Fix:** `String(req.body.email||'')` / `String(req.body.password||'')` before
use.
**Files:** `routes/admin.js`.

### 3.9 Information disclosure — `LOW`/`MEDIUM`
(a) a second error handler returned `err.message` to the client and appended
`err.stack` to a local file synchronously on every error;
(b) the dashboard render error returned `err.message`;
(c) the DB-down page exposed the Atlas connection error to any visitor.
**Fix:** generic 500s to clients, full detail to server logs only; DB-down is
now a neutral `503` maintenance page.
**Files:** `server.js`, `routes/admin.js`.

### 3.10 Inline-script data embeds — `LOW` (defence in depth)
Other `<%- JSON.stringify(...) %>` embeds (JSON-LD in `layout.ejs`, `fx-approx`,
the three checkout token templates, and the admin ads-planner/leads/product-form
embeds fixed earlier) shared the original XSS class.
**Fix:** all routed through `jsonForScript`.
**Verified:** static scan fails the build if any raw one reappears.

---

## 4. Verified secure (evidence)

- **Admin authorization:** every route across `admin`, `adminCustomers`,
  `adminEmails`, `adminPreorders`, `adminPartnerLog`, `adminAbandoned`,
  `adminAnalytics`, `distribution` carries `requireAuth`. Static scan enforces
  it (`static-scan.test.js`).
- **Customer order access (IDOR):** `services/customerOrders.findOwnedOrder`
  scopes every lookup to the authenticated customer's email with
  `escapeRegex`; "not found" and "not yours" return the same 404.
- **NoSQL injection:** auth tokens are hashed before lookup
  (`services/customerAuth`), order refs and login inputs are string-coerced,
  path params are strings. No user object reaches a query operator position.
- **Payment integrity:** `services/orderPipeline/signatureVerifier` fails closed
  without a secret, requires `sig`+`iat`, enforces a 30-min replay window, and
  compares with `crypto.timingSafeEqual`. Tested in
  `signatureVerifier.test.js`.
- **Secrets:** none hardcoded in the repo; all from environment.
- **Customer forms:** the `err()` helper emits only server-side static
  messages; `productImage.attrs()` escapes URLs for the attribute context.

---

## 5. How to verify / run

```bash
npm install
npm run test:security   # 18 regression tests, all green
npm audit               # expect: found 0 vulnerabilities
```

Historical data cleanup (run where MONGODB_URI is set — the host, not locally):
```bash
node scripts/clean-xss-events.js          # preview
node scripts/clean-xss-events.js --apply  # apply
```

---

## 6. Residual risk & recommended follow-ups

1. **Strict, nonce-based CSP `script-src` (recommended, needs testing).**
   The app has many inline `<script>` blocks and CDN sources (Chart.js,
   globe.gl, Google Ads, Meta Pixel, fonts). A strict `script-src` is the
   strongest XSS containment but will break the storefront if rolled out
   untested. Plan: add a per-request nonce, stamp every inline script/style
   with it, enumerate the CDN hosts, ship first as
   `Content-Security-Policy-Report-Only`, confirm zero violations across
   storefront + checkout + admin, then enforce. **Requires a staging pass and
   sign-off.**
2. **SSRF hardening on server-side fetchers** (`services/distribution/
   imageProbe.js`, `services/partnerClient.js`). URLs are admin/config-
   controlled today (low risk), but adding an internal-IP/host allowlist would
   close the class entirely.
3. **CORS** is currently permissive (`app.use(cors())`). It does not allow
   credentials, so authenticated data is not cross-origin readable, but scoping
   it to the specific origins/endpoints that need it is good hygiene.
4. **2FA** for admin is disabled (by prior request). With it off, the admin
   password + the new login rate-limit are the only barriers. Re-enabling TOTP
   (the `otplib` dependency is already present) is the highest-leverage
   remaining hardening for admin.

---

## 7. Permanent security requirement

Security is now a standing requirement for all future work on this codebase.
See `CLAUDE.md` for the checklist every change must satisfy, and the regression
suite under `test/security/` that enforces the non-negotiable invariants.
