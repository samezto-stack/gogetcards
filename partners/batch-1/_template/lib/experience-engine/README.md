# experience-engine

A small, **dependency-free**, framework-friendly engine for **signed, server-side experience routing**.

It lets a server mint a short-lived signed token that names an "experience," resolve that experience on a later request **entirely on the server** (token → cookie → default), remember the decision in a signed cookie, and — optionally — render a completely different page per experience. There is **no UI, no HTML, and no business logic** inside the engine. It is designed to be dropped into any Node/Express-style project and reused across many websites without modification.

- **Zero runtime dependencies** (Node built-ins only).
- **Framework-neutral core**: pure functions + `(req, res, next)` handlers that work with Express, Connect, Fastify (via compat), or a raw `http` server.
- **Secure by construction**: HMAC-SHA256 signing, constant-time comparisons, HttpOnly/Secure/SameSite cookies, fail-closed auth, secret redaction in logs.
- **Config-first**: a project configures five things; everything else has production defaults.

---

## Folder structure

```
experience-engine/
├── package.json
├── .env.example                 # every environment variable, documented
├── README.md                    # this file
├── CLAUDE_INTEGRATION_PROMPT.md # paste-into-Claude integration guide
├── types/
│   └── index.d.ts               # TypeScript declarations
├── examples/
│   └── express-basic.js         # minimal wiring example
├── test/
│   └── smoke.js                 # dependency-free self-test (npm test)
└── src/
    ├── index.js                 # createExperienceEngine() factory (entry point)
    ├── config.js                # config normalization + env parsing/validation
    ├── logger.js                # leveled logger with secret redaction
    ├── errors.js                # typed error classes
    ├── token/
    │   ├── codec.js             # base64url + HMAC + constant-time compare
    │   ├── generate.js          # generateToken(secret, claims, { ttlMs })
    │   ├── verify.js            # verifyToken(secret, token) -> payload | null
    │   └── index.js
    ├── experience/
    │   ├── catalog.js           # the supported experiences (from config)
    │   ├── issuer.js            # mints tokens for issuable experiences
    │   ├── cookie.js            # sign / set / read+verify the persistent cookie
    │   ├── resolver.js          # token -> cookie -> default resolution
    │   └── variants.js          # optional cached loader for per-experience HTML
    ├── middleware/
    │   ├── internalAuth.js      # Bearer shared-secret guard (fail-closed)
    │   └── resolveExperience.js # attaches req.experience before rendering
    ├── routes/
    │   └── internalToken.js     # POST handler for the token issuer
    └── utils/
        ├── cookie.js            # framework-neutral cookie parse/serialize
        └── urlCleanup.js        # history.replaceState snippet + injector
```

---

## Architecture

Three layers, each independently testable:

1. **Token layer** (`src/token`) — pure cryptographic primitives. Produces and verifies compact `payload.signature` tokens (HMAC-SHA256, base64url). Knows nothing about experiences.
2. **Experience layer** (`src/experience`) — the domain. A **catalog** of experience ids; an **issuer** that mints tokens for them; a **cookie** module that persists a resolved experience; a **resolver** that decides the experience for a request. Optional **variants** loader for per-experience HTML.
3. **Integration layer** (`src/middleware`, `src/routes`, `src/utils`) — thin adapters that expose the above as `(req, res, next)` handlers and HTML helpers.

The `createExperienceEngine(options)` factory (`src/index.js`) wires these together against one immutable config and returns a single `engine` object. Everything is an instance — there is no global state — so one process can host multiple engines if needed.

---

## Request flow

**A. Issue (server-to-server, privileged):**

```
Trusted backend ──POST /internal/experience/token──▶ engine.handlers.issueToken
  Authorization: Bearer <API_KEY>          (engine.middleware.internalAuth guards it)
  { "experience": "<id>" }
◀── 200 { token, param, expiresInMs }
```

**B. Resolve + render (public):**

```
Visitor ──GET /your-page?<param>=<token>──▶ engine.middleware.resolve()
  → verifies token → req.experience = { id, traits }, req.experienceSource = "token"
  → persists signed cookie (first token grant)
  → your route renders the page for req.experience.id
  → if a token was in the URL, inject engine.html.injectCleanup(html)
    so history.replaceState removes it from the address bar (no reload/redirect)

Later visit ──GET /your-page── (no token) ──▶ engine.middleware.resolve()
  → reads + verifies the signed cookie → same experience, server-side
```

Any failure at any step (missing/expired/forged/unknown) resolves to the **default** experience, silently. The visitor never sees an error.

---

## Security model

- **Signing secret never leaves the server.** Tokens and cookies are signed with `secret` (HMAC-SHA256). The browser only ever holds opaque signed values it cannot forge.
- **Server-to-server auth.** The token issuer is guarded by a shared `apiKey` presented as `Authorization: Bearer`. Comparison is constant-time. It **fails closed**: if `apiKey` is unset, every request is denied (`503`). Never call the issuer from a browser.
- **Cookie hardening.** The persistent cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` over HTTPS (auto-detected, or forced). Its value is itself a signed token — the browser is never trusted; the signature is verified on **every** request.
- **Silent, uniform failure.** Verification never throws and never reveals *why* it failed. Bad input → default experience. No error surface, no oracle.
- **No secret logging.** The bundled logger redacts keys matching `secret|token|apikey|authorization|cookie|password`.
- **Bounded input.** Tokens over 4 KB are rejected before any work.

Two secrets, both server-side only:

| Secret | Purpose |
|---|---|
| `EXPERIENCE_SIGNING_SECRET` | signs & verifies tokens and cookies |
| `EXPERIENCE_API_KEY` | authorizes callers of the token issuer |

Use **different** values. Generate each with `openssl rand -hex 32`.

---

## Environment variables

All optional except the two secrets. See `.env.example`.

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `EXPERIENCE_SIGNING_SECRET` | ✅ | — | signs tokens + cookies |
| `EXPERIENCE_API_KEY` | ✅ | — | shared secret for the issuer |
| `EXPERIENCE_IDS` | — | (none) | comma-separated experience ids beyond `default` |
| `EXPERIENCE_TOKEN_TTL_MS` | — | `600000` | URL token lifetime (10 min) |
| `EXPERIENCE_TOKEN_PARAM` | — | `t` | query param carrying the token |
| `EXPERIENCE_COOKIE_NAME` | — | `xp` | persistent cookie name |
| `EXPERIENCE_COOKIE_TTL_MS` | — | `31536000000` | cookie lifetime (365 days) |
| `EXPERIENCE_COOKIE_SECURE` | — | `auto` | `auto` \| `true` \| `false` |
| `EXPERIENCE_DEFAULT_ID` | — | `default` | id of the default experience |

`createConfigFromEnv(process.env)` builds an options object from these; `validateEnv(process.env)` returns `{ ok, errors }` for a startup self-check.

---

## Configuration

A project configures at most five things:

```js
const { createExperienceEngine } = require("experience-engine");

const engine = createExperienceEngine({
  secret: process.env.EXPERIENCE_SIGNING_SECRET, // required
  apiKey: process.env.EXPERIENCE_API_KEY,        // required
  experiences: ["partner"],                      // supported experiences (+ implicit "default")
  tokenTtlMs: 10 * 60 * 1000,                    // token lifetime
  cookie: { name: "xp", ttlMs: 365*24*60*60*1000, secure: "auto" }, // cookie settings
});
```

`experiences` accepts strings or objects with traits:

```js
experiences: [
  "partner",
  { id: "vip", traits: { priority: true } },
  { id: "affiliate", traits: { commission: true } },
]
```

`req.experience.traits` is exposed to your rendering layer so you can branch without hardcoding ids.

The engine surface:

```js
engine.token.issue(id)              // -> signed token | null
engine.token.verify(token)          // -> payload | null
engine.resolve(req)                 // -> { experience: { id, traits }, source }
engine.cookie.set(res, id, req)     // persist the signed cookie
engine.cookie.read(req)             // -> id | null
engine.cookie.clear(res)            // reset to default
engine.html.injectCleanup(html)     // strip the token from the URL client-side
engine.variants.load(absPath)       // optional cached per-experience HTML
engine.middleware.internalAuth      // guard for the issuer
engine.middleware.resolve(opts)     // attaches req.experience
engine.handlers.issueToken          // the issuer handler
engine.catalog.ids()                // list configured experiences
```

---

## Passthrough claims (e.g. an assigned value)

A token can carry extra **signed** values alongside the experience — for example a
one-time assigned email — so a value chosen on one server travels tamper-proof to
another and is handed to the destination page.

1. **Whitelist** the claim names in config so nothing arbitrary can be smuggled in:
   ```js
   createExperienceEngine({ /* … */ experiences: ["partner"], passthroughClaims: ["email"] });
   ```
   (or `EXPERIENCE_PASSTHROUGH_CLAIMS=email`).
2. **Bind** it when minting — either directly, `engine.token.issue("partner", { email })`,
   or by including it in the issuer request body:
   `POST /internal/experience/token  { "experience": "partner", "email": "…" }`.
   Only whitelisted names are bound; `experience`/`iat`/`exp` can never be overridden.
3. **Resolve** it on the destination: `engine.resolve(req)` returns
   `{ experience, source, claims }`, with `claims.email` present only when a valid
   token carried it (claims are read from the token, never persisted in the cookie).
4. **Hand it to the page**: `engine.html.injectClaims(html, claims)` injects an early,
   invisible script that writes the trusted values into the URL as `?email=…` (from
   the signed token, so untamperable) and strips the one-time token param — the page
   then reads them client-side (e.g. `new URLSearchParams(location.search).get("email")`).
   With no claims it falls back to a plain token cleanup.

The engine makes no assumption about what the value means or how the page uses it.

---

## Token lifecycle

1. **Mint** — a trusted backend calls the issuer with a valid `apiKey` and an experience id. `engine.token.issue(id)` signs `{ experience, iat, exp }` with `secret`; `exp = now + tokenTtlMs` (default 10 min).
2. **Carry** — the token is attached to a URL as `?<tokenParam>=<token>` and the visitor is redirected there (top-level navigation).
3. **Verify** — on the page request, the resolver verifies signature + expiry (`engine.token.verify`). Valid & issuable → that experience. Otherwise → default.
4. **Retire** — tokens are short-lived and single-purpose; never cache them. Once used, the cookie takes over and the token is stripped from the URL.

## Cookie lifecycle

1. **Create** — the first time a request resolves via a **token**, `resolve` middleware persists a signed cookie (`{ experience, iat, exp }`, `exp = now + cookieTtlMs`, default 365 days), `HttpOnly` + `SameSite=Lax` + `Secure` over HTTPS.
2. **Recognize** — later requests with no token are resolved from the cookie; the signature is re-verified every time.
3. **Reject** — a tampered, truncated, or expired cookie fails verification and is ignored (→ default). No error.
4. **Reset** — `engine.cookie.clear(res)` removes it. Rotating `secret` invalidates all existing cookies (they silently fall back to default until re-granted).

## Experience resolution

`engine.resolve(req)` returns `{ experience, source }` using strict precedence:

1. **URL token** (`req.query[tokenParam]`) — an explicit grant wins.
2. **Signed cookie** — persistent recognition.
3. **Default** — everything else.

`experience` is always a fresh, browser-safe object (`{ id, traits }`) — never an internal reference — so nothing sensitive leaks and callers can't mutate shared state. `source` is `"token" | "cookie" | "default"`.

---

## Error handling

- **Verification never throws.** `verifyToken` / `cookie.read` return `null` on any problem; `resolve` maps that to the default experience.
- **Typed errors** (`engine.errors`) are used only where throwing is appropriate — chiefly `ConfigError` at construction time (missing secret/apiKey). `UnauthorizedError` / `UnknownExperienceError` are available for consumers who want to branch.
- **Issuer HTTP semantics**: `401` (bad/missing key), `503` (issuer not configured — fail-closed), `404` (unknown/non-issuable experience). Auth is enforced by `internalAuth`; the handler returns `404` for unknown ids.
- **Fail-closed auth** ensures a misconfiguration can never silently expose the issuer.

---

## Future extension

- **Add an experience** — add its id (and optional traits) to `experiences`. The issuer, resolver, catalog, and cookie pick it up automatically; no code changes.
- **Per-experience pages** — map each experience id to a render target in *your* app (a view, or a standalone HTML document loaded via `engine.variants.load`). The engine stays agnostic about the HTML.
- **Multiple engines** — instantiate more than one (e.g. different cookie scopes or secrets) in the same process; there is no global state.
- **Different transport** — the core is pure; wire it into any framework by adapting the thin `(req, res, next)` handlers, or call `engine.resolve` / `engine.token.*` directly.

---

## Testing

```sh
npm test        # runs test/smoke.js — no dependencies, no network
```

## License

MIT.
