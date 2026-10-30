/**
 * What we sent, what failed, and what every template looks like.
 *
 * TWO SURFACES, ONE PAGE'S WORTH OF CODE:
 *
 *   The LOG answers "did this customer get their confirmation?" — which
 *   before this existed could only be answered by reading stdout on
 *   Render, and only if you happened to still have it. Every attempt is
 *   a row, including the ones that were skipped because the server had
 *   no credentials, which is the state this store was silently in for
 *   its entire life.
 *
 *   The PREVIEW renders every template against the same fixtures the
 *   audit asserts on, so the states a human eyeballs and the states a
 *   script checks cannot drift apart.
 *
 * PREVIEWS SEND NOTHING. They render to the response. The only route
 * here that puts a message on the wire is the deliberate test send, and
 * it goes to an address typed by an admin.
 */

const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/auth');
const retryQueue = require('../services/mail/retryQueue');
const dedupe = require('../services/mail/dedupe');
const EmailLog = require('../models/EmailLog');
const Order = require('../models/Order');
const Product = require('../models/Product');
const mail = require('../services/mail');
const lifecycle = require('../services/mail/lifecycle');
const templates = require('../services/mail/templates');
const samples = require('../services/mail/samples');
const mailCfg = require('../config/mail');
const orderReference = require('../helpers/orderReference');
const customerAuth = require('../services/customerAuth');
const site = require('../config/site');

const PAGE_SIZE = 100;

/* ── The log ───────────────────────────────────────────── */

router.get('/', requireAuth, async (req, res) => {
  try {
    const status = String(req.query.status || 'all');
    const type = String(req.query.type || 'all');
    const q = String(req.query.q || '').trim();

    const filter = {};
    if (status !== 'all') filter.status = status;
    if (type !== 'all') filter.type = type;
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ to: rx }, { orderRef: rx }, { orderId: rx }, { subject: rx }];
    }

    const [rows, counts, opened, sampleCount, transport] = await Promise.all([
      EmailLog.find(filter).sort({ createdAt: -1 }).limit(PAGE_SIZE).lean(),
      EmailLog.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      /* Clicks, not opens. See the note on EmailLog.linkOpenedAt. */
      EmailLog.countDocuments({ linkOpenedAt: { $ne: null } }),
      /* How many rows the Clear button would remove, so the button can
         say the number rather than being a leap of faith. */
      EmailLog.countDocuments({ orderRef: 'SAMPLE' }),
      /* Checked on every page load rather than cached: the reason
         somebody opens this page is usually that email is not arriving,
         and "SMTP is not configured" is the answer often enough that it
         should be the first thing they see. */
      mail.verifyTransport(),
    ]);

    const byStatus = { sent: 0, failed: 0, skipped: 0, pending: 0 };
    counts.forEach((c) => { byStatus[c._id] = c.n; });

    res.render('admin/emails', {
      layout: false,
      pageTitle: 'Email',
      rows, byStatus, opened, sampleCount, status, type, q,
      /* What is still waiting to go out, so the panel shows a live queue
         rather than a button whose effect is invisible. */
      retryQueue: await retryQueue.status(),
      /* How many rows the cleanup would remove. Shown on the button,
         because a destructive action whose confirm dialog cannot name a
         number is not really a confirmation. Counted in the database —
         plan() carries every doomed id back and this runs on every load. */
      duplicates: await dedupe.count(),
      transport,
      from: mailCfg.from(),
      replyTo: mailCfg.REPLY_TO,
      types: templates.keys,
      labels: templates.LABELS,
      sent: req.query.sent || '',
      failed: req.query.failed || '',
      query: req.query,
    });
  } catch (err) {
    console.error('[admin/emails] list failed:', err);
    res.status(500).send('Server Error');
  }
});

/**
 * Sends a logged message again.
 *
 * REBUILT FROM THE ORDER, not replayed from the log. The log stores what
 * was sent, not the data it was made from, and re-sending the old HTML
 * would mail a customer a tracking number we have since corrected. A
 * retry means "tell them what is true now".
 *
 * A fresh access link is minted as part of that, which also fixes the
 * commonest reason for a retry: the first link was spent or has expired.
 */
router.post('/:id/retry', requireAuth, async (req, res) => {
  try {
    const row = await EmailLog.findById(req.params.id).lean();
    if (!row) return res.redirect('/admin/emails');

    if (!row.orderId) {
      /* A sign-in link has no order to rebuild from, and re-issuing one
         unasked would email somebody a session key they did not request.
         Refused with a reason rather than silently doing nothing. */
      return res.redirect('/admin/emails?failed=no_order');
    }

    /* A broadcast message is rebuilt by its own queue, which knows every
       order it covered and what the admin typed. Handed back to it, due
       now, rather than rebuilt here as a single-order email. */
    if (row.broadcast) {
      await EmailLog.updateOne({ _id: row._id }, {
        $set: { status: 'queued', retryDueAt: new Date(), retryClaimedAt: null, retryQueuedBy: 'admin' },
      });
      return res.redirect('/admin/emails?sent=retry');
    }

    const order = await Order.findOne({ orderId: row.orderId });
    if (!order) return res.redirect('/admin/emails?failed=order_gone');

    const ctx = await lifecycle.context(order);
    if (!ctx) return res.redirect('/admin/emails?failed=no_address');

    /* mail.send, not sendOnce: the whole point of pressing Retry is that
       the once-per-order guard has already been satisfied by a row that
       did not actually arrive. */
    const result = await mail.send(row.type, Object.assign({}, ctx, { retryOf: row._id }));
    return res.redirect('/admin/emails?sent=' + (result.ok ? 'retry' : 'retry_failed'));
  } catch (err) {
    console.error('[admin/emails] retry failed:', err);
    res.redirect('/admin/emails?failed=error');
  }
});

/* Queue every retryable failure, spaced out.
 *
 * Deliberately NOT a loop that sends them. A provider outage fails a whole
 * morning of mail at once, and flushing that the instant it recovers is the
 * burst that gets a domain throttled again — the recovery causing the next
 * incident. This only stamps due times; cron/emailRetryQueue.js sends one
 * at a time. See services/mail/retryQueue.js. */
router.post('/retry-all', requireAuth, async (req, res) => {
  try {
    const by = (req.session && req.session.adminUser) || 'admin';
    const r = await retryQueue.enqueueFailed({ by: String(by) });
    const params = new URLSearchParams({
      queued: String(r.queued),
      skippedNoOrder: String(r.skipped.noOrder),
      skippedGone: String(r.skipped.orderGone),
    });
    return res.redirect('/admin/emails?' + params.toString());
  } catch (err) {
    console.error('[admin/emails] retry-all failed:', err);
    res.redirect('/admin/emails?failed=error');
  }
});

/**
 * Bulk actions over checked rows.
 *
 * TWO OF THEM, because "keep only the ones worth sending" has two very
 * different meanings and conflating them would be destructive by default.
 * Dequeue takes a message out of the send queue and leaves the row alone;
 * delete removes the record. Most curation wants the first.
 *
 * A checkbox list arrives as a bare string when one box is ticked and an
 * array when several are, so it is normalised before anything reads it —
 * the single-selection case is the one that silently does nothing if this
 * is got wrong, and it is also the commonest.
 */
function selectedIds(body) {
  const raw = body && body.ids;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  /* Anything that is not a plausible ObjectId is dropped rather than
     handed to Mongo, which would throw on the whole batch and lose the
     valid ids with it. */
  return list
    .map((v) => String(v || '').trim())
    .filter((v) => /^[0-9a-fA-F]{24}$/.test(v))
    .slice(0, 500);
}

const bulkBody = express.urlencoded({ extended: false, limit: '64kb' });

router.post('/bulk/delete', requireAuth, bulkBody, async (req, res) => {
  try {
    const ids = selectedIds(req.body);
    if (!ids.length) return res.redirect('/admin/emails?bulk=none');
    const r = await EmailLog.deleteMany({ _id: { $in: ids } });
    return res.redirect('/admin/emails?bulkDeleted=' + (r.deletedCount || 0));
  } catch (err) {
    console.error('[admin/emails] bulk delete failed:', err);
    res.redirect('/admin/emails?failed=error');
  }
});

/* Take the selected rows out of the queue without touching the rows. The
   gentler half of curating a queue: they stay in the log, still failed,
   still retryable one at a time, they just stop being scheduled. */
router.post('/bulk/dequeue', requireAuth, bulkBody, async (req, res) => {
  try {
    const ids = selectedIds(req.body);
    if (!ids.length) return res.redirect('/admin/emails?bulk=none');
    const r = await EmailLog.updateMany(
      { _id: { $in: ids }, retryDueAt: { $ne: null } },
      { $set: { retryDueAt: null, retryClaimedAt: null, retryQueuedBy: '' } }
    );
    return res.redirect('/admin/emails?bulkDequeued=' + (r.modifiedCount || 0));
  } catch (err) {
    console.error('[admin/emails] bulk dequeue failed:', err);
    res.redirect('/admin/emails?failed=error');
  }
});

/* A bare POST to the bulk form's own action. Reached only if a browser
   submits without a formaction — pressing Enter in a field, say — and it
   must not fall through to something destructive. */
router.post('/bulk', requireAuth, bulkBody, (req, res) => res.redirect('/admin/emails'));

/* Collapse repeat attempts at the same message down to one row.
 *
 * New retries delete the row they replace, so this is for the backlog from
 * before that, and for anything retried by hand. Destructive, so the panel
 * states the count before offering it — see services/mail/dedupe.js for
 * which row of a group survives. */
router.post('/dedupe', requireAuth, async (req, res) => {
  try {
    const r = await dedupe.run();
    return res.redirect(
      `/admin/emails?deduped=${r.removed}&groups=${r.groups}&wasFailed=${r.failedSupersededBySent}`
    );
  } catch (err) {
    console.error('[admin/emails] dedupe failed:', err);
    res.redirect('/admin/emails?failed=error');
  }
});

/* Empty the queue without sending. The escape hatch for "I pressed that
   before fixing the provider" — otherwise the only way to stop it is to
   watch it fail one message every few minutes. */
router.post('/retry-all/clear', requireAuth, async (req, res) => {
  try {
    const r = await retryQueue.clear();
    return res.redirect('/admin/emails?cleared=' + r.cleared);
  } catch (err) {
    console.error('[admin/emails] clear queue failed:', err);
    res.redirect('/admin/emails?failed=error');
  }
});

/**
 * Removes one row from the log.
 *
 * THE ROW IS THE EVIDENCE that a customer was told something, so this is
 * a deliberate act rather than a tidy-up: a deleted confirmation row
 * cannot later answer "did we tell them their order shipped". It exists
 * because test sends and failed experiments otherwise sit in the list
 * forever, and a log nobody trusts to be current is a log nobody reads.
 *
 * The message itself is already gone — this deletes our record of it,
 * not anything in anybody's inbox.
 */
router.post('/:id/delete', requireAuth, async (req, res) => {
  try {
    await EmailLog.deleteOne({ _id: req.params.id });
    res.redirect(back(req, 'deleted'));
  } catch (err) {
    console.error('[admin/emails] delete failed:', err);
    res.redirect('/admin/emails?failed=error');
  }
});

/**
 * Clears the test sends in one go.
 *
 * SCOPED BY WHAT THE ROWS ARE, not by a checkbox: only rows the test
 * button created, which are the ones carrying the SAMPLE reference.
 * A real confirmation cannot be caught by this however it is called,
 * which is the point — the tidy-up button must not be able to erase the
 * record that a customer was told their refund was on its way.
 */
router.post('/purge-tests', requireAuth, async (req, res) => {
  try {
    const result = await EmailLog.deleteMany({ orderRef: 'SAMPLE' });
    res.redirect('/admin/emails?sent=purged_' + (result.deletedCount || 0));
  } catch (err) {
    console.error('[admin/emails] purge failed:', err);
    res.redirect('/admin/emails?failed=error');
  }
});

/** Back to the list, keeping whatever filter was applied. */
function back(req, notice) {
  const referer = String(req.get('Referer') || '');
  if (!referer.includes('/admin/emails')) return '/admin/emails?sent=' + notice;
  const sep = referer.includes('?') ? '&' : '?';
  return `${referer}${sep}sent=${notice}`;
}

/* ── Preview ───────────────────────────────────────────── */

router.get('/preview', requireAuth, (req, res) => {
  res.render('admin/email-preview', {
    layout: false,
    pageTitle: 'Email templates',
    types: templates.keys,
    labels: templates.LABELS,
    cases: Object.fromEntries(templates.keys.map((t) => [t, samples.casesFor(t).map(([l]) => l)])),
  });
});

/**
 * Renders one template into the response.
 *
 * ?as=text serves the plain-text alternative as text/plain, because that
 * part is what a watch, a screen reader and a text-only client show, and
 * an HTML-only preview is how it rots unnoticed.
 */
router.get('/preview/:type', requireAuth, (req, res) => {
  const type = req.params.type;
  if (!templates[type] || typeof templates[type].build !== 'function') {
    return res.status(404).type('text/plain').send('Unknown template. Use: ' + templates.keys.join(', '));
  }
  const data = samples.sample(type, req.query.state);
  if (!data) return res.status(404).type('text/plain').send('No sample data for that template.');

  let out;
  try {
    out = templates[type].build(data);
  } catch (err) {
    return res.status(500).type('text/plain').send('Template threw:\n\n' + err.stack);
  }

  /* Never cached and never indexed: sample data is shaped like a real
     order, and a preview that turns up in a search result looks exactly
     like a leaked confirmation. */
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');

  if (req.query.as === 'text') return res.type('text/plain').send(out.text);
  if (req.query.as === 'subject') return res.type('text/plain').send(out.subject);
  return res.type('text/html').send(out.html);
});

/* ── A real test send ──────────────────────────────────── */

/**
 * Sends one template, with sample data, to an address an admin typed.
 *
 * The only way to answer "does this actually land in Gmail, and what
 * does it look like on a phone" — which no amount of local rendering
 * can. Logged like any other send, so the test appears in the list
 * above with whatever the provider said about it.
 */
router.post('/test', requireAuth, express.urlencoded({ extended: false, limit: '8kb' }), async (req, res) => {
  try {
    const type = String((req.body && req.body.type) || 'orderConfirmation');
    const to = String((req.body && req.body.to) || '').trim();
    const state = String((req.body && req.body.state) || '');

    if (!to.includes('@')) return res.redirect('/admin/emails?failed=bad_address');
    if (!templates[type] || typeof templates[type].build !== 'function') {
      return res.redirect('/admin/emails?failed=bad_type');
    }

    /* A REAL LINK, not the sample one.
       The sample data carries a hardcoded placeholder token, so a test
       email used to arrive with a "View my order" button that went to a
       dead link and could never register as opened. That made the test
       useless for the two things you would test it for: does the button
       work, and does the tracking work. A test now mints a genuine
       single-use link for the address it is sent to, so the whole flow
       is exercised end to end.

       It lands on /account rather than on a specific order, because the
       sample order does not exist. Minting a link for a typed address is
       an admin action and no escalation: an admin can already read every
       customer's orders from the pages next door. */
    let data = samples.sample(type, state);
    let linkId = null;
    try {
      const issued = await customerAuth.issueMagicLink(to, {
        redirectTo: '/account', req, purpose: 'signin',
        ttlMs: customerAuth.MAGIC_LINK_TTL_MS, withId: true,
      });
      if (issued) {
        linkId = issued.id;
        data = Object.assign({}, data, {
          accessUrl: `${site.origin()}/account/open/${issued.token}`,
        });
      }
    } catch (err) {
      console.error('[admin/emails] could not mint a test link:', err.message);
    }

    const result = await mail.send(type, { to, data, linkId, orderRef: 'SAMPLE' });
    return res.redirect('/admin/emails?sent=' + (result.ok ? 'test' : 'test_failed'));
  } catch (err) {
    console.error('[admin/emails] test send failed:', err);
    res.redirect('/admin/emails?failed=error');
  }
});

/* ── Release date update ───────────────────────────────── */

/**
 * Tells every open preorder holder that a release date has moved.
 *
 * THE ONE BROADCAST IN THE WHOLE SYSTEM, and the only email here that is
 * not triggered by something happening to a single order. It is a
 * deliberate admin action rather than a hook on saving a product,
 * because a release date gets corrected, mistyped and re-saved, and
 * every one of those would otherwise mail a hundred people.
 *
 * Cancelled and refunded orders are excluded: somebody who cancelled
 * does not need to hear that the set they no longer own has moved.
 */
router.post('/release-update', requireAuth, express.urlencoded({ extended: false, limit: '16kb' }), async (req, res) => {
  try {
    const slug = String((req.body && req.body.slug) || '').trim();
    const message = String((req.body && req.body.message) || '').slice(0, 600);
    const previousRelease = String((req.body && req.body.previousRelease) || '').slice(0, 60);
    if (!slug) return res.redirect('/admin/emails?failed=no_product');

    const product = await Product.findOne({ slug }).lean();
    if (!product) return res.redirect('/admin/emails?failed=no_product');

    /* QUEUED, NOT SENT. This used to loop over every open order and send
       in sequence — no parallelism, but no pause either, which at a few
       hundred orders is the same burst with a longer tail. It now goes
       through the paced broadcast queue like the release-day emails, one
       message per customer, spaced out. The count reported back is what
       was queued; /admin/preorders shows the run draining. */
    const broadcast = require('../services/mail/broadcast');
    const r = await broadcast.enqueue('releaseUpdate', slug, { previousRelease, message }, { by: 'admin' });

    console.log(`[admin/emails] release update for ${slug}: ${r.queued} queued (${r.orders} orders)`);
    return res.redirect(`/admin/preorders?sent=release_${r.queued}_${r.orders}`);
  } catch (err) {
    console.error('[admin/emails] release update failed:', err);
    res.redirect('/admin/emails?failed=error');
  }
});

/** Preorder products that still have open orders, for the form above. */
router.get('/release-targets', requireAuth, async (req, res) => {
  try {
    const rows = await Order.aggregate([
      { $match: { status: { $nin: ['abandoned', 'cancelled'] }, cancelledAt: null,
        fulfillmentStatus: { $nin: ['shipped', 'delivered'] }, productSlug: { $nin: ['', null] } } },
      { $group: { _id: '$productSlug', orders: { $sum: 1 } } },
      { $sort: { orders: -1 } },
    ]);
    const products = await Product.find({ slug: { $in: rows.map((r) => r._id) }, preorder: true })
      .select('slug title releaseDate preorderShips').lean();
    const bySlug = new Map(products.map((p) => [p.slug, p]));

    res.json(rows
      .filter((r) => bySlug.has(r._id))
      .map((r) => ({
        slug: r._id,
        title: bySlug.get(r._id).title,
        orders: r.orders,
        release: lifecycle.releaseDisplay(bySlug.get(r._id)),
      })));
  } catch (err) {
    console.error('[admin/emails] release targets failed:', err);
    res.json([]);
  }
});

module.exports = router;
