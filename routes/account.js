/**
 * The customer portal.
 *
 * AUTHORISATION IS STRUCTURAL, NOT CONDITIONAL. Nothing in here takes an
 * identifier from the browser and looks it up. Every read goes through
 * services/customerOrders, whose queries are scoped to the authenticated
 * customer's own email — so a reference belonging to somebody else does
 * not fail a permission check, it simply does not match. There is no `if`
 * to forget.
 *
 * NOTHING IS INDEXED. Every response carries noindex/nofollow and
 * no-store, because these pages contain names, addresses and purchase
 * history, and a cached account page on a shared machine is a leak that
 * needs no attacker.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

/* The magic-link sign-in sends an email for every POST. Without a limit it
   is an email-bombing tool (flood any address) and a cost/deliverability
   risk for the sending domain. Cap attempts per IP. */
const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many sign-in requests. Please wait a few minutes and try again.',
});

const Customer = require('../models/Customer');
const CustomerSession = require('../models/CustomerSession');
const Order = require('../models/Order');
const Product = require('../models/Product');

const customerAuth = require('../services/customerAuth');
const customerOrders = require('../services/customerOrders');
const { requireCustomer } = require('../middleware/customer');
const mail = require('../services/mail');
const lifecycle = require('../services/mail/lifecycle');
const site = require('../config/site');

/**
 * Private by default.
 *
 * Applied to the whole router rather than per-route: a new page added
 * below is private the moment it exists, instead of being private once
 * somebody remembers. Search engines are told not to index, and caches are
 * told not to keep it.
 */
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  /* `robotsOverride` is the name views/layout.ejs actually reads. The
     header is belt and braces: a crawler that never parses the HTML still
     gets told, and a page rendered outside this router still gets the meta
     tag from its own locals. */
  res.locals.robotsOverride = 'noindex, nofollow';
  next();
});

const page = (extra = {}) => ({
  metaDescription: '',
  robotsOverride: 'noindex, nofollow',
  ...extra,
});

/* ── Sign in ───────────────────────────────────────────── */

router.get('/sign-in', (req, res) => {
  if (req.customer) return res.redirect(customerAuth.safeRedirect(req.query.next || '/account'));
  res.render('pages/account-signin', page({
    pageTitle: 'Sign in | GoGetCards',
    sent: false, formError: '', email: '',
    redirectTo: customerAuth.safeRedirect(req.query.next || '/account'),
  }));
});

/**
 * Issues a sign-in link.
 *
 * ALWAYS REPORTS THE SAME THING, whether or not the address is known. A
 * form that says "no account found" is an account-enumeration oracle: it
 * lets anybody test whether a given person shops here, which for a store
 * selling four-figure collectables is worth knowing to the wrong people.
 */
router.post('/sign-in', signInLimiter, express.urlencoded({ extended: false, limit: '8kb' }), async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim();
  const redirectTo = customerAuth.safeRedirect((req.body && req.body.next) || '/account');

  const render = (extra) => res.render('pages/account-signin', page({
    pageTitle: 'Sign in | GoGetCards', email, redirectTo, sent: false, formError: '', ...extra,
  }));

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return render({ formError: 'That does not look like an email address.' });
  }

  try {
    const issued = await customerAuth.issueMagicLink(email, { redirectTo, req, withId: true });
    if (issued) {
      const { token, id: linkId } = issued;
      const url = `${site.origin()}/account/open/${token}`;
      const result = await mail.send('accountAccess', {
        to: email,
        /* So the log can show whether they actually came back. No pixel:
           the link IS the signal, and it is a real person clicking. */
        linkId,
        data: {
          accessUrl: url,
          expiresMinutes: Math.round(customerAuth.MAGIC_LINK_TTL_MS / 60000),
        },
      });
      /* Without a transport the link cannot be delivered. It is printed
         for a developer OUTSIDE PRODUCTION ONLY and never rendered to
         the browser: showing it would hand a session for that address to
         whoever typed it into the form. The EmailLog row records the
         attempt either way, so a missing sign-in email is diagnosable
         from /admin/emails rather than from server logs nobody reads. */
      if (!result.ok && process.env.NODE_ENV !== 'production') {
        console.log(`[account] sign-in link for ${email}: ${url}`);
      }
    }
  } catch (err) {
    console.error('[account] magic link failed:', err.message);
  }

  return render({ sent: true });
});

/**
 * Opening an emailed link.
 *
 * THE GET DOES NOT CONSUME THE TOKEN, and that is the whole point of
 * this route existing separately.
 *
 * A single-use link sent by email is opened by machines before it is
 * opened by a person. Outlook's Safe Links, Gmail's scanners, Proofpoint,
 * Mimecast and half a dozen corporate filters fetch every URL in every
 * message to see where it goes. If arriving at the URL burns the token,
 * the customer clicks their own confirmation email and is told the link
 * has already been used — by us, on their behalf, seconds after we sent
 * it. That is not a hypothetical; it is the standard failure of emailed
 * magic links and the reason so many of them feel broken.
 *
 * So: GET renders a page with one button, and the POST behind that
 * button is what spends the token. Scanners issue GET and HEAD, not
 * form posts, so they see the page and leave the link intact. The cost
 * is one deliberate click, which also means a link opened by somebody
 * looking over a shoulder does not silently sign them in.
 */
router.get('/open/:token', async (req, res) => {
  /* Nothing is looked up here beyond whether the token could plausibly
     be one. Telling a scanner "expired" versus "unknown" would leak
     which tokens exist, and there is no reason to answer that at all
     before somebody presses the button. */
  res.render('pages/account-open', page({
    pageTitle: 'Open your account | GoGetCards',
    token: String(req.params.token || ''),
    formError: '',
  }));
});

router.post('/open/:token', async (req, res) => {
  const result = await customerAuth.consumeMagicLink(req.params.token, res, { req });
  if (result.ok) return res.redirect(result.redirectTo);

  const messages = {
    used: 'That link has already been used. Links work once, for safety. Enter your email below and we will send a fresh one.',
    expired: 'That link has expired. Enter your email below and we will send a fresh one.',
    unknown: 'That link is not valid. Enter your email below and we will send a fresh one.',
    closed: 'That account is closed. Contact support if you think that is wrong.',
    missing: 'That link is not valid. Enter your email below and we will send a fresh one.',
  };
  res.status(400).render('pages/account-signin', page({
    pageTitle: 'Sign in | GoGetCards',
    sent: false, email: '', redirectTo: '/account',
    formError: messages[result.reason] || messages.unknown,
  }));
});

/* The old path, kept working. Links already sitting in inboxes point
   here, and a customer opening one in three weeks should land on the
   button rather than on a 404. Redirects rather than consuming, so the
   prefetch protection above applies to those too. */
router.get('/sign-in/:token', (req, res) => {
  res.redirect(302, '/account/open/' + encodeURIComponent(req.params.token));
});

router.post('/sign-out', async (req, res) => {
  await customerAuth.endSession(req, res);
  res.redirect('/');
});

router.post('/sign-out-all', requireCustomer, async (req, res) => {
  await customerAuth.endAllSessions(req.customer._id, res);
  res.redirect('/');
});

/* ── Overview ──────────────────────────────────────────── */

router.get('/', requireCustomer, async (req, res, next) => {
  try {
    const { all, counts, totalSpend } = await customerOrders.ordersForCustomer(req.customer);
    const preorders = all.filter((d) => d.isPreorder && !d.order.cancelledAt).slice(0, 3);
    const recent = all.slice(0, 4);

    res.render('pages/account', page({
      pageTitle: 'My account | GoGetCards',
      customerDoc: req.customer,
      counts, totalSpend, preorders, recent,
      recommendations: await recommendationsFor(req.customer, all),
      section: 'overview',
    }));
  } catch (err) { next(err); }
});

/* ── Orders ────────────────────────────────────────────── */

router.get('/orders', requireCustomer, async (req, res, next) => {
  try {
    const filter = String(req.query.filter || 'all');
    const { shown, counts } = await customerOrders.ordersForCustomer(req.customer, { filter });
    res.render('pages/account-orders', page({
      pageTitle: 'My orders | GoGetCards',
      customerDoc: req.customer,
      orders: shown, counts, filter, section: 'orders',
      /* Set by the reorder route when the product has gone. */
      unavailable: req.query.unavailable === '1',
    }));
  } catch (err) { next(err); }
});

router.get('/orders/:ref', requireCustomer, async (req, res, next) => {
  try {
    const found = await customerOrders.findOwnedOrder(req.customer, req.params.ref);
    /* Not found and not yours are the same response on purpose. A 403 on
       somebody else's reference confirms it exists. */
    if (!found) return res.status(404).render('pages/account-missing', page({
      pageTitle: 'Order not found | GoGetCards',
      customerDoc: req.customer, section: 'orders',
    }));

    res.render('pages/account-order', page({
      pageTitle: `Order ${found.reference} | GoGetCards`,
      customerDoc: req.customer, o: found, section: 'orders',
      justCancelled: req.query.cancelled === '1',
    }));
  } catch (err) { next(err); }
});

/* ── Cancellation ──────────────────────────────────────── */

router.get('/orders/:ref/cancel', requireCustomer, async (req, res, next) => {
  try {
    const found = await customerOrders.findOwnedOrder(req.customer, req.params.ref);
    if (!found) return res.redirect('/account/orders');
    if (!found.cancellable.can) return res.redirect(`/account/orders/${found.reference}`);

    res.render('pages/account-cancel', page({
      pageTitle: `Cancel order ${found.reference} | GoGetCards`,
      customerDoc: req.customer, o: found, section: 'orders', formError: '',
    }));
  } catch (err) { next(err); }
});

/**
 * Performs the cancellation.
 *
 * EVERY CONDITION IS RE-CHECKED HERE. The confirmation page having shown a
 * button proves nothing: the order may have shipped in the meantime, the
 * page may have been left open for a day, or the POST may not have come
 * from that page at all. Ownership, existence and eligibility are all
 * established again from the database before anything is written.
 *
 * NO REFUND IS INITIATED. Refunds are issued by hand in the payment
 * provider; this records that one is owed and says so honestly. Claiming
 * money had been sent when nothing had been triggered would be the single
 * most damaging lie this page could tell.
 */
router.post('/orders/:ref/cancel', requireCustomer,
  express.urlencoded({ extended: false, limit: '8kb' }), async (req, res, next) => {
    try {
      const found = await customerOrders.findOwnedOrder(req.customer, req.params.ref);
      if (!found) return res.status(404).redirect('/account/orders');

      if (!found.cancellable.can) {
        return res.status(409).render('pages/account-cancel', page({
          pageTitle: `Cancel order ${found.reference} | GoGetCards`,
          customerDoc: req.customer, o: found, section: 'orders',
          formError: found.cancellable.reason,
        }));
      }

      const now = new Date();
      /* Guarded update. The filter repeats the eligibility rules so a
         concurrent shipment between the check above and this write cannot
         produce a cancelled order that is already in a van. */
      const updated = await Order.findOneAndUpdate(
        {
          _id: found.order._id,
          cancelledAt: null,
          fulfillmentStatus: { $nin: ['shipped', 'delivered'] },
        },
        {
          $set: {
            cancelledAt: now,
            cancellationRequestedAt: found.order.cancellationRequestedAt || now,
            cancelledBy: 'customer',
            cancellationReason: String((req.body && req.body.reason) || '').slice(0, 200),
            /* 'processing' means "we owe you this and it is queued for a
               human", not "the provider has been called". */
            refundStatus: 'processing',
            refundInitiatedAt: now,
            refundAmount: found.order.totalPrice || 0,
            status: 'cancelled',
          },
        },
        { new: true }
      );

      if (!updated) {
        const fresh = await customerOrders.findOwnedOrder(req.customer, req.params.ref);
        return res.status(409).render('pages/account-cancel', page({
          pageTitle: 'Cancel order | GoGetCards',
          customerDoc: req.customer, o: fresh || found, section: 'orders',
          formError: 'This order changed while you were on this page and can no longer be cancelled.',
        }));
      }

      console.log(`[account] order ${found.reference} cancelled by customer — refund of `
        + `${(updated.refundAmount / 100).toFixed(2)} ${updated.currency} owed, to be issued manually.`);

      /* Written confirmation of the cancellation, sent without being
         waited on. The customer already has the on-screen confirmation;
         this is the copy they can find again in three weeks when they
         are wondering where their money is, and it states the refund as
         QUEUED rather than issued, because that is what just happened. */
      lifecycle.cancellation(updated).catch(() => {});

      res.redirect(`/account/orders/${found.reference}?cancelled=1`);
    } catch (err) { next(err); }
  });

/* ── Reinstatement ─────────────────────────────────────── */

/**
 * Everything of this customer's, for one product, that can still be put
 * back. The page the "Keep my order" email button lands on.
 *
 * Listed rather than acted on: a GET must not reinstate anything, and a
 * customer with two cancelled orders may want one back and not the other.
 * Orders that cannot be reinstated are shown with the reason, so somebody
 * arriving after the deadline sees why rather than an empty page.
 */
router.get('/reinstate/:slug', requireCustomer, async (req, res, next) => {
  try {
    const slug = String(req.params.slug || '');
    const all = (await customerOrders.ordersForCustomer(req.customer, { limit: 200 })).all;
    /* Cancelled orders for this set, plus the one just reinstated so the
       confirmation lands on a page that still shows what was kept. */
    const mine = all.filter((d) => d.order.productSlug === slug
      && (d.order.cancelledAt || (d.order.reinstatedAt && req.query.kept === '1')));
    const product = mine.length ? mine[0].product : await Product.findOne({ slug }).lean();

    res.render('pages/account-reinstate', page({
      pageTitle: 'Keep my order | GoGetCards',
      customerDoc: req.customer, section: 'orders',
      product, slug, rows: mine,
      kept: req.query.kept === '1',
      refusedReason: String(req.query.refused || '').slice(0, 200),
      formError: '',
    }));
  } catch (err) { next(err); }
});

/**
 * Puts one cancelled order back.
 *
 * THE MONEY DOES NOT MOVE, IN EITHER DIRECTION. The customer paid when
 * they ordered; the refund was queued for a human and never issued; this
 * withdraws the queue entry. Nothing is charged and nothing is returned,
 * and the page and the email both say so in those words.
 *
 * EVERY CONDITION IS RE-CHECKED IN THE WRITE. The filter repeats
 * reinstatability() so a refund issued, or a deadline passed, between the
 * page render and this POST cannot produce an order that is both refunded
 * and live. The deadline is compared at the instant of the write.
 */
router.post('/orders/:ref/keep', requireCustomer,
  express.urlencoded({ extended: false, limit: '8kb' }), async (req, res, next) => {
    try {
      const found = await customerOrders.findOwnedOrder(req.customer, req.params.ref);
      if (!found) return res.status(404).redirect('/account/orders');
      const back = `/account/reinstate/${encodeURIComponent(found.order.productSlug || '')}`;

      if (!found.reinstatable.can) {
        return res.status(409).redirect(`${back}?refused=${encodeURIComponent(found.reinstatable.reason)}`);
      }

      const now = new Date();
      const updated = await Order.findOneAndUpdate(
        {
          _id: found.order._id,
          cancelledAt: { $ne: null },
          refundStatus: 'processing',
          fulfillmentStatus: { $nin: ['shipped', 'delivered'] },
          reinstateDeadline: { $gte: now },
        },
        {
          $set: {
            cancelledAt: null,
            cancelledBy: '',
            status: 'completed',
            refundStatus: 'none',
            refundInitiatedAt: null,
            refundAmount: 0,
            reinstatedAt: now,
            reinstatedBy: 'customer',
            /* The offer is consumed. The deadline is cleared so the admin
               list stops showing "do not refund yet" on an order that is
               no longer waiting for a refund at all. */
            reinstateDeadline: null,
          },
        },
        { new: true }
      );

      if (!updated) {
        return res.status(409).redirect(`${back}?refused=${encodeURIComponent('This order changed while you were on this page and can no longer be reinstated.')}`);
      }

      console.log(`[account] order ${found.reference} reinstated by customer — queued refund of `
        + `${((found.order.refundAmount || 0) / 100).toFixed(2)} ${updated.currency} withdrawn, nothing charged.`);

      /* Written confirmation, not waited on. Carries the same delivery
         window the offer quoted, read back off the offer's own log row
         so the two emails cannot disagree. */
      deliveryWindowFor(updated).then((deliveryWindow) =>
        lifecycle.reinstated(updated, deliveryWindow ? { deliveryWindow } : {})
      ).catch(() => {});

      res.redirect(`${back}?kept=1`);
    } catch (err) { next(err); }
  });

/** The delivery window the offer email quoted for this order, if any. */
async function deliveryWindowFor(order) {
  try {
    const EmailLog = require('../models/EmailLog');
    const row = await EmailLog.findOne({
      type: 'reinstateOffer', status: 'sent', 'broadcast.orderIds': order.orderId,
    }).sort({ createdAt: -1 }).select('broadcast').lean();
    return row && row.broadcast && row.broadcast.extra && row.broadcast.extra.deliveryWindow || '';
  } catch { return ''; }
}

/* ── Profile ───────────────────────────────────────────── */

router.get('/profile', requireCustomer, (req, res) => {
  res.render('pages/account-profile', page({
    pageTitle: 'Profile | GoGetCards',
    customerDoc: req.customer, section: 'profile', saved: req.query.saved === '1', formError: '',
  }));
});

/**
 * Saves the editable fields.
 *
 * EMAIL IS NOT EDITABLE HERE, and that is the point rather than an
 * omission: the address IS the account identity and the thing sign-in
 * links are sent to, so changing it by typing into a form would let
 * anybody with a borrowed session move an account to their own inbox.
 * Changing it needs a verified link sent to the NEW address, which is a
 * flow of its own; until it exists, support handles it.
 */
router.post('/profile', requireCustomer,
  express.urlencoded({ extended: false, limit: '16kb' }), async (req, res, next) => {
    try {
      const b = req.body || {};
      const clean = (v, max) => String(v || '').trim().slice(0, max);

      await Customer.updateOne({ _id: req.customer._id }, {
        $set: {
          firstName: clean(b.firstName, 60),
          lastName: clean(b.lastName, 60),
          phone: clean(b.phone, 40),
          'address.line1': clean(b.line1, 120),
          'address.line2': clean(b.line2, 120),
          'address.city': clean(b.city, 80),
          'address.region': clean(b.region, 80),
          'address.postalCode': clean(b.postalCode, 24),
          'address.country': clean(b.country, 80),
          marketingOptIn: b.marketingOptIn === 'on',
        },
      });
      res.redirect('/account/profile?saved=1');
    } catch (err) { next(err); }
  });

/* ── Sessions ──────────────────────────────────────────── */

router.get('/security', requireCustomer, async (req, res, next) => {
  try {
    const sessions = await CustomerSession.find({ customer: req.customer._id })
      .sort({ lastUsedAt: -1 }).lean();
    res.render('pages/account-security', page({
      pageTitle: 'Security | GoGetCards',
      customerDoc: req.customer, section: 'security',
      sessions: sessions.map((s) => ({
        ...s,
        current: !!(req.customerSession && String(req.customerSession._id) === String(s._id)),
      })),
    }));
  } catch (err) { next(err); }
});

/* ── Reorder ───────────────────────────────────────────── */

/**
 * Sends the customer back to a product they bought.
 *
 * Checks availability at the moment of the click rather than trusting the
 * button that was rendered minutes ago, so a sold-out or withdrawn line
 * cannot be re-bought from a stale page.
 */
router.get('/reorder/:slug', requireCustomer, async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).select('slug available').lean();
    if (!product || !product.available) return res.redirect('/account/orders?unavailable=1');
    res.redirect(`/products/${product.slug}`);
  } catch (err) { next(err); }
});

/* ── Recommendations ───────────────────────────────────── */

/**
 * A few things worth seeing next.
 *
 * Deliberately shallow. It reads the vendors and types the customer has
 * already bought and offers current stock from the same shelves, excluding
 * what they already own. It does not build a profile, does not persist
 * behavioural data, and never says "because you bought X" — the store
 * knows what it sold; it does not need to perform that back at somebody.
 *
 * Bounded query: a handful of documents with a projection, never the
 * catalogue.
 */
async function recommendationsFor(customer, ownedOrders) {
  try {
    const ownedSlugs = ownedOrders.map((d) => d.order.productSlug).filter(Boolean);
    const vendors = [...new Set(ownedOrders.map((d) => d.product && d.product.vendor).filter(Boolean))];

    const query = {
      available: true,
      slug: { $nin: ownedSlugs },
      ...(vendors.length ? { vendor: { $in: vendors } } : {}),
    };
    let picks = await Product.find(query)
      .select('slug title imageUrl images price comparePrice vendor preorder tags')
      .sort({ featured: -1, createdAt: -1 }).limit(4).lean();

    /* A new customer, or one whose vendors have nothing else in stock,
       gets current product rather than an empty shelf. */
    if (picks.length < 4) {
      const filler = await Product.find({
        available: true,
        slug: { $nin: [...ownedSlugs, ...picks.map((p) => p.slug)] },
      }).select('slug title imageUrl images price comparePrice vendor preorder tags')
        .sort({ featured: -1, createdAt: -1 }).limit(4 - picks.length).lean();
      picks = picks.concat(filler);
    }
    return picks;
  } catch (err) {
    console.error('[account] recommendations failed:', err.message);
    return [];
  }
}

module.exports = router;
