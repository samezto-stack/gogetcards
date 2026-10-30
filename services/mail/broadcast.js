/**
 * Sending one message to many people without it looking like that.
 *
 * WHY THIS EXISTS. The release-day emails go to several hundred people
 * at once, on a domain whose reputation also carries every order
 * confirmation and refund notice this store will ever send. Several
 * hundred messages in one burst from a domain that normally sends a few
 * an hour is the exact shape a receiving filter is trained to throttle,
 * and a throttle on this domain costs receipts, not just announcements.
 * The old release-date broadcast sent sequentially but without pause,
 * which is the same burst with a slightly longer tail.
 *
 * So nothing here sends. Enqueueing writes one `queued` row per CUSTOMER
 * into the email log with a due time, spaced out with a jittered gap, and
 * cron/broadcastQueue.js sends at most one due row per pass. A run of
 * six hundred takes a few hours, and every message in it goes out at the
 * cadence a busy shop's transactional mail already has.
 *
 * ONE ROW PER CUSTOMER, NOT PER ORDER. Somebody holding three orders for
 * the set gets one email naming three references. Three emails a minute
 * apart to one address is what a broken mailer looks like, and is read
 * as one.
 *
 * REBUILT AT SEND TIME, NOT REPLAYED. The row stores which orders it
 * covers, not what the message said. When its turn comes the orders are
 * read again and re-tested against the same eligibility the enqueue
 * used — so an order cancelled, refunded or shipped while the row was
 * waiting drops out of the message, and a customer none of whose orders
 * still qualify is skipped rather than told something that stopped
 * being true an hour ago.
 *
 * IDEMPOTENT PER (campaign, order). An order that already has a sent or
 * queued row for this campaign is not queued again, so pressing the
 * button twice — or once more after a restart — sends nothing twice.
 * Cancelling and re-offering is a different campaign key, deliberately:
 * the deadline is part of the key, so a second offer with a new deadline
 * is a new message.
 */

const EmailLog = require('../../models/EmailLog');
const EmailSuppression = require('../../models/EmailSuppression');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Customer = require('../../models/Customer');
const testOrder = require('../testOrder');
const orderReference = require('../../helpers/orderReference');
const customerAuth = require('../customerAuth');
const view = require('./view');

/* Seconds between two broadcast sends, plus a random slice on top. Faster
   than the failure-retry queue (which drains a provider outage and can
   afford four minutes a message) because a release-day announcement that
   arrives two days late has missed its point — but still a human cadence.
   At the defaults, 600 messages take roughly four and a half hours. */
const GAP_SECONDS = parseInt(process.env.MAIL_BROADCAST_GAP_SECONDS || '', 10) || 20;
const JITTER_SECONDS = parseInt(process.env.MAIL_BROADCAST_JITTER_SECONDS || '', 10) || 15;

/* A claim older than this belonged to a process that died mid-send. */
const CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * The campaigns. Each names the template, which orders qualify, and how
 * the customer's link should land — the three things that differ between
 * "your set is here" and "do you still want it".
 *
 * `select` is the enqueue-time query. `stillEligible` is the send-time
 * re-test of one order, and it MUST agree with `select`, which is why
 * both are written against the same fields side by side.
 */
const KINDS = {
  releaseReady: {
    template: 'releaseReady',
    select: (slug) => ({
      productSlug: slug,
      status: { $nin: ['abandoned', 'cancelled'] },
      cancelledAt: null,
      fulfillmentStatus: { $nin: ['shipped', 'delivered'] },
      customerEmail: /@/,
      ...testOrder.EXCLUDE_FROM_REPORTING,
    }),
    stillEligible: (o) => !o.cancelledAt && o.status !== 'abandoned' && o.status !== 'cancelled'
      && o.fulfillmentStatus !== 'shipped' && o.fulfillmentStatus !== 'delivered',
    /* The button lands on their orders, not on one of them. */
    redirectTo: () => '/account/orders',
  },

  reinstateOffer: {
    template: 'reinstateOffer',
    select: (slug) => ({
      productSlug: slug,
      cancelledAt: { $ne: null },
      refundStatus: 'processing',
      fulfillmentStatus: { $nin: ['shipped', 'delivered'] },
      customerEmail: /@/,
      ...testOrder.EXCLUDE_FROM_REPORTING,
    }),
    stillEligible: (o) => !!o.cancelledAt && o.refundStatus === 'processing'
      && o.fulfillmentStatus !== 'shipped' && o.fulfillmentStatus !== 'delivered',
    /* Lands on the page that lists everything of theirs that can be put
       back for this set, with a button per order. */
    redirectTo: (slug) => `/account/reinstate/${slug}`,
  },

  /* The older release-date broadcast, now paced like the others. Same
     selection it always had. */
  releaseUpdate: {
    template: 'releaseUpdate',
    select: (slug) => KINDS.releaseReady.select(slug),
    stillEligible: (o) => KINDS.releaseReady.stillEligible(o),
    redirectTo: () => '/account/orders',
    /* Dates move more than once and each move is news, so this one may
       repeat. Its campaign key carries the time it was pressed. */
    repeatable: true,
  },
};

function buildSchedule(count, fromMs) {
  const out = [];
  let t = fromMs;
  for (let i = 0; i < count; i++) {
    out.push(new Date(t));
    t += (GAP_SECONDS + Math.floor(Math.random() * (JITTER_SECONDS + 1))) * 1000;
  }
  return out;
}

/** The suppression list, read once per enqueue. Only `all`-scope rows block a service message. */
async function suppressedSet(emails) {
  if (!emails.length) return new Set();
  const rows = await EmailSuppression.find({ email: { $in: emails }, scope: 'all' }).select('email').lean();
  return new Set(rows.map((r) => r.email));
}

/**
 * What an enqueue WOULD do, without doing it. The admin page shows this
 * next to the button, so "send to 581 people" is a number read off the
 * database rather than a guess.
 */
async function preview(kind, slug, { campaign } = {}) {
  const spec = KINDS[kind];
  if (!spec) throw new Error(`Unknown broadcast kind: ${kind}`);

  const orders = await Order.find(spec.select(slug))
    .select('orderId customerEmail quantity totalPrice currency createdAt purchaseDate')
    .sort({ createdAt: 1 }).lean();

  const key = campaign || campaignKey(kind, slug);
  const already = new Set((await EmailLog.find({
    'broadcast.campaign': key, status: { $in: ['queued', 'pending', 'sent'] },
  }).select('broadcast.orderIds').lean())
    .flatMap((r) => (r.broadcast && r.broadcast.orderIds) || []));

  const emails = [...new Set(orders.map((o) => o.customerEmail.toLowerCase()))];
  const blocked = await suppressedSet(emails);

  const byEmail = new Map();
  let skippedDone = 0;
  let skippedSuppressed = 0;
  for (const o of orders) {
    const email = o.customerEmail.toLowerCase();
    if (already.has(o.orderId)) { skippedDone++; continue; }
    if (blocked.has(email)) { skippedSuppressed++; continue; }
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email).push(o);
  }

  return {
    campaign: key,
    orders: orders.length,
    customers: byEmail.size,
    groups: byEmail,
    skipped: { alreadySent: skippedDone, suppressed: skippedSuppressed },
    /* How long the drain will take at the current spacing, so the page
       can say "finishes around 4pm" rather than making somebody do the
       arithmetic. */
    finishesAt: byEmail.size
      ? new Date(Date.now() + (byEmail.size - 1) * (GAP_SECONDS + JITTER_SECONDS / 2) * 1000)
      : null,
  };
}

/** One key per campaign. The offer's deadline is part of it (see file comment). */
function campaignKey(kind, slug, extra = {}) {
  if (kind === 'reinstateOffer' && extra.deadline) {
    return `${kind}:${slug}:${new Date(extra.deadline).toISOString().slice(0, 10)}`;
  }
  if (KINDS[kind] && KINDS[kind].repeatable) return `${kind}:${slug}:${Date.now()}`;
  return `${kind}:${slug}`;
}

/**
 * Queue a campaign. Writes the rows and returns what it wrote; sends
 * nothing.
 *
 * @param {'releaseReady'|'reinstateOffer'|'releaseUpdate'} kind
 * @param {string} slug     the product
 * @param {object} extra    template facts: deliveryWindow, deadline, message, previousRelease
 * @param {string} by       who pressed the button, for the log
 */
async function enqueue(kind, slug, extra = {}, { by = '' } = {}) {
  const spec = KINDS[kind];
  if (!spec) throw new Error(`Unknown broadcast kind: ${kind}`);
  const product = await Product.findOne({ slug }).lean();
  if (!product) throw new Error('No such product');

  const campaign = campaignKey(kind, slug, extra);
  const p = await preview(kind, slug, { campaign });

  const groups = [...p.groups.entries()];
  const schedule = buildSchedule(groups.length, Date.now());

  /* The offer stamps its deadline on every order it covers, so the
     customer's button and the admin's "do not refund yet" both read the
     same moment the email quotes. Done before the rows exist: if this
     write fails the campaign is not queued, rather than queued with a
     promise nobody recorded. */
  if (kind === 'reinstateOffer') {
    const ids = groups.flatMap(([, list]) => list.map((o) => o.orderId));
    await Order.updateMany(
      { orderId: { $in: ids } },
      { $set: { reinstateOfferedAt: new Date(), reinstateDeadline: new Date(extra.deadline) } }
    );
  }

  let queued = 0;
  for (let i = 0; i < groups.length; i++) {
    const [email, list] = groups[i];
    const first = list[0];
    await EmailLog.create({
      type: spec.template,
      to: first.customerEmail,
      subject: '',
      orderId: first.orderId,
      orderRef: orderReference(first),
      status: 'queued',
      retryDueAt: schedule[i],
      retryQueuedBy: by,
      broadcast: {
        kind, slug, campaign,
        orderIds: list.map((o) => o.orderId),
        extra: sanitiseExtra(extra),
      },
    });
    queued++;
  }

  return {
    campaign, queued,
    orders: groups.reduce((n, [, l]) => n + l.length, 0),
    skipped: p.skipped,
    finishesAt: schedule.length ? schedule[schedule.length - 1] : null,
  };
}

/** Only the fields a template reads, as plain values. Nothing typed by an admin is trusted further than that. */
function sanitiseExtra(extra = {}) {
  const out = {};
  if (extra.deliveryWindow) out.deliveryWindow = String(extra.deliveryWindow).slice(0, 60);
  if (extra.deadline) out.deadline = new Date(extra.deadline).toISOString();
  if (extra.deadlineDisplay) out.deadlineDisplay = String(extra.deadlineDisplay).slice(0, 60);
  if (extra.message) out.message = String(extra.message).slice(0, 600);
  if (extra.previousRelease) out.previousRelease = String(extra.previousRelease).slice(0, 60);
  return out;
}

/**
 * Send at most ONE due broadcast row. Called on a timer.
 *
 * Mirrors services/mail/retryQueue.drainOne: an atomic claim, a rebuild
 * from the database, one send, and the queue fields cleared whatever
 * happened — a failure leaves a `failed` row with a Retry button, never
 * a loop.
 */
async function drainOne() {
  await EmailLog.updateMany(
    { status: 'queued', retryClaimedAt: { $lt: new Date(Date.now() - CLAIM_TIMEOUT_MS) } },
    { $set: { retryClaimedAt: null } }
  );

  const row = await EmailLog.findOneAndUpdate(
    { status: 'queued', retryDueAt: { $ne: null, $lte: new Date() }, retryClaimedAt: null },
    { $set: { retryClaimedAt: new Date() } },
    { sort: { retryDueAt: 1 }, new: true }
  ).lean();
  if (!row) return { sent: false, reason: 'nothing_due' };

  const b = row.broadcast || {};
  const spec = KINDS[b.kind];
  const drop = (reason) => EmailLog.updateOne({ _id: row._id }, {
    $set: { status: 'skipped', error: reason, retryDueAt: null, retryClaimedAt: null, lastAttemptAt: new Date() },
  }).then(() => ({ sent: false, reason, to: row.to }));

  try {
    if (!spec) return drop('Unknown broadcast kind on this row.');

    /* Re-read and re-test. This is the whole reason the row stores ids
       rather than a rendered message. */
    const orders = await Order.find({ orderId: { $in: b.orderIds || [] } }).lean();
    const live = orders.filter(spec.stillEligible);
    if (!live.length) return drop('No order on this message still qualified when its turn came.');

    /* One more chance for the suppression list, in case an address hard
       bounced on an earlier message in the same run. */
    if (await EmailSuppression.isSuppressed(row.to, 'all')) return drop('Address is suppressed.');

    const product = await Product.findOne({ slug: b.slug }).lean();

    let accessUrl = null;
    let linkId = null;
    try {
      const issued = await customerAuth.issueMagicLink(row.to, {
        redirectTo: spec.redirectTo(b.slug), purpose: 'order',
        ttlMs: customerAuth.ORDER_LINK_TTL_MS, withId: true,
      });
      if (issued) {
        const site = require('../../config/site');
        accessUrl = `${site.origin()}/account/open/${issued.token}`;
        linkId = issued.id;
      }
    } catch (err) {
      console.error('[broadcast] could not mint a link:', err.message);
    }

    const extra = Object.assign({}, b.extra || {}, accessUrl ? { accessUrl } : {});
    if (extra.deadline) extra.deadline = new Date(extra.deadline);
    const data = view.fromOrders(live, product, extra);

    let customerId = null;
    try {
      const c = await Customer.findOne({ email: Customer.normaliseEmail(row.to) }).select('_id').lean();
      customerId = c ? c._id : null;
    } catch { /* the log row is still useful without it */ }

    const mail = require('./index');
    /* mail.send removes the queued row once the attempt row exists — the
       same replacement a retry does — so the log keeps one row per
       message. The attempt row inherits the campaign so the admin count
       of "sent for this campaign" and the idempotency check both work. */
    const result = await mail.send(spec.template, {
      to: row.to, data, orderId: live[0].orderId, orderRef: orderReference(live[0]),
      customer: customerId, linkId, retryOf: row._id,
      broadcast: { kind: b.kind, slug: b.slug, campaign: b.campaign, orderIds: live.map((o) => o.orderId) },
    });
    return { sent: !!(result && result.ok), reason: result && result.ok ? 'sent' : 'send_failed', to: row.to };
  } catch (err) {
    await EmailLog.updateOne({ _id: row._id }, {
      $set: { status: 'failed', error: String(err.message).slice(0, 500), retryDueAt: null, retryClaimedAt: null },
    }).catch(() => {});
    console.error(`[broadcast] ${row.to} (${b.kind}) threw:`, err.message);
    return { sent: false, reason: 'error', to: row.to, error: err.message };
  }
}

/** Where a campaign stands, for the admin page. */
async function status(slug) {
  const match = slug ? { 'broadcast.slug': slug } : { broadcast: { $ne: null } };
  const rows = await EmailLog.aggregate([
    { $match: match },
    { $group: { _id: { campaign: '$broadcast.campaign', kind: '$broadcast.kind', status: '$status' }, n: { $sum: 1 },
      nextDue: { $min: '$retryDueAt' }, lastDue: { $max: '$retryDueAt' } } },
  ]);
  const by = new Map();
  for (const r of rows) {
    const k = r._id.campaign;
    if (!by.has(k)) by.set(k, { campaign: k, kind: r._id.kind, queued: 0, sent: 0, failed: 0, skipped: 0, pending: 0, finishesAt: null });
    const c = by.get(k);
    c[r._id.status] = (c[r._id.status] || 0) + r.n;
    if (r._id.status === 'queued' && r.lastDue) c.finishesAt = r.lastDue;
  }
  return [...by.values()].sort((a, b) => String(b.campaign).localeCompare(String(a.campaign)));
}

/** Drop every unsent row of one campaign (or all of them) without sending. */
async function stop(campaign) {
  const filter = { status: 'queued', retryClaimedAt: null };
  if (campaign) filter['broadcast.campaign'] = campaign;
  const res = await EmailLog.deleteMany(filter);
  return { stopped: res.deletedCount || 0 };
}

module.exports = {
  KINDS, GAP_SECONDS, JITTER_SECONDS,
  preview, enqueue, drainOne, status, stop, campaignKey,
};
