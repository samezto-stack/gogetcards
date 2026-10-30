/**
 * Which partner site serves the next checkout, and which of its plans.
 *
 * THE ARRANGEMENT THIS IMPLEMENTS. Each partner site sells one thing on a
 * ladder of twelve plans in equal steps — $74.99, $149.98, … $899.88. That
 * ladder is not twelve products; it is a PRICE GRID in units of $74.99.
 * zypheratcg is the catalogue, and each of its products sits at some number
 * of those units: a $224.97 product is three units, a $374.95 product is
 * five.
 *
 * So the plan for a checkout is arithmetic, not configuration:
 *
 *     units        = product price / unit price
 *     plan for qty = ladder[ units × qty ]
 *     max quantity = floor(12 / units)
 *
 * A three-unit product therefore tops out at four, a five-unit product at
 * two. Both fall out of the grid rather than being typed in and kept in
 * step by hand.
 *
 * WHAT THIS REPLACED, AND WHY. Plans used to be entered per product per
 * site: twelve ids for every product on every host, retyped whenever
 * anything moved. It was wrong twice over — the work grew with products ×
 * sites, and a product's ladder could silently disagree with its own price.
 * Twelve ids per site, entered once, cannot disagree with anything.
 *
 * A PRICE OFF THE GRID IS REFUSED, NEVER ROUNDED. A $299.99 product is
 * 4.0004 units, and there is no plan that charges $299.99 — the nearest is
 * $299.96. Rounding to it would take four cents less than the page
 * advertised on every single order, silently, because Whop charges what the
 * plan id says regardless of what was displayed. So a product whose price is
 * not an exact multiple of the unit is not eligible for the partner hop at
 * all, and the admin screen says which products those are and what price
 * would fix them.
 *
 * ROTATION ADVANCES ON AN ORDER, NOT A VISIT: the point is to spread
 * completed sales, not traffic. A host shown a hundred times that sells
 * nothing has not had its turn.
 *
 * THE CURSOR IS A SITE ID, NOT AN INDEX. "Position 2 in the eligible list"
 * changes meaning the moment a site is paused, renamed or reordered.
 */

/** The ladder length every site is expected to carry. */
const LADDER_STEPS = 12;

/** Default step, in cents. Stored per site so a future host can differ. */
const DEFAULT_UNIT_CENTS = 7499;

/**
 * The experience id every partner host answers to.
 *
 * ONE CONSTANT, NOT A FIELD PER SITE. Every host in this group registers
 * 'partner' alongside its own service slugs precisely so one broker
 * configuration works against all of them, and the id only ever selects
 * "gated versus the marketing page" — WHICH product is shown comes from the
 * signed claims, never from the id. So a per-site box could only ever hold
 * the same word or a typo, and a typo there fails as a token the host
 * refuses, which looks exactly like a broken key.
 */
const PARTNER_EXPERIENCE_ID = 'partner';

/** The market every pre-markets ladder belongs to. */
const BASE_MARKET = 'US';

/**
 * One site's ladder for one MARKET.
 *
 * KEYED BY MARKET, NOT BY CURRENCY, and the difference is the point.
 * Germany and France both charge euros and still hold separate ladders,
 * because a plan id is where the money lands: sharing one euro ladder
 * between them would pool the revenue and leave no way to tell a German
 * sale from a French one. Per-country plan ids are what make a per-country
 * campaign measurable rather than merely runnable.
 *
 * It also happens to be the stricter of the two. A currency-keyed ladder
 * lets a market open the moment any country on that currency has plans;
 * a market-keyed one requires that country's own.
 *
 * THE SITE-LEVEL `unitCents`/`plans` ARE THE US LADDER. Every site
 * configured before markets existed keeps working untouched and needs no
 * migration; `ladders.US` overrides them if anyone sets it, and every
 * other market lives only under `ladders`.
 */
function ladderFor(site, marketId) {
  const key = String(marketId || BASE_MARKET).toUpperCase();
  const explicit = site && site.ladders && site.ladders[key];
  if (explicit) return explicit;
  if (key === BASE_MARKET) return { unitCents: site && site.unitCents, plans: (site && site.plans) || [] };
  return null;
}

/** This site's step for a market, in that market's smallest unit. */
function unitCents(site, marketId) {
  const l = ladderFor(site, marketId);
  if (!l) return 0;
  const isBase = String(marketId || BASE_MARKET).toUpperCase() === BASE_MARKET;
  const raw = Number(l.unitCents || (isBase ? DEFAULT_UNIT_CENTS : 0));
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0;
}

/**
 * Every market the rotation can actually charge for right now.
 *
 * THE GATE ON OPENING A MARKET. config/markets.js can declare Germany
 * enabled, but if no switched-on site holds a DE ladder then a German
 * checkout would have no plan to resolve — or, worse, would fall back to
 * one priced in another country's terms. services/market intersects the
 * configured markets with this set, so a market that cannot be charged is
 * off however it is configured.
 */
function marketsServed(config) {
  const seen = new Set();
  for (const site of activeSites(config)) {
    if (unitCents(site, BASE_MARKET) > 0 && ladder(site, BASE_MARKET).some(Boolean)) {
      seen.add(BASE_MARKET);
    }
    for (const key of Object.keys((site && site.ladders) || {})) {
      const k = key.toUpperCase();
      if (unitCents(site, k) > 0 && ladder(site, k).some(Boolean)) seen.add(k);
    }
  }
  return [...seen];
}

/** The site's plan ids, position 0 being one unit. Blanks are preserved so
 *  a partly-filled ladder reports the right missing step rather than
 *  shifting every plan up. */
function ladder(site, marketId) {
  const l = ladderFor(site, marketId);
  const out = ((l && l.plans) || []).map((p) => String(p || '').trim());
  while (out.length < LADDER_STEPS) out.push('');
  return out.slice(0, LADDER_STEPS);
}

/**
 * How many units a product costs, or null when it is not an exact multiple.
 *
 * INTEGER ARITHMETIC ON CENTS, and the modulo below is where it earns its
 * keep. In floating point, 524.93 % 74.99 is 74.98999999999998 rather than
 * 0 — so a float check rejects a legitimate seven-step price as "off the
 * grid". Eight of the twelve prices on a $74.99 ladder give a non-zero float
 * modulo. Every one of them would silently stop going to partners at all,
 * and the settings screen would report them as mispriced. Cents divide and
 * remainder exactly.
 */
function unitsFor(site, productPriceCents, marketId) {
  const price = Math.round(Number(productPriceCents) || 0);
  if (price <= 0) return null;
  const unit = unitCents(site, marketId);
  /* No ladder for this market is not "off the grid", it is "cannot be
     charged at all" — and dividing by it would throw or, worse, return
     Infinity and pick a plan. */
  if (unit <= 0) return null;
  if (price % unit !== 0) return null;
  return price / unit;
}

/** The highest quantity this site's ladder can charge for the product. */
function maxQuantity(site, productPriceCents, marketId) {
  const units = unitsFor(site, productPriceCents, marketId);
  if (!units) return 0;
  return Math.floor(LADDER_STEPS / units);
}

/**
 * The plan for one product at one quantity on one site, or null.
 *
 * Null means the partner hop is abandoned and the buyer takes the ordinary
 * checkout. Every route to null is a case where charging anything would mean
 * charging something other than the price on the page.
 */
function planFor(site, productPriceCents, quantity, marketId) {
  const cur = String(marketId || BASE_MARKET).toUpperCase();
  const units = unitsFor(site, productPriceCents, cur);
  if (!units) return null;
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const step = units * qty;
  if (step > LADDER_STEPS) return null;
  const id = ladder(site, cur)[step - 1];
  if (!id) return null;
  return {
    whopPlanId: id,
    step,
    quantity: qty,
    /* Carried so the caller never has to assume. A plan id is opaque —
       nothing about it says what it charges, in what, or for where — so
       the market travels with it to the payment step and onto the order,
       and the currency is looked up from the registry rather than
       guessed. */
    market: cur,
    currency: require('../config/markets').currency(
      (require('../config/markets').byId(cur) || {}).currency).code,
    /* The price the plan is expected to charge, derived from the same grid
       the id came from — so the figure shown and the figure charged have one
       source rather than two. */
    priceCents: step * unitCents(site, cur),
  };
}

/**
 * A site can serve a product when it is on, has a link, the price is on its
 * grid, and the plan for a single unit exists.
 *
 * THE PLAN CHECK IS PART OF ELIGIBILITY. A site with a half-filled ladder
 * would otherwise take its turn, fail at the hop, and drop the buyer back to
 * the normal checkout — costing that host's turn and looking like nothing
 * happened.
 *
 * THE GROUP FLAG COUNTS HERE TOO, for the same reason it counts in
 * activeSites: the two are ANDed everywhere else, and a filter that reads
 * only the site's own switch answers a different question from the one that
 * decides who serves. It was doing exactly that — with a group paused,
 * maxQuantityAcross still reported a cap of four while nextSite correctly
 * refused every one of them, so the product page offered a partner quantity
 * for a hop that could not happen.
 */
function eligibleSites(config, productPriceCents, marketId) {
  return ((config && config.savedSites) || []).filter((s) => {
    if (!s || s.enabled === false) return false;
    if (suspended(s)) return false;
    if (!groupAllows(config, s)) return false;
    if (!String(s.url || '').trim()) return false;
    return !!planFor(s, productPriceCents, 1, marketId);
  });
}

/**
 * The highest quantity of a product that ANY site in the rotation could
 * charge for — the minimum across the eligible ones, not the maximum.
 *
 * THE MINIMUM, because the rotation decides which site serves and that
 * decision is not made until the buyer clicks. Offering a quantity only the
 * generous site can carry means the buyer meets a dead end whenever the
 * cycle happens to land elsewhere — an intermittent failure, which is worse
 * than a consistent one because it looks like a fluke.
 *
 * Zero means no site can serve this product at all, and the caller should
 * leave whatever limit it already had alone rather than clamping to nothing.
 */
function maxQuantityAcross(config, product, opts = {}) {
  const cur = String(opts.market || BASE_MARKET).toUpperCase();
  const price = opts.amount != null ? opts.amount : (product && product.price);
  const pool = eligibleSites(config, price, cur);
  if (!pool.length) return 0;
  return Math.min(...pool.map((s) => maxQuantity(s, price, cur)));
}

/**
 * Every site that is switched on, in rotation order.
 *
 * THE ROTATION IS GLOBAL, NOT PER PRODUCT. One order anywhere on the
 * catalogue moves the whole system to the next site: order 1 goes to X#1,
 * order 2 to X#2, order 3 to X#3, order 4 back to X#1, whatever was bought
 * each time. A per-product cursor would mean three products drifting into
 * three independent cycles, and no single answer to "who is next" — which is
 * the one thing the operator needs to be able to see at a glance.
 */
function activeSites(config) {
  return ((config && config.savedSites) || []).filter(
    (s) => s && s.enabled !== false && !suspended(s) && String(s.url || '').trim() && groupAllows(config, s),
  );
}

/**
 * A site whose checkout has been observed to be dead.
 *
 * WHY THIS EXISTS AT ALL. A suspended Whop business still mounts an iframe
 * into the partner site's payment panel — it just contains Whop's "Nothing
 * to see here yet" page. Nothing in the browser can tell that apart from a
 * card form, because the frame is cross-origin. So the signal is counted
 * rather than seen: hand-offs that never became orders. See
 * services/partnerHealth.js, which is the only thing that writes it.
 *
 * READ HERE, WRITTEN THERE, deliberately. Rotation is pure and synchronous
 * over a plain config object; importing a module that talks to the database
 * would make every function in this file untestable. This is the single
 * fact rotation needs from it.
 *
 * SEPARATE FROM `enabled`, which belongs to the operator. A site can be
 * paused by hand, suspended automatically, or both, and the admin screen
 * has to be able to say which — restoring one must never silently undo the
 * other.
 */
function suspended(site) {
  return !!(site && site.health && site.health.state === 'suspended');
}

/**
 * Groups, and what a group switch means.
 *
 * A group is a switch over several sites at once — a set that gets paused
 * or resumed together. The two flags are ANDed, never ORed: a site takes
 * orders only when both it AND its group are on. That is the safe
 * direction, and it is the only one that composes. Pausing a group can
 * never leave one of its sites quietly still selling, and resuming a group
 * can never wake a site that was paused on its own for a reason.
 *
 * It is also what makes a mixed selection expressible: run group A, and
 * from group B keep only the two sites you want by pausing the rest
 * individually. The group flag is a master switch, not a second opinion.
 *
 * A site with no group answers to its own flag alone, and so does a site
 * whose group has been deleted — losing a group must not silently stop
 * the sites that were in it.
 */
function groups(config) {
  return (config && Array.isArray(config.groups)) ? config.groups : [];
}

function groupById(config, id) {
  if (!id) return null;
  return groups(config).find((g) => g && g.id === id) || null;
}

function groupAllows(config, site) {
  const group = groupById(config, site && site.groupId);
  return group ? group.enabled !== false : true;
}

/** Why this site is not taking orders, or null when it is. */
function pausedBy(config, site) {
  if (!site) return 'missing';
  if (site.enabled === false) return 'site';
  /* Reported after the operator's own switch and before the group's: a site
     somebody paused on purpose is paused for that reason, whatever its
     checkout is doing. */
  if (suspended(site)) return 'suspended';
  const group = groupById(config, site.groupId);
  if (group && group.enabled === false) return 'group';
  return null;
}

/** The site the global cursor points at, or the first active one. */
function cursorSite(config) {
  const pool = activeSites(config);
  if (!pool.length) return null;
  /* An unresolvable cursor restarts the cycle rather than failing: that is
     the state after the site it named was deleted, and after the very first
     order. Deleting a site must never break the rotation. */
  return pool.find((s) => s.id === (config && config.cursor)) || pool[0];
}

/**
 * Who serves this checkout: the site whose turn it is, unless its grid
 * cannot price this particular product, in which case the next one along
 * that can.
 *
 * SKIPPING DOES NOT ADVANCE THE CURSOR. A site passed over because one
 * product does not fit its grid has not had its turn — the next order still
 * belongs to it. Only an order moves the cursor.
 */
function nextSite(config, product, opts = {}) {
  const pool = activeSites(config);
  if (!pool.length) return null;
  const start = pool.indexOf(cursorSite(config));
  const from = start < 0 ? 0 : start;
  /* Priced for the MARKET when one is given. A site that can charge for
     the US but holds no German ladder is not eligible for a German
     checkout, so it must be skipped here rather than selected and failed
     at the hop — otherwise it burns its turn in the rotation on an order
     it was never able to take. */
  const cur = String(opts.market || BASE_MARKET).toUpperCase();
  const price = opts.amount != null ? opts.amount : (product && product.price);
  for (let i = 0; i < pool.length; i++) {
    const candidate = pool[(from + i) % pool.length];
    if (planFor(candidate, price, 1, cur)) return candidate;
  }
  return null;
}

/**
 * The cursor value that should follow an order, or null when there is
 * nothing to advance to.
 *
 * Takes no product: the cycle is global, so an order for anything hands the
 * next order to the next active site.
 *
 * IT ADVANCES FROM WHOEVER SERVED, not from where the cursor was pointing,
 * and the difference is a real fairness bug rather than a detail. When the
 * cursor's site cannot price a product, the order goes to the next one that
 * can — and if the cursor then only moved one place, it would land on the
 * site that just served and hand it the next order too. With three sites and
 * a middle one that cannot carry a product, that turns an even split into
 * one site taking half of everything.
 *
 * Passing the served site is therefore how the caller keeps the cycle even.
 * Omitting it falls back to the cursor, which is correct whenever nothing
 * was skipped.
 *
 * IDEMPOTENCY IS THE CALLER'S JOB. Advancing twice for one payment skips a
 * site entirely; the order pipeline already distinguishes a new order from a
 * repeat, and that is the flag this must sit behind.
 */
function advanceCursor(config, servedSite) {
  const pool = activeSites(config);
  if (pool.length <= 1) return null;
  const from = servedSite ? pool.findIndex((s) => s.id === servedSite.id) : pool.indexOf(cursorSite(config));
  return pool[((from < 0 ? 0 : from) + 1) % pool.length].id;
}

/* ── What a site has actually earned ────────────────────────────────
   `stats.orders` has always counted how many orders a site took. It says
   nothing about how much, and with four currencies live "eleven orders"
   can mean anything.

   KEPT PER CURRENCY, in minor units. Adding euros to dollars produces one
   number that is true of nothing, so each currency is banked separately
   and the admin prints them side by side.

   A running total rather than a query, because an order does not record
   which site served it — that is deliberate (see the note in the order
   pipeline: a second copy of who served is a thing that can disagree with
   the cursor). The cost is that this counts from the day it ships
   forward; it cannot reconstruct what came before. */
function addRevenue(stats, cents, currency) {
  const amount = Math.round(Number(cents) || 0);
  const code = String(currency || 'USD').toUpperCase();
  const prev = (stats && stats.revenue) || {};
  if (!amount) return prev;
  return { ...prev, [code]: (Number(prev[code]) || 0) + amount };
}

/** Every currency a site has banked, largest first, for the admin. */
function revenueOf(site) {
  const rev = (site && site.stats && site.stats.revenue) || {};
  return Object.entries(rev)
    .filter(([, v]) => Number(v) > 0)
    .map(([currency, amount]) => ({ currency, amount: Number(amount) }))
    .sort((a, b) => b.amount - a.amount);
}

/* ── How many orders a site takes before its turn ends ──────────────
   One, unless configured otherwise. The rotation exists to spread orders
   across Whop accounts, and how fast to move is a judgement about those
   accounts rather than something this code can know — so it is a setting.

   Clamped rather than trusted: a zero or a negative would mean a turn that
   never ends and one site taking everything, and the field is a text input
   on a settings page. */
const MAX_SALES_PER_SITE = 100;

/* A single field, clamped. Anything unusable reads as "not set" so the
   next level down decides, rather than silently becoming 1 and overriding
   a group that did set a number. */
function paceValue(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(n, MAX_SALES_PER_SITE);
}

/**
 * How many orders THIS site takes before its turn ends.
 *
 * SITE, THEN ITS GROUP, THEN THE GLOBAL DEFAULT. The accounts are not
 * interchangeable — one may be older and worth resting sooner, another may
 * be a group of fresh ones that can carry more — so the number has to be
 * settable at whichever level the operator actually thinks in. The most
 * specific setting wins, which is the only ordering that lets a group set
 * a policy and one member opt out of it.
 *
 * Called with no site it answers the global default, which is what the
 * settings page shows and what a config with no overrides behaves like.
 */
function salesPerSite(config, site) {
  const own = paceValue(site && site.salesPerSite);
  if (own) return own;

  const group = groupById(config, site && site.groupId);
  const fromGroup = paceValue(group && group.salesPerSite);
  if (fromGroup) return fromGroup;

  return paceValue(config && config.salesPerSite) || 1;
}

/** Where a site's number comes from, so the admin can say so. */
function paceSource(config, site) {
  if (paceValue(site && site.salesPerSite)) return 'site';
  const group = groupById(config, site && site.groupId);
  if (paceValue(group && group.salesPerSite)) return 'group';
  return 'default';
}

/** How many orders the current turn has already taken. */
function cursorServed(config) {
  const n = parseInt(config && config.cursorServed, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * The whole rotation state after an order: where the cursor goes, and how
 * far into its turn that site now is.
 *
 * THE TURN BELONGS TO WHOEVER SERVED. While a turn is unfinished the cursor
 * is pointed at the site that just took the order, not at wherever it was
 * before — otherwise a site that served only because the cursor's site
 * could not price the product would hand the rest of the turn back to a
 * site that has not taken anything.
 *
 * advanceCursor is left alone and still means "move on one": this decides
 * WHETHER to move, and delegates WHERE.
 *
 * IDEMPOTENCY IS STILL THE CALLER'S JOB, and it matters more now — counting
 * one payment twice does not just skip a site, it shortens a turn.
 */
function advanceRotation(config, servedSite) {
  const pool = activeSites(config);
  if (!pool.length) return { cursor: null, cursorServed: 0 };

  const served = cursorServed(config) + 1;
  /* The limit belongs to the site taking the orders, not to the config as
     a whole — a per-site or per-group override is meaningless otherwise. */
  const per = salesPerSite(config, servedSite || cursorSite(config));

  if (served < per && pool.length > 1) {
    const stay = servedSite || cursorSite(config);
    return { cursor: stay ? stay.id : null, cursorServed: served };
  }

  /* Turn over — or nothing to rotate between, in which case the count is
     meaningless and is reset rather than left to climb forever. */
  return { cursor: advanceCursor(config, servedSite), cursorServed: 0 };
}

/**
 * The rotation as the admin screen shows it: every active site in order,
 * with whoever is up next marked.
 */
function rotationOrder(config) {
  const pool = activeSites(config);
  const next = cursorSite(config);
  return pool.map((s, i) => ({
    position: i + 1,
    id: s.id,
    name: s.name || s.url,
    isNext: !!(next && next.id === s.id),
    orders: (s.stats && s.stats.orders) || 0,
    lastOrderAt: (s.stats && s.stats.lastOrderAt) || null,
  }));
}

/** The most recent orders and which site took them, newest first. */
const HISTORY_LIMIT = 12;
function recordHistory(config, entry) {
  const history = [entry, ...((config && config.history) || [])];
  return history.slice(0, HISTORY_LIMIT);
}

/**
 * How one site handles one product, for the admin screen.
 *
 * Reports the reason when it cannot, because every one of those reasons is
 * otherwise invisible: a product simply stops going to partners and the
 * settings page looks perfectly filled in.
 */
function siteForProduct(site, product) {
  const price = product && product.price;
  const unit = unitCents(site);
  const units = unitsFor(site, price);

  if (!units) {
    /* Name the nearest prices that WOULD work. "Not a multiple of 74.99" is
       a diagnosis; "price it 299.96 or 374.95" is a fix. */
    const below = Math.floor((price || 0) / unit) * unit;
    const above = below + unit;
    return {
      ok: false,
      reason: 'price-off-grid',
      detail: `Not a multiple of ${(unit / 100).toFixed(2)} — nearest are ${(below / 100).toFixed(2)} and ${(above / 100).toFixed(2)}`,
      units: null,
      maxQuantity: 0,
    };
  }
  if (units > LADDER_STEPS) {
    return {
      ok: false,
      reason: 'above-ladder',
      detail: `${(price / 100).toFixed(2)} is ${units} steps — the ladder stops at ${LADDER_STEPS}`,
      units,
      maxQuantity: 0,
    };
  }

  const rungs = ladder(site);
  const cap = Math.floor(LADDER_STEPS / units);
  const missing = [];
  for (let q = 1; q <= cap; q++) {
    if (!rungs[units * q - 1]) missing.push(units * q);
  }
  if (missing.length) {
    return {
      ok: false,
      reason: 'missing-plans',
      detail: `No plan id at step ${missing.join(', ')}`,
      units,
      maxQuantity: 0,
    };
  }

  return { ok: true, reason: '', detail: '', units, maxQuantity: cap };
}

/**
 * The whole mapping, product by product, for the admin screen.
 *
 * This is the screen that replaces the configuration: there is nothing to
 * fill in per product, so what an operator needs instead is to see what the
 * arithmetic decided and why anything is excluded.
 */
function mapping(config, products) {
  const sites = (config && config.savedSites) || [];
  return (products || []).map((product) => {
    const perSite = sites.map((s) => ({
      id: s.id,
      name: s.name || s.url,
      enabled: s.enabled !== false,
      ...siteForProduct(s, product),
    }));
    const serving = perSite.filter((s) => s.ok && s.enabled);
    /* Which site this particular product would go to right now, which is the
       cursor unless the cursor's grid cannot price it. */
    const upNext = nextSite(config, product);
    return {
      slug: product.slug,
      title: product.title,
      price: product.price,
      units: perSite.length ? perSite[0].units : null,
      maxQuantity: serving.length ? Math.min(...serving.map((s) => s.maxQuantity)) : 0,
      rotating: serving.length > 1,
      activeCount: serving.length,
      sites: perSite.map((s) => ({ ...s, isNext: !!(upNext && upNext.id === s.id) })),
    };
  });
}

/** How complete one site's ladder is, for its card. */
function ladderStatus(site) {
  const rungs = ladder(site);
  const filled = rungs.filter(Boolean).length;
  return {
    filled,
    total: LADDER_STEPS,
    complete: filled === LADDER_STEPS,
    unitCents: unitCents(site),
    rungs: rungs.map((id, i) => ({ step: i + 1, planId: id, priceCents: (i + 1) * unitCents(site) })),
  };
}

/**
 * Bring an older config forward, in place, and say whether anything moved.
 *
 * Three shapes have existed: routes, then sites with one ladder, then sites
 * with a ladder per product. All of them stored plan ids against a price, so
 * the grid can be recovered from any of them: an id whose price is N units
 * becomes rung N.
 *
 * IDEMPOTENT, because it runs on every settings load. One that duplicated a
 * site would multiply the rotation every time anyone opened the page.
 */
function migrate(config) {
  if (!config || typeof config !== 'object') return { config, changed: false };
  const out = { ...config };
  let changed = false;

  /* Everything that ever carried plans, flattened to (site, plans) pairs. */
  const legacySites = [];
  for (const s of out.savedSites || []) {
    if (!s) continue;
    if (Array.isArray(s.plans)) { legacySites.push(s); continue; }
    changed = true;
    const collected = [];
    /* v2: a ladder per product. v1: one ladder for the site. Both stored
       {quantity, whopPlanId, price}, plus a separate quantity-1 id. */
    const groups = Array.isArray(s.products)
      ? s.products
      : [{ whopPlanId: s.whopPlanId, bundlePlans: s.bundlePlans }];
    for (const g of groups) {
      if (g && g.whopPlanId) collected.push({ cents: DEFAULT_UNIT_CENTS, id: g.whopPlanId });
      for (const b of (g && g.bundlePlans) || []) {
        if (b && b.whopPlanId && Number.isFinite(Number(b.price))) {
          collected.push({ cents: Math.round(Number(b.price) * 100), id: b.whopPlanId });
        }
      }
    }
    const next = { ...s, unitCents: DEFAULT_UNIT_CENTS, plans: rungsFrom(collected) };
    delete next.products;
    delete next.productSlugs;
    delete next.whopPlanId;
    delete next.bundlePlans;
    legacySites.push(next);
  }
  out.savedSites = legacySites;

  if (Array.isArray(out.routes) && out.routes.length) {
    for (const route of out.routes) {
      if (!route || !route.url) continue;
      const collected = [];
      if (route.whopPlanId) collected.push({ cents: DEFAULT_UNIT_CENTS, id: route.whopPlanId });
      for (const b of route.bundlePlans || []) {
        if (b && b.whopPlanId && Number.isFinite(Number(b.price))) {
          collected.push({ cents: Math.round(Number(b.price) * 100), id: b.whopPlanId });
        }
      }
      out.savedSites.push({
        id: `mig_${Math.random().toString(36).slice(2, 10)}`,
        name: route.label || route.url,
        url: route.url,
        experienceId: route.experienceId || 'partner',
        apiKey: route.apiKey || '',
        baseUrl: (() => { try { return new URL(route.url).origin; } catch { return ''; } })(),
        enabled: true,
        unitCents: DEFAULT_UNIT_CENTS,
        plans: rungsFrom(collected),
        stats: { orders: 0, lastOrderAt: null },
      });
      changed = true;
    }
    out.routes = [];
  }

  /* The per-site API key and experience id are gone from the form: both were
     the same value on every host, and a field that can only hold one correct
     value is a field that can hold a wrong one.

     A key that was set per site is PROMOTED to the shared key rather than
     discarded — the shared box may well be empty, and silently dropping the
     only key configured would take every partner offline on the next deploy
     with nothing on screen to explain it. Only the first is promoted; they
     were always meant to be identical, and picking one is better than
     picking none. */
  let promoted = out.apiKey;
  for (const site of out.savedSites) {
    if (site && site.apiKey && !promoted) promoted = site.apiKey;
  }
  if (promoted && promoted !== out.apiKey) {
    out.apiKey = promoted;
    changed = true;
  }
  for (const site of out.savedSites) {
    if (!site) continue;
    if (site.apiKey !== undefined) { delete site.apiKey; changed = true; }
    if (site.experienceId !== undefined) { delete site.experienceId; changed = true; }
  }

  return { config: out, changed };
}

/** Places recovered plan ids on the grid by the price they charged. */
function rungsFrom(collected) {
  const rungs = new Array(LADDER_STEPS).fill('');
  for (const { cents, id } of collected) {
    if (cents % DEFAULT_UNIT_CENTS !== 0) continue; // off the grid: unrecoverable
    const step = cents / DEFAULT_UNIT_CENTS;
    if (step >= 1 && step <= LADDER_STEPS && !rungs[step - 1]) rungs[step - 1] = id;
  }
  return rungs;
}

module.exports = {
  addRevenue, revenueOf,
  salesPerSite, paceSource, cursorServed, advanceRotation, MAX_SALES_PER_SITE,
  LADDER_STEPS,
  BASE_MARKET,
  ladderFor,
  marketsServed,
  maxQuantityAcross,
  PARTNER_EXPERIENCE_ID,
  HISTORY_LIMIT,
  activeSites,
  suspended,
  groups,
  groupById,
  groupAllows,
  pausedBy,
  cursorSite,
  rotationOrder,
  recordHistory,
  DEFAULT_UNIT_CENTS,
  unitCents,
  ladder,
  unitsFor,
  maxQuantity,
  planFor,
  eligibleSites,
  nextSite,
  advanceCursor,
  siteForProduct,
  mapping,
  ladderStatus,
  migrate,
};
