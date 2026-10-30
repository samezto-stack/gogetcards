/**
 * Is a partner site's checkout actually alive?
 *
 * THE FAILURE THIS EXISTS FOR. When a Whop business is suspended, its
 * embedded checkout still mounts an iframe — the iframe just contains
 * Whop's "Nothing to see here yet" page. Every existing signal reports
 * success: the partner site's own beacon fires `payment_shown` the moment
 * an iframe appears, because an iframe did appear. The buyer sees a 404
 * where the card form should be, leaves, and nothing anywhere records that
 * the order died. The site keeps its turn in the rotation and keeps
 * swallowing every checkout the cursor hands it.
 *
 * WHY THE BROWSER CANNOT TELL US. The iframe is cross-origin. Reading its
 * contents, its title or its status is exactly the restriction we do not
 * work around, so a client-side check cannot distinguish a payment form
 * from a 404. This file therefore never looks at Whop at all.
 *
 * WHAT IT WATCHES INSTEAD: hand-offs against completions, per site. Every
 * time the rotation sends a buyer to a site, that site's open hand-off
 * count goes up. Every completed order attributed to it sets the count
 * back to zero. A live site oscillates near zero; a dead one climbs and
 * never comes back down, and it is the only site doing so while its
 * neighbours keep converting.
 *
 * TWO CONDITIONS, NOT ONE, and the second is what makes it safe. A run of
 * hand-offs with no completion is ordinary on a quiet day — people abandon
 * checkouts constantly. So a site is only suspended once the run is BOTH
 * long enough AND old enough: the oldest unconverted hand-off has to have
 * been sitting there longer than a buyer could plausibly still be typing.
 * A burst of five abandonments inside a minute proves nothing and suspends
 * nobody.
 *
 * SUSPENDED IS NOT PAUSED. `enabled: false` is an operator decision and
 * this never touches it, in either direction. Health is a separate field,
 * so restoring a site that was auto-suspended cannot accidentally resume a
 * site somebody paused on purpose, and the admin screen can say which of
 * the two is keeping a site out of the rotation.
 *
 * NOTHING HERE FAILS A CHECKOUT. Every function is best-effort: if the
 * write throws, the buyer's hand-off has already happened and the order is
 * worth more than the bookkeeping. Failures are logged and swallowed.
 */
const SiteConfig = require('../models/SiteConfig');

const KEY = 'partnerExperience';

/** How many unconverted hand-offs in a row before a site is suspended. */
const THRESHOLD = Math.max(2, parseInt(process.env.PARTNER_DEAD_HANDOFFS || '', 10) || 5);

/**
 * How old the oldest unconverted hand-off must be, in minutes.
 *
 * Long enough that somebody genuinely mid-checkout is never counted
 * against the site they are buying from. A buyer who is going to convert
 * has almost always done so well inside this.
 */
const MIN_AGE_MS = Math.max(5, parseInt(process.env.PARTNER_DEAD_MINUTES || '', 10) || 30) * 60 * 1000;

/** The health block every site is read as having, whether or not it has one. */
function healthOf(site) {
  const h = (site && site.health) || {};
  return {
    state: h.state === 'suspended' ? 'suspended' : 'ok',
    openHandoffs: Math.max(0, parseInt(h.openHandoffs, 10) || 0),
    firstOpenAt: h.firstOpenAt ? new Date(h.firstOpenAt) : null,
    lastOrderAt: h.lastOrderAt ? new Date(h.lastOrderAt) : null,
    suspendedAt: h.suspendedAt ? new Date(h.suspendedAt) : null,
    reason: String(h.reason || ''),
    by: String(h.by || ''),
  };
}

function isSuspended(site) {
  return healthOf(site).state === 'suspended';
}

/**
 * Should this site be suspended right now? Pure, so it can be tested and
 * so the admin screen can explain the decision without repeating it.
 *
 * `now` is a parameter for the same reason.
 */
function verdict(site, now = Date.now()) {
  const h = healthOf(site);
  if (h.state === 'suspended') return { suspend: false, already: true, ...h };
  const enough = h.openHandoffs >= THRESHOLD;
  const old = !!h.firstOpenAt && (now - h.firstOpenAt.getTime()) >= MIN_AGE_MS;
  return {
    suspend: enough && old,
    already: false,
    enough,
    old,
    openHandoffs: h.openHandoffs,
    firstOpenAt: h.firstOpenAt,
    needed: THRESHOLD,
    minAgeMinutes: Math.round(MIN_AGE_MS / 60000),
  };
}

/**
 * Write to ONE site's health without rewriting the whole config.
 *
 * A read-modify-write of `partnerExperience` would lose whatever another
 * request wrote in between — and the two writers here are the checkout
 * hand-off and the order pipeline, which are precisely the two things that
 * happen at the same time. A positional update touches only the fields it
 * names.
 */
async function patch(siteId, update) {
  if (!siteId) return false;
  try {
    const res = await SiteConfig.updateOne(
      { key: KEY },
      update,
      { arrayFilters: [{ 's.id': siteId }] },
    );
    return !!(res && (res.modifiedCount || res.nModified));
  } catch (err) {
    console.error(`[partner-health] write failed for ${siteId}: ${err.message}`);
    return false;
  }
}

/**
 * The rotation has just sent a buyer to this site.
 *
 * $min on firstOpenAt keeps the OLDEST open hand-off rather than the newest:
 * the age test asks how long this site has been failing, and the newest
 * hand-off is always young.
 */
async function recordHandoff(siteId) {
  return patch(siteId, {
    $inc: { 'value.savedSites.$[s].health.openHandoffs': 1 },
    $min: { 'value.savedSites.$[s].health.firstOpenAt': new Date() },
  });
}

/**
 * An order attributed to this site completed, so its checkout works.
 *
 * This also clears a suspension. A site that has just taken money is alive
 * whatever the counter said, and requiring a human to restore it after
 * proof of life would be ceremony.
 */
async function recordCompletion(siteId) {
  return patch(siteId, {
    $set: {
      'value.savedSites.$[s].health.openHandoffs': 0,
      'value.savedSites.$[s].health.firstOpenAt': null,
      'value.savedSites.$[s].health.lastOrderAt': new Date(),
      'value.savedSites.$[s].health.state': 'ok',
      'value.savedSites.$[s].health.suspendedAt': null,
      'value.savedSites.$[s].health.reason': '',
      'value.savedSites.$[s].health.by': '',
    },
  });
}

async function suspend(siteId, reason, by = 'auto') {
  return patch(siteId, {
    $set: {
      'value.savedSites.$[s].health.state': 'suspended',
      'value.savedSites.$[s].health.suspendedAt': new Date(),
      'value.savedSites.$[s].health.reason': String(reason || '').slice(0, 200),
      'value.savedSites.$[s].health.by': by === 'admin' ? 'admin' : 'auto',
    },
  });
}

/**
 * Put a site back in the rotation and give it a clean slate.
 *
 * The counter is reset as well as the state. Restoring a site whose count
 * is still over the threshold would suspend it again on its next hand-off,
 * which reads as the button not working.
 */
async function restore(siteId, by = 'admin') {
  return patch(siteId, {
    $set: {
      'value.savedSites.$[s].health.state': 'ok',
      'value.savedSites.$[s].health.openHandoffs': 0,
      'value.savedSites.$[s].health.firstOpenAt': null,
      'value.savedSites.$[s].health.suspendedAt': null,
      'value.savedSites.$[s].health.reason': '',
      'value.savedSites.$[s].health.by': String(by || 'admin').slice(0, 40),
    },
  });
}

/**
 * Suspend every site whose run of dead hand-offs has met both conditions.
 *
 * Called after each hand-off rather than on a timer: the moment a site
 * crosses the line is the moment it was about to be handed another buyer,
 * and a sweep on a schedule would let the next few through first.
 *
 * Returns what it did, so the caller can log it once instead of guessing.
 */
async function sweep(config, now = Date.now()) {
  const sites = (config && config.savedSites) || [];

  /* NEVER SUSPEND THE LAST ONE, and this is not a nicety.
     An empty rotation is not a degraded checkout, it is no checkout:
     resolvePartnerRedirect returns null, and the buyer gets gogetcards's
     own "This checkout cannot be completed" page for every product in the
     catalogue. A dead partner at least shows one broken payment step to
     the people the cursor happens to land on.
     So suspension can take the pool down to one site and no further. The
     last site stays in the rotation however badly it is converting, and
     the operator's own pause switch remains the only thing that can empty
     the pool — because that one is a decision somebody made. */
  let standing = sites.filter((s) => s && s.enabled !== false && !isSuspended(s)).length;

  /* Worst first, so if several cross the line at once the one left
     standing is the one with the shortest run rather than whichever
     happens to sit last in the array. */
  const candidates = sites
    .filter((s) => s && s.enabled !== false && verdict(s, now).suspend)
    .sort((a, b) => healthOf(b).openHandoffs - healthOf(a).openHandoffs);

  const done = [];
  const held = [];
  for (const site of candidates) {
    const v = verdict(site, now);
    const reason = `${v.openHandoffs} hand-offs with no completed order, oldest ${Math.round((now - v.firstOpenAt.getTime()) / 60000)} minutes ago`;
    if (standing <= 1) {
      console.warn(`[partner-health] ${site.name || site.id} looks dead (${reason}) but is the last site in the rotation — left active`);
      held.push({ id: site.id, name: site.name || site.id, reason });
      continue;
    }
    /* Through module.exports rather than the local binding, so the guard
       above can be tested without a database. The only caller that swaps it
       is the audit. */
    if (await module.exports.suspend(site.id, reason, 'auto')) {
      standing--;
      console.warn(`[partner-health] suspended ${site.name || site.id}: ${reason}`);
      done.push({ id: site.id, name: site.name || site.id, reason });
    }
  }
  return { suspended: done, held };
}

module.exports = {
  KEY,
  THRESHOLD,
  MIN_AGE_MS,
  healthOf,
  isSuspended,
  verdict,
  recordHandoff,
  recordCompletion,
  suspend,
  restore,
  sweep,
};
