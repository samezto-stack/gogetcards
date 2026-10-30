# Release day

What to do, in order, on the day a preordered set lands with several
hundred orders waiting on it. Everything below lives on
**/admin/preorders → the set**.

## The two emails

| | Who gets it | What it says |
|---|---|---|
| **1. "Your preorder is here"** | Everyone still holding an open order (not cancelled, not shipped) | The set has landed, orders are being dispatched in the order they were placed, expect it within the window you type, tracking follows by email. |
| **2. Keep it, or take the refund?** | Everyone who cancelled and whose refund has **not** been issued yet | The set is here. Press the button before the deadline to keep the original order at the price already paid — nothing charged again — or do nothing and the refund goes ahead as promised. Asked once, no follow-up. |

Both are **one message per customer**: somebody holding three orders gets
one email naming three references, not three emails a minute apart.

Both are **queued, not sent**. Pressing the button writes the rows and
the page shows the run draining. Messages go out roughly every 20–35
seconds, jittered, from the same `orders@` address as the receipts. Six
hundred customers take about four and a half hours. That pace is the
point: several hundred messages in one burst from the domain the order
confirmations use is exactly what a receiving filter throttles, and a
throttle on that domain costs receipts, not just announcements.

Pressing a button twice queues nobody who is already covered. A run can
be stopped from the table under the buttons; anything already sent is
sent.

## The refund hold — read this before pressing button 2

Button 2 writes a **deadline** onto every cancelled order it covers (end
of the chosen day, Pacific time) and quotes that date in the email. The
email promises the refund goes out **after** the deadline if they do
nothing.

So until the deadline passes: **do not issue those refunds.** The orders
list marks every such order in amber — *Keep-or-refund offer open — do
not refund before <date>*. Refunding early breaks the promise in the
email and can refund an order the customer is about to reinstate.

When a customer presses "Keep my order":

- the cancellation and the queued refund are withdrawn (`cancelledAt`
  cleared, `refundStatus` back to `none`, `reinstatedAt` set),
- **no money moves in either direction** — they paid at order time, the
  refund was never issued,
- they get an "Your order is back on" email,
- the order drops out of *Refund open* and shows *Reinstated by the
  customer — no refund owed* in the list.

After the deadline the button stops working (checked at the instant of
the click, against the database, not against the page), and the
remaining cancelled orders are refunded exactly as they would have been.

## Where things show up

- **/admin/emails** — every message, with `queued` rows waiting their
  turn and a Retry button on anything that failed. A retried broadcast
  goes back into the paced queue rather than out immediately.
- **/admin/orders?status=refunded** — the refund-open list, with the
  amber hold marker on anything under an open offer.
- **/admin/emails/preview** — both templates, in every state, with sample
  data. Send yourself a test from there before the real run.

## Tuning

Environment variables, all optional:

```
MAIL_BROADCAST_GAP_SECONDS=20      # base gap between two broadcast sends
MAIL_BROADCAST_JITTER_SECONDS=15   # random extra on top of each gap
MAIL_BROADCAST_TICK_MS=10000       # how often the drain looks
```

Slower is always safe. Faster than about 10 seconds is not worth the
risk on a domain that also carries receipts.
