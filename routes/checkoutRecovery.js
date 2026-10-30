/**
 * The three public endpoints abandoned-checkout recovery needs.
 *
 *   POST /api/checkout/session      partner hosts report checkout state
 *   GET  /checkout/recover/:token   the button in the email
 *   GET  /email/unsubscribe/:token  the opt-out in the email
 *
 * WHY CAPTURE IS A SEPARATE ENDPOINT FROM THE FUNNEL BEACON. The beacon
 * (/api/checkout/confirm-arrival) is a 1x1 GIF carrying a zcid and a step
 * name and NOTHING personal — that was deliberate, and it stays that way.
 * Recovery needs an email address and a shipping address, which is a
 * different kind of data with different retention and consent
 * consequences, so it gets its own POST, its own validation and its own
 * rate limit rather than being smuggled onto an image request.
 *
 * ALL THREE ARE UNAUTHENTICATED, which is what the threat model is about:
 * nothing here accepts an identifier a stranger could guess. Capture is
 * keyed by a zcid the server itself minted, recovery by 32 bytes of
 * CSPRNG, and unsubscribe by an HMAC over a server-side secret.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const AbandonedCheckout = require('../models/AbandonedCheckout');
const EmailLog = require('../models/EmailLog');
const EmailSuppression = require('../models/EmailSuppression');
const Product = require('../models/Product');
const service = require('../services/abandonedCheckout');
const site = require('../config/site');
const markets = require('../config/markets');

/* ── THE CUSTOMER GOES BACK TO THE STOREFRONT THEY LEFT ────────────────
   A UK buyer who abandons at £179.97 and clicks the reminder has to land
   on /uk — on the US page they would be shown a different number for the
   same box, and the reminder that brought them there would read as a
   bait. The market is recorded on the checkout row, so every destination
   this route builds is resolved through it rather than through the bare
   origin. */
function marketUrl(doc, path) {
  const market = markets.byId(doc && doc.market) || markets.defaultMarket();
  return `${site.origin()}${markets.path(market, path)}`;
}

/* Capture fires on every meaningful edit of a checkout form, so the limit
   has to allow a real customer filling in eight fields while still being
   useless to somebody trying to write junk into the collection. */
const captureLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests' },
});

/* Token endpoints are the enumeration target. Deliberately tight: a real
   customer clicks a link in an email once, maybe twice. */
const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

/* ─────────────────── capture ─────────────────── */

const MAX_FIELD = 200;
const clean = (v) => (v == null ? '' : String(v).slice(0, MAX_FIELD).trim());

router.post('/api/checkout/session', captureLimiter, express.json({ limit: '8kb' }), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const b = req.body || {};
    const checkoutId = clean(b.checkoutId);
    const email = clean(b.email).toLowerCase();

    /* Both are required and neither is guessable-into-existence: the
       checkoutId was minted by trackCheckoutReached() on this server when
       the customer was routed to the partner host. */
    if (!checkoutId || !email || !email.includes('@')) {
      return res.status(400).json({ ok: false, error: 'checkoutId and a valid email are required' });
    }

    const doc = await service.capture({
      checkoutId,
      email,
      firstName: clean(b.firstName),
      lastName: clean(b.lastName),
      phone: clean(b.phone),
      country: clean(b.country),
      shipping: {
        line1: clean(b.address1),
        line2: clean(b.address2),
        city: clean(b.city),
        state: clean(b.state),
        postalCode: clean(b.postalCode),
      },
      productSlug: clean(b.productSlug),
      productName: clean(b.productName),
      productImage: clean(b.productImage),
      quantity: b.quantity,
      total: clean(b.total),
      currency: clean(b.currency) || 'USD',
      whopPlanId: clean(b.whopPlanId),
      availability: clean(b.availability),
      releaseDate: clean(b.releaseDate),
      partnerStore: clean(b.partnerStore) || (req.get('Origin') || ''),
    });

    /* Deliberately says nothing about what was stored. The response is a
       receipt, not a lookup: a reply that varied by whether the address
       was already known would make this endpoint an oracle. */
    return res.json({ ok: !!doc });
  } catch (err) {
    console.error('[checkout/session] capture failed:', err.message);
    return res.status(500).json({ ok: false });
  }
});

/* ─────────────────── recovery link ─────────────────── */

function expiredPage(res, { heading, message }) {
  const origin = site.origin();
  res.status(410).type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${heading} | GoGetCards</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0B0F14;color:#E5E7EB;
       font:15px/1.6 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:24px}
  .c{max-width:440px;text-align:center}
  h1{font-size:22px;margin:0 0 10px;color:#fff;letter-spacing:-0.02em}
  p{margin:0 0 22px;color:#9CA3AF}
  a{display:inline-block;padding:13px 22px;border-radius:6px;background:#7C3AED;color:#fff;
    text-decoration:none;font-weight:600}
</style></head>
<body><div class="c">
  <h1>${heading}</h1>
  <p>${message}</p>
  <a href="${origin}/">Browse the store</a>
</div></body></html>`);
}

/**
 * One click, written to both places that care about it.
 *
 * THE EMAIL SIDE. Recovery emails were the one lifecycle family whose
 * links went untracked: /admin/emails could tell you a reminder was
 * delivered and nothing about whether it was used, so the six-step
 * sequence was the only email on the site whose value could not be read
 * off its own report. `s` names the step, so the click lands on the exact
 * message that carried it; a link from before that parameter existed, or
 * one mangled in transit, falls back to the most recent email actually
 * sent — the honest guess, and the only one available.
 *
 * Stamped once, like the sign-in links: linkOpenedAt is "first used", not
 * a click counter, and a mail client pre-fetching a URL must not be able
 * to move a date that is already set.
 */
async function recordClick(doc, stepParam) {
  const now = new Date();
  try {
    await AbandonedCheckout.updateOne(
      { _id: doc._id },
      { $set: { lastActivityAt: now, lastRecoveryClickAt: now }, $inc: { recoveryLinkClicks: 1 } }
    );
  } catch (err) {
    console.error('[recovery] click not recorded:', err.message);
  }

  try {
    const sent = (doc.emailsSent || []).filter((e) => e && e.emailLogId && e.sentAt);
    if (!sent.length) return;
    const step = parseInt(stepParam, 10);
    const named = Number.isFinite(step) ? sent.find((e) => e.step === step) : null;
    const latest = sent.reduce((a, b) => (a.sentAt > b.sentAt ? a : b));
    const target = named || latest;
    await EmailLog.updateOne(
      { _id: target.emailLogId, linkOpenedAt: null },
      { $set: { linkOpenedAt: now } }
    );
  } catch (err) {
    /* A missing click statistic must never cost the customer their
       checkout. */
    console.error('[recovery] click not attributed to an email:', err.message);
  }
}

router.get('/checkout/recover/:token', tokenLimiter, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const origin = site.origin();

  try {
    const hash = AbandonedCheckout.hashRecoveryToken(req.params.token || '');
    const doc = await AbandonedCheckout.findOne({ recoveryTokenHash: hash });

    /* Same response for "no such token" and "wrong token", and no timing
       difference worth measuring, because both are a single indexed
       lookup that missed. */
    if (!doc) {
      return expiredPage(res, {
        heading: 'This checkout link has expired',
        message: 'Checkout links stay active for a few days. Your order was not placed and nothing was charged.',
      });
    }

    /* ── THE CLICK IS RECORDED HERE, BEFORE ANY BRANCH ────────────────
       They clicked our link. That is true whether the checkout is still
       live, has expired, or was already paid, and it is the fact both
       things downstream depend on: the email report's click-through, and
       whether a later order counts as recovered or merely purchased.

       Recording it only on the happy path, which is what happened before,
       meant a customer who clicked a three-day-old link, landed on the
       product page because the price had moved, and bought it there was
       filed as though the email had never been sent. */
    await recordClick(doc, req.query.s);

    if (doc.recoveryTokenExpiresAt && doc.recoveryTokenExpiresAt < new Date()) {
      return expiredPage(res, {
        heading: 'This checkout link has expired',
        message: 'Checkout links stay active for a few days. Your order was not placed and nothing was charged.',
      });
    }

    /* Already paid. Send them somewhere useful instead of back into a
       checkout for something they own. */
    if (doc.status === 'recovered' || (await service.hasPaid(doc.email))) {
      await service.markRecoveredByEmail(doc.email);
      return res.redirect(302, marketUrl(doc, '/account'));
    }

    /* REVALIDATE. The email may be three days old; the catalogue is
       not frozen. Never drop somebody into a checkout that cannot
       complete, and never honour a price that has moved. */
    const check = await service.validateForSend(doc);
    if (!check.ok && check.stop && check.reason !== 'suppressed') {
      await service.stopSequence(doc, check.reason, 'expired');
      const product = doc.productSlug ? await Product.findOne({ slug: doc.productSlug }).lean() : null;
      if (product && product.available !== false) {
        /* Still sellable, just not at the saved price — the product page
           is the honest destination, showing today's figure. */
        return res.redirect(302, marketUrl(doc, `/products/${encodeURIComponent(doc.productSlug)}`));
      }
      return expiredPage(res, {
        heading: 'This checkout is no longer available',
        message: 'The product in it can no longer be ordered. Nothing was charged.',
      });
    }

    await AbandonedCheckout.updateOne({ _id: doc._id }, { $set: { lastActivityAt: new Date() } });

    /* STRAIGHT TO PAYMENT, WITH EVERYTHING THEY ALREADY GAVE US.
     *
     * This used to hop directly to the partner page. That was right while
     * that page carried its own information form; it is the payment step
     * and nothing else now, so the same redirect dropped the customer on a
     * page with no order behind it and told them to start over — the exact
     * opposite of what a recovery email is for.
     *
     * We already hold their email, their name and their full shipping
     * address on this row. Rebuilding a checkout session from it and going
     * to the payment step means the reminder lands them on a filled-in
     * payment form with one button between them and the order they left.
     *
     * It pays for nothing by itself: the card details and the button are
     * still theirs, on the provider's own form.
     *
     * The session reuses THIS row's checkoutId, so when the order is
     * created the pipeline closes this exact sequence instead of leaving
     * it live to send another reminder about a purchase already made. */
    try {
      const sessionService = require('../services/checkout/session');
      const started = await sessionService.start(doc.productSlug, doc.quantity || 1, {
        checkoutId: doc.checkoutId || '',
        userAgent: req.get('User-Agent') || '',
        ip: req.ip,
      });
      if (started.ok) {
        const s = started.session;
        s.email = doc.email;
        s.firstName = doc.firstName || '';
        s.lastName = doc.lastName || '';
        s.phone = doc.phone || '';
        s.country = doc.country || '';
        s.address1 = (doc.shipping && doc.shipping.line1) || '';
        s.address2 = (doc.shipping && doc.shipping.line2) || '';
        s.city = (doc.shipping && doc.shipping.city) || '';
        s.state = (doc.shipping && doc.shipping.state) || '';
        s.postalCode = (doc.shipping && doc.shipping.postalCode) || '';
        /* Step 1 IS complete — they completed it themselves the first time
           round. Saying so is what lets the payment step open rather than
           bouncing them back into a form they have already filled in. */
        s.status = 'step1_completed';
        s.lastActivityAt = new Date();
        await s.save();
        return res.redirect(302, marketUrl(doc, `/checkout/${started.token}/payment`));
      }
    } catch (err) {
      /* A recovery link must never dead-end. Fall through to the product
         page, which is a working checkout for anyone. */
      console.error('[checkout/recover] session rebuild failed:', err.message);
    }

    /* No partner route available (pool empty, no bundle plan for this
       quantity). The product page is the working fallback, exactly as it
       is for a first-time buyer. */
    if (doc.productSlug) {
      return res.redirect(302, marketUrl(doc, `/products/${encodeURIComponent(doc.productSlug)}`));
    }
    return res.redirect(302, marketUrl(doc, '/'));
  } catch (err) {
    console.error('[checkout/recover] failed:', err.message);
    return expiredPage(res, {
      heading: 'Something went wrong',
      message: 'We could not reopen that checkout. Nothing was charged.',
    });
  }
});

/* ─────────────────── unsubscribe ─────────────────── */

/**
 * Does the opt-out. Shared by the link a customer clicks and the POST a
 * mail provider sends on their behalf, so the two can never diverge — an
 * unsubscribe that works from the footer but not from Gmail's own button
 * is worse than none, because the customer believes they have opted out.
 *
 * Returns the address it suppressed, or '' if the link did not verify.
 */
async function applyUnsubscribe(token, checkoutId) {
  let email = '';
  try {
    /* The token is an HMAC over (address, checkoutId), so the address is
       not in the URL. Recover it from the checkout the link names, then
       verify the HMAC actually matches that pair — which is what stops
       somebody unsubscribing an address they merely guessed. */
    const doc = checkoutId ? await AbandonedCheckout.findOne({ checkoutId }).lean() : null;
    if (doc && EmailSuppression.verifyUnsubscribeToken(token, doc.email, checkoutId)) {
      email = doc.email;
    }
  } catch (err) {
    console.error('[email/unsubscribe] lookup failed:', err.message);
  }

  if (!email) return '';

  try {
    await EmailSuppression.suppress(email, 'unsubscribed', {
      sourceCheckoutId: checkoutId,
      tokenHash: EmailSuppression.hashUnsubscribeToken(token),
    });
    /* Stop every live sequence for the address immediately, rather than
       waiting for the next sweep to notice. */
    await AbandonedCheckout.updateMany(
      { email, status: { $in: ['active', 'abandoned'] } },
      {
        $set: {
          status: 'suppressed',
          suppressedAt: new Date(),
          nextEmailAt: null,
          stoppedReason: 'customer unsubscribed',
          recoveryTokenHash: '',
        },
      }
    );
  } catch (err) {
    console.error('[email/unsubscribe] suppress failed:', err.message);
  }

  return email;
}

/* The link in the footer. */
router.get('/email/unsubscribe/:token', tokenLimiter, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const email = await applyUnsubscribe(req.params.token || '', String(req.query.c || ''));

  if (!email) {
    return res.status(400).type('html').send(unsubPage({
      heading: 'This link is not valid',
      message: 'We could not match it to a subscription. If you keep receiving emails you did not ask for, reply to any of them and we will stop.',
    }));
  }

  return res.type('html').send(unsubPage({
    heading: 'You are unsubscribed',
    message: 'We will not send you any more checkout reminders. You will still get receipts and shipping updates for anything you actually order.',
  }));
});

/**
 * RFC 8058 one-click unsubscribe. This is the endpoint Gmail's and Apple
 * Mail's own "Unsubscribe" button calls — the mail client POSTs here
 * directly and shows the customer nothing of ours.
 *
 * WHY IT HAD TO EXIST. The recovery mails advertise
 * List-Unsubscribe-Post: List-Unsubscribe=One-Click (see services/mail/
 * index.js). A provider that is told one-click is available and then gets a
 * 404 treats the message as misconfigured bulk mail, which is the opposite
 * of what the header is for. Gmail and Yahoo have both required a working
 * one-click opt-out on promotional mail since February 2024.
 *
 * NOT a duplicate of the GET above: it runs the same applyUnsubscribe and
 * differs only in what it returns, because there is no human looking.
 *
 * A body is required by the spec (List-Unsubscribe=One-Click) but is
 * deliberately not checked — the token in the path is the authorisation,
 * and refusing an otherwise valid opt-out over a malformed body would mean
 * continuing to mail someone who asked to stop. For the same reason an
 * unverifiable token answers 200 rather than 400: a retry loop against a
 * mail provider is worse than a no-op, and the token proves ownership
 * anyway, so there is nothing to leak by staying quiet.
 */
router.post('/email/unsubscribe/:token', tokenLimiter, express.urlencoded({ extended: false }), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  await applyUnsubscribe(req.params.token || '', String(req.query.c || ''));
  return res.status(200).type('text/plain').send('OK');
});

function unsubPage({ heading, message }) {
  const origin = site.origin();
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${heading} | GoGetCards</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0B0F14;color:#E5E7EB;
       font:15px/1.6 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:24px}
  .c{max-width:460px;text-align:center}
  h1{font-size:22px;margin:0 0 10px;color:#fff;letter-spacing:-0.02em}
  p{margin:0 0 22px;color:#9CA3AF}
  a{color:#A78BFA}
</style></head>
<body><div class="c">
  <h1>${heading}</h1>
  <p>${message}</p>
  <p><a href="${origin}/">GoGetCards</a></p>
</div></body></html>`;
}

module.exports = router;
