/* ── Post-Purchase Pipeline ───────────────────────────────
   Orchestrates the explicit steps described by the product spec:
   receive redirect params -> validate -> detect source -> normalize
   customer -> create order -> send confirmation email -> notify admin.
   Each step is its own module; this file only sequences them.
*/

const { parseOrderParams } = require('./orderParser');
const { validateOrderParams } = require('./orderValidator');
const { detectSource } = require('./sourceDetector');
const { normalizeCustomer } = require('./customerNormalizer');
const { buildOrderData } = require('./orderModel');
const { createOrRetrieveOrder, markConfirmationEmailSent } = require('./orderService');
/* The confirmation now goes through services/mail, which renders a real
   template, records the attempt in EmailLog and retries. NOTHING ELSE IN
   THIS PIPELINE CHANGED: the same claim still gates it, in the same
   place, so a page refresh still cannot send twice.

   The residual weakness is unchanged too and is worth naming: the claim
   is taken BEFORE the send, so a send that fails is not retried
   automatically. It is now at least recoverable — the failure is a row
   in /admin/emails with a Retry button, where before it was a line on
   stdout and a customer who never heard from us. */
const lifecycle = require('../mail/lifecycle');
const abandonedCheckout = require('../abandonedCheckout');
const { notifyAdminNewOrder } = require('./notificationService');
const metaCapi = require('../metaCapi');
const testOrder = require('../testOrder');
const Event = require('../../models/Event');
const PartnerEmail = require('../../models/PartnerEmail');
const SiteConfig = require('../../models/SiteConfig');
const partnerRotation = require('../partnerRotation');

// Looks back up the checkout_click Event recorded at the original checkout
// click on gogetcards (see routes/frontend.js's trackCheckoutReached), by
// the zcid that rode through the entire Partner Experience round trip
// untouched. Returns null when unresolvable — no zcid on this order (e.g. a
// native Shopify/Stripe order, whose completion is reported from a separate
// cross-domain request with no link back to that click), or no matching
// Event (expired past the Event TTL, or the click was never tracked for
// some reason). Carries both the true traffic-source attribution AND, when
// this checkout went through the Partner Experience broker, which specific
// pooled email was claimed for it — one shared lookup for both.
async function resolveCheckoutClickEvent(raw) {
  if (!raw.zcid) return null;
  try {
    return await Event.findOne({ checkoutId: raw.zcid, type: 'checkout_click' }).lean();
  } catch {
    return null;
  }
}

// Permanently locks the pooled email that was claimed for this checkout, now
// that a real order has confirmed it converted — the whole point being that
// this exact email is permanently linked to this order.
//
// HISTORICAL ONLY. Pooled email is retired — nothing claims an address any
// more — so this fires solely for a checkout that was already in flight
// under the old scheme, or a click Event written before it was removed. It
// is kept because 'converted' is the one status the pool table is
// authoritative for, and it carries the order id: it is what lets somebody
// later ask whose order is sitting under one of our addresses.
//
// Guarded to only ever transition FROM 'used', so it never re-processes an
// already-converted row. Best-effort: a failure here never blocks order
// creation, since the order itself is the thing that matters.
async function convertPooledEmail(pooledEmail, orderId) {
  if (!pooledEmail) return;
  try {
    await PartnerEmail.updateOne(
      { email: pooledEmail.toLowerCase().trim(), status: 'used' },
      { $set: { status: 'converted', convertedOrderId: orderId, convertedAt: new Date() } },
    );
  } catch (err) {
    console.error(`[orderPipeline] Failed to mark pooled email converted for order ${orderId}:`, err.message);
  }
}

/**
 * Hand the next sale of this product to the next partner site, and record
 * that this one sold.
 *
 * READ-MODIFY-WRITE, WHICH IS FINE HERE AND WOULD NOT BE ANYWHERE ELSE. Two
 * orders for the same product landing in the same millisecond could have one
 * advance overwrite the other, costing a single position in a cycle. The
 * alternative is a per-product atomic counter in its own collection, which
 * is a schema, a migration and a second source of truth — for a race that
 * makes one host sell one extra item. The config is a single small document
 * and this runs once per order, so the cost of being wrong is bounded and
 * tiny while the cost of the fix is not.
 *
 * The order count on each site is incremented the same way and is what makes
 * the rotation auditable: a cycle nobody can check is one you have to take
 * on trust, and every way it breaks looks like a working checkout that
 * merely favours one host.
 */
async function advancePartnerRotation(order) {
  const config = await SiteConfig.getValue('partnerExperience', null);
  if (!config || !Array.isArray(config.savedSites) || config.savedSites.length === 0) return;

  /* WHO SERVED IT IS THE CURSOR, not a field on the order. The site that
     took this payment is by definition the one the cursor pointed at when
     the checkout started, because that is the only thing deciding where a
     buyer is sent. A second copy on the order is a thing that can disagree.

     The product is loaded because a site whose price grid cannot carry it is
     skipped at checkout, so the site that actually served may be one along
     from the cursor. */
  /* ASKED IN THE MARKET THE ORDER WAS PLACED IN, which is the whole reason
     the order carries one. Re-deriving the server with no market reads the
     US ladder at the US price — so a site holding a full US ladder and no
     euro one, which the checkout correctly SKIPPED for a euro order, is the
     site this hands the money to. The revenue lands on a host that never
     took it, and the cursor advances from the wrong place, which then hands
     the next order to the wrong site as well. Both are silent: every screen
     shows a working rotation that merely favours one host. */
  const slug = order && order.productSlug;
  let served = null;
  if (slug) {
    const Product = require('../../models/Product');
    const product = await Product.findOne({ slug }).select('slug price marketPrices available').lean();
    if (product) {
      const markets = require('../../config/markets');
      const marketService = require('../market');
      const market = markets.byId(order && order.market) || markets.defaultMarket();
      /* The PER-UNIT price in that market, not order.totalPrice: the grid is
         indexed by units of one, and quantity multiplies the rung. */
      const local = marketService.priceFor(product, market);
      if (local) served = partnerRotation.nextSite(config, product, { amount: local.amount, market: market.id });
    }
  }
  served = served || partnerRotation.cursorSite(config);

  /* GLOBAL, NOT PER PRODUCT. One order anywhere moves the whole system on.
     How far it moves is the salesPerSite setting: at 1 every order hands
     over, which is what this did before the setting existed, and at N a
     site keeps the next N-1 orders before its turn ends. */
  const rotation = partnerRotation.advanceRotation(config, served);
  const nextId = rotation.cursor;

  const savedSites = config.savedSites.map((s) => {
    if (!served || s.id !== served.id) return s;
    const stats = s.stats || {};
    /* Orders AND money. The count alone cannot answer which account is
       carrying the weight once the ladder sells at four different rungs;
       banked per currency, because a sum across them means nothing. */
    return {
      ...s,
      stats: {
        ...stats,
        orders: (stats.orders || 0) + 1,
        lastOrderAt: new Date(),
        revenue: partnerRotation.addRevenue(stats, order.totalPrice, order.currency),
      },
      /* PROOF OF LIFE. This site just took money, so whatever its run of
         unconverted hand-offs had climbed to, its checkout works. The
         counter goes back to zero and any automatic suspension lifts —
         see services/partnerHealth.js for why the run is counted at all.

         Written into the same object as the stats rather than through
         partnerHealth's positional update, because this whole config is
         about to be replaced wholesale a few lines below and a separate
         write would be overwritten by it. */
      health: {
        ...((s && s.health) || {}),
        state: 'ok',
        openHandoffs: 0,
        firstOpenAt: null,
        lastOrderAt: new Date(),
        suspendedAt: null,
        reason: '',
        by: '',
      },
    };
  });

  /* A short log of what happened after each order. Without it the rotation
     is a claim: every way it can go wrong looks like a working checkout that
     merely favours one host, and nobody can tell by looking. */
  const history = partnerRotation.recordHistory(config, {
    at: new Date(),
    orderId: order.orderId || '',
    productSlug: slug || '',
    siteId: served ? served.id : '',
    siteName: served ? (served.name || served.url) : 'unknown',
  });

  await SiteConfig.setValue('partnerExperience', {
    ...config,
    savedSites,
    history,
    /* null means there is nothing to rotate between — one active site, or
       none. Leave the cursor alone rather than writing a null into it. */
    ...(nextId ? { cursor: nextId } : {}),
    /* Written unconditionally, including the zero that ends a turn: leaving
       a stale count behind would cut the next site's turn short by however
       far the last one had got. */
    cursorServed: rotation.cursorServed,
  });
}

async function runThankYouPipeline(query) {
  const raw = parseOrderParams(query);
  const { valid, errors } = validateOrderParams(raw);

  if (!valid) {
    return { ok: false, errors, raw };
  }

  const sourceInfo = detectSource(raw);

  /* THE SHIPPING ADDRESS COMES FROM OUR OWN CHECKOUT, NOT THE PAYLOAD.
   *
   * When the customer went through the two-step checkout, Step 1 collected
   * and stored their details here, on this server, keyed by the same zcid
   * that is signed into this payload. Those stored values win.
   *
   * Two reasons. It is what lets the payment page stop asking for an
   * address it no longer needs to know — the partner host reports that a
   * payment happened, not who the buyer is. And it is strictly safer: the
   * address on the order stops being something a partner host sends us and
   * becomes something only this server ever held.
   *
   * A payload with no matching session — the direct partner flow, or any
   * older link — is used exactly as before. Nothing about the existing
   * path changes. */
  /* Whether this is a rehearsal is decided by OUR OWN record of the
     checkout, never by the payload. See the guard just below for the other
     half of that. */
  let isTestOrder = false;

  if (raw.zcid) {
    try {
      const CheckoutSession = require('../../models/CheckoutSession');
      const cs = await CheckoutSession.findOne({ checkoutId: String(raw.zcid) }).lean();
      if (cs && cs.isTest) isTestOrder = true;
      if (cs && cs.email) {
        raw.email = cs.email;
        raw.first_name = cs.firstName || raw.first_name;
        raw.last_name = cs.lastName || raw.last_name;
        raw.address1 = cs.address1 || raw.address1;
        raw.address2 = cs.address2 || raw.address2;
        raw.city = cs.city || raw.city;
        raw.state = cs.state || raw.state;
        raw.zip = cs.postalCode || raw.zip;
        raw.country = cs.country || raw.country;
        raw.phone = cs.phone || raw.phone;
      }
    } catch (err) {
      /* Fall through to the payload. An order with the address the partner
         sent is far better than no order at all. */
      console.error('[orderPipeline] checkout session lookup failed:', err.message);
    }
  }

  /* THE TEST PANEL CANNOT BE USED TO MANUFACTURE AN ORDER.
     A payment page reporting a test purchase is only believed when this
     server's own record of that checkout says it was one. Otherwise the
     ztest flag was appended to a URL by hand, no card was charged, and
     nothing may be created from it. */
  const claimsTest = raw.store === testOrder.MARKER || String(raw.payment_id || '').startsWith('ztest_');
  if (claimsTest && !isTestOrder) {
    console.warn('[orderPipeline] refused a test purchase with no test checkout behind it:', raw.zcid || '(no zcid)');
    return { ok: false, errors: ['This checkout could not be verified. Nothing was charged.'], raw };
  }

  const customer = normalizeCustomer(raw);
  const clickEvent = await resolveCheckoutClickEvent(raw);
  const trafficSource = (clickEvent && clickEvent.source) || '';
  const orderData = buildOrderData(raw, customer, sourceInfo, trafficSource);
  /* The established marker, not a new flag: Order.originalCheckoutMethod
     is what /admin's revenue queries already exclude on, and what
     testOrder.isTestOrder() already recognises. Forced here rather than
     trusted from the payload so it cannot be dropped in transit. */
  if (isTestOrder) orderData.originalCheckoutMethod = testOrder.MARKER;

  const { order, isNew } = await createOrRetrieveOrder(orderData);

  /* PAYMENT ALWAYS WINS. Close any abandoned-checkout sequence for this
     purchase the moment the order exists, before a single email can go
     out about it.
     
     Keyed on raw.zcid rather than on the address: in pooled-email mode
     order.customerEmail is the POOLED address, while the abandoned
     checkout was captured under the address the customer actually typed,
     so an email-only match would silently never fire. Both are passed,
     and markRecovered closes every live row matching either — a customer
     who abandoned three sessions and then bought must not hear from any
     of them.

     Runs on every call, not just isNew: a refresh costs one indexed
     updateMany that matches nothing, and skipping it would leave a
     sequence live if the first call died between order creation and
     here. */
  try {
    await abandonedCheckout.markRecovered({
      checkoutId: raw.zcid || '',
      email: order.customerEmail || '',
      orderId: order.orderId || '',
      note: 'payment completed',
    });
  } catch (err) {
    console.error('[orderPipeline] Failed to close abandoned checkout:', err.message);
  }

  /* Close the CheckoutSession the same way and for the same reason: the
     customer paid, so the two-step checkout is finished and its token must
     stop opening a payment page. Matched on the zcid this checkout carried
     and, failing that, on the address — the same pair used above, because
     in pooled-email mode order.customerEmail is the POOLED address rather
     than the one the customer typed into Step 1. */
  try {
    const CheckoutSession = require('../../models/CheckoutSession');
    const or = [];
    if (raw.zcid) or.push({ checkoutId: String(raw.zcid) });
    if (order.customerEmail) or.push({ email: String(order.customerEmail).toLowerCase().trim() });
    if (or.length) {
      await CheckoutSession.updateMany(
        { $or: or, status: { $nin: ['paid', 'expired', 'cancelled'] } },
        {
          $set: {
            status: 'paid',
            orderId: order.orderId || '',
            paidAt: new Date(),
            lastActivityAt: new Date(),
          },
        }
      );
    }
  } catch (err) {
    console.error('[orderPipeline] Failed to close checkout session:', err.message);
  }

  // Only the request that actually created the order (or, in a rare race,
  // whichever request wins the atomic flag-flip) sends the email/notifies
  // admin/pushes to Meta/converts the pooled email — a page refresh never
  // re-triggers any of these.
  if (isNew) {
    /* Move the partner rotation on.
     *
     * DELIBERATELY INSIDE isNew, and that is the whole correctness argument.
     * A rotation that advances twice for one payment skips a host entirely;
     * one that advances on a page refresh skips several. isNew is already
     * the flag that stops a refresh sending a second confirmation email, so
     * it is exactly the once-per-order guarantee this needs — and borrowing
     * it means the pipeline has one such guarantee rather than two that can
     * drift apart.
     *
     * Never fatal. The order exists and the customer has paid; failing to
     * advance a cursor means the next sale goes to the same site, which is a
     * fairness problem and not a money problem. */
    try {
      await advancePartnerRotation(order);
    } catch (err) {
      console.error(`[orderPipeline] could not advance the partner rotation for ${order.orderId}:`, err.message);
    }

    if (clickEvent && clickEvent.pooledEmail) {
      await convertPooledEmail(clickEvent.pooledEmail, order.orderId);
    }
    const claimed = await markConfirmationEmailSent(order.orderId);
    if (claimed) {
      try {
        await lifecycle.orderConfirmation(order);
      } catch (err) {
        console.error(`[orderPipeline] Failed to send confirmation email for ${order.orderId}:`, err.message);
      }
      try {
        await notifyAdminNewOrder(order);
      } catch (err) {
        console.error(`[orderPipeline] Failed to notify admin for ${order.orderId}:`, err.message);
      }
      // Automatic server-side Meta CAPI push — ONLY when this order's
      // resolved traffic source is Facebook. Orders from Google, Yahoo,
      // Direct, or unresolved sources never get pushed; the client-side
      // browser pixel on the Thank You page follows the same rule (see
      // views/pages/thank-you.ejs). Never blocks or fails the response —
      // this is a fire-and-forget side effect of a successful order.
      //
      // NEVER FOR A TEST ORDER. The old test flow could not reach here with
      // an attributed source because it withheld the zcid; a test that goes
      // through the partner payment step carries one, so the exclusion has
      // to be stated. Reporting a purchase that did not happen would train
      // the ad platform on a fake conversion.
      if (order.trafficSource === 'Facebook' && !testOrder.isTestOrder(order)) {
        try {
          const result = await metaCapi.sendPurchaseEvent({
            value: order.totalPrice / 100,
            currency: order.currency,
            email: order.customerEmail,
            eventId: order.orderId,
          });
          if (!result.ok) {
            console.error(`[orderPipeline] Meta CAPI push failed for ${order.orderId}:`, result.error);
          }
        } catch (err) {
          console.error(`[orderPipeline] Meta CAPI push threw for ${order.orderId}:`, err.message);
        }
      }
    }
  }

  return { ok: true, order, sourceInfo, isNew };
}

module.exports = { runThankYouPipeline };
