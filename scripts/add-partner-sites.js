/*
 * Gives a partner site the full four-currency ladder its Whop storefront
 * issued, in the partnerExperience config.
 *
 * WHY A SCRIPT AND NOT THE ADMIN FORM. Each site carries 48 plan ids across
 * four markets. Typing them into the settings page is 48 chances per site to
 * transpose a character into a field nothing validates until a customer
 * reaches checkout and the plan does not resolve.
 *
 * SAFE TO RUN TWICE. An existing entry is updated in place and keeps its id,
 * its group and its order stats, so re-running never duplicates a site or
 * resets what it has sold. Nothing is ever deleted.
 *
 * IT MATCHES ON THE PLANS, NOT ONLY THE URL. Sites listed here are not all
 * new: The Bindery has been taking orders since long before this script
 * existed, and is recorded under whatever URL was typed into the settings
 * page then — possibly a custom domain rather than the onrender host below.
 * Matching on the URL alone would miss it and add a SECOND copy of a site
 * already in the rotation, which is worse than not running at all. See
 * findRow.
 *
 * DRY RUN BY DEFAULT. It prints what it would change and writes nothing.
 * Pass --apply to commit the change.
 *
 *   MONGODB_URI=... node scripts/add-partner-sites.js
 *   MONGODB_URI=... node scripts/add-partner-sites.js --apply
 */
const mongoose = require('mongoose');
const crypto = require('crypto');
const SiteConfig = require('../models/SiteConfig');
const partnerRotation = require('../services/partnerRotation');
const { MARKETS } = require('../config/markets');

/* The step for each market, in cents. These are the rungs the price grid is
   built from; a site whose unit does not match its plans sells the wrong
   quantity, so they are stated here rather than defaulted. */
const UNIT_CENTS = { US: 7499, CA: 10999, UK: 5999, EU: 6999 };

/* GoGetCards' own partner batch goes here, one entry per site, in the
   same shape zypheratcg's script used:

     { name, url, plans: [12 US plan ids, one unit upward],
       ladders: { CA: { unitCents, plans }, UK: {...}, EU: {...} } }

   The list starts EMPTY on purpose. The 1,100 plan ids that were here
   belonged to zypheratcg's Whop businesses; applying them to this database
   would have routed GoGetCards buyers to another store's checkouts.

   BEFORE THE FIRST ENTRY, SETTLE THE UNIT. The partner ladder is a price
   grid: a product is sold only if its price is an exact multiple of the
   unit, and a twelve-rung ladder tops out at 12 x unit per checkout.
   zypheratcg's $74.99 unit fits its catalogue; a sealed-card catalogue with
   $34.99 bundles, $89.99 trainer boxes and $1,199.99 hobby boxes does not
   fit any single unit under twelve rungs. See docs/launch-checklist.md. */
const SITES = [
];

function ladderFor(marketId, plans) {
  return { unitCents: UNIT_CENTS[marketId], plans: plans.slice() };
}

/* Every assertion that must hold before a single write happens. A bad ladder
   is worse than no ladder: services/market reads the presence of one as the
   signal that a market can be charged, so a short or duplicated ladder opens
   a market that cannot actually resolve a plan. */
function validate() {
  const problems = [];
  const seen = new Map();
  const marketIds = MARKETS.filter((m) => !m.isDefault).map((m) => m.id);

  for (const s of SITES) {
    if (!/^https:\/\//i.test(s.url)) problems.push(`${s.name}: url is not https`);
    if (s.plans.length !== partnerRotation.LADDER_STEPS) {
      problems.push(`${s.name}: USD ladder has ${s.plans.length} rungs, expected ${partnerRotation.LADDER_STEPS}`);
    }
    for (const m of marketIds) {
      const l = s.ladders[m];
      if (!l) { problems.push(`${s.name}: no ${m} ladder`); continue; }
      if (l.length !== partnerRotation.LADDER_STEPS) {
        problems.push(`${s.name}: ${m} ladder has ${l.length} rungs, expected ${partnerRotation.LADDER_STEPS}`);
      }
    }
    const all = [...s.plans, ...Object.values(s.ladders).flat()];
    for (const id of all) {
      if (!/^plan_[A-Za-z0-9]+$/.test(id)) problems.push(`${s.name}: malformed plan id ${id}`);
      const owner = seen.get(id);
      /* Both halves of this have already happened once: a currency block
         pasted twice within one site, and a block belonging to a different
         business pasted under this one. Either sells the wrong thing in the
         wrong currency, and neither is visible by eye in 48 lines of
         random-looking ids. */
      if (owner === s.name) problems.push(`${s.name}: plan id ${id} appears twice — a block was pasted twice`);
      else if (owner) problems.push(`plan id ${id} is listed under both ${owner} and ${s.name}`);
      else seen.set(id, s.name);
    }
  }
  return problems;
}

/* WHICH CONFIGURED ROW IS THIS SITE, if any.
 *
 * The URL is tried first, because for a site this script itself added that
 * is exact. It is not enough on its own: a site configured by hand before
 * this script existed is recorded under whatever URL was typed then, which
 * may be a custom domain rather than the onrender host, or a service slug
 * since renamed. A miss there does not fail safely — it adds a second copy
 * of a site already in the rotation, and both halves then serve.
 *
 * So the USD ladder is the identity of last resort. A Whop plan id belongs
 * to exactly one product in one business, so a row already holding one of
 * these ids IS this site, whatever it is currently called.
 */
function findRow(config, s) {
  const byUrl = config.savedSites.find((x) => x.url === s.url);
  if (byUrl) return { row: byUrl, how: 'url' };
  const ours = new Set(s.plans);
  const byPlan = config.savedSites.find((x) => (x.plans || []).some((id) => ours.has(id)));
  if (byPlan) return { row: byPlan, how: 'plans' };
  return null;
}

async function main() {
  const apply = process.argv.includes('--apply');

  /* Before the URI check, so a freshly pasted ladder can be proof-read with
     `node scripts/add-partner-sites.js` and no database at all. */
  const problems = validate();
  if (problems.length) {
    console.error('Refusing to run — the data in this script is wrong:');
    for (const p of problems) console.error('  ' + p);
    process.exit(1);
  }
  console.log(`${SITES.length} sites validated: ${partnerRotation.LADDER_STEPS} rungs x 4 markets each, no duplicate plan ids.\n`);

  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI is not set.'); process.exit(1); }

  await mongoose.connect(uri);
  const config = await SiteConfig.getValue('partnerExperience', { apiKey: '', routes: [], savedSites: [] });
  if (!Array.isArray(config.savedSites)) config.savedSites = [];

  /* Resolved once, up front: the clash check below has to know which rows are
     legitimately ours before it can call a shared plan id a mistake. */
  const matched = new Map();
  for (const s of SITES) {
    const hit = findRow(config, s);
    if (hit) matched.set(s, hit);
  }
  const claimed = new Set([...matched.values()].map((m) => m.row));

  /* Any plan id already configured on a DIFFERENT site is a paste error, and
     the only moment it is cheap to catch is before the write. */
  const mine = new Set(SITES.flatMap((s) => [...s.plans, ...Object.values(s.ladders).flat()]));
  const clashes = [];
  for (const site of config.savedSites) {
    if (claimed.has(site)) continue;
    const existing = [...(site.plans || []), ...Object.values(site.ladders || {}).flatMap((l) => l.plans || [])];
    for (const id of existing) if (mine.has(id)) clashes.push(`${id} is already on "${site.name}"`);
  }
  if (clashes.length) {
    console.error('Refusing to run — these plan ids already belong to another site:');
    for (const c of clashes) console.error('  ' + c);
    await mongoose.disconnect();
    process.exit(1);
  }

  let added = 0;
  let updated = 0;
  const resolved = new Map();
  for (const s of SITES) {
    const ladders = {};
    for (const [m, plans] of Object.entries(s.ladders)) ladders[m] = ladderFor(m, plans);
    const fields = {
      unitCents: UNIT_CENTS.US,
      plans: s.plans.slice(),
      ladders,
    };

    const hit = matched.get(s);
    if (hit) {
      /* `enabled` is deliberately NOT in `fields`. Re-running this script must
         never resume a site somebody paused on purpose — the same rule the
         group toggle follows, where pausing is never silently undone. A new
         site starts enabled; an existing one keeps whatever it already was. */
      Object.assign(hit.row, fields);
      /* On a URL match the row is one this script owns, so the name is kept in
         step. On a PLAN match it is somebody's existing configuration found by
         its ladder, and the name and URL are left exactly as they are: this
         script knows which plans to charge, not where traffic should be sent,
         and rewriting a working custom domain to an onrender host would send
         buyers somewhere else. */
      if (hit.how === 'url') hit.row.name = s.name;
      resolved.set(s, hit.row);
      updated += 1;
      console.log(`  update  ${s.name.padEnd(12)} ${hit.row.url}`
        + (hit.how === 'plans' ? `   (matched by its USD ladder, listed as "${hit.row.name}")` : '')
        + (hit.row.enabled === false ? '   (left paused)' : ''));
    } else {
      const row = {
        ...fields,
        name: s.name,
        url: s.url,
        enabled: true,
        id: crypto.randomUUID(),
        groupId: '',
        baseUrl: new URL(s.url).origin,
        stats: { orders: 0, lastOrderAt: null },
      };
      config.savedSites.push(row);
      resolved.set(s, row);
      added += 1;
      console.log(`  add     ${s.name.padEnd(12)} ${s.url}`);
    }
  }

  console.log(`\n${added} to add, ${updated} to update. Total sites after: ${config.savedSites.length}.`);

  if (!apply) {
    console.log('\nDRY RUN — nothing was written. Re-run with --apply to commit.');
  } else {
    await SiteConfig.setValue('partnerExperience', config);
    console.log('\nWritten.');
    const after = await SiteConfig.getValue('partnerExperience', { savedSites: [] });
    /* Read back by id, not by URL: a row matched on its ladder keeps its own
       URL, and looking it up by the one in this file would report a site that
       was written correctly as MISSING. */
    for (const s of SITES) {
      const id = (resolved.get(s) || {}).id;
      const row = (after.savedSites || []).find((x) => x.id === id);
      const markets = row ? Object.keys(row.ladders || {}).sort().join(',') : '-';
      console.log(`  ${row ? 'ok  ' : 'MISSING'} ${s.name.padEnd(12)} markets=US,${markets} rungs=${row ? (row.plans || []).length : 0}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
