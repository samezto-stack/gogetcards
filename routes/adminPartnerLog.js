/**
 * Which site took each order, and for how much.
 *
 * This lived as a bare table inside the checkout settings page, showing the
 * last few brokered orders with no amounts on them. It was in the wrong
 * place twice over: settings is where you change how the rotation behaves,
 * not where you audit what it did, and a log without money on it cannot
 * answer the only question anyone asks of it — whether the split is even.
 *
 * THE HISTORY IS THE ROTATION'S ONLY WITNESS. Every way the cycle can go
 * wrong looks, from the outside, like a working checkout that happens to
 * favour one host. The per-site totals below are what makes a stuck cursor
 * or a site quietly failing its ladder visible.
 *
 * Amounts are joined from Order rather than stored on the history entry, so
 * a refunded or corrected order reads correctly here instead of preserving
 * whatever it was worth at the moment it was brokered.
 */

const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/auth');
const SiteConfig = require('../models/SiteConfig');
const Order = require('../models/Order');
const markets = require('../config/markets');
const partnerRotation = require('../services/partnerRotation');

router.get('/', requireAuth, async (req, res) => {
  try {
    const config = await SiteConfig.getValue('partnerExperience', {}) || {};
    const history = Array.isArray(config.history) ? config.history : [];

    /* One query for every order named in the log, rather than one per row. */
    const ids = history.map((h) => h.orderId).filter(Boolean);
    const orders = ids.length
      ? await Order.find({ orderId: { $in: ids } })
        .select('orderId totalPrice currency createdAt customerEmail').lean()
      : [];
    const byId = new Map(orders.map((o) => [o.orderId, o]));

    const rows = history.map((h) => {
      const order = byId.get(h.orderId);
      const currency = (order && order.currency) || 'USD';
      return {
        at: h.at,
        siteId: h.siteId || '',
        siteName: h.siteName || 'unknown',
        productSlug: h.productSlug || '',
        orderId: h.orderId || '',
        /* An order the log names but the database does not have is worth
           showing as exactly that. It means the history outlived the order,
           or the order never landed — both are things to look into, and
           printing a zero would hide them. */
        amount: order ? order.totalPrice : null,
        currency,
      };
    });

    /* Totals per site, in each currency they billed in. Summing across
       currencies would produce one number that means nothing. */
    const totals = new Map();
    for (const r of rows) {
      const key = r.siteName;
      if (!totals.has(key)) totals.set(key, { name: key, orders: 0, byCurrency: new Map(), unknown: 0 });
      const t = totals.get(key);
      t.orders += 1;
      if (r.amount == null) { t.unknown += 1; continue; }
      t.byCurrency.set(r.currency, (t.byCurrency.get(r.currency) || 0) + r.amount);
    }
    const siteTotals = [...totals.values()]
      .map((t) => ({
        name: t.name,
        orders: t.orders,
        unknown: t.unknown,
        sums: [...t.byCurrency.entries()].map(([c, amount]) => markets.format(amount, c)),
      }))
      .sort((a, b) => b.orders - a.orders);

    /* LIFETIME, which the table above cannot give. The history this page
       reads is capped at a dozen entries, so its totals answer "recently"
       and were being read as "ever". The running counters on each site
       answer the question actually being asked — which account has earned
       what — and cover every order since the counters shipped.

       Listed from savedSites rather than from the log so a site that has
       taken nothing lately still appears with what it has banked. */
    const lifetime = (Array.isArray(config.savedSites) ? config.savedSites : [])
      .map((site) => ({
        name: site.name || site.url || site.id,
        orders: (site.stats && site.stats.orders) || 0,
        sums: partnerRotation.revenueOf(site).map((r) => markets.format(r.amount, r.currency)),
      }))
      .filter((s) => s.orders > 0 || s.sums.length)
      .sort((a, b) => b.orders - a.orders);

    res.render('admin/partner-log', {
      layout: false,
      pageTitle: 'Brokered orders',
      rows,
      siteTotals,
      lifetime,
      money: (amount, currency) => markets.format(amount, currency),
    });
  } catch (err) {
    console.error('[admin/partner-log]', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
