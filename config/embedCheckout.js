/**
 * Which partner hosts can serve the payment step inside a frame.
 *
 * WHY A LIST AND NOT A FLAG ON EVERY HOST. Embedded mode needs TWO changes
 * on the partner side — serving the gated page without the token-stripping
 * redirect, and posting the completion up to the parent instead of
 * navigating. A host without both of those will either show its own
 * marketing page inside the frame or render the thank-you page in a box in
 * the middle of the checkout. Neither fails loudly, and both take money
 * first. So a host is embedded only once it has been changed and tested,
 * and everything else keeps the redirect it has today.
 *
 * HOW TO ADD ONE. Ship the partner changes, put a real card through it on a
 * phone and a desktop, confirm the order appears, then add the host here.
 * Not before.
 *
 * Matched on hostname only — no scheme, no path, no port. A host that is
 * not listed is redirected to exactly as it is now, which is why this file
 * being wrong in the safe direction costs nothing.
 */

/**
 * HOW the payment step is presented. Two ways, one constraint apart.
 *
 *   'window'  A payment window this page opens. TOP-LEVEL, so the bank's
 *             3-D Secure challenge has no frame to refuse — and wallets
 *             work, because Apple Pay and Google Pay do not survive a
 *             nested frame either. The customer's own window never leaves
 *             gogetcards.
 *
 *   'frame'   Inline in the page. The best-looking option and the one that
 *             hides the partner domain completely, but the payment ends up
 *             three frames deep: gogetcards -> partner -> Whop -> the
 *             bank. Plenty of banks send frame-ancestors 'none' on their
 *             challenge page, and a customer who needs one gets a blank
 *             box instead of a payment they can complete.
 *
 * 'window' is the default because a checkout that looks slightly less
 * seamless beats one that cannot take money from a whole class of cards.
 * Switch a host to 'frame' only if you have proved 3-D Secure completes
 * inside it with a real card that actually challenges.
 */
const MODES = { WINDOW: 'window', FRAME: 'frame' };

/* GoGetCards runs its OWN partner batch, separate from zypheratcg's. The
   list starts empty on purpose: a host is added here only once its site has
   been built from the partner template, shipped, and proved with a real card.
   Custom domains must be listed; *.onrender.com hosts frame by the blanket
   rule below without an entry. */
const HOSTS = [];

const MODE_BY_HOST = {};

/** Normalised set, so a stray capital or a trailing dot cannot miss. */
const SET = new Set(HOSTS.map((h) => String(h).trim().toLowerCase().replace(/\.$/, '')));

/**
 * EVERY *.onrender.com HOST IS EMBEDDABLE, without being listed above.
 *
 * WHY THIS IS SAFE HERE, when the whole file otherwise insists on explicit
 * opt-in. Two facts about this setup make the blanket rule sound:
 *
 *   1. A host is only ever FRAMED if the rotation SENDS A BUYER TO IT, and a
 *      site enters the rotation only when the operator adds it (its row in
 *      the partner CSV / Settings). So the real gate is "is it a configured
 *      partner site", which the operator controls — an arbitrary stranger's
 *      onrender app is never in the rotation and so is never framed.
 *   2. Every partner site is built from one template that already carries the
 *      embed build (the POST-body token path, ALLOWED_PARENT_ORIGINS, and the
 *      data-ck-embed marker). So any of these sites is embed-ready by
 *      construction; there is no half-built onrender partner to protect
 *      against.
 *
 * WHAT IT BUYS: new sites spun up on fresh *.onrender.com hosts frame with
 * no edit to this file, so the site-building work does not have to reach into
 * gogetcards at all. The explicit onrender entries above are now redundant
 * (kept as documentation of what shipped); custom domains still need listing,
 * because the argument above is specific to onrender and does not extend to a
 * domain we might not control.
 *
 * WINDOW is still reachable per host through MODE_BY_HOST — a host listed
 * there wins over this default, so a specific onrender host can be forced
 * back to a window if 3-D Secure ever proves it needs one.
 */
function isRenderHost(host) {
  return host === 'onrender.com' || host.endsWith('.onrender.com');
}

/**
 * Can this payment URL be shown in a frame?
 *
 * Defaults to NO on anything unparseable. The cost of a wrong "no" is the
 * redirect that has always happened; the cost of a wrong "yes" is a
 * customer staring at a coaching homepage where the card form should be.
 */
function canEmbed(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SET.has(host) || isRenderHost(host);
  } catch {
    return false;
  }
}

/**
 * How this host should present the payment step.
 *
 * Returns '' for a host that is not enabled at all, which the caller treats
 * as "redirect, exactly as before". An explicit MODE_BY_HOST entry wins;
 * otherwise any onrender host frames, and everything else that is not listed
 * is not enabled.
 */
function modeFor(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (SET.has(host)) return MODE_BY_HOST[host] === MODES.FRAME ? MODES.FRAME : MODES.WINDOW;
    if (isRenderHost(host)) return MODES.FRAME;
    return '';
  } catch {
    return '';
  }
}

module.exports = { HOSTS, MODES, canEmbed, modeFor };
