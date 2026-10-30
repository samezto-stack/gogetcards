# GoGetCards — engineering guide

This is a live e-commerce platform handling real customers, orders, payments and
personal data. **Security is a standing requirement, not a later step.** Every
feature, change or refactor must satisfy the rules below from the first line.

A full audit lives in `docs/security-audit.md`. The non-negotiable invariants
are enforced by `test/security/` — run `npm run test:security` before every push.

---

## Security rules (apply to every change)

### Output encoding / XSS
- **Never** put untrusted data into an inline `<script>` with
  `<%- JSON.stringify(x) %>`. Use `<%- jsonForScript(x) %>` (global helper,
  `helpers/jsonForScript.js`). A static test fails the build if a raw
  `JSON.stringify` appears in a `<%- %>` tag.
- Default to EJS `<%= %>` (auto-escaped). Reach for `<%- %>` only for
  trusted/escaped HTML, and say in a comment why it is safe.
- Client JS: never pass untrusted strings to `innerHTML`/`insertAdjacentHTML`/
  `document.write`. Build with `textContent` or escape first.
- Treat `utm_*`, referrers, `Order`/`Customer`/`Lead` fields, page/product
  content and anything from a query string or request body as untrusted.

### Authentication & sessions
- Every `/admin*` route handler must include `requireAuth`; every `/account*`
  route that touches customer data must include `requireCustomer`. (Static test
  enforces the admin side.)
- Never add a hardcoded secret fallback. Secrets come from the environment.
- Regenerate the session on any privilege change (login).
- Keep cookies `httpOnly`, `secure` in production, `sameSite: 'lax'`.

### Access control / IDOR
- Scope every object lookup to the authenticated principal. For customer data,
  go through `services/customerOrders` (owner-scoped) — never fetch an order by
  a client-supplied id without an ownership check. "Not found" and "not yours"
  return the same response.

### Injection
- Mongo: never let a request body/query **value** reach a query position as an
  object. Coerce scalars with `String(...)`/`Number(...)`; for text used in a
  `RegExp`, use `escapeRegex`. Path params are strings and are safe as values.

### Payments
- The post-purchase pipeline only runs behind
  `services/orderPipeline/signatureVerifier` (HMAC, replay window,
  constant-time). Keep its canonicalisation in sync with the partner signer.
  Never bypass it or add a path that writes an Order without it.

### Rate limiting
- Any endpoint that sends email, writes on behalf of an anonymous user, or
  checks a credential gets an `express-rate-limit` guard.

### Errors & disclosure
- Clients get generic messages; log detail server-side only. Never return
  `err.message`/`err.stack` or datastore details to the browser.

### Dependencies
- `npm audit` must stay at **0** for production deps. Run it before shipping a
  dependency change.

### Outbound requests (SSRF)
- Server-side `fetch`/`axios` to a user- or partner-influenced URL must validate
  the target (no internal IPs/hosts).

---

## Before you push
1. `npm run test:security` is green.
2. `npm audit` shows 0 vulnerabilities (if deps changed).
3. New inline-script data goes through `jsonForScript`.
4. New admin/account routes carry their auth guard.
5. New untrusted input is validated/encoded at entry and at render.

## Project facts
- Node/Express + EJS, MongoDB (Mongoose), sessions in Mongo (`connect-mongo`).
- Deployed on a PaaS; pushing to `main` auto-deploys. Secrets are in the
  platform environment (`SESSION_SECRET`, `MONGODB_URI`, SMTP, signing secrets,
  …) — keep them there.
- Payments are handed off to the partner (Whop) site; this app never charges a
  card directly and confirms purchases only via the signed callback.
