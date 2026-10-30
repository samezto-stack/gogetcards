/*
 * The partner-sites settings screen, rendered for real.
 *
 * check-rotation.js covers the arithmetic against pure functions. This covers
 * the other half: that the screen an operator makes decisions from says what
 * the checkout will actually do.
 *
 * The failures worth catching are all silent. A product priced off the grid
 * simply stops going to partners, and the settings page looks fine. A saved
 * API key rendered back into an input is a secret in the page source. "Next
 * order" marked on two sites at once, or none, means the strip is describing
 * a cycle the checkout is not running.
 *
 * Run:  node scripts/audit/check-partner-sites.js
 */
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const rot = require(path.join(ROOT, 'services/partnerRotation'));

let fails = 0;
const check = (name, ok, detail) => {
  if (!ok) { fails++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`pass  ${name}`);
};

/* Available products only — the settings route filters on available:true,
   because offering to route buyers at something not for sale is a dead end. */
const PRODUCTS = [
  { slug: 'one-step', title: 'One Step Product', price: 7499 },
  { slug: 'three-step', title: 'Three Step Product', price: 22497 },
  { slug: 'five-step', title: 'Five Step Product', price: 37495 },
  { slug: 'off-grid', title: 'Off Grid Product', price: 29999 },
];

function site(id, over = {}) {
  return {
    id,
    name: id.replace(/-/g, ' '),
    url: `https://${id}.onrender.com/services/thing`,
    baseUrl: `https://${id}.onrender.com`,
    unitCents: 7499,
    plans: Array.from({ length: 12 }, (_, i) => `plan_${id}_${i + 1}`),
    enabled: true,
    stats: { orders: 3, lastOrderAt: new Date() },
    ...over,
  };
}

const CONFIG = {
  enabled: true,
  apiKey: 'encrypted:shared',
  savedSites: [
    site('coverage-desk'),
    site('award-cycle', { enabled: false }),
    /* A half-filled ladder: rung 6 blank, so it cannot carry two of a
       three-step product. */
    site('defense-date', { plans: Array.from({ length: 12 }, (_, i) => (i === 5 ? '' : `plan_dd_${i + 1}`)) }),
  ],
  cursor: 'defense-date',
  history: [
    { at: new Date(), orderId: 'ord_1', productSlug: 'three-step', siteId: 'coverage-desk', siteName: 'coverage desk' },
  ],
};

const mapping = rot.mapping(CONFIG, PRODUCTS);
const ladders = CONFIG.savedSites.map((s) => ({ id: s.id, ...rot.ladderStatus(s) }));
const order = rot.rotationOrder(CONFIG);

const full = fs.readFileSync(path.join(ROOT, 'views/admin/settings.ejs'), 'utf8');
const start = full.indexOf('        <%\n          /* Partner Sites.');
const end = full.indexOf('        <%/* Integration switches.');
check('the partner-sites block is present', start > 0 && end > start, `start=${start} end=${end}`);

let html = '';
if (start > 0 && end > start) {
  const block = full.slice(start, end);
  try {
    html = ejs.render(block, {
      partnerExperience: CONFIG,
      partnerProducts: PRODUCTS,
      partnerMapping: mapping,
      partnerLadders: ladders,
      partnerOrder: order,
      partnerHistory: CONFIG.history,
      /* The real page always has these; without them the per-market ladders
         render as nothing and every assertion about them passes vacuously. */
      allMarkets: require(path.join(ROOT, 'config/markets')).MARKETS,
    }, { filename: path.join(ROOT, 'views/admin/settings.ejs') });
    check('the block renders', html.length > 800, `${html.length} bytes`);
  } catch (e) {
    check('the block renders', false, e.message);
  }
}

if (html) {
  /* ── Who is next ─────────────────────────────────────────────────
     The numbered cycle strip is gone: the list is one row per site and
     the answer lives on the row it belongs to, plus once in the summary.
     What still has to hold is that the screen and the engine agree, and
     that they agree in exactly one place — "Next order" on two rows, or
     on none, means the page is describing a cycle the checkout is not
     running. */
  check('exactly one row is marked as next',
    (html.match(/px-pill--next">Next order/g) || []).length === 1,
    String((html.match(/px-pill--next">Next order/g) || []).length));
  check('the row marked next is the one the cursor names', (() => {
    const row = (html.match(/<button type="button" class="px-row[^"]*px-row--next[\s\S]*?<\/button>/) || [''])[0];
    return row.includes('defense date');
  })());
  check('the summary names the same site as the row', (() => {
    const cell = (html.match(/Next order<\/span>\s*<span class="px-summary__v">([^<]*)/) || [])[1] || '';
    return cell.trim() === 'defense date';
  })());
  check('the summary counts only sites that can take an order', (() => {
    const m = html.match(/px-summary__v">(\d+) <span class="px-summary__of">of (\d+)/);
    return m && m[1] === String(rot.activeSites(CONFIG).length) && m[2] === '3';
  })(), (html.match(/px-summary__v">(\d+) <span class="px-summary__of">of (\d+)/) || []).slice(1).join(' of '));
  check('a paused site is never the one marked next', (() => {
    const row = (html.match(/<button type="button" class="px-row[^"]*px-row--next[\s\S]*?<\/button>/) || [''])[0];
    return !row.includes('award cycle');
  })());
  check('the order log is linked rather than inlined',
    html.includes('/admin/partner-log') && !html.includes('px-log'));

  /* ── The mapping ── */
  check('the map lists every product', PRODUCTS.every((p) => html.includes(p.title)));
  check('a three-step product shows max qty 4', (() => {
    const row = (html.match(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*Three Step Product[\s\S]*?<\/tr>/) || [''])[0];
    return row.includes('>3<') && row.includes('>4<');
  })(), 'steps/max-qty not shown');
  check('a five-step product shows max qty 2', (() => {
    const row = (html.match(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*Five Step Product[\s\S]*?<\/tr>/) || [''])[0];
    return row.includes('>5<') && row.includes('>2<');
  })());
  check('an off-grid product says why, with the nearest workable prices',
    html.includes('299.96') && html.includes('374.95'));
  check('an off-grid product is not shown as served', (() => {
    const row = (html.match(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*Off Grid Product[\s\S]*?<\/tr>/) || [''])[0];
    return row.includes('px-map__row--out');
  })());

  /* ── Secrets, and the two fields that are gone ── */
  check('no API key reaches the page', !html.includes('encrypted:'));
  check('there is no per-site API key field', !html.includes('name="siteApiKey"'));
  check('there is no per-site experience id field', !html.includes('name="siteExperienceId"'));

  /* ── The ladder ── */
  check('the twelve plan ids are one textarea, not twelve fields', (() => {
    /* One per site card, plus one on the add form. */
    return (html.match(/name="sitePlans"/g) || []).length === CONFIG.savedSites.length + 1
      && !html.includes('name="sitePlan1"');
  })(), String((html.match(/name="sitePlans"/g) || []).length));
  check('the ladder prices are shown beside it',
    html.includes('$74.99') && html.includes('$899.88'));
  check('an incomplete ladder is counted on the card', html.includes('11/12 plans'));
  check('the ladder round-trips its ids', html.includes('plan_coverage-desk_1'));
  check('the ladder textarea is not left to the browser default', (() => {
    /* It sits outside .form-group, so without its own rule it renders as a
       white box in a dark panel. */
    const css = fs.readFileSync(path.join(ROOT, 'public/css/admin.css'), 'utf8');
    const rule = (css.match(/\.px-ladder__body textarea \{[\s\S]*?\}/) || [''])[0];
    return rule.includes('var(--admin-bg)') && rule.includes('var(--admin-text)');
  })());

  /* ── Collapsing ──
     A finished site should be one line; an unfinished one must open itself,
     because the ladder it would hide is the only thing needing attention. */
  /* ── One row per site, editing behind it ─────────────────────────
     Cards that unfolded inline became unreadable at ten sites. The rule
     that replaced them: every site is exactly one row, every row opens
     exactly one dialog, and the row alone carries enough to decide
     whether anything needs doing. */
  check('every site is one row and one dialog', (() => {
    const rows = (html.match(/<button type="button" class="px-row/g) || []).length;
    const dialogs = (html.match(/<dialog class="px-modal"/g) || []).length;
    return rows === 3 && dialogs === 3;
  })());
  check('the row shows status without opening anything', (() => {
    const row = (html.match(/<button type="button" class="px-row[\s\S]*?award cycle[\s\S]*?<\/button>/) || [''])[0];
    return row.includes('award cycle') && row.includes('Paused') && row.includes('orders');
  })());
  check('an incomplete ladder is flagged on the row itself', (() => {
    const row = (html.match(/<button type="button" class="px-row[\s\S]*?defense date[\s\S]*?<\/button>/) || [''])[0];
    return row.includes('11/12 plans');
  })());
  check('the editor for a site is inside its own dialog', (() => {
    const dlg = (html.match(/<dialog class="px-modal" id="px-modal-coverage-desk">[\s\S]*?<\/dialog>/) || [''])[0];
    return dlg.includes('name="sitePlans"') && dlg.includes('plan_coverage-desk_1');
  })());
  check('every dialog is closed properly',
    (html.match(/<dialog/g) || []).length === (html.match(/<\/dialog>/g) || []).length);
  check('the market ladders are tabbed, and all of them still submit', (() => {
    const dlg = (html.match(/<dialog class="px-modal" id="px-modal-coverage-desk">[\s\S]*?<\/dialog>/) || [''])[0];
    const panels = (dlg.match(/data-px-panel=/g) || []).length;
    const textareas = (dlg.match(/name="ladder_[A-Z]+_plans"/g) || []).length;
    /* Hidden, never removed: a panel that unmounted would drop its ladder
       from the POST and silently wipe a market on the next save. */
    return panels === 4 && textareas === 3 && !dlg.includes('display:none');
  })());

  /* ── Controls ── */
  check('each site can be paused', html.includes('/toggle'));
  check('each site can be removed permanently', html.includes('/delete'));
  check('counters can be reset', html.includes('/reset-stats'));
  check('a site can be added', html.includes('/sites/add'));
  check('side actions use formaction, not nested forms', (() => {
    /* A <form> inside a <form> is dropped by the parser, so the buttons
       would post somewhere else with no error anywhere. */
    return !/<form[^>]*>(?:(?!<\/form>)[\s\S])*<form/.test(html);
  })());

  /* ── Nothing left over from the shapes this replaced ── */
  for (const dead of ['siteProductSlugs', 'productPlanId', 'productLadder', 'data-px-picker', 'px-prow']) {
    check(`no leftover ${dead}`, !html.includes(dead));
  }

  /* ── Empty state ── */
  const emptyHtml = ejs.render(full.slice(start, end), {
    partnerExperience: { savedSites: [] },
    partnerProducts: PRODUCTS,
    partnerMapping: [],
    partnerLadders: [],
    partnerOrder: [],
    partnerHistory: [],
  }, { filename: path.join(ROOT, 'views/admin/settings.ejs') });
  check('the empty state renders', emptyHtml.includes('No partner sites yet'));
  check('the empty state marks no site as next',
    !emptyHtml.includes('px-pill--next') && !emptyHtml.includes('px-row--next'));
}

/* ── Groups ──────────────────────────────────────────────────────────
   A group is a switch over several sites at once. The rule that has to
   hold is that the two flags are ANDed: pausing a group can never leave
   one of its members quietly still selling, and resuming a group can
   never wake a site that was paused on its own. Everything downstream —
   the rotation, marketsServed, eligibility — reads activeSites, so this
   is the one place the rule can be enforced or broken. */
{
  const G = {
    groups: [
      { id: 'live', name: 'Live', enabled: true },
      { id: 'held', name: 'Held', enabled: false },
    ],
    savedSites: [
      site('a', { groupId: 'live' }),
      site('b', { groupId: 'live', enabled: false }),
      site('c', { groupId: 'held' }),
      site('d', { groupId: 'deleted-group' }),
      site('e'),
    ],
  };
  const active = rot.activeSites(G).map((x) => x.id).sort().join(',');
  check('a live group lets its enabled sites through', active.includes('a'));
  check('a site paused on its own stays paused inside a live group', !active.includes('b'));
  check('a paused group holds back a site that is switched on', !active.includes('c'));
  check('a site whose group was deleted keeps its own flag', active.includes('d'));
  check('an ungrouped site answers to its own flag alone', active.includes('e'));
  check('the two flags are ANDed, never ORed', active === 'a,d,e', active);

  /* The reason matters as much as the fact: "paused" and "paused with its
     group" have different fixes, and a screen that says only the first
     sends you to the wrong switch. */
  check('the screen can tell the two kinds of paused apart',
    rot.pausedBy(G, G.savedSites[1]) === 'site'
    && rot.pausedBy(G, G.savedSites[2]) === 'group'
    && rot.pausedBy(G, G.savedSites[0]) === null);

  /* A market opens only where it can be charged, and a group holds back
     the ladders of everything inside it. Worth asserting because closing
     a market is exactly what a careless group pause would do silently. */
  const withLadders = {
    groups: [{ id: 'held', name: 'Held', enabled: false }],
    savedSites: [site('only-ca', {
      groupId: 'held',
      ladders: { CA: { unitCents: 10999, plans: Array.from({ length: 12 }, (_, i) => `plan_ca_${i + 1}`) } },
    })],
  };
  check('pausing a group withdraws the markets only it could charge',
    rot.marketsServed(withLadders).length === 0,
    rot.marketsServed(withLadders).join(','));
}

/* ── The routes and wiring behind the screen ── */
const adminSrc = fs.readFileSync(path.join(ROOT, 'routes/admin.js'), 'utf8');
for (const route of [
  '/settings/partner-experience/groups/add',
  "/settings/partner-experience/groups/:id'",
  '/settings/partner-experience/groups/:id/toggle',
  '/settings/partner-experience/groups/:id/delete',
  '/settings/partner-experience/sites/add',
  "/settings/partner-experience/sites/:id'",
  '/settings/partner-experience/sites/:id/toggle',
  '/settings/partner-experience/sites/:id/reset-stats',
]) {
  check(`route ${route} is defined`, adminSrc.includes(route));
}
check('settings migrates an older config on load', adminSrc.includes('partnerRotation.migrate'));
check('the catalogue is filtered to products on sale', adminSrc.includes('Product.find({ available: true }'));
check('the site form no longer reads a key or an experience id',
  !adminSrc.includes('siteApiKey') && !adminSrc.includes('siteExperienceId'));
check('the dead saved-sites/add route is gone', (() => {
  /* Anchored on the ROUTE, not the name — the comment explaining its removal
     mentions it, and a test that matches prose fails on its own
     documentation. */
  return !adminSrc.includes("router.post('/settings/partner-experience/saved-sites/add'");
})());
check('removing a site is still possible', adminSrc.includes('saved-sites/:id/delete'));
check('saving the switches does not wipe the rotation', (() => {
  /* The integration form rebuilds the config object. Without spreading the
     existing one first it dropped the cursor and the history on every save,
     restarting the cycle whenever anyone touched a checkbox. */
  return adminSrc.includes('...existingConfig,\n      enabled: isEnabled');
})());

const viewSrc = fs.readFileSync(path.join(ROOT, 'views/admin/settings.ejs'), 'utf8');
for (const dead of ['routeUrl', 'routeSlugs', 'addPartnerRoute', 'SAVED_SITES', 'routeBundlePlans']) {
  check(`the routes UI is gone: ${dead}`, !viewSrc.includes(dead));
}

const feSrc = fs.readFileSync(path.join(ROOT, 'routes/frontend.js'), 'utf8');
check('the checkout asks the rotation', feSrc.includes('partnerRotation.nextSite'));
check('the checkout takes its plan from the grid', feSrc.includes('partnerRotation.planFor'));
check('the checkout uses one experience id for every host',
  feSrc.includes('partnerRotation.PARTNER_EXPERIENCE_ID'));
check('every refusal to use a partner says why', (() => {
  /* This function declining is indistinguishable from the outside from it
     never having been called. Six preconditions can decline, and a silent
     one turns a configuration gap into an unexplained error page. */
  return (feSrc.match(/return decline\(/g) || []).length >= 6;
})(), String((feSrc.match(/return decline\(/g) || []).length));
check('the switched-off case names the switch',
  feSrc.includes('Send buyers to partner sites'));
check('the checkout uses the one shared key', (() => {
  /* A per-site key would be an identical copy or a wrong one, and a wrong
     one fails as a refused token — indistinguishable from an unreachable
     host. */
  return !feSrc.includes('savedSite && savedSite.apiKey');
})());
check('legacy routes are no longer a second resolution path',
  !feSrc.includes('(partnerExperience.routes || []).find'));

const sessSrc = fs.readFileSync(path.join(ROOT, 'services/checkout/session.js'), 'utf8');
check('step 1 quotes from the same grid the hop charges from',
  sessSrc.includes('partnerRotation.planFor'));

const pipeSrc = fs.readFileSync(path.join(ROOT, 'services/orderPipeline/index.js'), 'utf8');
check('the advance is inside the isNew branch', (() => {
  const at = pipeSrc.indexOf('await advancePartnerRotation(order);');
  const isNewAt = pipeSrc.indexOf('if (isNew) {');
  return at > 0 && isNewAt > 0 && at > isNewAt;
})());
check('a failed advance never breaks the order',
  /try \{\s*await advancePartnerRotation\(order\);\s*\} catch/.test(pipeSrc));
/* The served site is still what the rotation advances FROM — the call is
   now advanceRotation, which decides whether the turn is over and hands
   the served site on to advanceCursor to decide where. Passing it remains
   the thing that keeps the cycle even when a site was skipped. */
check('the cursor advances from whoever served, keeping the cycle even',
  pipeSrc.includes('advanceRotation(config, served)'));
check('and the turn count is persisted alongside it, so a turn is not restarted',
  /cursorServed: rotation\.cursorServed/.test(pipeSrc));
check('each order is recorded in the activity log',
  pipeSrc.includes('partnerRotation.recordHistory'));

/* ── There is one checkout, and the Buy button reaches it ────────────────
 *
 * THE BUG THIS SECTION EXISTS FOR. The product page rendered its Buy
 * button's form only when partnerExperience.routes listed the slug, and
 * `routes` is the pre-rotation config shape that migrating deletes. So on
 * every migrated install the flag was false for every product at every
 * price, the button fell through to the Shopify checkout, and the buyer
 * met "Product Resolution Failed" — a symptom that tracked neither price
 * nor quantity, which is why two reasonable guesses at it were both wrong.
 *
 * Both other checkouts are deleted now, so the failure mode is gone with
 * them; these checks are what keeps either from growing back. */
const prodView = fs.readFileSync(path.join(ROOT, 'views/pages/product.ejs'), 'utf8');
check('the Buy button does not depend on the deleted routes config',
  !prodView.includes('showPartnerCheckout'));
check('the Buy button posts the checkout form',
  prodView.includes("document.getElementById('partner-checkout-form').submit()"));
check('no per-product URL can bypass checkout',
  !prodView.includes('checkoutUrlVal') && !prodView.includes('goToCheckout'));

check('a refusal ends on a page of ours, not another checkout',
  feSrc.includes('function checkoutUnavailable(res, slug)')
  && !/\/checkout-redirect\?slug=/.test(feSrc));

const flowSrc = fs.readFileSync(path.join(ROOT, 'routes/checkoutFlow.js'), 'utf8');
check('checkout/start refuses visibly instead of falling through',
  flowSrc.includes('frontend.checkoutUnavailable(res, slug)') && !flowSrc.includes('legacyFallback'));

for (const dead of ['ShopifyStore', 'VariantCache', 'StripeConfig', 'checkoutMode']) {
  check(`the deleted checkouts leave nothing behind: ${dead}`,
    !feSrc.includes(dead) && !flowSrc.includes(dead));
}
for (const gone of ['models/ShopifyStore.js', 'models/VariantCache.js',
                    'models/StripeConfig.js', 'routes/stripeWebhook.js']) {
  check(`${gone} is deleted`, !fs.existsSync(path.join(ROOT, gone)));
}

/* The removal has to hold outside routes/frontend.js too — an admin form
   that still writes checkoutMode, or a settings panel still offering the
   choice, is a second checkout waiting to be switched on. */
for (const f of ['routes/admin.js', 'server.js', 'views/admin/settings.ejs', 'views/pages/product.ejs']) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  check(`${f} names no checkout mode`,
    !/checkoutMode|stripe_static|shopify_rotator|ShopifyStore|StripeConfig/.test(src));
}
check('no route hands a buyer to a myshopify cart', !/myshopify\.com\/cart/.test(feSrc));
check('the refusal page says nothing was charged', /Nothing was charged/.test(feSrc));
check('the redirect helper the old Buy button used is gone',
  !fs.readFileSync(path.join(ROOT, 'public/js/zyphera.js'), 'utf8').includes('window.goToCheckout'));

/* ── Pooled email stays retired ──────────────────────────────────────
   The scheme substituted one of OUR addresses for the buyer's, so the
   order came back under an address we controlled. It is removed (see
   docs/pooled-email.md): the billing name and card belonged to a real
   person while the email did not, which is the shape a processor's risk
   model is built to catch, and it left a paying customer unable to look
   up their own order.

   The checks are split deliberately. The first three say the WRITE path
   is gone. The last two say the RECORD is not — deleting it would not
   undo the scheme, it would only make its results unreadable, and one of
   those readers is the guard that stops us emailing "you left something
   behind" to somebody who paid. */
{
  const claims = /email:\s*assignedEmail|PartnerEmail\.findOneAndUpdate|status:\s*'available'\s*\}/;
  check('no route claims a pooled address', !claims.test(feSrc));
  check('the checkout sends the buyer\'s own address', /email:\s*customerEmail \|\| undefined/.test(feSrc));
  const adminSrc = fs.readFileSync(path.join(ROOT, 'routes/admin.js'), 'utf8');
  check('the pool cannot be added to, released or cleared from the admin',
    !/emails\/(add|release|clear)/.test(adminSrc));
  check('the release sweep that wiped the history is gone',
    !fs.existsSync(path.join(ROOT, 'cron/recoveryBot.js')));

  check('the record survives, and is downloadable',
    fs.existsSync(path.join(ROOT, 'services/partnerEmailHistory.js'))
    && fs.existsSync(path.join(ROOT, 'scripts/export-partner-emails.js'))
    && /emails\/export\.csv/.test(adminSrc));
  /* A paid checkout that used a pooled address is only recognisable BY
     that address — the payment carries it, not the customer's. Lose this
     and the sweep emails people about checkouts they completed. */
  check('the abandoned sweep still recognises a pooled-address payment',
    /pooledEmail/.test(fs.readFileSync(path.join(ROOT, 'services/abandonedCheckout/index.js'), 'utf8')));
  for (const [f, field] of [['models/Event.js', 'pooledEmail'], ['models/CheckoutSession.js', 'pooledEmail']]) {
    check(`${f} keeps its ${field} field`,
      new RegExp(`${field}:\\s*\\{`).test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
  }
}

console.log(fails ? `\n${fails} partner-site check(s) FAILED` : '\nAll partner-site checks pass');
process.exit(fails ? 1 : 0);
