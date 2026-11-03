# Accepted-payment brand marks

The checkout renders an "accepted payment methods" strip from
`public/assets/payment/`. **It ships switched off**, via an empty `data-marks`
attribute on `#ck-pay-marks` in `partner.html`. This document is how to turn it
on correctly, and why it is off until then.

## Why it is off

### 1. There are no assets, and inventing them is worse than nothing

An earlier version drew its own badges: grey rounded rectangles containing the
words `VISA`, `MC`, `AMEX`, `APPLE`, `GPAY`, `KLARNA`. Setting a card scheme's
name in Inter is not its trademark. A shopper who knows what a Visa mark looks
like reads a hand-set one as a template, which is the opposite of the
reassurance a payment strip exists to provide.

Visa, Mastercard, American Express, Discover, Apple and Google all publish
acceptance marks with mandatory clear-space, minimum-size and colour rules.
Redrawing them is a misuse. So is pulling an SVG off a logo aggregator, which is
also how you end up serving a stale or subtly wrong mark.

### 2. Whop decides the methods, not this page

This is the important one, and it is why a fixed logo row can never be fully
correct here.

Whop surfaces payment methods **automatically, based on the buyer's location**,
out of 100+ supported methods — Apple Pay, PayPal, Cash App (US), iDEAL
(Netherlands), Bancontact (Belgium), SEPA (EU), Twint (Switzerland), and ten
separate BNPL providers among them. What a buyer in Texas sees is not what a
buyer in Morocco sees. Availability also depends on what is enabled in the Whop
dashboard.

So a static row showing Apple Pay is a broken promise to every buyer whose
country does not get Apple Pay — at the exact moment they were deciding whether
to trust the page.

The sentence rendered under the strip is written to be true in all of those
cases, which is why it stays regardless of what you add:

> Cards and digital wallets are processed securely by **Whop**, our payment
> provider. The methods available to you are shown on the next step and depend
> on your country.

### 3. Apple Pay needs per-domain verification

Whop's embedded checkout supports Apple Pay only after a one-time **domain
verification**. That is per domain, and there are nine partner domains here.
Until a given domain is verified, Apple Pay will not appear in the embed on that
domain — so showing an Apple Pay mark there is advertising something the buyer
demonstrably cannot use.

Check this in the Whop dashboard before adding `apple-pay` to any site.

## How to switch it on

1. **Confirm what is actually enabled** for this Whop account, and for the
   specific domain, in the Whop dashboard. Only add marks for methods you have
   verified are live.
2. Download the official acceptance marks from each brand's own asset library
   (Visa Brand Center, Mastercard Brand Center, the American Express Brand Hub,
   Discover acceptance marks, Apple's Apple Pay Marketing Guidelines, Google Pay
   brand guidelines). Do not source them anywhere else.
3. Save them as SVG in `public/assets/payment/`, named by slug:
   `visa.svg`, `mastercard.svg`, `amex.svg`, `discover.svg`, `apple-pay.svg`,
   `google-pay.svg`, `klarna.svg`, `paypal.svg`, `cash-app.svg`.
4. List the ones you want in `partner.html`:

   ```html
   <div class="ck-pay-marks" id="ck-pay-marks" data-marks="visa,mastercard,amex">
   ```

The strip appears as soon as at least one file loads. Any file that is missing
removes itself from the row, so a partial set still looks deliberate and a
missing set leaves only the sentence beneath. With `data-marks` empty the page
makes no extra requests at all — which is why it cannot 404 on the one page
where a broken image matters most.

### Recommended starting set

Cards are the safe universal case. `visa,mastercard,amex` is true nearly
everywhere card payments are enabled, and it is the row most shoppers actually
scan for. Add wallets only per-domain, after verifying each one.

## Sizing and presentation

Marks render at `height: 26px`, width auto, on a white plate with a small
radius. The plate is deliberate: official marks carry their own brand colours
and are drawn for light backgrounds, and recolouring or knocking them out is
exactly what the brand guidelines prohibit. Supply files with a `viewBox` and no
fixed `width`/`height` so they scale cleanly, and keep each file's built-in
padding — the clear-space requirement is usually baked into the artwork.

Note what the plate is *not*: each mark is not wrapped in its own purple rounded
rectangle. A row of branded chips reads as decoration; a row of real acceptance
marks reads as a payment strip.
