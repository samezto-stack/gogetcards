/**
 * Partner sites and their ladders, read from a CSV.
 *
 * WHY THIS EXISTS. A site with four markets is forty-eight plan ids, and
 * twelve of them are one textarea. Ten sites is four hundred and eighty
 * strings typed or pasted into a form by hand, and the failure mode of a
 * mistake is not an error — a rung in the wrong slot charges one price and
 * shows another, and nothing anywhere reports it. Machines are better at
 * this than people, so the ids arrive as a file.
 *
 * THE FORMAT IS LONG, NOT WIDE. One row per rung:
 *
 *     site,url,market,step,plan_id,unit_price
 *     Term Sheet,https://term-sheet.onrender.com/services/term-sheet-review,US,1,plan_Wxt…,74.99
 *
 * A wide file — one row per site, fifty-odd columns — is shorter to look at
 * and silently wrong the moment a column is added, removed or reordered:
 * every id shifts one place and the file still parses. Here each row states
 * its own market and its own step, so a row can go missing, arrive out of
 * order, or be edited in a spreadsheet, and nothing it does not mention can
 * be corrupted. The header is read by NAME for the same reason; column
 * order is not part of the contract.
 *
 * NOTHING IS APPLIED UNLESS EVERYTHING PARSES. A half-applied import leaves
 * some sites with ladders and some without, and no way to tell from the
 * screen which is which. So parsing collects every problem with its row
 * number and the caller writes nothing at all if there is one.
 *
 * THE GROUP IS NOT IN THE FILE. It is chosen in the form at import time —
 * a CSV that carried group ids would be tied to one installation's
 * database, and the operator would have to look them up to write it.
 */
const markets = require('../config/markets');
const partnerRotation = require('./partnerRotation');

const REQUIRED_COLUMNS = ['site', 'url', 'market', 'step', 'plan_id', 'unit_price'];

/** One CSV line into fields, honouring double quotes around commas. */
function splitRow(line) {
  const out = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; }   /* "" is one quote */
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(field); field = ''; }
    else field += c;
  }
  out.push(field);
  return out.map((f) => f.trim());
}

/**
 * Parse the whole file.
 *
 * Returns { sites, errors, warnings }. `sites` is only meaningful when
 * `errors` is empty — see the note above about half-applied imports.
 */
function parseSitesCsv(text) {
  const errors = [];
  const warnings = [];
  const rows = String(text || '')
    .replace(/^﻿/, '')            /* Excel writes a BOM */
    .split(/\r\n|\n|\r/)
    .map((l, i) => ({ line: i + 1, raw: l }))
    .filter((r) => r.raw.trim() !== '');

  if (!rows.length) return { sites: [], errors: ['The file is empty.'], warnings };

  const header = splitRow(rows[0].raw).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) {
    return {
      sites: [],
      errors: [`The header row is missing: ${missing.join(', ')}. Expected ${REQUIRED_COLUMNS.join(', ')}.`],
      warnings,
    };
  }
  const at = (fields, name) => fields[header.indexOf(name)] || '';

  const marketIds = markets.MARKETS.map((m) => m.id);
  const baseMarket = markets.defaultMarket().id;
  const STEPS = partnerRotation.LADDER_STEPS;

  /* Keyed by url: the url is what the rotation redirects to, so two rows
     claiming the same url are the same site however they spell the name. */
  const byUrl = new Map();

  for (const row of rows.slice(1)) {
    const f = splitRow(row.raw);
    const where = `Row ${row.line}`;
    const name = at(f, 'site');
    const url = at(f, 'url');
    const market = at(f, 'market').toUpperCase();
    const stepRaw = at(f, 'step');
    const planId = at(f, 'plan_id');
    const priceRaw = at(f, 'unit_price');

    if (!name) { errors.push(`${where}: no site name.`); continue; }
    if (!/^https:\/\/\S+$/i.test(url)) { errors.push(`${where}: url must be an absolute https URL, got "${url}".`); continue; }
    if (!marketIds.includes(market)) {
      errors.push(`${where}: unknown market "${market}". Known markets are ${marketIds.join(', ')}.`);
      continue;
    }
    const step = parseInt(stepRaw, 10);
    if (!Number.isInteger(step) || step < 1 || step > STEPS) {
      errors.push(`${where}: step must be a whole number from 1 to ${STEPS}, got "${stepRaw}".`);
      continue;
    }
    if (!/^plan_[A-Za-z0-9]+$/.test(planId)) {
      errors.push(`${where}: "${planId}" is not a plan id.`);
      continue;
    }
    const price = parseFloat(priceRaw);
    if (!Number.isFinite(price) || price <= 0) {
      errors.push(`${where}: unit_price must be a positive number, got "${priceRaw}".`);
      continue;
    }

    let site = byUrl.get(url);
    if (!site) {
      site = { name, url, markets: new Map() };
      byUrl.set(url, site);
    } else if (site.name !== name) {
      warnings.push(`${url} is named both "${site.name}" and "${name}"; using "${site.name}".`);
    }

    let lad = site.markets.get(market);
    if (!lad) {
      lad = { unitCents: Math.round(price * 100), plans: new Array(STEPS).fill(''), seen: new Map() };
      site.markets.set(market, lad);
    } else if (lad.unitCents !== Math.round(price * 100)) {
      /* Two different steps for one market cannot both be right, and
         guessing which would misprice every rung under it. */
      errors.push(
        `${where}: ${name} ${market} already has a step of ${(lad.unitCents / 100).toFixed(2)}, ` +
        `this row says ${price.toFixed(2)}.`,
      );
      continue;
    }

    if (lad.seen.has(step)) {
      errors.push(`${where}: ${name} ${market} step ${step} appears twice (line ${lad.seen.get(step)} and ${row.line}).`);
      continue;
    }
    lad.seen.set(step, row.line);
    lad.plans[step - 1] = planId;
  }

  /* Cross-row checks that only make sense once the whole file is read. */
  const sites = [];
  const everyId = new Map();
  for (const site of byUrl.values()) {
    const out = { name: site.name, url: site.url, unitCents: 0, plans: new Array(STEPS).fill(''), ladders: {} };

    for (const [market, lad] of site.markets) {
      const filled = lad.plans.filter(Boolean).length;
      if (filled !== STEPS) {
        const gaps = lad.plans.map((p, i) => (p ? null : i + 1)).filter(Boolean);
        errors.push(`${site.name} ${market}: ${filled} of ${STEPS} rungs — missing step ${gaps.join(', ')}.`);
      }
      for (const id of lad.plans) {
        if (!id) continue;
        const prev = everyId.get(id);
        /* One plan id in two places charges the wrong ladder's price in at
           least one of them, and both look correct on screen. */
        if (prev) errors.push(`Plan ${id} is used twice: ${prev} and ${site.name} ${market}.`);
        else everyId.set(id, `${site.name} ${market}`);
      }

      if (market === baseMarket) {
        out.unitCents = lad.unitCents;
        out.plans = lad.plans;
      } else {
        out.ladders[market] = { unitCents: lad.unitCents, plans: lad.plans };
      }
    }

    if (!out.plans.some(Boolean)) {
      /* Not an error: a site may open a non-default market first. But the
         default market is where most sales are, so say so out loud. */
      warnings.push(`${site.name} has no ${baseMarket} ladder, so it cannot serve the default market.`);
      out.unitCents = partnerRotation.DEFAULT_UNIT_CENTS;
    }
    sites.push(out);
  }

  return { sites, errors, warnings };
}

module.exports = { parseSitesCsv, splitRow, REQUIRED_COLUMNS };
