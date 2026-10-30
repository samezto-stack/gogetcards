/**
 * /admin/analytics — the full funnel, in one place.
 *
 * SEPARATE FROM THE DASHBOARD ON PURPOSE. /admin is what you check between
 * other tasks: today's money and anything that needs a decision. This is
 * what you open when you have a question, and it is allowed to be dense and
 * slow-ish because you came here deliberately.
 *
 * EVERY FIGURE IS AGGREGATED IN THE DATABASE — see services/analytics/
 * report.js. Nothing here loads raw events into Node.
 *
 * WHERE THE DATA CANNOT ANSWER, THE PAGE SAYS SO rather than rendering a
 * confident zero. Two known limits are surfaced in the UI itself: events
 * expire (so a window longer than retention is partial, not empty), and
 * campaign tags only exist from the day capture shipped.
 */

const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/auth');
const report = require('../services/analytics/report');
const Event = require('../models/Event');
const site = require('../config/site');

/* How far back events actually exist. Anything beyond this is reported as
   a partial window rather than presented as a complete one. */
const RETENTION_DAYS = Event.EVENT_TTL_DAYS || 365;

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'month', label: 'This month' },
  { key: 'prev_month', label: 'Previous month' },
  { key: 'year', label: 'This year' },
  { key: 'custom', label: 'Custom range' },
];

/**
 * A window, plus the equivalent window immediately before it.
 *
 * The comparison period is the SAME LENGTH and directly adjacent, so "+18%"
 * always means "against the previous equally long stretch". A month-on-month
 * comparison against a 28-day February would otherwise flatter March by
 * three days of trading.
 */
function resolveWindow(query) {
  const key = String(query.range || '30d');
  const now = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let startDate;
  let endDate;

  switch (key) {
    case 'today':
      startDate = startOfDay(now); endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 1); break;
    case 'yesterday':
      startDate = startOfDay(now); startDate.setDate(startDate.getDate() - 1);
      endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 1); break;
    case '7d':
      endDate = now; startDate = new Date(now.getTime() - 7 * 864e5); break;
    case '90d':
      endDate = now; startDate = new Date(now.getTime() - 90 * 864e5); break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1); endDate = now; break;
    case 'prev_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1); endDate = now; break;
    case 'custom': {
      const s = new Date(query.start);
      const e = new Date(query.end);
      /* An unparseable date must not become 1970 and scan the whole
         collection — fall back to the default window instead. */
      if (isNaN(s) || isNaN(e)) { endDate = now; startDate = new Date(now.getTime() - 30 * 864e5); break; }
      startDate = s; endDate = new Date(e); endDate.setDate(endDate.getDate() + 1);
      break;
    }
    case '30d':
    default:
      endDate = now; startDate = new Date(now.getTime() - 30 * 864e5); break;
  }

  const span = endDate - startDate;
  const prev = { startDate: new Date(startDate - span), endDate: new Date(startDate) };

  /* Events older than retention are gone, so a window reaching past it is
     honest-but-partial. Orders are unaffected. */
  const oldest = new Date(Date.now() - RETENTION_DAYS * 864e5);
  const partialEvents = startDate < oldest;

  return { key, startDate, endDate, prev, partialEvents, retentionDays: RETENTION_DAYS };
}

/** Percentage change, or null when there is no base to compare against. */
function delta(now, before) {
  if (!before) return null;
  return ((now - before) / before) * 100;
}

/** The bucket size that makes sense for a window, unless one was asked for. */
function bucketFor(win, asked) {
  if (['hour', 'day', 'week', 'month'].includes(asked)) return asked;
  const days = (win.endDate - win.startDate) / 864e5;
  if (days <= 2) return 'hour';
  if (days <= 62) return 'day';
  if (days <= 400) return 'week';
  return 'month';
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const win = resolveWindow(req.query);
    const bucket = bucketFor(win, req.query.bucket);
    const tz = site.timezone ? site.timezone() : 'UTC';

    /* Run together: they are independent reads and the page is the slowest
       thing in the admin. */
    const [
      overview, prevOverview, funnel, products, countries, sources,
      devices, technical, campaigns, series, abandonment, customers, sourceProduct,
      coProduct, coCountry,
    ] = await Promise.all([
      report.overview(win),
      report.overview(win.prev),
      report.funnel(win),
      report.products(win),
      report.countries(win),
      report.sources(win),
      report.devices(win),
      report.technical(win),
      report.campaigns(win),
      report.timeseries(win, bucket, tz),
      report.abandonment(win),
      report.customers(win),
      report.sourceByProduct(win),
      report.checkoutsByProduct(win),
      report.checkoutsByCountry(win),
    ]);

    res.render('admin/analytics', {
      layout: false,
      pageTitle: 'Analytics',
      ranges: RANGES,
      range: win.key,
      query: req.query,
      win,
      bucket,
      overview,
      deltas: {
        visitors: delta(overview.visitors, prevOverview.visitors),
        orders: delta(overview.orders, prevOverview.orders),
        revenue: delta(overview.revenue, prevOverview.revenue),
        aov: delta(overview.aov, prevOverview.aov),
        conversionRate: delta(overview.conversionRate, prevOverview.conversionRate),
        started: delta(overview.started, prevOverview.started),
      },
      funnel, products, countries, sources, devices, technical,
      campaigns, series, abandonment, customers, sourceProduct,
      coProduct, coCountry,
    });
  } catch (err) {
    console.error('[admin/analytics] failed:', err);
    res.status(500).send('Analytics failed to load');
  }
});

/* ── Export ────────────────────────────────────────────────
 * CSV of whichever table is asked for, over the SAME window and filters as
 * the page — the export is generated from the same functions the page
 * renders from, so a spreadsheet can never disagree with the screen it came
 * from. */
const EXPORTS = {
  products: { fn: 'products', cols: ['slug', 'name', 'views', 'viewers', 'checkouts', 'step1', 'step2', 'orders', 'units', 'revenue', 'avgPrice', 'conversionRate', 'viewToCheckout', 'checkoutToPurchase', 'abandonmentRate', 'refunds', 'refundAmount'] },
  countries: { fn: 'countries', cols: ['key', 'visitors', 'productViews', 'starts', 'step2', 'orders', 'units', 'revenue', 'aov', 'conversionRate', 'abandonmentRate', 'revenuePerVisitor'] },
  sources: { fn: 'sources', cols: ['key', 'visitors', 'productViews', 'starts', 'step2', 'orders', 'units', 'revenue', 'aov', 'conversionRate', 'revenuePerVisitor'] },
  campaigns: { fn: 'campaigns', cols: ['source', 'medium', 'campaign', 'visitors'] },
  'checkouts-by-product': { fn: 'checkoutsByProduct', cols: ['slug', 'name', 'starts', 'step1', 'step2', 'tokenFailed', 'step1Rate', 'step2Rate'] },
  'checkouts-by-country': { fn: 'checkoutsByCountry', cols: ['country', 'starts', 'step1', 'step2', 'tokenFailed', 'step1Rate', 'step2Rate'] },
  timeseries: { fn: 'timeseries', cols: ['bucket', 'visitors', 'starts', 'orders', 'revenue'] },
};

/** RFC 4180 quoting. A product name with a comma must not shift columns. */
function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

router.get('/export/:what.csv', requireAuth, async (req, res) => {
  try {
    /* The channel grid is the one export whose columns are not known until
       the data is read, so it is flattened here rather than described by a
       fixed column list like the others. */
    if (req.params.what === 'channel-grid') {
      const win = resolveWindow(req.query);
      const grid = await report.sourceByProduct(win);
      const cols = ['slug', 'name', ...grid.columns, 'total_orders', 'revenue'];
      const out = [cols.map(csvCell).join(',')];
      for (const r of grid.rows) {
        out.push([
          csvCell(r.slug), csvCell(r.name),
          ...grid.columns.map((c) => csvCell(r.cells[c] ? r.cells[c].orders : 0)),
          csvCell(r.orders), csvCell(r.revenue),
        ].join(','));
      }
      const st = win.startDate.toISOString().slice(0, 10) + '_' + win.endDate.toISOString().slice(0, 10);
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="channel-grid_${st}.csv"`);
      res.set('Cache-Control', 'no-store');
      return res.send(out.join('\n'));
    }

    const spec = EXPORTS[req.params.what];
    if (!spec) return res.status(404).type('text/plain').send('Unknown export');

    const win = resolveWindow(req.query);
    const rows = spec.fn === 'timeseries'
      ? await report.timeseries(win, bucketFor(win, req.query.bucket), site.timezone ? site.timezone() : 'UTC')
      : await report[spec.fn](win);

    const list = Array.isArray(rows) ? rows : (rows.rows || []);
    const out = [spec.cols.join(',')];
    for (const r of list) out.push(spec.cols.map((c) => csvCell(r[c])).join(','));

    const stamp = win.startDate.toISOString().slice(0, 10) + '_' + win.endDate.toISOString().slice(0, 10);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${req.params.what}_${stamp}.csv"`);
    /* Not cached: it is a report over a live window, and a stale one is
       worse than a slow one. */
    res.set('Cache-Control', 'no-store');
    res.send(out.join('\n'));
  } catch (err) {
    console.error('[admin/analytics] export failed:', err);
    res.status(500).type('text/plain').send('Export failed');
  }
});

/* ── Ads Planner ───────────────────────────────────────────
 * A focused view for planning Google Ads: the store's side of the picture —
 * ads-attributed sessions, orders and revenue per advertised country — with
 * spend entered on the page so ROAS is computed in the browser. Separate
 * from the main analytics page because it answers one question (where is the
 * ad money working) and is built to be copied out in one block. */
const adsPlanner = require('../services/analytics/adsPlanner');

router.get('/ads', requireAuth, async (req, res) => {
  try {
    /* Default to this month — the window a planning session actually asks
       about — rather than the dashboard's rolling 30 days. */
    if (!req.query.range) req.query.range = 'month';
    const win = resolveWindow(req.query);
    const report = await adsPlanner.adsByMarket(win);
    res.render('admin/ads-planner', {
      layout: false,
      pageTitle: 'Ads Planner',
      ranges: RANGES,
      range: win.key,
      query: req.query,
      win,
      report,
    });
  } catch (err) {
    console.error('[admin/analytics/ads] failed:', err);
    res.status(500).send('Ads Planner failed to load');
  }
});

router.get('/ads.csv', requireAuth, async (req, res) => {
  try {
    if (!req.query.range) req.query.range = 'month';
    const win = resolveWindow(req.query);
    const { rows } = await adsPlanner.adsByMarket(win);
    const cols = ['market', 'currency', 'ad_sessions', 'ad_orders', 'ad_revenue_local', 'aov_local', 'conversion_rate_pct', 'ad_revenue_usd', 'top_products'];
    const out = [cols.join(',')];
    for (const r of rows) {
      out.push([
        csvCell(r.id),
        csvCell(r.currency),
        csvCell(r.sessions),
        csvCell(r.orders),
        csvCell((r.revenueCents / 100).toFixed(2)),
        csvCell((r.aovCents / 100).toFixed(2)),
        csvCell(r.conversionRate == null ? '' : r.conversionRate.toFixed(2)),
        csvCell((r.revenueUsdCents / 100).toFixed(2)),
        csvCell(r.topProducts.map((p) => `${p.name} (${p.n})`).join(' | ')),
      ].join(','));
    }
    const stamp = win.startDate.toISOString().slice(0, 10) + '_' + win.endDate.toISOString().slice(0, 10);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="ads-planner_${stamp}.csv"`);
    res.set('Cache-Control', 'no-store');
    res.send(out.join('\n'));
  } catch (err) {
    console.error('[admin/analytics/ads] export failed:', err);
    res.status(500).type('text/plain').send('Export failed');
  }
});

module.exports = router;
module.exports.resolveWindow = resolveWindow;
module.exports.csvCell = csvCell;
module.exports.bucketFor = bucketFor;
module.exports.delta = delta;
