/*
 * The partner price grid, and the rotation across sites.
 *
 * WHAT GOES WRONG HERE IS INVISIBLE, which is the whole reason for this file.
 * Whop charges what a plan id is configured for, regardless of what the page
 * displayed. So every arithmetic mistake below ends in a successful payment
 * for the wrong amount: an off-by-one on the grid sells a three-step product
 * at two steps' price, dividing 149.97 by 49.99 in floating point yields
 * 2.9999999999999996 and floors to 2, and rounding a near-miss undercharges
 * every order by four cents forever. None of them error, none appear in a
 * log, and all of them look like a working checkout.
 *
 * The rotation half has the same property: a cursor that never advances
 * sells everything through site one, one that advances twice skips site two,
 * and an index-based cursor points somewhere else the moment a site is
 * paused.
 *
 * Run:  node scripts/audit/check-rotation.js
 */
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const rot = require(path.join(ROOT, 'services/partnerRotation'));

let fails = 0;
const check = (name, ok, detail) => {
  if (!ok) { fails++; console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
  else console.log(`pass  ${name}`);
};

/* Prices in cents on the store's step — the three shapes the catalogue has.
   Derived from the service's own constants so the ladder can change length
   or unit without this file silently testing the previous grid. */
const UNIT = rot.DEFAULT_UNIT_CENTS;
const STEPS = rot.LADDER_STEPS;
const money = (cents) => (cents / 100).toFixed(2);
const ONE_STEP = { slug: 'one-step', title: 'One step', price: UNIT };            // max qty STEPS
const THREE_STEP = { slug: 'three-step', title: 'Three steps', price: 3 * UNIT }; // max qty floor(STEPS/3)
const FIVE_STEP = { slug: 'five-step', title: 'Five steps', price: 5 * UNIT };    // max qty floor(STEPS/5)
const OFF_GRID = { slug: 'off-grid', title: 'Off grid', price: 6 * UNIT + 5 };    // five cents off rung 6

function site(id, over = {}) {
  return {
    id,
    name: id,
    url: `https://${id}.example/services/x`,
    unitCents: UNIT,
    plans: Array.from({ length: STEPS }, (_, i) => `plan_${id}_${i + 1}`),
    enabled: true,
    stats: { orders: 0, lastOrderAt: null },
    ...over,
  };
}

/* ── The grid ── */
check('a one-step product is 1 unit', rot.unitsFor(site('a'), UNIT) === 1);
check('a three-step product is 3 units', rot.unitsFor(site('a'), 3 * UNIT) === 3);
check('a five-step product is 5 units', rot.unitsFor(site('a'), 5 * UNIT) === 5);
check(`the top of the ladder is ${STEPS} units`, rot.unitsFor(site('a'), STEPS * UNIT) === STEPS);

/* THE FLOAT TRAP, which is in the MODULO rather than the division. Many of
   the prices on a ladder give a non-zero float remainder — 524.93 % 74.99
   was 74.98999999999998 on the old grid — so a float grid check would reject
   them as mispriced and silently stop them going to partners at all. */
check('a float modulo would reject some valid prices', (() => {
  const prices = Array.from({ length: STEPS }, (_, i) => Number(money((i + 1) * UNIT)));
  const wouldFail = prices.filter((p) => p % (UNIT / 100) !== 0).length;
  return wouldFail > 0;
})(), 'the premise of the next check no longer holds');
check('every price on the ladder is recognised, in integer cents', (() => {
  const prices = Array.from({ length: STEPS }, (_, i) => (i + 1) * UNIT);
  return prices.every((cents, i) => rot.unitsFor(site('a'), cents) === i + 1);
})());

check(`max quantity for a one-step product is ${STEPS}`, rot.maxQuantity(site('a'), UNIT) === STEPS);
check(`max quantity for a three-step product is ${Math.floor(STEPS / 3)}`, rot.maxQuantity(site('a'), 3 * UNIT) === Math.floor(STEPS / 3));
check(`max quantity for a five-step product is ${Math.floor(STEPS / 5)}`, rot.maxQuantity(site('a'), 5 * UNIT) === Math.floor(STEPS / 5));

/* ── Off the grid is refused, never rounded ── */
check('a price off the grid has no unit count', rot.unitsFor(site('a'), OFF_GRID.price) === null);
check('a price off the grid gets no plan, rather than the rung below',
  rot.planFor(site('a'), OFF_GRID.price, 1) === null);
check('the reason names the nearest workable prices', (() => {
  const r = rot.siteForProduct(site('a'), OFF_GRID);
  return r.reason === 'price-off-grid' && r.detail.includes(money(6 * UNIT)) && r.detail.includes(money(7 * UNIT));
})(), JSON.stringify(rot.siteForProduct(site('a'), OFF_GRID)));
check('a price above the ladder is refused', (() => {
  const r = rot.siteForProduct(site('a'), { price: (STEPS + 1) * UNIT }); // one step past the top
  return !r.ok && r.reason === 'above-ladder';
})());

/* ── Plan selection ── */
const MAX3 = Math.floor(STEPS / 3);
const MAX5 = Math.floor(STEPS / 5);
check('a three-step product maps each quantity to rung 3 x quantity',
  Array.from({ length: MAX3 }, (_, i) => i + 1).every((q) => {
    const p = rot.planFor(site('a'), 3 * UNIT, q);
    return p && p.step === 3 * q && p.whopPlanId === `plan_a_${3 * q}`;
  }));
check('a three-step product refuses one quantity past the top', rot.planFor(site('a'), 3 * UNIT, MAX3 + 1) === null);
check('a five-step product maps qty 1,2 to rungs 5,10', (() => {
  const a = rot.planFor(site('a'), 5 * UNIT, 1);
  const b = rot.planFor(site('a'), 5 * UNIT, 2);
  return a.step === 5 && b.step === 10;
})());
check('a five-step product refuses one quantity past the top', rot.planFor(site('a'), 5 * UNIT, MAX5 + 1) === null);
check('the price comes from the grid, and agrees with price x quantity', (() => {
  const p = rot.planFor(site('a'), 3 * UNIT, 2);
  /* They agree BY CONSTRUCTION — the plan was chosen for charging exactly
     this — which is what stops the displayed and charged figures diverging. */
  return p.priceCents === 6 * UNIT && p.priceCents === 3 * UNIT * 2;
})());
check('planFor tolerates junk quantities',
  rot.planFor(site('a'), UNIT, 'x').step === 1
  && rot.planFor(site('a'), UNIT, 0).step === 1
  && rot.planFor(site('a'), UNIT, -3).step === 1);
check('planFor tolerates a missing site', rot.planFor(null, UNIT, 1) === null);
check('a zero-priced product is refused', rot.planFor(site('a'), 0, 1) === null);

/* ── A gap in the ladder ── */
const gapped = site('g', { plans: Array.from({ length: STEPS }, (_, i) => (i === 5 ? '' : `plan_g_${i + 1}`)) });
check('a missing rung refuses only the quantity that needs it',
  rot.planFor(gapped, 3 * UNIT, 1) !== null && rot.planFor(gapped, 3 * UNIT, 2) === null);
check('a gap that blocks a quantity marks the product unservable', (() => {
  const r = rot.siteForProduct(gapped, THREE_STEP);
  return !r.ok && r.reason === 'missing-plans' && r.detail.includes('6');
})());
check('a gap that blocks nothing leaves the product servable', (() => {
  /* A five-step product uses rungs 5 and 10, so a blank rung 6 is irrelevant
     to it — and excluding it would drop a site from rotation for no reason. */
  return rot.siteForProduct(gapped, FIVE_STEP).ok === true;
})());
check('ladderStatus counts the filled rungs', (() => {
  const st = rot.ladderStatus(gapped);
  return st.filled === STEPS - 1 && st.total === STEPS && st.complete === false;
})());

/* ── Rotation ── */
/* Drives real orders through the rotation. The cursor is GLOBAL, so the
   product only decides whether a site can price this particular order — it
   never gets its own cycle. */
function run(config, product, n) {
  const seq = [];
  const cfg = { ...config };
  for (let i = 0; i < n; i++) {
    const s = rot.nextSite(cfg, product);
    seq.push(s ? s.id : null);
    /* From whoever SERVED, exactly as the pipeline does — advancing from the
       cursor instead hands the next order back to the site that just sold
       whenever anything was skipped. */
    const next = rot.advanceCursor(cfg, s);
    if (next) cfg.cursor = next;
  }
  return seq;
}

const three = { savedSites: [site('a'), site('b'), site('c')] };
check('three active sites cycle a,b,c,a,b,c',
  run(three, THREE_STEP, 6).join(',') === 'a,b,c,a,b,c', run(three, THREE_STEP, 6).join(','));
check('a single site is served every time',
  run({ savedSites: [site('a')] }, THREE_STEP, 4).join(',') === 'a,a,a,a');
check('a single site never advances the cursor',
  rot.advanceCursor({ savedSites: [site('a')] }) === null);
check('no sites yields null', rot.nextSite({ savedSites: [] }, THREE_STEP) === null);
check('a missing config does not throw', rot.nextSite(null, THREE_STEP) === null);

/* A site on a different step sits out when the price does not fit it — the
   case a single shared ladder could not express. */
const oddStep = { savedSites: [site('a'), site('b', { unitCents: 5000 }), site('c')] };
check('a site on a different step sits out when the price does not fit',
  run(oddStep, THREE_STEP, 4).join(',') === 'a,c,a,c', run(oddStep, THREE_STEP, 4).join(','));
check('and serves a product that does fit its own step',
  rot.planFor(site('b', { unitCents: 5000 }), 20000, 1).step === 4);

check('a paused site is skipped entirely',
  run({ savedSites: [site('a'), site('b', { enabled: false }), site('c')] }, THREE_STEP, 4).join(',') === 'a,c,a,c');
check('a site with no link is skipped',
  run({ savedSites: [site('a'), site('b', { url: '' }), site('c')] }, THREE_STEP, 4).join(',') === 'a,c,a,c');
check('a site with no ladder is skipped',
  run({ savedSites: [site('a'), site('b', { plans: [] }), site('c')] }, THREE_STEP, 4).join(',') === 'a,c,a,c');

/* ── THE CASES AN INDEX CURSOR GETS WRONG ── */
check('the cursor survives a site being paused mid-cycle',
  rot.nextSite({ savedSites: [site('a'), site('b', { enabled: false }), site('c')], cursor: 'c' }, THREE_STEP).id === 'c');
check('the cursor survives reordering',
  rot.nextSite({ savedSites: [site('c'), site('a'), site('b')], cursor: 'b' }, THREE_STEP).id === 'b');
check('a cursor pointing at a deleted site restarts rather than misfires',
  rot.nextSite({ savedSites: [site('a'), site('c')], cursor: 'b' }, THREE_STEP).id === 'a');
check('advancing from the last wraps to the first',
  rot.advanceCursor({ savedSites: [site('a'), site('b'), site('c')], cursor: 'c' }) === 'a');
check('a new site joins the cycle in place',
  run({ savedSites: [site('a'), site('b'), site('c'), site('d')], cursor: 'c' }, THREE_STEP, 4).join(',') === 'c,d,a,b');
/* ── THE CYCLE IS GLOBAL ──
   Order 1 to X#1, order 2 to X#2, order 3 to X#3, order 4 back to X#1 —
   whatever was bought each time. Not one cycle per product. */
check('an order for one product advances the cycle for every product', (() => {
  const cfg = { savedSites: [site('a'), site('b'), site('c')] };
  const first = rot.nextSite(cfg, THREE_STEP).id;
  cfg.cursor = rot.advanceCursor(cfg);
  /* A DIFFERENT product now, and it must get the second site, not the first. */
  return first === 'a' && rot.nextSite(cfg, ONE_STEP).id === 'b';
})());
check('mixed products still walk one cycle in order', (() => {
  const cfg = { savedSites: [site('a'), site('b'), site('c')] };
  const seq = [];
  for (const product of [THREE_STEP, ONE_STEP, FIVE_STEP, ONE_STEP]) {
    seq.push(rot.nextSite(cfg, product).id);
    cfg.cursor = rot.advanceCursor(cfg);
  }
  return seq.join(',') === 'a,b,c,a';
})());
check('the cycle stays even when a site cannot price a product', (() => {
  /* b is on a $50 step and can never price a $224.97 product. Advancing from
     the CURSOR would leave it on c after c served, handing c the next order
     too — c would take half of everything. Advancing from whoever served
     keeps it a,c,a,c. */
  const cfg = { savedSites: [site('a'), site('b', { unitCents: 5000 }), site('c')] };
  return run(cfg, THREE_STEP, 4).join(',') === 'a,c,a,c';
})());
check('and b still takes its turn for a product it CAN price', (() => {
  /* $200.00 is four steps of $50, which only b can carry. */
  const cfg = { savedSites: [site('a'), site('b', { unitCents: 5000 }), site('c')], cursor: 'b' };
  return rot.nextSite(cfg, { slug: 'fifty', price: 20000 }).id === 'b';
})());
check('an inactive site is skipped in the cycle', (() => {
  /* #1 -> #3 -> #4 -> #1, exactly as specified, with #2 switched off. */
  const cfg = { savedSites: [site('1'), site('2', { enabled: false }), site('3'), site('4')] };
  return run(cfg, ONE_STEP, 4).join(',') === '1,3,4,1';
})());
check('deleting the site that was up next does not break the cycle', (() => {
  const cfg = { savedSites: [site('a'), site('c')], cursor: 'b' };
  return run(cfg, ONE_STEP, 3).join(',') === 'a,c,a';
})());
check('rotationOrder marks exactly one site as next', (() => {
  const order = rot.rotationOrder({ savedSites: [site('a'), site('b'), site('c')], cursor: 'b' });
  return order.length === 3 && order.filter((o) => o.isNext).length === 1
    && order.find((o) => o.isNext).id === 'b'
    && order.map((o) => o.position).join(',') === '1,2,3';
})());
check('rotationOrder omits paused sites', (() => {
  const order = rot.rotationOrder({ savedSites: [site('a'), site('b', { enabled: false })] });
  return order.length === 1 && order[0].id === 'a';
})());
check('history keeps the newest first and is capped', (() => {
  let cfg = { history: [] };
  for (let i = 0; i < rot.HISTORY_LIMIT + 5; i++) {
    cfg = { ...cfg, history: rot.recordHistory(cfg, { orderId: 'o' + i }) };
  }
  return cfg.history.length === rot.HISTORY_LIMIT
    && cfg.history[0].orderId === 'o' + (rot.HISTORY_LIMIT + 4);
})());
check('50 orders across 3 sites land evenly', (() => {
  const seq = run(three, THREE_STEP, 50);
  const counts = ['a', 'b', 'c'].map((id) => seq.filter((x) => x === id).length);
  return Math.max(...counts) - Math.min(...counts) <= 1;
})());

/* ── The mapping the admin screen renders ── */
const mapped = rot.mapping(three, [ONE_STEP, THREE_STEP, FIVE_STEP, OFF_GRID]);
check('mapping covers every product', mapped.length === 4);
check('mapping reports the right max quantities', (() => {
  const by = Object.fromEntries(mapped.map((m) => [m.slug, m.maxQuantity]));
  return by['one-step'] === STEPS && by['three-step'] === MAX3 && by['five-step'] === MAX5 && by['off-grid'] === 0;
})(), JSON.stringify(mapped.map((m) => [m.slug, m.maxQuantity])));
check('mapping marks the off-grid product as served by nobody',
  mapped.find((m) => m.slug === 'off-grid').activeCount === 0);
check('mapping marks exactly one site as next for a rotating product',
  mapped.find((m) => m.slug === 'three-step').sites.filter((s) => s.isNext).length === 1);
check('mapping says a product with several sites is rotating',
  mapped.find((m) => m.slug === 'three-step').rotating === true);

/* ── Migration ──
   Runs on every settings load, so idempotency is not a nicety: one that
   duplicated a site would multiply the rotation each time anyone looked. */
const migrated = rot.migrate({
  routes: [{
    label: 'Old Route',
    url: 'https://old.example/services/thing',
    experienceId: 'thing',
    apiKey: 'enc',
    whopPlanId: 'plan_old_1',
    bundlePlans: [
      { quantity: 2, whopPlanId: 'plan_old_2', price: Number(money(2 * UNIT)) },
      { quantity: 3, whopPlanId: 'plan_old_3', price: Number(money(3 * UNIT)) },
    ],
    productSlugs: ['three-step'],
  }],
  savedSites: [],
});
check('a legacy route becomes a site', migrated.changed && migrated.config.savedSites.length === 1);
check('recovered plans land on the grid by the price they charged', (() => {
  /* The ids were stored against prices, so the grid is recoverable whatever
     "quantity" each was labelled: two units is rung 2, three units is rung 3. */
  const l = rot.ladder(migrated.config.savedSites[0]);
  return l[0] === 'plan_old_1' && l[1] === 'plan_old_2' && l[2] === 'plan_old_3';
})(), JSON.stringify(rot.ladder(migrated.config.savedSites[0])));
check('the migrated site keeps its link', (() => {
  const m = migrated.config.savedSites[0];
  return m.url.includes('old.example');
})());
check('its key is promoted to the shared one, not kept per site', (() => {
  const m = migrated.config.savedSites[0];
  return migrated.config.apiKey === 'enc' && m.apiKey === undefined;
})());
check('the route list is emptied so nothing resolves twice', migrated.config.routes.length === 0);
check('migration is idempotent', rot.migrate(migrated.config).changed === false);
check('the per-product shape migrates too', (() => {
  const m = rot.migrate({
    routes: [],
    savedSites: [{
      id: 'v2', name: 'v2', url: 'https://v2.example/s', experienceId: 'x',
      products: [{ slug: 'a', whopPlanId: 'plan_v2_1', bundlePlans: [{ quantity: 2, whopPlanId: 'plan_v2_2', price: Number(money(2 * UNIT)) }] }],
    }],
  });
  const l = rot.ladder(m.config.savedSites[0]);
  return m.changed && l[0] === 'plan_v2_1' && l[1] === 'plan_v2_2'
    && m.config.savedSites[0].products === undefined;
})());
check('migrate tolerates junk',
  rot.migrate(null).changed === false && rot.migrate({}).changed === false);

/* ── The per-site key and experience id are gone ──
   Both were the same value on every host, so a per-site copy could only ever
   be identical or wrong — and a wrong key fails as a refused token, which
   looks exactly like an unreachable site. */
check('a per-site key is promoted to the shared one rather than dropped', (() => {
  /* The shared box may well be empty. Discarding the only key that was
     configured would take every partner offline on the next deploy, with
     nothing on screen to explain it. */
  const m = rot.migrate({
    routes: [],
    apiKey: '',
    savedSites: [{ id: 'a', name: 'a', url: 'https://a/x', apiKey: 'enc_from_site', plans: ['plan_x'] }],
  });
  return m.changed && m.config.apiKey === 'enc_from_site';
})());
check('an existing shared key is not overwritten by a site one', (() => {
  const m = rot.migrate({
    routes: [],
    apiKey: 'enc_shared',
    savedSites: [{ id: 'a', name: 'a', url: 'https://a/x', apiKey: 'enc_from_site', plans: ['plan_x'] }],
  });
  return m.config.apiKey === 'enc_shared';
})());
check('the per-site key and id are cleared once promoted', (() => {
  const m = rot.migrate({
    routes: [],
    apiKey: '',
    savedSites: [{ id: 'a', name: 'a', url: 'https://a/x', apiKey: 'enc', experienceId: 'thing', plans: ['plan_x'] }],
  });
  const site = m.config.savedSites[0];
  return site.apiKey === undefined && site.experienceId === undefined;
})());
check('clearing them is idempotent', (() => {
  const once = rot.migrate({
    routes: [], apiKey: '',
    savedSites: [{ id: 'a', name: 'a', url: 'https://a/x', apiKey: 'enc', experienceId: 'thing', plans: ['plan_x'] }],
  });
  return rot.migrate(once.config).changed === false;
})());
check('there is one experience id for every host',
  rot.PARTNER_EXPERIENCE_ID === 'partner');
check('an already-current config reports no change',
  rot.migrate({ routes: [], savedSites: [site('a')] }).changed === false);

/* ── How many orders a site takes before its turn ends ──────────────
   The rotation used to hand over on every order. salesPerSite makes that
   a setting, and 1 has to keep meaning exactly what it always did. */
check('unset means one order per site, as before', rot.salesPerSite({}) === 1);
check('a zero or a negative cannot stall the rotation on one site',
  rot.salesPerSite({ salesPerSite: 0 }) === 1 && rot.salesPerSite({ salesPerSite: -4 }) === 1);
check('nor can a non-number', rot.salesPerSite({ salesPerSite: 'lots' }) === 1);
check('and it is capped',
  rot.salesPerSite({ salesPerSite: 10000 }) === rot.MAX_SALES_PER_SITE);

/* Runs the cycle the way the order pipeline does and counts where orders
   land. A pacing bug is invisible in a single call and obvious over a
   cycle. */
function spread(per, orders, ids = ['a', 'b', 'c']) {
  let cfg = { savedSites: ids.map((x) => site(x)), cursor: ids[0], salesPerSite: per, cursorServed: 0 };
  const tally = {};
  for (let i = 0; i < orders; i++) {
    const served = rot.activeSites(cfg).find((s) => s.id === cfg.cursor);
    tally[served.id] = (tally[served.id] || 0) + 1;
    const out = rot.advanceRotation(cfg, served);
    cfg = { ...cfg, cursor: out.cursor || cfg.cursor, cursorServed: out.cursorServed };
  }
  return tally;
}
check('at 1 the cycle is unchanged: six orders split evenly across three',
  JSON.stringify(spread(1, 6)) === JSON.stringify({ a: 2, b: 2, c: 2 }));
check('at 3 each site takes three before handing over',
  JSON.stringify(spread(3, 9)) === JSON.stringify({ a: 3, b: 3, c: 3 }));
check('a turn shorter than the setting keeps every order on one site',
  JSON.stringify(spread(5, 5)) === JSON.stringify({ a: 5 }));

check('a single site never accumulates a count it cannot spend', (() => {
  const out = rot.advanceRotation(
    { savedSites: [site('solo')], cursor: 'solo', salesPerSite: 5, cursorServed: 4 },
    site('solo'));
  return out.cursor === null && out.cursorServed === 0;
})());

check('a count already past the setting ends the turn rather than running on', (() => {
  const out = rot.advanceRotation(
    { savedSites: [site('a'), site('b')], cursor: 'a', salesPerSite: 2, cursorServed: 7 },
    site('a'));
  return out.cursor === 'b' && out.cursorServed === 0;
})());

/* ── Whose number applies ───────────────────────────────────────────
   The accounts are not interchangeable, so the pace is settable on a
   site, on a group, or globally, and the most specific one wins. Getting
   this order wrong is silent: orders keep flowing, just to the wrong
   account for the wrong number of turns. */
{
  const cfg = {
    salesPerSite: 2,
    groups: [{ id: 'g1', name: 'Fresh', enabled: true, salesPerSite: 5 }],
    savedSites: [
      { id: 'a', name: 'a', url: 'https://a/x', enabled: true, groupId: '' },
      { id: 'b', name: 'b', url: 'https://b/x', enabled: true, groupId: 'g1' },
      { id: 'c', name: 'c', url: 'https://c/x', enabled: true, groupId: 'g1', salesPerSite: 9 },
      { id: 'd', name: 'd', url: 'https://d/x', enabled: true, groupId: 'g1', salesPerSite: 0 },
    ],
  };
  const by = (id) => cfg.savedSites.find((x) => x.id === id);
  check('an ungrouped site takes the global default',
    rot.salesPerSite(cfg, by('a')) === 2 && rot.paceSource(cfg, by('a')) === 'default');
  check('a grouped site takes its group\'s number',
    rot.salesPerSite(cfg, by('b')) === 5 && rot.paceSource(cfg, by('b')) === 'group');
  check('a site with its own number overrides the group',
    rot.salesPerSite(cfg, by('c')) === 9 && rot.paceSource(cfg, by('c')) === 'site');
  check('an unusable site value falls through instead of becoming 1',
    rot.salesPerSite(cfg, by('d')) === 5);
  check('called with no site it answers the global default',
    rot.salesPerSite(cfg) === 2);

  /* The whole point of the override: with two groups paced differently,
     the orders have to land unevenly on purpose. */
  const twoGroups = {
    salesPerSite: 1,
    groups: [
      { id: 'slow', name: 'slow', enabled: true, salesPerSite: 1 },
      { id: 'fast', name: 'fast', enabled: true, salesPerSite: 3 },
    ],
    savedSites: [
      { id: 's1', name: 's1', url: 'https://s1/x', enabled: true, groupId: 'slow', unitCents: UNIT, plans: Array(STEPS).fill('p') },
      { id: 'f1', name: 'f1', url: 'https://f1/x', enabled: true, groupId: 'fast', unitCents: UNIT, plans: Array(STEPS).fill('p') },
    ],
  };
  let c = { ...twoGroups, cursor: 's1', cursorServed: 0 };
  const tally = {};
  for (let i = 0; i < 8; i += 1) {
    const served = rot.activeSites(c).find((x) => x.id === c.cursor);
    tally[served.id] = (tally[served.id] || 0) + 1;
    const out = rot.advanceRotation(c, served);
    c = { ...c, cursor: out.cursor || c.cursor, cursorServed: out.cursorServed };
  }
  check('two groups paced differently split orders in that ratio',
    JSON.stringify(tally) === JSON.stringify({ s1: 2, f1: 6 }), JSON.stringify(tally));
}

check('the order pipeline persists the count, not just the cursor', (() => {
  const src = fs.readFileSync(path.join(ROOT, 'services/orderPipeline/index.js'), 'utf8');
  return /advanceRotation\(config, served\)/.test(src) && /cursorServed: rotation\.cursorServed/.test(src);
})());

/* ── Every filter over the sites must ask the same question ─────────────
   activeSites decides who serves, and ANDs the site flag with its group's.
   eligibleSites feeds maxQuantityAcross, which is what the product page
   uses to cap the quantity selector. While the two disagreed, a paused
   group left the page offering a partner quantity of four for a hop that
   nextSite would then refuse — the buyer fell back to the ordinary
   checkout, so nothing errored and nothing was logged. */
{
  const paused = {
    groups: [{ id: 'g', name: 'g', enabled: false }],
    savedSites: ['a', 'b'].map((id) => ({
      id, name: id, url: `https://${id}/x`, enabled: true, groupId: 'g',
      unitCents: UNIT, plans: Array(STEPS).fill('p'),
    })),
  };
  const product = { slug: 'p', price: 3 * UNIT };
  check('a paused group empties eligibleSites, not just activeSites',
    rot.eligibleSites(paused, product.price, 'US').length === 0,
    `${rot.eligibleSites(paused, product.price, 'US').length} still eligible`);
  check('a paused group caps the partner quantity at zero',
    rot.maxQuantityAcross(paused, product, { market: 'US' }) === 0,
    String(rot.maxQuantityAcross(paused, product, { market: 'US' })));
  check('...and nextSite agrees with both',
    rot.nextSite(paused, product, { market: 'US' }) === null);
}

/* ── What an import may not quietly take away ───────────────────────────
   A CSV states what it knows. It does not assert the absence of what it
   does not mention, and two of the things it does not mention are money: a
   market whose ladder is dropped stops selling with nothing on screen
   saying why, and a group id overwritten with the select's blank default
   resumes a set the operator had deliberately paused. */
{
  const src = fs.readFileSync(path.join(ROOT, 'routes/admin.js'), 'utf8');
  const body = src.slice(
    src.indexOf("'/settings/partner-experience/sites/import'"),
    src.indexOf("router.post('/settings/partner-experience/sites/add'"),
  );
  check('the import merges ladders rather than replacing them',
    /\.\.\.\(existing\.ladders \|\| \{\}\), \.\.\.\(s\.ladders \|\| \{\}\)/.test(body));
  check('the import only writes a group when one was chosen',
    /if \(!groupId\) delete fields\.groupId;/.test(body));
  check('the import refuses a plan id already saved on another site',
    /takenIds/.test(body) && /collisions\.length/.test(body));
  /* Changed deliberately. A batch is uploaded in order to be sold, and
     eight sites each needing their own click produced exactly one failure
     mode: the site somebody forgot, configured and silent while the
     operator believed the batch was live. The protections that actually
     guard a buyer are elsewhere and still hold — an incomplete ladder
     prices nothing, a price off the grid abandons the hop, a duplicate
     plan id is refused above, and a checkout that stops converting is
     suspended automatically. */
  check('imported sites arrive active', /enabled: true,/.test(body));
}

console.log(fails ? `\n${fails} check(s) FAILED` : '\nAll rotation checks pass');
process.exit(fails ? 1 : 0);
