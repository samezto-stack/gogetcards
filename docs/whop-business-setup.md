# Setting up a Whop business for a partner site

Every partner host sells through its own Whop business. This is the
checklist that business has to satisfy, and the reason for each item.

The prompts that drive the setup are generated per batch — they carry the
forty-eight plan figures, which is the part no one should retype. This
file holds the part that does **not** change between batches, so that a
future batch generated from scratch cannot quietly lose it.

## 1. Turn off Whop's customer emails — every business, no exceptions

**Business Settings → Checkout → turn OFF "Send transactional emails to
your members".**

Do this on every business, including the ones already created.

The buyer never sees Whop as the shop. They browse the storefront, click
buy, and the checkout is framed inside the partner host — so as far as
they are concerned they bought from that host, and that host is what
sends the receipt. The confirmation they expect comes from
`services/mail`, addressed from the storefront's own domain, and it is
the one they will look for if they want to check what they ordered.

Leaving the switch on adds a second sender they never agreed to hear
from. Minutes after paying, the buyer gets an email from a business name
that appears nowhere on the site they used, about a charge they have
already been emailed about once. The reasonable reading of that is a
duplicate charge by a stranger, and the reasonable response is a
chargeback — which costs the payment, the fee, and the account's standing
with the processor. A dispute opened for this reason cannot be won by
explaining the arrangement afterwards.

It is also the one email in the flow this codebase cannot suppress.
Everything gogetcards sends is gated, logged in `EmailLog`, and covered
by the rule that a customer who has successfully purchased is never
emailed about an abandoned checkout. Whop's transactional mail obeys none
of that, because it is not ours: the only control is this switch.

## 2. Rename the existing business — never create a new one

Each batch is set up by working inside a business that already exists:
rename it, change its slug. Creating a fresh one leaves an abandoned
shell holding the old name, and the slug that the partner host's
`returnUrl` and the embed allowlist were written against.

## 3. Forty-eight plans, four ladders, all one-time

Twelve rungs in each of USD, CAD, GBP and EUR. Every plan is a **one-time
payment**, never a subscription.

Each currency has its own step and each rung is that step multiplied by
the rung number, exactly:

| | step |
|---|---|
| USD | $74.99 |
| CAD | $109.99 |
| GBP | £59.99 |
| EUR | €69.99 |

Nothing is rounded to a nicer figure and nothing is converted between
currencies — the four ladders are set independently. `unitsFor()` in
`services/partnerRotation.js` divides in integer cents and **refuses** a
price that is not an exact multiple, rather than rounding to the nearest
rung, so a ladder rounded at setup time silently stops selling.

The ladders are keyed by **market, not currency**: the plan id is where
the money lands, so two countries sharing a currency still need their own
twelve ids or the revenue pools with no way to tell the campaigns apart.

## 4. What the business may not claim

No invented reviews, ratings, testimonials, customer counts, years in
business, certifications, partnerships or affiliations. No naming or
implying a real firm, vendor, platform, regulator or professional body,
and no claim to a qualification or licence. Each site adds its own
profession-specific version of this — a bookkeeping site must not
describe the service as an audit, a construction-claims site must not
imply anyone here is a solicitor.

## 5. Getting the plan ids back out

The setup prompt ends by asking for all forty-eight ids in one block, in
a fixed format, as the last thing in the reply. That block is what feeds
the CSV, and the CSV is what `/admin/settings` imports — see
`services/partnerImport.js`. Nothing is typed into the settings form by
hand: forty-eight ids per site is not a form, and a rung pasted into the
wrong slot charges one price while displaying another, with nothing
anywhere reporting it.
