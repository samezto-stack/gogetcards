/**
 * Product Distribution admin routes.
 *
 * Mounted at /admin/distribution. Every route requires an authenticated
 * admin, and the two that reach Google (connect, sync) additionally check
 * that the channel is configured, so a misconfigured install fails with a
 * sentence rather than a stack trace.
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const requireAuth = require('../middleware/auth');
const Product = require('../models/Product');
const ChannelConfig = require('../models/ChannelConfig');

const distribution = require('../config/distribution');
const company = require('../config/company');
const site = require('../config/site');
const preorderCfg = require('../config/preorder');
const feedBuilder = require('../services/distribution/feedBuilder');
const validators = require('../services/distribution/validators');
const autofix = require('../services/distribution/autofix');
const imageProbe = require('../services/distribution/imageProbe');
const fileProvider = require('../services/distribution/providers/file');

/**
 * The OAuth redirect URI. Must match a URI registered on the OAuth client
 * in Google Cloud character for character, or Google refuses the consent
 * screen. config/site guarantees an absolute origin, so this can no longer
 * come out relative — which is what an unset SITE_URL used to produce, and
 * Google reported that as its own error, on its own page, where none of
 * our configuration is visible.
 */
function redirectUri() {
  return `${site.origin()}/admin/distribution/connect/callback`;
}

/** The channel config document, created on first use. */
async function getConfig(channel) {
  let cfg = await ChannelConfig.findOne({ channel });
  if (!cfg) cfg = await ChannelConfig.create({ channel });
  return cfg;
}

/* ── Dashboard ─────────────────────────────────────────── */

router.get('/', requireAuth, async (req, res) => {
  try {
    const channel = req.query.channel || 'google';
    const [config, products] = await Promise.all([
      getConfig(channel),
      Product.find({}).lean(),
    ]);

    /* Image probing is opt-in per page load. It makes one network request
       per distinct image and would otherwise turn a dashboard refresh into
       a several-second wait on a large catalogue. */
    let probes = null;
    if (req.query.probe === '1') {
      const urls = products.map((p) => feedBuilder.build(p).imageLink).filter(Boolean);
      probes = await imageProbe.probeAll(urls, { concurrency: 6 });
    }

    const selectionMode = config.selectionMode || 'all';
    const rows = products.map((product) => {
      const result = validators.validate(product, {
        channel,
        selectionMode,
        imageProbe: probes ? probes.get(feedBuilder.build(product).imageLink) : null,
      });
      return {
        product,
        result,
        status: validators.statusOf(result),
        hash: feedBuilder.hash(result.payload),
      };
    });

    const summary = rows.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      acc.totalIssues += r.result.issues.length;
      if (r.result.errors) acc.errorIssues += r.result.errors;
      if (r.result.warnings) acc.warningIssues += r.result.warnings;
      /* What the feed actually contains right now. "In Google" and
         "Awaiting sync" used to be counted here from lastSyncStatus, which
         only the API push ever wrote — with the push gone they would have
         frozen at whatever the final sync left behind and quietly lied
         from then on. A feed has no such state to report: either an item
         is in the file Google fetches or it is not, and that is knowable
         from the validation above without asking anyone. */
      if (r.status !== 'excluded' && !r.result.errors) acc.inFeed++;
      return acc;
    }, { ready: 0, warning: 0, error: 0, excluded: 0, totalIssues: 0, errorIssues: 0, warningIssues: 0, inFeed: 0 });

    /* Issue frequency across the catalogue. One product with a missing
       GTIN is a task; forty is a process problem, and the difference is
       what decides where to spend an afternoon. */
    /* Counted ONLY over products that are actually going to the channel.
       A product deliberately held back is not a problem to solve, and
       listing its issues turns a work queue into a wall of things the
       operator has already decided about. Its issues are still on its own
       page, so nothing is hidden — it just stops being nagged about. */
    const counted = rows.filter((r) => !r.result.excluded);
    const issueTally = new Map();
    counted.forEach((r) => r.result.issues.forEach((i) => {
      const entry = issueTally.get(i.code) || { ...i, count: 0, slugs: [] };
      entry.count++;
      if (entry.slugs.length < 12) entry.slugs.push(r.product.slug);
      issueTally.set(i.code, entry);
    }));
    const topIssues = [...issueTally.values()].sort((a, b) => {
      const rank = { error: 0, warning: 1, info: 2 };
      return rank[a.severity] - rank[b.severity] || b.count - a.count;
    });

    /* Account health came from the Content API and went with it. Merchant
       Center's own Diagnostics page is where disapprovals are read now, and
       it is authoritative in a way a mirrored panel never was. */

    /* ── One row per feed ─────────────────────────────────────────────
       Each storefront is one Merchant Center submission, so the panel
       shows what each one would actually contain: its URL, its label, the
       countries it covers and how many products are priced for it. That
       last number is the one worth seeing — a feed with zero eligible
       products is a submission that will report an empty catalogue, and
       Google reads an empty feed as "this merchant sells nothing" and
       removes the listings rather than leaving the previous fetch alone. */
    const marketsCfg = require('../config/markets');
    const marketService = require('../services/market');
    const openMarkets = await marketService.sellableNow();
    const feedRows = marketsCfg.feeds().map((f) => {
      const eligible = products.filter((p) => {
        const r = validators.validate(p, { channel, selectionMode, market: f.market });
        return r.eligible;
      }).length;
      return {
        id: f.market.id,
        name: f.market.name,
        flag: f.market.flag,
        currency: f.market.currency,
        label: f.label,
        countries: f.countries,
        url: f.url,
        isDefault: !!f.market.isDefault,
        open: openMarkets.some((m) => m.id === f.market.id),
        priced: eligible,
      };
    });

    res.render('admin/distribution', {
      layout: false,
      query: req.query,
      feedRows,
      siteOrigin: feedBuilder.siteOrigin(),
      channel,
      channels: distribution.CHANNELS,
      available: distribution.available(),
      planned: distribution.planned(),
      config,
      rows: rows.sort((a, b) => a.result.score - b.result.score),
      summary,
      topIssues,
      probed: !!probes,
      connectionGap: config.connectionGap ? config.connectionGap() : null,
      selectionMode,
      uncountedIssueProducts: rows.length - counted.length,
      defaults: distribution.defaults,
      refused: autofix.REFUSED,
    });
  } catch (err) {
    console.error('[distribution] dashboard:', err);
    res.status(500).send('Server error. Check the server logs.');
  }
});

/* ── Per-product detail and controls ───────────────────── */

router.get('/product/:slug', requireAuth, async (req, res) => {
  try {
    const channel = req.query.channel || 'google';
    const product = await Product.findOne({ slug: req.params.slug }).lean();
    if (!product) return res.redirect('/admin/distribution');

    const config = await getConfig(channel);
    const selectionMode = config.selectionMode || 'all';
    const payload = feedBuilder.build(product, { channel });
    const probe = await imageProbe.probe(payload.imageLink);
    const result = validators.validate(product, { channel, selectionMode, imageProbe: probe });
    const fixes = autofix.plan(product);

    res.render('admin/distribution-product', {
      layout: false,
      query: req.query,
      channel,
      product,
      result,
      status: validators.statusOf(result),
      selectionMode,
      /* Where the preorder state came from. "Why does it think this is a
         preorder?" is unanswerable from the product form when the cause is
         a leftover tag rather than the checkbox. */
      preorderSource: product.preorder
        ? 'the Preorder checkbox'
        : ((product.tags || []).includes('preorder') ? 'the “preorder” tag' : null),
      release: preorderCfg.releaseInfo(product),
      tradingName: company.business.tradingName,
      payload: result.payload,
      probe,
      fixes,
      refused: autofix.REFUSED,
      xml: fileProvider.toXml([result.payload]),
      defaults: distribution.defaults,
      tcgTypes: validators.TCG_TYPES,
    });
  } catch (err) {
    console.error('[distribution] product:', err);
    res.status(500).send('Server error. Check the server logs.');
  }
});

router.post('/product/:slug', requireAuth, async (req, res) => {
  try {
    const b = req.body;
    const cfg = await getConfig(b.channel || 'google');
    const selectionMode = cfg.selectionMode || 'all';
    const toArray = (v) => (Array.isArray(v) ? v : (v ? [v] : []));
    await Product.updateOne({ slug: req.params.slug }, {
      $set: {
        /* Both lists are written from the one checkbox the form showed,
           which is the one for the channel's current mode. The other list
           is left exactly as it was, so switching modes back restores the
           earlier decision instead of inheriting this one. */
        ...(selectionMode === 'selected'
          ? { 'merchant.included.google': b.sendToGoogle === 'on' }
          : { 'merchant.excluded.google': b.excludeGoogle === 'on' }),
        'merchant.title': (b.mTitle || '').trim(),
        'merchant.description': (b.mDescription || '').trim(),
        'merchant.imageLink': (b.mImageLink || '').trim(),
        'merchant.googleCategory': (b.googleCategory || '').trim(),
        'merchant.googleProductType': (b.googleProductType || '').trim(),
        'merchant.identifierExists': b.identifierExists !== 'off',
        'merchant.isBundle': b.isBundle === 'on',
        'merchant.multipack': parseInt(b.multipack, 10) || 0,
        'merchant.adult': b.adult === 'on',
        'merchant.shippingLabel': (b.shippingLabel || '').trim(),
        'merchant.taxCategory': (b.taxCategory || '').trim(),
        'merchant.excludedDestinations': toArray(b.excludedDestinations),
        /* Clearing the hash forces the next sync to resend this product.
           Without it, an edit that changes the payload would still be
           skipped as "unchanged" if the hash happened to match a stale
           value. */
        'merchant.lastSyncHash': '',
      },
    });
    res.redirect(`/admin/distribution/product/${req.params.slug}?saved=1`);
  } catch (err) {
    res.status(500).send('Server error. Check the server logs.');
  }
});

/* ── Which products go to the channel ──────────────────── */

/**
 * Switches between "everything except what I exclude" and "only what I
 * select".
 *
 * Deliberately does NOT clear either list. Somebody trying the other mode
 * to see what it does should be able to switch straight back and find
 * their decisions intact.
 */
router.post('/selection-mode', requireAuth, async (req, res) => {
  try {
    const channel = req.body.channel || 'google';
    const cfg = await getConfig(channel);
    cfg.selectionMode = req.body.selectionMode === 'selected' ? 'selected' : 'all';
    await cfg.save();
    res.redirect(`/admin/distribution?channel=${channel}&saved=1`);
  } catch (err) {
    res.status(500).send('Server error. Check the server logs.');
  }
});

/**
 * Bulk include/exclude from the products table.
 *
 * Writes the list the channel's current mode actually reads, so the button
 * the admin pressed and the effect it has are the same thing. The other
 * list is untouched for the reason given on the model.
 *
 * Clearing lastSyncHash on every affected product is what makes the change
 * take effect: without it a product that is being re-included would still
 * match its stored hash and be skipped as "unchanged", and the admin would
 * watch a sync run and see nothing happen.
 */
router.post('/bulk', requireAuth, async (req, res) => {
  try {
    const channel = req.body.channel || 'google';
    const cfg = await getConfig(channel);
    const selectionMode = cfg.selectionMode || 'all';
    const slugs = Array.isArray(req.body.slugs) ? req.body.slugs : (req.body.slugs ? [req.body.slugs] : []);

    /* 'send' and 'hold' rather than 'include'/'exclude': the same button
       has to set a flag in one mode and clear a different flag in the
       other, so the action names what the admin wants to happen, not which
       field it lands in. */
    const wantsSend = req.body.action === 'send';

    if (!slugs.length) {
      return res.redirect(`/admin/distribution?channel=${channel}&error=` + encodeURIComponent('Select at least one product first.'));
    }

    const field = selectionMode === 'selected'
      ? `merchant.included.${channel}`
      : `merchant.excluded.${channel}`;
    const value = selectionMode === 'selected' ? wantsSend : !wantsSend;

    const result = await Product.updateMany(
      { slug: { $in: slugs } },
      { $set: { [field]: value, 'merchant.lastSyncHash': '' } }
    );

    res.redirect(`/admin/distribution?channel=${channel}&bulk=${result.modifiedCount}&action=${wantsSend ? 'send' : 'hold'}`);
  } catch (err) {
    res.status(500).send('Server error. Check the server logs.');
  }
});

/** Applies the safe repairs for one product. */
router.post('/product/:slug/autofix', requireAuth, async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).lean();
    if (!product) return res.redirect('/admin/distribution');
    const { patch } = autofix.plan(product);
    if (Object.keys(patch).length) {
      await Product.updateOne({ slug: req.params.slug }, { $set: { ...patch, 'merchant.lastSyncHash': '' } });
    }
    res.redirect(`/admin/distribution/product/${req.params.slug}?fixed=${Object.keys(patch).length}`);
  } catch (err) {
    res.status(500).send('Server error. Check the server logs.');
  }
});

/** Applies the safe repairs across the whole catalogue. */
router.post('/autofix-all', requireAuth, async (req, res) => {
  try {
    const products = await Product.find({}).lean();
    let changed = 0;
    for (const product of products) {
      const { patch } = autofix.plan(product);
      if (Object.keys(patch).length) {
        await Product.updateOne({ _id: product._id }, { $set: { ...patch, 'merchant.lastSyncHash': '' } });
        changed++;
      }
    }
    res.redirect(`/admin/distribution?fixed=${changed}`);
  } catch (err) {
    res.status(500).send('Server error. Check the server logs.');
  }
});

/* ── Connection ────────────────────────────────────────── */

/* ── The Content API push, and everything that fed it, is gone ────────
 *
 * WHAT WENT: the OAuth connect/callback/select/disconnect flow, the stored
 * merchant credentials, the manual and scheduled sync, the retry, and the
 * per-run history pages. With them went services/distribution/syncEngine.js,
 * services/distribution/providers/google.js, cron/distributionScheduler.js
 * and the SyncRun model.
 *
 * WHY: Merchant Center fetches https://gogetcards.com/feed/google.xml on a
 * schedule and that has worked. The push path was a second transport for the
 * identical payload — same feedBuilder, same validators — so it bought
 * immediacy and nothing else, in exchange for an OAuth integration, stored
 * Google credentials, a scheduler, a run history, and a second code path
 * that could disagree with the feed about what had been published. A catalogue
 * this size does not need a product live thirty minutes sooner.
 *
 * WHAT STAYED, because the feed depends on it: this page's product list and
 * readiness scoring, the per-product merchant overrides, the selection mode,
 * the autofixes and the export preview below. Those shape what the feed
 * contains; they were never part of the transport.
 */

router.get('/export.:format', requireAuth, async (req, res) => {
  try {
    const products = await Product.find({}).lean();
    const cfg = await getConfig('google');
    const payloads = products
      .map((p) => validators.validate(p, { channel: 'google', selectionMode: cfg.selectionMode || 'all' }))
      .filter((r) => r.eligible)
      .map((r) => r.payload);

    const formats = {
      xml: { body: () => fileProvider.toXml(payloads), type: 'application/xml' },
      csv: { body: () => fileProvider.toCsv(payloads), type: 'text/csv' },
      json: { body: () => fileProvider.toJson(payloads), type: 'application/json' },
    };
    const chosen = formats[req.params.format];
    if (!chosen) return res.status(404).send('Unknown format. Use xml, csv or json.');

    res.type(chosen.type);
    res.setHeader('Content-Disposition', `attachment; filename="gogetcards-feed.${req.params.format}"`);
    res.send(chosen.body());
  } catch (err) {
    res.status(500).send('Server error. Check the server logs.');
  }
});

module.exports = router;
