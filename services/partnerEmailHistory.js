/**
 * Every address from the pooled-email era, and what it stood in for.
 *
 * WHAT THE SCHEME WAS. For a period the partner checkout could be handed one
 * of OUR addresses instead of the buyer's, so the Whop order came back under
 * an address we controlled. It is removed — see docs/pooled-email.md — but
 * the record has to outlive it. An order sitting under one of these
 * addresses is otherwise unattributable: the only thing that says whose
 * order it was is the row that recorded the substitution.
 *
 * THREE SOURCES, BECAUSE NO ONE OF THEM IS COMPLETE.
 *
 *   CheckoutSession  The good one. markHandedOff wrote pooledEmail next to
 *                    the buyer's real email, the product, the host, the
 *                    order id and the amount. The collection has NO TTL
 *                    index — expiresAt only decides whether a token still
 *                    opens a checkout, it never deletes the row — so this
 *                    reaches back to the beginning.
 *
 *   Event            checkout_click rows carry pooledEmail too and cover the
 *                    period before the session model existed. They are
 *                    deleted after EVENT_TTL_DAYS (365 by default), so this
 *                    source thins with age.
 *
 *   PartnerEmail     The pool itself. Authoritative for `converted`, which
 *                    is permanent and carries an order id. Authoritative for
 *                    nothing else: the release sweep and the admin's
 *                    "release used emails" action both reset `usedFor` to
 *                    null, so an address handed out fifty times and never
 *                    converted reads as a pristine `available` row.
 *
 * So the answer is the union, and every row says which sources it came from.
 * That is not bookkeeping detail — it is the difference between "this
 * address was never used" and "this address was used and the evidence
 * expired", which the pool row alone cannot tell apart.
 *
 * READ-ONLY. Nothing here writes.
 */
const CheckoutSession = require('../models/CheckoutSession');
const PartnerEmail = require('../models/PartnerEmail');
const Event = require('../models/Event');
const Order = require('../models/Order');

const lower = (s) => String(s || '').trim().toLowerCase();
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A CSV cell that survives a comma, a quote and a newline. */
function cell(v) {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const csvRow = (cells) => cells.map(cell).join(',');

/**
 * Gather the whole history.
 *
 * Returns { rows, detail, stats } — one row per address, one detail entry
 * per hand-off, and the counts worth printing above them.
 */
async function collect() {
  const byEmail = new Map();
  const take = (email) => {
    const key = lower(email);
    if (!key) return null;
    if (!byEmail.has(key)) {
      byEmail.set(key, {
        email: key,
        sources: new Set(),
        handoffs: 0,
        paid: 0,
        firstSeen: null,
        lastSeen: null,
        poolStatus: '',
        convertedOrderId: '',
        convertedAt: null,
        addedToPool: null,
        customers: new Set(),
        orderIds: new Set(),
      });
    }
    return byEmail.get(key);
  };
  const stamp = (r, at) => {
    if (!at) return;
    const d = new Date(at);
    if (!r.firstSeen || d < r.firstSeen) r.firstSeen = d;
    if (!r.lastSeen || d > r.lastSeen) r.lastSeen = d;
  };

  const detail = [];

  /* 1. The pool itself. */
  const pool = await PartnerEmail.find({}).lean();
  for (const p of pool) {
    const r = take(p.email);
    if (!r) continue;
    r.sources.add('pool');
    r.poolStatus = p.status || '';
    r.convertedOrderId = p.convertedOrderId || '';
    r.convertedAt = p.convertedAt || null;
    r.addedToPool = p.createdAt || null;
    if (p.convertedOrderId) r.orderIds.add(p.convertedOrderId);
    stamp(r, p.createdAt);
    stamp(r, p.assignedAt);
    stamp(r, p.convertedAt);
  }

  /* 2. Every hand-off, with the customer it stood in for. */
  const sessions = await CheckoutSession.find({ pooledEmail: { $nin: [null, ''] } })
    .select('pooledEmail email checkoutId productSlug quantity total currency market '
          + 'paymentHost orderId paidAt handedOffAt isTest status createdAt')
    .sort({ createdAt: 1 })
    .lean();
  for (const s of sessions) {
    const r = take(s.pooledEmail);
    if (!r) continue;
    r.sources.add('session');
    r.handoffs += 1;
    if (s.orderId || s.paidAt) r.paid += 1;
    if (s.email) r.customers.add(lower(s.email));
    if (s.orderId) r.orderIds.add(s.orderId);
    stamp(r, s.handedOffAt || s.createdAt);
    detail.push({
      pooledEmail: lower(s.pooledEmail),
      customerEmail: lower(s.email),
      at: s.handedOffAt || s.createdAt,
      productSlug: s.productSlug,
      quantity: s.quantity,
      total: s.total,
      currency: s.currency,
      market: s.market,
      paymentHost: s.paymentHost,
      orderId: s.orderId || '',
      paidAt: s.paidAt || null,
      isTest: s.isTest ? 'yes' : '',
      status: s.status,
      source: 'CheckoutSession',
    });
  }

  /* 3. The older clicks, while they still exist. */
  const events = await Event.find({ type: 'checkout_click', pooledEmail: { $nin: [null, ''] } })
    .select('pooledEmail checkoutId productSlug createdAt')
    .sort({ createdAt: 1 })
    .lean();
  const knownCheckouts = new Set(sessions.map((s) => String(s.checkoutId || '')));
  let eventOnly = 0;
  for (const e of events) {
    const r = take(e.pooledEmail);
    if (!r) continue;
    r.sources.add('event');
    stamp(r, e.createdAt);
    /* Counted only when no session covers the same checkout, so the two
       sources cannot report one hand-off twice. */
    if (knownCheckouts.has(String(e.checkoutId || ''))) continue;
    eventOnly += 1;
    r.handoffs += 1;
    detail.push({
      pooledEmail: lower(e.pooledEmail),
      customerEmail: '',
      at: e.createdAt,
      productSlug: e.productSlug,
      quantity: '', total: '', currency: '', market: '', paymentHost: '',
      orderId: '', paidAt: null, isTest: '', status: '',
      source: 'Event (checkout_click)',
    });
  }

  /* 4. Orders that actually landed on one of these addresses — the point of
        the whole scheme was that they would, so this is where the money is. */
  const addresses = [...byEmail.keys()];
  let ordersFound = 0;
  if (addresses.length) {
    const orders = await Order.find({
      customerEmail: { $in: addresses.map((a) => new RegExp(`^${escapeRegex(a)}$`, 'i')) },
    }).select('orderId customerEmail totalPrice currency createdAt').lean();
    ordersFound = orders.length;
    for (const o of orders) {
      const r = take(o.customerEmail);
      if (!r) continue;
      r.orderIds.add(o.orderId);
      stamp(r, o.createdAt);
    }
  }

  const rows = [...byEmail.values()].sort((a, b) => {
    const at = a.lastSeen ? a.lastSeen.getTime() : 0;
    const bt = b.lastSeen ? b.lastSeen.getTime() : 0;
    return bt - at || a.email.localeCompare(b.email);
  });
  detail.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));

  const everUsed = (r) => r.handoffs > 0 || r.poolStatus === 'converted' || r.poolStatus === 'used';

  return {
    rows,
    detail,
    stats: {
      addresses: rows.length,
      everUsed: rows.filter(everUsed).length,
      handoffs: rows.reduce((n, r) => n + r.handoffs, 0),
      paid: rows.reduce((n, r) => n + r.paid, 0),
      poolRows: pool.length,
      converted: pool.filter((p) => p.status === 'converted').length,
      used: pool.filter((p) => p.status === 'used').length,
      available: pool.filter((p) => p.status === 'available').length,
      sessions: sessions.length,
      events: events.length,
      eventOnly,
      orders: ordersFound,
      /* Addresses the pool knows about, marked available, with no hand-off
         anywhere. Either never used, or used and released before the
         session/event record began — the release sweep wiped `usedFor`, so
         from the pool row alone the two are indistinguishable. */
      unknowable: rows.filter((r) => r.sources.size === 1 && r.sources.has('pool')
        && r.poolStatus === 'available').length,
    },
  };
}

const SUMMARY_HEAD = ['email', 'ever_used', 'hand_offs', 'paid', 'pool_status',
  'converted_order_id', 'converted_at', 'order_ids', 'customers_stood_in_for',
  'first_seen', 'last_seen', 'added_to_pool', 'sources'];

const DETAIL_HEAD = ['pooled_email', 'customer_email', 'at', 'product', 'quantity',
  'total', 'currency', 'market', 'payment_host', 'order_id', 'paid_at', 'is_test',
  'status', 'source'];

function toSummaryCsv(rows) {
  return [csvRow(SUMMARY_HEAD), ...rows.map((r) => csvRow([
    r.email,
    (r.handoffs > 0 || r.poolStatus === 'converted' || r.poolStatus === 'used') ? 'yes' : 'no',
    r.handoffs,
    r.paid,
    r.poolStatus,
    r.convertedOrderId,
    r.convertedAt,
    [...r.orderIds].join(' '),
    [...r.customers].join(' '),
    r.firstSeen,
    r.lastSeen,
    r.addedToPool,
    [...r.sources].sort().join('+'),
  ]))].join('\n') + '\n';
}

function toDetailCsv(detail) {
  return [csvRow(DETAIL_HEAD), ...detail.map((d) => csvRow([
    d.pooledEmail, d.customerEmail, d.at, d.productSlug, d.quantity, d.total,
    d.currency, d.market, d.paymentHost, d.orderId, d.paidAt, d.isTest, d.status, d.source,
  ]))].join('\n') + '\n';
}

module.exports = { collect, toSummaryCsv, toDetailCsv, SUMMARY_HEAD, DETAIL_HEAD };
