# Compliance audit suite

Three checks, run in order. The first produces the HTML the other two read.

```
node scripts/audit/check-modules.js  # requires every module; catches boot-time crashes
node scripts/audit/render-pages.js   # renders every page template through the real layout
node scripts/audit/check-pages.js    # asserts the correct things ARE present
node scripts/audit/check-claims.js   # asserts specific WRONG things are absent
node scripts/audit/check-routes.js   # exercises the real Express handlers (standalone)
node scripts/audit/check-feed.js     # fetches the public feed anonymously, as Google does
node scripts/audit/check-links.js    # needs a running server; see below

node scripts/audit/check-account-rules.js  # account decision logic, exhaustively
node scripts/audit/check-account-views.js  # every account view, in every state
node scripts/audit/check-account.js        # the whole portal end to end; needs MongoDB
node scripts/audit/check-test-order.js     # the test-purchase bypass
node scripts/audit/check-email.js          # every transactional email
```

Every one exits non-zero on failure, so they can be chained:

```
node scripts/audit/check-modules.js && node scripts/audit/render-pages.js \
  && node scripts/audit/check-pages.js && node scripts/audit/check-claims.js \
  && node scripts/audit/check-routes.js
```

## Why these exist

Google Merchant Center's Misrepresentation criteria are largely about
internal consistency: a reviewer's method is to compare one page against
another and against the feed. This store has failed that test three
separate ways in the past — a payment method advertised on five surfaces
and offered on none, a shipping threshold with three different values on
three pages, and preorders described as in stock.

Each of those is now impossible to reintroduce silently, because the fact
lives in one config module and these scripts assert that every surface
agrees with it.

## What each one covers

**check-pages.js** — payment badges match `config/payments.js`; seller
identity is in the footer; the contact form has a label and an
autocomplete token on every input; preorders disclose up-front payment and
never render as in stock; product identifiers appear; the search box
exists; header and footer use the same logomark; Organization schema
carries a contact point and invents nothing.

**check-claims.js** — a phrase blacklist read from the visible text of
every page: unevidenced customer counts, star ratings with no review
system, "official retailer of", price-superiority claims, guaranteed
returns, unoffered payment methods, taxes-included claims, stale shipping
thresholds, and placeholder or AI-generation artifacts.

Patterns here are deliberately narrow. A sweep that cries wolf gets
ignored, and a broad version already produced two false positives:
"Orders over $500 require a signature" read as a shipping threshold, and
"we will not always be the cheapest" read as a superiority claim. Both are
the opposite of the thing being looked for.

**check-routes.js** — runs the real Express handlers with stubbed model
reads, so the JSON-LD asserted is the JSON-LD production emits. Covers the
contact form's validation and honeypot, the Product/Offer schema including
per-region shipping and preorder availabilityDate, all 14 trust pages,
every legacy `/page/*` redirect, and that an unknown slug still 404s
rather than being swallowed by the trust route's catch-all.

**check-account-rules.js** — the customer portal's decision logic as truth
tables rather than examples: status precedence across all nine states,
cancellability across every combination of dispatch state, refund state,
age and preorder flag, redirect safety against a phishing corpus, cookie
parsing edge cases, IP truncation, and order-reference format and
distribution. It also reads `routes/account.js` and asserts the guarded
database update is no looser than the eligibility rules it repeats — the
one place those two could drift apart without anything failing.

It additionally asserts that the sentence "was refunded to your original
payment method" appears exactly once in the whole portal, inside the
`refundStatus === 'refunded'` branch. Refunds here are issued by hand in
the payment provider; the single worst thing this system could do is tell
somebody their money has been sent when nothing has been triggered.

**check-account-views.js** — renders all eight account views in 22 states,
including the ones that occur for one customer in a hundred: a refunded
order, a product withdrawn since it was bought, a blank profile, a session
with no user agent. Each render is scanned for a leaked `undefined`, `NaN`
or `[object Object]`, and for a password input, a `localStorage` reference
or a token in a link — none of which should ever exist here.

**check-account.js** — the whole portal end to end over real HTTP with a
real cookie jar: an account created from a confirmed order, a returning
buyer not duplicated and not overwritten, anonymous access refused, one
customer unable to reach another's order by reference or by raw payment
id, cancellation and its refusals, profile edits with the email address
held fixed, single-use sign-in links, sign-out on one device and on all,
and the admin side driving the fulfilment and refund state the portal
reports, including that deleting an account keeps its orders (and that
signing in again therefore rebuilds it around them) while the combined
"delete the orders too" variant refuses outright for any account holding
a real sale.

This is the only script in the suite that needs MongoDB, because every
authorisation property in it is a property of a *query* — ownership is
enforced by scoping reads to the signed-in customer's own email, not by an
`if` — and a harness that stubbed the models would be verifying the stub.
It uses `mongodb-memory-server`, or `MONGO_AUDIT_URI` if set. Where
neither is reachable it prints `SKIPPED` and exits 0 rather than passing
vacuously.

**check-test-order.js** — the test-purchase bypass (services/testOrder.js),
which lets a signed-in admin type a designated address into the checkout
and walk the real post-purchase flow without paying. A bypass around
payment is the one thing in a shop that must never be slightly wrong, so
this covers both directions: sixteen addresses a real customer might type
are asserted NOT to open it, nine session shapes that are not an admin
session are asserted not to open it, and the route is exercised over HTTP
to confirm an admin gets a signed confirmation while everybody else takes
the ordinary checkout with nothing in the response hinting the address
meant anything.

It then runs the genuine signature verifier and the genuine pipeline steps
over the URL the bypass produces, and asserts the two properties that keep
a test harmless: `trafficSource` is empty, so neither the server-side Meta
CAPI push nor the browser Purchase pixel can fire; and the order carries
the marker the admin reporting excludes on, checked against the field the
pipeline actually wrote rather than against a copy of the constant.

It also covers permanent deletion of a test account, which is the other
end of the same feature: that the guard lives in the route rather than in
which button the page rendered, that sessions and unspent sign-in links
go with the account, and that all three states of the delete panel render.

**check-email.js** — every transactional email, rendered in every state
that changes what it says, then asserted mostly on WORDING rather than
markup. Email is the one thing this shop produces that it cannot take
back: a page with a bug gets refreshed, but a confirmation promising
delivery in 2 to 5 days for a set that has not been printed sits in
somebody's inbox as written evidence.

So the load-bearing assertions are: a preorder confirmation never carries
a delivery estimate and never claims the parcel is already in transit
(checked on tense, since future-tense dispatch wording is correct and
useful); a queued refund never says the money has been sent, always gives
the 7–10 business day window, and always promises a second email; only
the refund-issued template says it has gone. Plus the spam-signal rules —
no exclamation marks, no emoji, no shouted words, no fake urgency, no
third-party links, at most one image.

The markup checks are only the ones with a known failure in a real
client: a missing `bgcolor` attribute leaves Outlook for Windows with no
background at all, and the light/dark pair has to stay complete in both
directions — an element with a `dm-` class and no rule in the dark block,
or an inline colour with no `dm-` class, each produce a patch that is
invisible in one scheme and glaring in the other. It also asserts
the wiring — that every lifecycle event is actually attached to
something, that each fires on a transition rather than a state, and that
the emailed access link is consumed by a POST so mail scanners cannot
burn it before the customer clicks.

**check-links.js** — reports any URL linked from NAVIGATION more than once
on the same page under different anchor text. Needs a running server
(`PORT`, default 5300); it is the only suite that does.

To be precise about what this is and is not: Merchant Center has **no**
policy on internal links or anchor text, so nothing it finds can cause a
rejection. The Google Search effect is mild and well understood — linking
one URL several times from a page is normal and unpenalised, though the
first link's anchor text is what carries the signal. The real cost is to
the reader: "Free shipping on all orders" sitting next to "Shipping &
Delivery" in the same footer, both going to `/shipping`, reads as two
destinations. That is the case this catches.

Legitimate patterns are allow-listed rather than reported: the logo and a
"Home" nav item both pointing at `/`, a header nav using "MTG" where the
footer spells out "Magic: The Gathering", and a breadcrumb using a short
label. Prose links are excluded entirely — a sentence linking "what each
one does" to the cookie policy is good writing, and rewriting prose to
match a nav label would make it worse.

## Running against a real database

Only `check-account.js` needs MongoDB, for the reason given above.
`check-routes.js` stubs the handful of model reads the routes make; the
rest render templates directly. That is deliberate — a compliance check
that only runs when someone has a database to hand is a compliance check
that does not run.

To run the account audit:

```
MONGO_AUDIT_URI=mongodb://127.0.0.1:27017/zy_audit node scripts/audit/check-account.js
```

It empties every collection it uses before seeding, so point it at a
scratch database, never at production.
