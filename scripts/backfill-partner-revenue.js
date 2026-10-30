/*
 * Rebuilds each partner site's lifetime takings from the orders it actually
 * served, so the counters do not start from zero on the day they shipped.
 *
 * WHERE THE LINK COMES FROM. An order does not record which site served it
 * — that is deliberate, so there is no second copy to disagree with the
 * cursor. But the checkout session does: markHandedOff writes the host the
 * buyer was sent to, and markPaid writes the order id onto the same row.
 * One join, and it is exact rather than inferred.
 *
 * COVERAGE IS COMPLETE. resolvePartnerRedirect is called from exactly one
 * place in the request path (routes/checkoutFlow's payment step), so every
 * partner order has a session. CheckoutSession has no TTL index — the
 * `expiresAt` field only decides whether a token still opens a checkout, it
 * never deletes the row — so the history goes back to the beginning.
 *
 * IT SETS RATHER THAN ADDS. This is a recomputation from source, so running
 * it twice gives the same answer. Adding would double-count on the second
 * run, which is the failure nobody notices until the numbers are quietly
 * wrong.
 *
 * DRY RUN BY DEFAULT.
 *
 *   MONGODB_URI=... node scripts/backfill-partner-revenue.js
 *   MONGODB_URI=... node scripts/backfill-partner-revenue.js --apply
 *
 * Add --orders to also correct the per-site order counts from the same
 * source. Left off by default because that counter predates this join and
 * may legitimately hold orders from before; the dry run prints the
 * difference either way so the decision is an informed one.
 */
const mongoose = require('mongoose');
const markets = require('../config/markets');
const testOrder = require('../services/testOrder');

const SiteConfig = require('../models/SiteConfig');
const CheckoutSession = require('../models/CheckoutSession');
const Order = require('../models/Order');

/* Hosts are compared, not URLs: the session stores the host it handed off
   to, and a site is configured with a full service link. */
function hostOf(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).host.toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const alsoOrders = process.argv.includes('--orders');
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI is not set.'); process.exit(1); }

  await mongoose.connect(uri);

  const config = await SiteConfig.getValue('partnerExperience', null);
  if (!config || !Array.isArray(config.savedSites) || !config.savedSites.length) {
    console.error('No partner sites configured — nothing to rebuild.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const byHost = new Map();
  for (const site of config.savedSites) {
    const h = hostOf(site.baseUrl || site.url);
    if (h) byHost.set(h, site.id);
  }

  /* Only sessions that reached payment AND produced an order. */
  const sessions = await CheckoutSession.find({
    orderId: { $nin: [null, ''] },
    paymentHost: { $nin: [null, ''] },
  }).select('orderId paymentHost').lean();

  console.log(`${sessions.length} paid checkout session(s) name both an order and a host.`);

  /* One order can only be served once; a duplicate row would otherwise
     count the same money twice. */
  const hostByOrder = new Map();
  for (const s of sessions) {
    if (!hostByOrder.has(s.orderId)) hostByOrder.set(s.orderId, s.paymentHost);
  }

  const orders = await Order.find({
    orderId: { $in: [...hostByOrder.keys()] },
    ...testOrder.EXCLUDE_FROM_REPORTING,
  }).select('orderId totalPrice currency').lean();

  console.log(`${orders.length} of those exist as real (non-test) orders.\n`);

  const revenue = new Map();   // siteId -> { CUR: cents }
  const counts = new Map();    // siteId -> orders
  const unmatched = new Map(); // host -> count
  let counted = 0;

  for (const o of orders) {
    const host = hostOf(hostByOrder.get(o.orderId));
    const siteId = byHost.get(host);
    if (!siteId) {
      unmatched.set(host, (unmatched.get(host) || 0) + 1);
      continue;
    }
    const cur = String(o.currency || 'USD').toUpperCase();
    const amount = Math.round(Number(o.totalPrice) || 0);
    const bucket = revenue.get(siteId) || {};
    bucket[cur] = (bucket[cur] || 0) + amount;
    revenue.set(siteId, bucket);
    counts.set(siteId, (counts.get(siteId) || 0) + 1);
    counted += 1;
  }

  console.log(`${counted} order(s) attributed to a configured site.`);
  if (unmatched.size) {
    console.log('\nHosts that no configured site matches — a site that was renamed or removed:');
    for (const [h, n] of unmatched) console.log(`  ${h}  (${n} order(s))`);
  }

  console.log('\nPer site:');
  const savedSites = config.savedSites.map((site) => {
    const rev = revenue.get(site.id) || {};
    const sums = Object.entries(rev).map(([c, a]) => markets.format(a, c)).join(' · ') || '—';
    const wasOrders = (site.stats && site.stats.orders) || 0;
    const nowOrders = counts.get(site.id) || 0;
    const delta = nowOrders === wasOrders ? '' : `   orders: counter ${wasOrders}, join finds ${nowOrders}`;
    console.log(`  ${String(site.name || site.url).padEnd(20)} ${sums}${delta}`);

    const stats = { ...(site.stats || {}) };
    stats.revenue = rev;
    if (alsoOrders) stats.orders = nowOrders;
    return { ...site, stats };
  });

  if (!apply) {
    console.log('\nDRY RUN — nothing was written. Re-run with --apply to commit.');
    if (!alsoOrders) console.log('Add --orders to also set the order counts from this same join.');
  } else {
    await SiteConfig.setValue('partnerExperience', { ...config, savedSites });
    console.log('\nWritten.');
    const after = await SiteConfig.getValue('partnerExperience', { savedSites: [] });
    for (const s of after.savedSites || []) {
      const rev = (s.stats && s.stats.revenue) || {};
      const sums = Object.entries(rev).map(([c, a]) => markets.format(a, c)).join(' · ') || '—';
      console.log(`  ok  ${String(s.name || s.url).padEnd(20)} ${sums}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
