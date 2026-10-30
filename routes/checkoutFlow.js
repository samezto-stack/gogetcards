/**
 * The two-step checkout.
 *
 *   POST /checkout/start           product page -> mints a session
 *   GET  /checkout/:token          Step 1, information (this domain)
 *   POST /checkout/:token          validate, save, price -> Step 2
 *   GET  /checkout/:token/payment  re-prices, then 302s to the payment host
 *
 * ROUTE ORDER. This router is mounted before routes/frontend.js, which
 * already owns /checkout/step-1, /checkout/whop and /checkout/success, and
 * routes/checkoutRecovery.js owns /checkout/recover/:token. A bare
 * /checkout/:token would swallow all four. So the token parameter is shape
 * -checked and anything that is not a 40+ character base64url string falls
 * through with next() — no reserved-word list to keep in sync.
 *
 * NOTHING HERE BRANCHES ON WHO IS ASKING. There is no user-agent check, no
 * crawler detection and no bot-specific content anywhere in this flow. A
 * reviewer, a crawler and a customer following the same URL get byte-for-
 * byte the same response. The checkout pages are noindex because a private
 * token URL should not be in an index, not because anything is hidden: the
 * product page stays fully crawlable and carries the same price, the same
 * availability and the same terms as this page does.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const CheckoutSession = require('../models/CheckoutSession');
const Product = require('../models/Product');
const sessionService = require('../services/checkout/session');
const abandoned = require('../services/abandonedCheckout');
const testOrder = require('../services/testOrder');
const site = require('../config/site');
const embedCheckout = require('../config/embedCheckout');
const markets = require('../config/markets');

/* A redirect to a bare path leaves the storefront the shopper is in — the
   session keeps its market, so the money stays right, but the URL, the
   header and every link on the page it lands on revert to the default
   market. `req.market` is set by middleware/market on every request. */
function mpath(req, p) {
  return markets.path(req.market || markets.defaultMarket(), p);
}


/* 32 random bytes base64url is 43 characters. Anything shorter is not one
   of ours and belongs to another route. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{40,}$/;

const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,          // a real customer reloads and retries; a scanner does not
  standardHeaders: true,
  legacyHeaders: false,
});

const startLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Every checkout page: private, never indexed, never cached. */
function privatePage(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('X-Robots-Tag', 'noindex, nofollow');
}

/* ─────────────── start ─────────────── */

router.post('/checkout/start', startLimiter, express.urlencoded({ extended: true }), async (req, res) => {
  privatePage(res);
  const slug = String(req.body.slug || '').trim();
  const qty = req.body.quantity || req.body.qty || 1;
  const frontend = require('./frontend');

  /* WHAT HAPPENS WHEN THIS CANNOT SERVE THE ORDER — a missing plan on the
     ladder, a session that failed to write.

     It used to fall through to /checkout-redirect, which was a pool of
     Shopify storefronts. That is deleted, and with it the TWO_STEP_CHECKOUT
     env switch that reverted the store to it: there is nothing left to
     revert to, and a kill switch pointing at a checkout that no longer
     exists is worse than none. A refusal now says so, in the customer's own
     terms, with the reason on one line in the logs. */
  const unavailable = () => frontend.checkoutUnavailable(res, slug);

  try {
    /* Minted here because THIS is the checkout click now. The same id then
       follows the customer onto the AbandonedCheckout row, the partner
       hand-off and the Order. */
    const checkoutId = frontend.trackCheckoutReached(
      req, Math.max(1, parseInt(qty, 10) || 1), 'two_step_checkout', slug
    );

    const started = await sessionService.start(slug, qty, {
      checkoutId,
      market: (req.market && req.market.id) || undefined,
      userAgent: req.get('User-Agent') || '',
      ip: req.ip,
    });

    if (!started.ok) {
      console.warn(`[checkout/start] session start refused ${slug} x${qty}: ${started.reason || 'unknown'}`);
      return unavailable();
    }
    return res.redirect(303, mpath(req, `/checkout/${started.token}`));
  } catch (err) {
    console.error('[checkout/start]', err.message);
    return unavailable();
  }
});

/* ─────────────── Step 1 ─────────────── */

router.get('/checkout/:token', tokenLimiter, async (req, res, next) => {
  const token = req.params.token;
  if (!TOKEN_SHAPE.test(token)) return next();
  privatePage(res);

  const session = await CheckoutSession.resolve(token);
  if (!session) return renderExpired(res);

  /* Already paid. Never show the payment step again, and never let a
     second order be created from a link somebody kept. */
  if (session.isComplete()) return renderComplete(res, session);

  const priced = await sessionService.priceFor(session.productSlug, session.quantity,
    { market: session.market });
  if (!priced.ok) return renderUnavailable(res, priced);

  session.lastActivityAt = new Date();
  await session.save();

  /* Why they are looking at this page again instead of the payment step.
     `repriced` has been set on a redirect from the payment step for a long
     time and nothing ever read it, so the customer was bounced back to a
     form with no explanation and the same total they had already accepted
     staring at them. */
  let notice = null;
  if (req.query.moved === '1') {
    /* req.market, not a bare `market` — the middleware has already resolved
       it from the prefix this redirect landed on, which is the storefront
       the customer is now actually in. */
    const m = req.market || markets.defaultMarket();
    notice = `Your delivery address is in ${m.name}, so we have moved you to our `
      + `${m.name} store. Prices here are in ${m.currency} — please check the `
      + `total before you continue.`;
  } else if (req.query.repriced === '1') {
    notice = 'The price of this item changed while you were filling this in. '
      + 'Please check the total before continuing.';
  }

  return renderStep1(res, {
    session, token, priced, errors: {}, values: session.customerFields(),
    notice,
    testMode: testOrder.isAllowed(req) && testOrder.isTestEmail(session.email),
  });
});

router.post('/checkout/:token', tokenLimiter, express.urlencoded({ extended: true }), async (req, res, next) => {
  const token = req.params.token;
  if (!TOKEN_SHAPE.test(token)) return next();
  privatePage(res);

  const session = await CheckoutSession.resolve(token);
  if (!session) return renderExpired(res);
  if (session.isComplete()) return renderComplete(res, session);

  const result = await sessionService.completeStep1(session, req.body);

  if (!result.ok) {
    if (result.reason === 'invalid') {
      const priced = await sessionService.priceFor(session.productSlug, session.quantity,
        { market: session.market });
      return renderStep1(res, {
        session, token, priced,
        errors: result.errors,
        values: result.values,
        testMode: testOrder.isAllowed(req) && testOrder.isTestEmail(result.values.email),
      });
    }
    if (result.reason === 'price_changed') {
      /* Show the new figure and make them confirm it. Charging a price
         the customer never saw is the one thing this cannot do. */
      return renderStep1(res, {
        session: result.session, token, priced: result.priced,
        errors: {}, values: result.session.customerFields(),
        notice: 'The price of this item changed while you were filling this in. Please check the total before continuing.',
      });
    }
    return renderUnavailable(res, result);
  }

  /* A rehearsal of the whole flow, and the server-side abandoned-checkout
     record — both decided in one shared helper so the progressive
     single-page flow (POST .../prepare) runs exactly the same thing. See
     applyStep1Complete and services/testOrder.js. Everything after this
     point is the real production path; a test only changes what the
     payment step DISPLAYS, never that the order, the email and the
     notification are the real ones. */
  await applyStep1Complete(req, session, result);

  return res.redirect(303, mpath(req, `/checkout/${token}/payment`));
});

/* ─────────────── Step 1 side effects, shared ─────────────── */

/**
 * The side effects of a completed Step 1 — the test-mode flag and the
 * server-side abandoned-checkout capture.
 *
 * Extracted verbatim from POST /checkout/:token so the progressive
 * single-page flow (POST /checkout/:token/prepare) runs EXACTLY the same
 * thing the classic two-step POST runs. Nothing here is new behaviour; it
 * is the block that used to sit inline after `completeStep1` returned ok.
 */
async function applyStep1Complete(req, session, result) {
  const wantsTest = testOrder.isTestEmail(session.email) && testOrder.isAllowed(req);
  if (session.isTest !== wantsTest) {
    session.isTest = wantsTest;
    await session.save();
  }

  /* The abandoned-checkout record is written HERE, from the server, with
     the server's own price. Skipped for a rehearsal so a deliberate
     walk-away does not start recovery emails about an order that was
     never meant to happen. */
  try {
    if (!session.isTest) await abandoned.capture({
      checkoutId: session.checkoutId || String(session._id),
      email: session.email,
      firstName: session.firstName,
      lastName: session.lastName,
      phone: session.phone,
      country: session.country,
      shipping: {
        line1: session.address1, line2: session.address2,
        city: session.city, state: session.state, postalCode: session.postalCode,
      },
      productSlug: session.productSlug,
      productName: result.priced.product.title,
      productImage: result.priced.product.imageUrl || '',
      quantity: session.quantity,
      total: (session.total / 100).toFixed(2),
      currency: session.currency,
      market: session.market || '',
      availability: result.priced.isPreorder ? 'preorder' : 'in_stock',
      releaseDate: result.priced.release.iso || '',
      partnerStore: site.origin(),
    });
  } catch (err) {
    /* A checkout must never fail because a recovery record did not save. */
    console.error('[checkout] abandoned capture failed:', err.message);
  }
}

/* ─────────────── Step 2 handoff, shared ─────────────── */

/**
 * Turn a session whose Step 1 is done into a payment destination.
 *
 * This is the ENTIRE body that used to live inline in GET
 * /checkout/:token/payment, lifted out unchanged so two callers can share
 * it: the classic GET route (which renders the result as a page) and the
 * new POST .../prepare route (which serialises it as JSON for the
 * progressive single page). Every decision that gates a payment — the
 * address/market match, the stock hold, the final reprice, the partner
 * token, the embed-mode choice — happens here and ONLY here, exactly as
 * before.
 *
 * Returns a discriminated outcome the caller maps to its own transport:
 *   { kind: 'redirect',        status, location }  — moved / repriced / plain handoff
 *   { kind: 'unavailable',     info }               — sold out, payment down, …
 *   { kind: 'embed',           ctx }                — draw the payment inside our page
 */
async function preparePayment(req, session, token) {
  /* THE STOREFRONT MUST MATCH THE SHIPPING ADDRESS.
   *
   * A buyer can reach /ca/checkout and then type a United States address —
   * from the market selector, a mis-targeted ad, or a link somebody shared.
   * Left alone they would be charged a Canadian plan, in Canadian dollars,
   * for a parcel going to the United States, and the first anyone would
   * hear of it is the customer asking why their bank shows CAD.
   *
   * DECIDED FROM THE ADDRESS THE CUSTOMER TYPED, NEVER FROM THEIR IP. That
   * distinction is the whole reason this is safe to do: a crawler never
   * fills in a form, so this can never fire for one, and every URL still
   * renders the same bytes for a customer, for Googlebot and for a
   * Merchant Center reviewer. An IP-based redirect would break all three.
   *
   * SENT BACK TO STEP 1, not forward to payment. The total changes
   * currency here, and charging a price the customer has not seen is the
   * one thing this flow must never do — the same rule the reprice branch
   * below follows.
   */
  const addressMarket = markets.byCountry(session.country);
  const currentMarketId = session.market || markets.defaultMarket().id;
  if (addressMarket && addressMarket.id !== currentMarketId) {
    /* Only somewhere we can actually charge. A market configured on but
       with no active partner ladder is not a place to send a buyer. */
    const servable = (req.sellableMarkets || []).some((m) => m.id === addressMarket.id);
    if (servable) {
      const there = await sessionService.priceFor(session.productSlug, session.quantity,
        { market: addressMarket.id });
      /* And only if the product is genuinely sold there. Moving somebody
         into a storefront that cannot price this item would replace a
         currency mismatch with a dead end, which is worse. When it cannot
         be priced they stay where they are and pay what they were quoted. */
      if (there.ok) {
        session.market = addressMarket.id;
        session.currency = there.currency;
        session.unitPrice = there.unitPrice;
        session.total = there.total;
        await session.save();

        /* The abandoned record was written at Step 1, in the storefront
           they have just left. Resubmitting the form would refresh it, but
           a customer who walks away from this very page never does — and
           their recovery email would then quote the old currency and link
           back into the storefront we just moved them out of. Terminal
           rows are left alone: a paid or recovered checkout is finished. */
        try {
          const AbandonedCheckout = require('../models/AbandonedCheckout');
          await AbandonedCheckout.updateOne(
            {
              checkoutId: session.checkoutId,
              status: { $nin: AbandonedCheckout.TERMINAL_STATUSES },
            },
            {
              $set: {
                market: addressMarket.id,
                currency: there.currency,
                total: (there.total / 100).toFixed(2),
              },
            },
          );
        } catch (err) {
          /* A stale recovery row must never block a checkout. */
          console.error('[checkout] could not re-market abandoned row:', err.message);
        }

        return {
          kind: 'redirect', status: 303,
          location: markets.path(addressMarket, `/checkout/${token}`) + '?moved=1',
        };
      }
    }
  }

  /* THE ONLY CALL THAT ENFORCES THE STOCK HOLD. A held product renders
     Step 1 and accepts the form; it is stopped here, one step before any
     money could be involved, and offered its successor. */
  const priced = await sessionService.priceFor(session.productSlug, session.quantity,
    { enforceStock: true, market: session.market });
  if (!priced.ok) return { kind: 'unavailable', info: priced };

  /* FINAL PRICE CHECK before any money can be involved. */
  if (priced.total !== session.total) {
    session.total = priced.total;
    session.unitPrice = priced.unitPrice;
    await session.save();
    return {
      kind: 'redirect', status: 303,
      location: mpath(req, `/checkout/${token}`) + '?repriced=1',
    };
  }

  /* Mint the payment destination through the SAME function a first-time
     buyer goes through, so the pooled email, the bundle plan and the token
     are resolved in exactly one place. */
  let payment = null;
  try {
    const frontend = require('./frontend');
    /* The whole buyer, not just the email. The payment page prefills Whop's
       billing form from these, so the customer is not asked a second time
       for the address they just gave us. Carried as signed claims — never
       as query parameters. */
    payment = await frontend.resolvePartnerRedirect(session.productSlug, session.quantity, {
      market: session.market,
      checkoutId: session.checkoutId,
      email: session.email,
      firstName: session.firstName,
      lastName: session.lastName,
      address1: session.address1,
      address2: session.address2,
      city: session.city,
      state: session.state,
      postalCode: session.postalCode,
      country: session.country,
    });
  } catch (err) {
    console.error('[checkout/payment] partner resolve failed:', err.message);
  }

  if (!payment || !payment.url) {
    return {
      kind: 'unavailable',
      info: { reason: 'payment_unavailable', product: priced.product },
    };
  }

  const url = new URL(payment.url);
  /* NOT the session token. The order is tied back by zcid, which is
     already signed into the thank-you payload, so putting a bearer token
     for this checkout on another domain would buy nothing and risk it
     leaking through a referrer or an access log.

     There is no longer a `step=2` flag either. The payment page has only
     one behaviour now, so there is nothing for a flag to select — and one
     fewer parameter is one fewer thing in the customer's address bar. */
  if (session.checkoutId) url.searchParams.set('zcid', session.checkoutId);

  /* A rehearsal. The payment page shows a labelled test panel instead of
     the card form, and no card is charged. The flag only changes what that
     page DISPLAYS — whether the resulting order counts as a test is decided
     here, from session.isTest, and re-checked when the order is created, so
     appending this to a URL by hand achieves nothing. */
  if (session.isTest) url.searchParams.set('ztest', '1');

  await sessionService.markHandedOff(session, {
    url: url.toString(),
    host: url.host,
  });

  /* EMBEDDED, where the partner host supports it.
   *
   * The redirect below hands the customer to another domain. They are on
   * gogetcards.com looking at a booster box, they press "Continue to secure
   * payment", and the address bar changes to a company they have never
   * heard of — which then asks for a card. Checking the address bar before
   * typing a card number is the one habit every bank and every browser has
   * spent a decade teaching, and this arrangement fails it at exactly that
   * moment. Twenty-two of the twenty-three people who reached a working
   * payment form did not use it.
   *
   * So where the partner can serve it framed, the payment step is shown
   * INSIDE this page rather than replacing it. Nothing about the payment
   * moves: Whop is still embedded by the partner, on the partner's own
   * domain, on that business's own service page, under that business's own
   * account. Their page is displayed within ours instead of instead of ours.
   *
   * NOTHING IS HIDDEN. No proxy, no rewriting, no masking. The frame's src
   * is the partner's real URL, visible in the page source and the network
   * panel, and location.ancestorOrigins names this site to anything inside
   * the frame that cares to look.
   *
   * A host not on the embed list, or a frame that never paints, falls
   * through to the redirect that has always run. */
  /* noembed=1 is the frame's own escape hatch coming back to us (see
     fallbackUrl below). Honouring it is what turns a failed embed into a
     working plain checkout instead of a loop. */
  const mode = req.query.noembed === '1' ? '' : embedCheckout.modeFor(url.toString());
  if (mode) {
    /* THE FRAME'S URL CARRIES NOTHING.
     *
     * The token used to ride in the frame's src. That put it in this page's
     * HTML, in the partner's access-log line for that request, and — for the
     * moment before the page strips it — in the document URL that Whop's own
     * iframe inherits as its referrer. The page won that race every time,
     * but a race that must be won on every page load is not a design.
     *
     * So the frame navigates by form POST to a bare path with no query
     * string whatsoever, and the token travels in the body: not logged, not
     * in an address bar, not in any referrer, not in this page's source.
     * Everything else the partner needs is already inside the signed token
     * as claims, so nothing else has to be in the URL either. */
    const bare = new URL(url.toString());
    const carried = {};
    /* ztest is the one thing that is NOT a claim — it decides what the
       partner page DISPLAYS, and whether the resulting order counts as a
       rehearsal is settled on this server regardless. It moves to the body
       with the token rather than staying in the URL. */
    if (bare.searchParams.get('ztest')) carried.ztest = bare.searchParams.get('ztest');
    bare.search = '';

    return { kind: 'embed', ctx: {
      priced,
      token,
      mode,
      /* This page's own origin, stated to the partner rather than left to be
         inferred from a Referer header the visitor's browser may not send. */
      selfOrigin: site.origin(),
      /* Where the frame or window POSTs to. No query string. */
      paymentAction: bare.toString(),
      partnerOrigin: bare.origin,
      /* The one-time token the partner will verify, delivered in the body. */
      partnerToken: payment.token || '',
      partnerTokenParam: payment.tokenParam || 't',
      carried,
      /* The plain redirect, for the automatic escape when the frame never
         greets us, and for a browser that refuses to open the window. Byte
         for byte where a customer goes today. */
      /* BACK THROUGH THIS ROUTE, not straight at the partner.
       *
       * The obvious fallback — the partner URL we just built — is a trap.
       * Its token is ONE-TIME and the frame has already spent it by the time
       * anything goes wrong, so following it lands the customer on the
       * partner's ordinary marketing page. Not a degraded checkout: a
       * coaching site, with no way to pay and no explanation. Confirmed
       * against a real server, and it is what referrer-suppressed visitors
       * have been getting all along.
       *
       * Coming back here re-runs the session, re-prices, and mints a FRESH
       * token, so the fallback is a working checkout rather than a dead
       * link. noembed=1 stops it choosing the frame a second time and
       * looping. */
      fallbackUrl: `/checkout/${token}/payment?noembed=1`,
    } };
  }

  /* Straight through. The interstitial that used to sit here told the
     customer something the payment page says better and cost them a click
     to read it — and a checkout's job is to remove steps, not add a page
     that only announces the next one.

     This is still not a hidden redirect: it happens because the customer
     pressed "Continue to secure payment", the destination is a normal 302
     to a URL anything can follow, and nothing about it varies by who is
     asking. */
  return { kind: 'redirect', status: 302, location: url.toString() };
}

/* ─────────────── Step 2 handoff, the classic page route ─────────────── */

router.get('/checkout/:token/payment', tokenLimiter, async (req, res, next) => {
  const token = req.params.token;
  if (!TOKEN_SHAPE.test(token)) return next();
  privatePage(res);

  const session = await CheckoutSession.resolve(token);
  if (!session) return renderExpired(res);
  if (session.isComplete()) return renderComplete(res, session);

  /* Step 1 must actually be done. Somebody who types this URL is sent
     back to fill the form in rather than shown a dead payment page. */
  if (!session.email || session.status === 'step1_active') {
    return res.redirect(303, mpath(req, `/checkout/${token}`));
  }

  /* The whole payment decision lives in preparePayment, shared with the
     progressive single-page flow. This route just draws the result as a
     full page — byte for byte what it rendered before the extraction. */
  const outcome = await preparePayment(req, session, token);
  switch (outcome.kind) {
    case 'redirect':    return res.redirect(outcome.status, outcome.location);
    case 'unavailable': return renderUnavailable(res, outcome.info);
    case 'embed':       return renderStep2Embedded(res, outcome.ctx);
    default:            return renderUnavailable(res, { reason: 'payment_unavailable' });
  }
});

/* ─────────────── Step 2 handoff, the progressive single-page flow ─────────────── */

/**
 * The single-page checkout's payment reveal, as JSON.
 *
 * Same journey as POST /checkout/:token followed by GET
 * /checkout/:token/payment, collapsed into one request the page makes with
 * fetch() so the payment step can appear INLINE, below the information the
 * customer just filled in, without a second page load. It runs the exact
 * same helpers — completeStep1, applyStep1Complete, preparePayment — so the
 * backend behaviour, the validation, the pricing, the token and the handoff
 * are identical to the classic flow. Only the transport differs.
 *
 * NO-JAVASCRIPT PATH IS UNAFFECTED. The form on the page still posts to
 * POST /checkout/:token and still lands on GET /checkout/:token/payment;
 * this endpoint is only ever reached by the page's own script.
 */
router.post('/checkout/:token/prepare', tokenLimiter, express.urlencoded({ extended: true }), async (req, res, next) => {
  const token = req.params.token;
  if (!TOKEN_SHAPE.test(token)) return next();
  privatePage(res);
  res.set('Content-Type', 'application/json; charset=utf-8');

  const session = await CheckoutSession.resolve(token);
  if (!session) return res.status(410).json({ ok: false, kind: 'expired' });
  if (session.isComplete()) {
    return res.json({ ok: false, kind: 'navigate', location: mpath(req, `/checkout/${token}`) });
  }

  /* Validate + save + re-price — the very same call the classic POST makes. */
  const result = await sessionService.completeStep1(session, req.body);

  if (!result.ok) {
    if (result.reason === 'invalid') {
      /* The page renders these inline against the fields, exactly as the
         server-rendered error page does for the no-JS flow. */
      return res.json({ ok: false, kind: 'invalid', errors: result.errors, values: result.values });
    }
    if (result.reason === 'price_changed') {
      /* The total moved while they were typing. A currency/amount change
         must be re-shown and re-accepted, so send them back to a full
         reload that presents the new figure with a notice. */
      return res.json({ ok: false, kind: 'navigate', location: mpath(req, `/checkout/${token}`) + '?repriced=1' });
    }
    /* Sold out, no bundle plan, unavailable — the full page says this best
       (it can offer a successor product). Reload the information URL, which
       re-prices and renders the right message. */
    return res.json({ ok: false, kind: 'navigate', location: mpath(req, `/checkout/${token}`) });
  }

  /* The same side effects the classic POST runs on a completed Step 1. */
  const wantsTest = testOrder.isTestEmail(session.email) && testOrder.isAllowed(req);
  await applyStep1Complete(req, session, result);

  /* Mint the payment destination. Identical decision to GET .../payment. */
  const outcome = await preparePayment(req, session, token);

  if (outcome.kind === 'redirect') {
    /* Moved market, repriced, or a partner host we cannot frame: all of
       these are full-page transitions in the classic flow, so the page
       navigates to them rather than trying to reveal payment inline. */
    return res.json({ ok: false, kind: 'navigate', location: outcome.location });
  }
  if (outcome.kind === 'unavailable') {
    /* Let the full payment page render the unavailable/sold-out screen. */
    return res.json({ ok: false, kind: 'navigate', location: mpath(req, `/checkout/${token}/payment`) });
  }

  /* outcome.kind === 'embed': hand the page everything it needs to draw the
     partner payment step inline, with the same postMessage handshake the
     step-2 page uses. The token travels in the POST body the page builds,
     never in a URL — same rule as the classic embed. */
  const ctx = outcome.ctx;
  const money = moneyFor(ctx);
  return res.json({
    ok: true,
    kind: 'embed',
    mode: ctx.mode,
    selfOrigin: ctx.selfOrigin,
    paymentAction: ctx.paymentAction,
    partnerOrigin: ctx.partnerOrigin,
    partnerToken: ctx.partnerToken,
    partnerTokenParam: ctx.partnerTokenParam,
    carried: ctx.carried || {},
    fallbackUrl: ctx.fallbackUrl,
    /* For the button label in window mode and the confirmed-total line. */
    total: ctx.priced.total,
    totalLabel: money(ctx.priced.total),
    currency: ctx.priced.currency,
    testMode: !!wantsTest,
  });
});

/* ─────────────── render helpers ─────────────── */

/**
 * Money for a checkout page, in the currency that checkout will charge.
 *
 * Both step renderers hardcoded a dollar sign and an en-US locale. A buyer
 * who came in through /uk read pounds on the product page, pounds in the
 * cart, and then dollars on the two screens where they decide whether to
 * pay — quoting a number that is not the one the plan charges, on the page
 * that takes the money.
 *
 * Taken from the priced result rather than the request, because that is
 * the same object the plan id is resolved from: the figure on screen and
 * the figure charged cannot diverge if they are read off one value. The
 * session's market is the fallback, and USD only if neither says
 * otherwise.
 */
function moneyFor(ctx) {
  const fromPrice = ctx && ctx.priced && ctx.priced.currency;
  const fromSession = ctx && ctx.session && markets.byId(ctx.session.market);
  const currency = fromPrice || (fromSession && fromSession.currency) || 'USD';
  return (cents) => markets.format(cents, currency);
}

function renderStep1(res, ctx) {
  /* The single progressive page: the information form AND the payment step
     in one document. With JavaScript off it posts to the classic two-step
     endpoint and reaches the standalone payment page unchanged, so this
     render is a superset of the old step-1 — same context, same fields. */
  return res.render('pages/checkout-token-single', {
    pageTitle: 'Complete your order | GoGetCards',
    layout: false,
    notice: null,
    /* Only ever true for somebody already signed into /admin, so it tells a
       stranger nothing — which matters, because a message that appeared for
       a non-admin would confirm the address means something. For an admin it
       answers the question that is otherwise unanswerable until the payment
       step: did the test mode take, or am I about to be charged? */
    testMode: false,
    ...ctx,
    money: moneyFor(ctx),
  });
}

/**
 * The payment step, shown inside this page.
 *
 * Deliberately thin: everything that decides WHETHER a payment may happen —
 * the session, the final price check, the plan resolution, the handoff
 * record — has already run in the route above and is untouched. This only
 * decides where the resulting page is drawn.
 */
function renderStep2Embedded(res, ctx) {
  return res.render('pages/checkout-token-step2', {
    pageTitle: 'Secure payment | GoGetCards',
    layout: false,
    ...ctx,
    money: moneyFor(ctx),
  });
}

function renderExpired(res) {
  return res.status(410).render('pages/checkout-token-message', {
    pageTitle: 'Checkout expired | GoGetCards',
    layout: false,
    heading: 'This checkout has expired',
    message: 'Checkout links stay active for a few days. Nothing was charged, and the product is still available to order.',
    ctaHref: '/',
    ctaLabel: 'Browse the store',
  });
}

function renderComplete(res, session) {
  return res.render('pages/checkout-token-message', {
    pageTitle: 'Order complete | GoGetCards',
    layout: false,
    heading: 'Your order has already been completed',
    message: 'This checkout was paid for, so there is nothing left to do here. You will not be charged twice.',
    ctaHref: session.orderId ? '/account/orders' : '/account',
    ctaLabel: 'View your order',
  });
}

function renderUnavailable(res, info) {
  const messages = {
    unavailable: 'This product can no longer be ordered.',
    not_found: 'This product is no longer in our catalogue.',
    no_bundle_plan: 'That quantity is not available to order right now. Try a different quantity from the product page.',
    payment_unavailable: 'Our payment step is temporarily unavailable. Nothing was charged. Please try again shortly.',
  };

  /* ── Sold out, told here ──────────────────────────────────────────────
     A held product (Product.stockHold) reaches this page having already
     taken the buyer's name, address and email, so the copy owes them two
     things: that nothing was charged, and somewhere to go that is not the
     page that just wasted their time.

     THE CTA POINTS AT THE SUCCESSOR, NOT BACK AT THE PRODUCT. Sending
     them back would land them on a page still advertising the item as
     available, whose Buy button walks them through the same form to the
     same refusal. */
  if (info.reason === 'sold_out') {
    const p = info.product || {};
    const a = info.replacement;
    /* FLATTENED HERE, NOT IN THE TEMPLATE. The view shows a badge for
       every one of these and must not have to decide what counts as
       real: `stock` is null unless a figure was actually entered, so an
       unset inventory renders no scarcity line at all rather than a
       number nobody chose. Same rule the product page's stock meter
       already follows. */
    const preorderCfg = require('../config/preorder');
    const rel = a ? preorderCfg.releaseInfo(a) : null;
    return res.status(409).render('pages/checkout-sold-out', {
      layout: false,
      pageTitle: 'Sold out | GoGetCards',
      gone: {
        title: p.title || 'This item',
        image: p.imageUrl || (p.images || [])[0] || '',
      },
      alt: a ? {
        slug: a.slug,
        title: a.title,
        image: a.imageUrl || (a.images || [])[0] || '',
        /* PRICED IN THE STOREFRONT THE BUYER IS STANDING IN. This page is
           reached mid-checkout, so quoting the base currency here would
           show a shopper who has been reading pounds all session a dollar
           figure for the replacement, on the one screen asking them to
           commit to it. altPriced is null when the successor is not sold
           in this market, and the view then offers it without a price
           rather than inventing one. */
        ...(function () {
          const priced = typeof res.locals.marketPrice === 'function'
            ? res.locals.marketPrice(a) : null;
          return priced
            ? { price: priced.amount, comparePrice: priced.compareAmount || 0, currency: priced.currency }
            : { price: 0, comparePrice: 0, currency: '' };
        })(),
        stock: typeof a.stock === 'number' && a.stock > 0 ? a.stock : 0,
        limit: a.allocationLimit || 0,
        isPreorder: !!a.preorder,
        release: rel && rel.hasDate ? rel.display : '',
      } : null,
    });
  }

  return res.status(409).render('pages/checkout-token-message', {
    pageTitle: 'Checkout unavailable | GoGetCards',
    layout: false,
    heading: 'This checkout cannot be completed',
    message: messages[info.reason] || 'Something changed with this order. Nothing was charged.',
    ctaHref: info.product && info.product.slug ? `/products/${info.product.slug}` : '/',
    ctaLabel: info.product && info.product.slug ? 'Back to the product' : 'Browse the store',
  });
}

module.exports = router;
