# Pooled email — what it was, why it is gone, where the record lives

For a period, the partner checkout could be handed **one of our own email
addresses** instead of the buyer's. The Whop order then came back under an
address we controlled rather than the customer's.

That is removed. Every checkout now carries the buyer's own address.

## Why it is removed rather than switched off

It was already a toggle, already off, and already carried a comment saying it
"should stay off". A switch that must never be flipped is not a setting, it
is a hazard with a label on it.

Two things were wrong with the scheme:

1. **It is the shape of a fraudulent transaction.** The billing name and card
   belonged to a real person; the email did not. That mismatch is exactly
   what a processor's risk model looks for, and the cost of being flagged is
   not one declined payment but the account.
2. **It put us between a customer and their own receipt.** Somebody who paid
   could not look up their own order with the address they paid from, and
   support could not find it by the address they wrote in from.

## What is kept, and why

The **records are not deleted**, and the collection is now read-only.

An order sitting under one of our addresses is unattributable without the row
that recorded the substitution. Deleting that record would not undo the
scheme — it would make its results permanently unreadable, which is worse
than the scheme was.

So the pool table stays, the `pooledEmail` fields on `Event` and
`CheckoutSession` stay, and the admin panel became a download instead of an
editor.

### What was deleted, and why each one specifically

| Gone | Why |
|---|---|
| The claim in `resolvePartnerRedirect` | The substitution itself |
| `usePooledEmail`, `emptyPoolBehavior` | Nothing reads them |
| **Add to pool** | Nothing draws from the pool any more |
| **Release used emails** | This is what *destroyed* the history — it reset `usedFor` to null, so an address handed out fifty times and never converted reads today as a pristine `available` row |
| **Clear entire pool** | Deleted everything including `converted` rows. Its own confirm text admitted it was "permanently losing which customer each one was linked to". Keeping a one-click version of that next to a record we now rely on is how it happens on a tired day |
| `cron/recoveryBot.js` | Its only job was the release sweep above |

### What deliberately survives

- **`convertPooledEmail`** in the order pipeline. It only fires for a
  checkout already in flight under the old scheme. `converted` is the one
  status the pool table is authoritative for and it carries the order id.
- **The abandoned-checkout guard** that reads `Event.pooledEmail`. When a
  pooled address was used, the payment is recorded against *that* address, so
  checking the customer's own address would answer "never paid" and we would
  email somebody about a checkout they completed. That would break the
  standing rule that a customer who has purchased is never emailed about an
  abandoned checkout. It stays until the last such Event ages out.

## Getting the list

Two ways, one implementation (`services/partnerEmailHistory.js`), so they
cannot disagree:

**In the admin** — Settings → *Pooled email — retired*:

- **Download the record** — one row per address
- **Download every hand-off** — one row per checkout, naming the real
  customer each address stood in for

**On the command line:**

```
MONGODB_URI=... node scripts/export-partner-emails.js
```

Read-only; safe against production.

## How complete the list is

Three sources are unioned, and every row says which it came from. This
matters, because they have different reach:

| Source | Reach |
|---|---|
| `CheckoutSession` | **Complete.** No TTL index — `expiresAt` only decides whether a token still opens a checkout, it never deletes the row |
| `Event` | Last **365 days** (`EVENT_TTL_DAYS`). Covers the period before the session model existed |
| `PartnerEmail` | Authoritative for `converted` only. The release sweep rewrote everything else |

The one gap worth stating plainly: an address that was handed out, never
converted, and then released **before** `CheckoutSession` began recording has
had its only trace wiped by the sweep. It appears as `available` with no
hand-off. From the pool row alone, "never used" and "used, and the evidence
was erased" are indistinguishable — the export counts those rows and tells
you how many there are rather than guessing.
