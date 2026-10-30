/**
 * Live-ish exchange rates, for the approximate local price shown under the
 * real one.
 *
 * WHAT THIS IS NOT. It never sets a price. Every price on this site, in the
 * feed, in the structured data, in the cart and at checkout is USD and stays
 * USD. What this produces is a courtesy line — "about CA$615" — so a
 * Canadian reaching the payment step is not surprised by the number their
 * bank shows them. If these rates were wrong by five percent nothing would
 * break; the customer would simply see a slightly worse estimate.
 *
 * That is also why it is safe for Merchant Center. Google compares the price
 * in the feed against the price on the landing page, and both are the same
 * unchanging USD figure. The estimate is rendered client-side, is labelled
 * as approximate, and never appears in JSON-LD or the feed.
 *
 * WHY THE FETCH IS SERVER-SIDE. The obvious implementation calls a currency
 * API from the browser, which would mean every visitor's IP is handed to a
 * third party we have no agreement with, on every product page, before they
 * have consented to anything. Fetching once here and inlining the result
 * costs the visitor no extra request and tells no one outside this server
 * that they exist.
 *
 * IT CANNOT TAKE THE SITE DOWN. The table below ships with the code, so a
 * blocked network, a rate-limited provider or a provider that disappears
 * entirely leaves the site rendering exactly as it does now, with slightly
 * stale estimates. Nothing here throws, nothing here is awaited on a request
 * path, and a failed refresh keeps the last good values.
 */

/* Approximate USD -> X, correct to within a percent or two when written
   (August 2026). Only a seed and a fallback: the refresh below replaces
   these within seconds of boot in any environment with network access.
   Deliberately not precise, because pretending otherwise would invite
   someone to treat them as authoritative. */
const FALLBACK = {
  CAD: 1.37, GBP: 0.78, EUR: 0.92, AUD: 1.52, NZD: 1.66,
  JPY: 152, MXN: 18.7, SGD: 1.34, CHF: 0.88, SEK: 10.6,
  NOK: 10.7, DKK: 6.85, PLN: 3.95, BRL: 5.45, AED: 3.67,
};

/* The only currencies quoted. Adding one here is all it takes; anything
   outside this list simply gets no estimate, which is the correct outcome
   for a currency we have no rate for. */
const SUPPORTED = Object.keys(FALLBACK);

const PROVIDER = 'https://open.er-api.com/v6/latest/USD';
const REFRESH_MS = 6 * 60 * 60 * 1000; // six hours; these move by fractions of a percent a day
const FETCH_TIMEOUT_MS = 6000;

let rates = { ...FALLBACK };
let updatedAt = null; // null means "never successfully fetched, these are the shipped values"

/**
 * Rejects a payload that parsed but is not sane.
 *
 * A currency API returning 200 with garbage is more likely than one that is
 * down, and a rate of 0 or 1e9 would render an estimate absurd enough to
 * cost a sale. Anything outside a wide but finite band is discarded rather
 * than shown.
 */
function plausible(code, value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return false;
  const seed = FALLBACK[code];
  /* Within an order of magnitude of the shipped value. Real currencies do
     not move by 10x without it being the least of anyone's problems. */
  return value > seed / 10 && value < seed * 10;
}

async function refresh() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(PROVIDER, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) throw new Error(`provider responded ${res.status}`);

    const body = await res.json();
    const incoming = body && body.rates;
    if (!incoming || typeof incoming !== 'object') throw new Error('no rates in payload');

    const next = {};
    for (const code of SUPPORTED) {
      if (plausible(code, incoming[code])) next[code] = incoming[code];
    }
    /* A partial answer is worse than no answer: it would quietly leave some
       currencies on shipped values and others live, with no way to tell
       which from the outside. Take all of them or keep what we have. */
    if (Object.keys(next).length !== SUPPORTED.length) {
      throw new Error(`only ${Object.keys(next).length}/${SUPPORTED.length} rates were usable`);
    }

    rates = next;
    updatedAt = Date.now();
  } catch (err) {
    console.warn('[fx] rate refresh failed, keeping the previous table:', err.message);
  }
}

/** What the page inlines. Small enough that inlining beats a second request. */
function snapshot() {
  return { rates, updatedAt };
}

/**
 * Starts the refresh loop. Called once from server.js.
 *
 * unref() so this timer never holds the process open: a server that will not
 * shut down because of a currency ticker is a deployment that hangs.
 */
function start() {
  refresh();
  const timer = setInterval(refresh, REFRESH_MS);
  if (typeof timer.unref === 'function') timer.unref();
}

module.exports = { snapshot, start, refresh, SUPPORTED, FALLBACK };
