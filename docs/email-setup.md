# Transactional email setup

Zyphera TCG runs **two** mail systems on one domain, and they must not be
confused with each other.

| | Zoho Mail | ZeptoMail |
|---|---|---|
| What it does | The mailboxes people read and reply from — `support@`, `returns@`, `privacy@` | Sends confirmations, dispatch notices, refund updates and sign-in links |
| Who logs in | You | Nobody. It is an API/SMTP endpoint |
| Changes here | **None.** Leave it exactly as it is | New account, ~10 minutes |

Keeping them apart is a deliverability decision before it is a technical
one. A mailbox and a sending service earn sender reputation differently,
and a bounce storm from a bad address should not be able to degrade
delivery of your reply to a customer.

## Why not just use Zoho Mail

Two reasons, and the first is fatal:

1. **Zoho removed SMTP, IMAP and POP from the free plan.** It is web and
   mobile access only. There is no credential you can put in `SMTP_USER`
   today that will authenticate. Paid plans start at Mail Lite.
2. Even on a paid plan, Zoho Mail is a mailbox product with per-hour send
   caps, and Zoho's own documentation points application email at
   ZeptoMail. ZeptoMail is transactional-only *by policy*, which means
   its sending IPs carry no marketing traffic — that is an advantage, not
   a restriction.

**Cost:** $2.50 per 10,000 emails, pay as you go, $0 in a month where you
send nothing. New accounts get 10,000 free credits for a month.

---

## 1. Create the ZeptoMail account

1. Go to **zoho.com/zeptomail** and sign in with the Zoho account you
   already use for Zoho Mail. It is a separate product, not a separate
   login.
2. Add **zypheratcg.com** as a sending domain.
3. ZeptoMail gives you DNS records to add. Do **section 2** before
   continuing — verification will not pass without them.

## 2. DNS records

Add these at your DNS host. The critical thing is that **SPF is one
record containing both includes** — publishing two `v=spf1` records is a
permanent SPF failure, not a merge.

### SPF — edit your existing record, do not add a second one

You almost certainly already have one for Zoho Mail. Find it and add
ZeptoMail's include to it:

```
Type:  TXT
Host:  @
Value: v=spf1 include:zoho.com include:zeptomail.zoho.com ~all
```

If you have no SPF record at all, publish exactly the line above.

> Use whatever include string ZeptoMail shows you in its own setup panel
> if it differs from the one here — providers occasionally move them, and
> theirs is authoritative.

### DKIM — two separate selectors, both live at once

Zoho Mail and ZeptoMail each sign with their own key, under their own
selector, so they coexist without touching each other:

```
Zoho Mail   Host: zoho._domainkey        (already there — leave it alone)
ZeptoMail   Host: zmail._domainkey       Value: (the long v=DKIM1 string ZeptoMail gives you)
```

The selector name ZeptoMail asks for may differ. Use theirs verbatim.

### DMARC — one record, and start permissive

```
Type:  TXT
Host:  _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@zypheratcg.com; fo=1; adkim=r; aspf=r
```

**Start at `p=none` and leave it there for two weeks.** `p=none` asks for
reports without asking anyone to reject anything. Once the reports show
that everything legitimate is passing both SPF and DKIM, move to
`p=quarantine`, and later `p=reject` if you want it.

Going straight to `p=reject` before you can see the reports is how people
silently kill their own order confirmations.

## 3. Credentials

In ZeptoMail: **Mail Agents → your agent → SMTP**. Copy the password (the
username is always `emailapikey`) and set it:

```
SMTP_USER=emailapikey
SMTP_PASS=<the token from ZeptoMail>
```

That is all that is required. `SMTP_PASS` is the ZeptoMail **Send Mail
Token**, and it is the same value the HTTPS API authenticates with — so
the same one variable powers both transports.

### Which transport, and why the default is the API

The app sends over **ZeptoMail's HTTPS API (port 443) by default**, not
SMTP. This is deliberate and it is the whole reason mail works here:

> **Shared hosts block outbound SMTP.** Render blocks it; Railway blocks
> ports 25/465/587 on every plan below Pro. On those hosts *no* SMTP port
> will ever connect — the symptom is a socket that never answers, i.e.
> *Connection timeout* with every message logged and none delivered. Port
> 443 is never blocked, so the API always gets through. This is ZeptoMail's
> own recommendation, and Railway's, for anything below their Pro tier.

You do not configure the API separately. `config/mail.js` reads:

| Variable | Default | Purpose |
| --- | --- | --- |
| `MAIL_TRANSPORT` | *(unset → API when a token exists)* | `api` forces the HTTPS API, `smtp` forces SMTP (a Pro plan, or a local mail catcher). |
| `ZEPTOMAIL_TOKEN` | falls back to `SMTP_PASS` | The Send Mail Token. Set it only if you want the API token to differ from the SMTP password. |
| `ZEPTOMAIL_API_URL` | region of `SMTP_HOST` | Override the endpoint outright. |
| `SMTP_HOST` | `smtp.zeptomail.com` | Also decides the API region: a `.eu` host means the API is `api.zeptomail.eu`. |
| `SMTP_PORT` | `465` | Only used when `MAIL_TRANSPORT=smtp`. 465 (implicit TLS), not 587 — 587 is the port hosts drop. |

> **Regional endpoint.** If your ZeptoMail account is in the EU data
> centre, set `SMTP_HOST=smtp.zeptomail.eu`. Both the API region and (if you
> ever use it) the SMTP host follow from it. Pointing at the wrong region
> produces a clean timeout, not an auth error.

So on Railway/Render the setup is: set `SMTP_USER` and `SMTP_PASS`,
redeploy, done — the API carries the mail with nothing further to configure.

## 4. Confirm it works

1. Open **/admin/emails**. The banner at the top should read
   **Sending is live** with the host and port. If it says *Not sending*,
   the error underneath is the exact reason.
2. Use **Send yourself a test** at the bottom of that page. Send an
   *Order confirmation* to a Gmail address and an Outlook address.
3. In Gmail, open the message → **⋮ → Show original**. You want:
   ```
   SPF:   PASS   with domain zypheratcg.com
   DKIM:  PASS   with domain zypheratcg.com
   DMARC: PASS   with domain zypheratcg.com
   ```
   Anything other than three PASSes means a DNS record is wrong. Fix it
   before real customers get anything.
4. Place a test order (see the `+ztest` flow) and confirm the real
   confirmation arrives and appears in the log with status `sent`.

---

## What sends, and when

| Email | Trigger | Sent more than once? |
|---|---|---|
| Order confirmation | Payment verified server-side, order written | No — once per order |
| Preorder confirmation | Same, when the product is a preorder | No |
| Shipped | Admin sets fulfilment to shipped or delivered | No |
| Tracking available | Tracking added to an order that already shipped | No |
| Order cancelled | Customer cancels, or admin cancels | No |
| Refund started | Admin marks a refund owed without cancelling | No |
| Refund issued | Admin marks a refund actually sent | No |
| Release date update | Admin action on /admin/preorders | Yes — dates move more than once |
| Sign-in link | Customer asks for one | Every time asked |

Every one of these writes a row to `EmailLog` **before** it tries to
send, so a message that never left is visible rather than invisible.

## The refund wording rule

Refunds are issued **by hand** in the payment provider. Nothing in this
codebase calls Whop or Stripe to move money.

- *Order cancelled* and *Refund started* say the refund is **being
  processed** and give the 7–10 business day window.
- Only *Refund issued* — sent when an admin records that they have
  actually refunded it — says the money has been sent.

`scripts/audit/check-email.js` asserts this in both directions and fails
if any template drifts.

## Deliverability rules the templates already follow

Kept here so they survive the next redesign:

- **One image maximum**, the product photo. The wordmark is text, so it
  renders before images load and cannot be blocked.
- **A real plain-text alternative**, written by hand per template, not
  stripped from the HTML.
- **No third-party links.** Only zypheratcg.com and the carrier's own
  tracking URL. No tracking pixels, no click wrapping, no analytics.
- **No open tracking, deliberately, and this one should not be revisited.**
  Open tracking means a 1×1 remote image carrying a per-recipient id.
  That is the signature spam filters look for, because it is exactly how
  a spammer confirms an address is live, and it would reverse the
  one-image rule above. It is also poor data: Apple's Mail Privacy
  Protection pre-fetches every remote image for anyone who enabled it,
  and Gmail proxies them, so most recorded "opens" are machines.

  Engagement is measured from the **link** instead. Every order email
  carries an access token unique to that message; when somebody clicks
  through and signs in, the log row is marked opened. Fewer events, all
  of them real people, and nothing added to the email at all. The
  **Opened** column on /admin/emails is that, and a blank means "we do
  not know", not "unread".

  `check-email.js` fails on a second image, on any 1×1 or hidden image,
  and on an image whose URL looks like a beacon.
- **No exclamation marks, no emoji, no shouted words, no urgency.** These
  are service messages, not campaigns.
- **`Auto-Submitted: auto-generated`** so out-of-office autoresponders do
  not reply into the support inbox.
- **No `List-Unsubscribe`.** Bulk-sender rules require it for marketing;
  transactional mail is exempt, and adding it signals "this is
  marketing".
- **`bgcolor` attributes as well as CSS**, because Outlook on Windows
  ignores CSS backgrounds and the design would arrive as unstyled text
  without them. The attribute always carries the LIGHT value — Outlook
  for Windows has no dark mode to opt into.
- **Light base, dark variant.** This is worth understanding before
  anyone changes it back.

  The emails were originally dark-only, matching the site. Gmail and
  Outlook.com apply their own colour inversion in dark mode, and the
  documented opt-out — `color-scheme` / `supported-color-schemes` — is
  honoured by Apple Mail and **ignored by Gmail**. So a dark email
  arrived in Gmail's dark theme with its background flipped to near-white
  and its text flipped to dark: washed out, for probably most customers.

  A light email inverts *gracefully* — Gmail's dark mode produces a
  readable dark message on its own. That is why every large retailer
  sends light transactional mail.

  So the inline styles are light (inline is the only thing every client
  honours), and the dark treatment is a `prefers-color-scheme` block
  keyed on `dm-*` classes, applied by Apple Mail, iOS Mail and Outlook
  for macOS. **Every coloured element needs both an inline light colour
  and a `dm-` class** — one with only the inline style stays light inside
  the dark variant and arrives as a glaring patch. `check-email.js`
  fails on any element that has one without the other, in both
  directions.

## Troubleshooting

**"Not sending" on /admin/emails** — no token on the server. The banner
means `SMTP_PASS` (and `ZEPTOMAIL_TOKEN`, if you set one) are both unset, so
there is nothing to authenticate with and every message is logged as
`skipped`. Set `SMTP_PASS` and redeploy.

**Everything is `failed` with "Connection timeout"** — you are on SMTP on a
host that blocks it. By default the app uses the HTTPS API and this cannot
happen; if you see it, `MAIL_TRANSPORT` is set to `smtp` on a host (Render,
Railway below Pro) that blocks outbound SMTP ports. **Fix: remove
`MAIL_TRANSPORT` (or set it to `api`) and redeploy** — the API on port 443
is never blocked. Only keep `MAIL_TRANSPORT=smtp` on a plan that actually
permits SMTP.

**Everything is `failed` with "ZeptoMail rejected the message" / an auth
error** — over the API a 401 means the token is wrong: `ZEPTOMAIL_TOKEN`, or
`SMTP_PASS` if no dedicated token is set, is not this Mail Agent's Send Mail
Token, or the domain is not verified yet. A 400 with a recipient message
means the To address was refused. The row carries ZeptoMail's exact words.

**Gmail says `SPF: SOFTFAIL` or `neutral`** — you have two `v=spf1`
records, or ZeptoMail's include is missing. There must be exactly one.

**Gmail says `DKIM: none`** — the ZeptoMail DKIM TXT record has not
propagated, or the selector name does not match what ZeptoMail expects.

**Emails arrive in Promotions** — usually a Reply-To that bounces, or too
many links. Both are already handled; check that `support@zypheratcg.com`
actually receives mail.

**A customer says they got nothing** — search /admin/emails by their
address. The row tells you whether it was sent, refused, or never
attempted, and carries the provider's own words. Retry rebuilds the
message from the order as it is *now*, not as it was.

---

## Abandoned-checkout recovery

Six reminders, then stop: 30 min, 4 h, 12 h, 24 h, 48 h, 72 h from the
moment a checkout goes quiet. A checkout is only "quiet" after 30 minutes
with no activity, so nobody is emailed while they are still filling the
form in.

### How a checkout gets here

The customer types their email on a PARTNER host, not on zypheratcg. The
funnel beacon (`/api/checkout/confirm-arrival`) deliberately carries no
personal data, so recovery needs its own channel: `partner.html` posts the
checkout state to `POST /api/checkout/session`, keyed by the same `zcid`
the beacon uses. No `zcid`, no capture — the page never invents an id.

### Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `ABANDONED_RECOVERY_ENABLED` | on | Set to `false` to stop the sweep without a deploy. |
| `ABANDONED_SWEEP_INTERVAL_MS` | `300000` | How often the sweep runs. |
| `ABANDONED_MAX_PER_RUN` | `50` | Ceiling per run, so a backlog drains instead of flooding the provider. |
| `EMAIL_UNSUBSCRIBE_SECRET` | falls back to `THANK_YOU_SIGNING_SECRET` | HMAC key for unsubscribe links. Set it explicitly in production. |

The sweep starts from `server.js`'s `boot()` alongside the other crons. It
needs no external scheduler.

### The rules that matter

**Payment always wins.** `services/orderPipeline` closes any live sequence
the moment an Order exists, and the scheduler re-checks the Order
collection immediately before every single send. Status on the row is a
cache; the Order collection is the truth.

That check looks at TWO addresses. In pooled-email mode the address on the
Order is the POOLED one, not the address the customer typed, so matching
only on the typed address would never fire and a paying customer would
receive six reminders. The pooled address is recovered from this checkout's
own click `Event`.

**Exactly once.** A row lock plus a conditional `recoveryStep` increment
claimed BEFORE the message is handed to SMTP. If two workers reach the same
row, one wins the `recoveryStep: n-1` predicate and the other does nothing.
The cost is that a hard SMTP failure burns its step instead of retrying,
which is the right way round: the alternative's failure mode is a customer
receiving the same email twice.

**Unsubscribe is honoured everywhere.** `EmailSuppression` stops recovery
mail only — receipts, dispatch notices and refund emails still go out,
because those are records of a transaction the customer entered into.
Recovery mail is commercial, so `layout.js` swaps its footer for the
opt-out wording and the postal address; transactional mail keeps the
service-message wording.

**The sequence stops itself** if the product is withdrawn, the preorder
closes, or the price moves — a reminder quoting a price the customer will
not be charged is a misquotation, so it is not sent.

### Testing

```
node scripts/audit/check-abandoned-recovery.js
```

Needs a MongoDB it can reach (it uses `mongodb-memory-server`, which
downloads a `mongod` binary on first run). It drives the whole lifecycle:
each step sending exactly once, three concurrent sweeps producing one
email, payment/unsubscribe/bounce/withdrawal all stopping the sequence,
and one customer with three abandoned sessions getting one sequence rather
than three.
