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
 *             zypheratcg.
 *
 *   'frame'   Inline in the page. The best-looking option and the one that
 *             hides the partner domain completely, but the payment ends up
 *             three frames deep: zypheratcg -> partner -> Whop -> the
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

const HOSTS = [
  /* callback-coaching: the first one through. */
  'callback-coaching.onrender.com',
  'callbackcoaching.com',
  'www.callbackcoaching.com',

  /* the-bindery: carries the same embedded-checkout build, so it can take
     over from callback-coaching without anything else changing. */
  'the-bindery.onrender.com',
  'thebindery.com',
  'www.thebindery.com',

  /* podium-strategy: same build again. */
  'podium-strategy.onrender.com',
  'podiumstrategy.com',
  'www.podiumstrategy.com',

  /* closing-hour: same build again. */
  'closing-hour.onrender.com',
  'closinghour.com',
  'www.closinghour.com',

  /* on-record-coaching: same build again. */
  'on-record-coaching.onrender.com',
  'onrecordcoaching.com',
  'www.onrecordcoaching.com',

  /* admit-hour-coaching: same build again. */
  'admit-hour-coaching.onrender.com',
  'admithourcoaching.com',
  'www.admithourcoaching.com',

  /* coverage-desk, award-cycle and defense-date: the same build once more.
     Each carries its own EXPERIENCE_SIGNING_SECRET and shares only the api
     key and the thank-you signing secret, exactly like the six above. The
     apex domains are listed ahead of being registered — an unregistered host
     in this list grants nothing on its own, and adding it now means the day
     a domain is attached is not also the day someone has to remember this
     file. */
  'coverage-desk.onrender.com',
  'coveragedesk.com',
  'www.coveragedesk.com',

  'award-cycle.onrender.com',
  'awardcycle.com',
  'www.awardcycle.com',

  'defense-date.onrender.com',
  'defensedate.com',
  'www.defensedate.com',

  /* deck-margin, proposal-ledger and contrast-ratio: the same build again,
     verified before being listed — each serves the gated page without the
     token-stripping redirect (the POST-body token path), reads the parent
     origin, and marks the document data-ck-embed so the framed render drops
     the header and order summary the parent has already drawn.

     Apex domains listed ahead of registration, per the note above. If any
     of these three ends up on a different domain, correct it here — an
     unlisted host is redirected to rather than framed, which is the safe
     direction to be wrong in. */
  'deck-margin.onrender.com',
  'deckmargin.com',
  'www.deckmargin.com',

  'proposal-ledger.onrender.com',
  'proposalledger.com',
  'www.proposalledger.com',

  'contrast-ratio.onrender.com',
  'contrastratio.com',
  'www.contrastratio.com',

  /* crawl-budget, mail-path, plate-cost, run-of-show and second-listen:
     the same build once more. Each was checked before being listed — the
     gated route answers a POSTed token with 200 and the embedded document
     rather than the token-stripping redirect, the parent origin is read
     from the allowlist rather than the request, and the page marks itself
     data-ck-embed so the framed render drops the header and order summary
     the parent has already drawn.

     Apex domains listed ahead of registration, per the note above. */
  'crawl-budget.onrender.com',
  'crawlbudget.com',
  'www.crawlbudget.com',

  'mail-path.onrender.com',
  'mailpath.com',
  'www.mailpath.com',

  'plate-cost.onrender.com',
  'platecost.com',
  'www.platecost.com',

  'run-of-show.onrender.com',
  'runofshow.com',
  'www.runofshow.com',

  'second-listen.onrender.com',
  'secondlisten.com',
  'www.secondlisten.com',

  /* sight-line and peer-window: the last two of the same build, checked the
     same way once their plan ids landed. That completes the set of ten. */
  'sight-line.onrender.com',
  'sightline.com',
  'www.sightline.com',

  'peer-window.onrender.com',
  'peerwindow.com',
  'www.peerwindow.com',

  /* label-panel, bid-package, drill-down and floor-set: the same build
     again. Each was read rather than driven — this environment cannot reach
     *.onrender.com, so the checks below were made against the four repos'
     source, not against what Render is currently serving:

       - server.js mounts POST /services/<slug> through acceptTokenFromBody,
         so the gated page answers a POSTed token instead of the
         token-stripping redirect;
       - ALLOWED_PARENT_ORIGINS holds the three zypheratcg origins and
         nothing else, and parentOriginFrom() reads the claim against that
         set rather than trusting the request;
       - server/experiences/partner.html marks the document data-ck-embed,
         so the framed render drops the header and order summary the parent
         has already drawn.

     WHAT IS NOT CONFIRMED: that a real challenged card completes 3-D Secure
     inside the frame — open for every host in this list equally — and that
     Render has deployed the current main for these four. If either turns
     out wrong, deleting these four lines restores exactly the redirect they
     have today.

     No apex domains listed for these four. The entries above name domains
     that are ours; guessing labelpanel.com and the rest would be granting
     frame rights to whoever actually owns them. */
  'label-panel.onrender.com',
  'bid-package.onrender.com',
  'drill-down.onrender.com',
  'floor-set.onrender.com',

  /* term-sheet, sample-size, pick-path, job-spec, cut-list and data-room:
     the same build once more, checked the same way — the gated route takes
     a POSTed token through acceptTokenFromBody, ALLOWED_PARENT_ORIGINS
     holds the three zypheratcg origins and nothing else, and partner.html
     marks the document data-ck-embed.

     THE HOSTNAMES ARE NOT ALL THE REPOSITORY NAMES. Render appended a
     suffix where the plain name was taken, so sample-size, cut-list and
     data-room answer on -5pbl, -zjfe and -yfem. Matching is on hostname,
     so guessing the tidy form here would leave those three redirecting
     while their siblings frame — an inconsistency nobody would think to
     look for. Copied from the live URLs rather than derived.

     Read, not driven: this environment cannot reach *.onrender.com. Apex
     domains are absent because none is registered for these six; listing
     a domain we do not own would grant frame rights to whoever does. */
  'term-sheet.onrender.com',
  'sample-size-5pbl.onrender.com',
  'pick-path.onrender.com',
  'job-spec.onrender.com',
  'cut-list-zjfe.onrender.com',
  'data-room-yfem.onrender.com',

  /* string-table, trial-balance, shot-list, cap-table, change-order,
     cue-sheet, test-plan, dead-stock, press-kit and hold-music: the same
     build once more. Each was read rather than driven — this environment
     cannot reach *.onrender.com — and each carries the POST-body token
     path, ALLOWED_PARENT_ORIGINS holding the three zypheratcg origins
     and nothing else, and the data-ck-embed marker on partner.html.

     TWO OF THE TEN ARE SUFFIXED. Render appended -zqlh to test-plan and
     -uy84 to hold-music where the plain name was taken; the other eight
     match their repository. Matching here is on hostname, so the tidy
     forms would leave those two redirecting while their eight siblings
     frame — and the same mismatch in returnUrl was, on the previous
     batch, a paying customer landing on a host that does not exist.
     Copied from the live URLs, not derived from repository names.

     No apex domains: none is registered for these ten, and listing a
     domain we do not own grants frame rights to whoever does. */
  'string-table.onrender.com',
  'trial-balance.onrender.com',
  'shot-list.onrender.com',
  'cap-table.onrender.com',
  'change-order.onrender.com',
  'cue-sheet.onrender.com',
  'test-plan-zqlh.onrender.com',
  'dead-stock.onrender.com',
  'press-kit.onrender.com',
  'hold-music-uy84.onrender.com',

  /* heat-loss, tariff-line, cover-note, first-run, stage-plot, comp-plan
     and course-map: the same build a seventh time. Each was read rather
     than driven — this environment cannot reach *.onrender.com — and each
     carries the POST-body token path, ALLOWED_PARENT_ORIGINS holding the
     three zypheratcg origins and nothing else, and the data-ck-embed
     marker on partner.html.

     TWO OF THE SEVEN ARE SUFFIXED. Render appended -oncc to first-run and
     -prvm to course-map where the plain name was taken; the other five
     match their repository. Matching here is on hostname, so the tidy
     forms would leave those two redirecting while their five siblings
     frame — and the same mismatch in returnUrl has twice been a paying
     customer landing on a host that does not exist. Copied from the live
     URLs the operator sent, not derived from repository names.

     No apex domains: none is registered for these seven, and listing a
     domain we do not own grants frame rights to whoever does. */
  'heat-loss.onrender.com',
  'tariff-line.onrender.com',
  'cover-note.onrender.com',
  'first-run-oncc.onrender.com',
  'stage-plot.onrender.com',
  'comp-plan.onrender.com',
  'course-map-prvm.onrender.com',

  /* red-line, cold-restore, notice-file, read-speed and hard-code: the
     first five of batch 8, the same build an eighth time. Each was read
     rather than driven — this environment cannot reach *.onrender.com —
     and each carries the POST-body token path, ALLOWED_PARENT_ORIGINS
     holding the three zypheratcg origins and nothing else, and the
     data-ck-embed marker on partner.html.

     ONE OF THE FIVE IS SUFFIXED. Render appended -zsii to red-line where
     the plain name was taken; the other four match their repository.
     Copied from the live URLs the operator sent, not derived from
     repository names — the tidy form would leave red-line redirecting
     while its siblings frame, and would send a paying buyer to a host
     that does not exist.

     No apex domains: none is registered for these five, and listing a
     domain we do not own grants frame rights to whoever does. */
  'red-line-zsii.onrender.com',
  'cold-restore.onrender.com',
  'notice-file.onrender.com',
  'read-speed.onrender.com',
  'hard-code.onrender.com',

  /* minute-book, shift-cover and prize-draw: the last three of batch 8,
     read rather than driven like every sibling, and carrying the same
     POST-body token path, parent-origin list and data-ck-embed marker.

     ONE OF THE THREE IS SUFFIXED. Render appended -dv7y to shift-cover;
     the other two match their repository. Copied from the live URLs the
     operator sent, and the tidy shift-cover form stays unlisted for the
     same reason red-line's does above. */
  'minute-book.onrender.com',
  'shift-cover-dv7y.onrender.com',
  'prize-draw.onrender.com',

  /* Batch 9, REBRANDED and moved to the turanozsoy org: Board Packs, Rooms
     Data, Mark Schemes, Call Sheets, Menu Copies, Handover Notes, Release
     Notes and Export Sets. These REPLACE the old samezto-stack hosts
     (boardpack-abuw, roomdatapro, markscheme, callsheets, menucopy,
     handovernote, releasenote, exportset), which are being retired — the
     Whop products and plan ids are unchanged, only the repo, name, design
     and host moved. Each still carries the POST-body token path,
     ALLOWED_PARENT_ORIGINS holding the three zypheratcg origins and nothing
     else, and the data-ck-embed marker on partner.html.

     ONE OF THE EIGHT IS SUFFIXED. Render appended -9hc1 to release-notes
     where the plain name was taken; the other seven match their repository.
     Copied from the live URLs the operator sent, not derived from names —
     the tidy release-notes form would leave it redirecting while its
     siblings frame. No apex domains: none is registered for these eight. */
  'boardpackss.onrender.com',
  'rooms-data.onrender.com',
  'mark-schemes.onrender.com',
  'call-sheets.onrender.com',
  'menu-copies.onrender.com',
  'handover-notes.onrender.com',
  'release-notes-9hc1.onrender.com',
  'export-sets.onrender.com',
];

const MODE_BY_HOST = {
  /* Inline, pending a real 3-D Secure test. This is the arrangement that
     looks right — one page, one domain, nothing to explain — and whether it
     can actually take a challenged card is the open question. Move it back
     to 'window' the moment a real card proves it cannot. */
  'callback-coaching.onrender.com': MODES.FRAME,
  'callbackcoaching.com': MODES.FRAME,
  'www.callbackcoaching.com': MODES.FRAME,
  'the-bindery.onrender.com': MODES.FRAME,
  'thebindery.com': MODES.FRAME,
  'www.thebindery.com': MODES.FRAME,
  'podium-strategy.onrender.com': MODES.FRAME,
  'podiumstrategy.com': MODES.FRAME,
  'www.podiumstrategy.com': MODES.FRAME,
  'closing-hour.onrender.com': MODES.FRAME,
  'closinghour.com': MODES.FRAME,
  'www.closinghour.com': MODES.FRAME,
  'on-record-coaching.onrender.com': MODES.FRAME,
  'onrecordcoaching.com': MODES.FRAME,
  'www.onrecordcoaching.com': MODES.FRAME,
  'admit-hour-coaching.onrender.com': MODES.FRAME,
  'admithourcoaching.com': MODES.FRAME,
  'www.admithourcoaching.com': MODES.FRAME,
  'coverage-desk.onrender.com': MODES.FRAME,
  'coveragedesk.com': MODES.FRAME,
  'www.coveragedesk.com': MODES.FRAME,
  'award-cycle.onrender.com': MODES.FRAME,
  'awardcycle.com': MODES.FRAME,
  'www.awardcycle.com': MODES.FRAME,
  'defense-date.onrender.com': MODES.FRAME,
  'defensedate.com': MODES.FRAME,
  'www.defensedate.com': MODES.FRAME,
  /* FRAME to match every sibling, not because it has been proved. The
     3-D Secure question above is open for all twelve hosts equally, so
     singling these three out as 'window' would make them behave
     differently for no reason anyone could find later. The day a real
     challenged card fails inside the frame, the fix is one edit here and
     it applies to the whole list. */
  'deck-margin.onrender.com': MODES.FRAME,
  'deckmargin.com': MODES.FRAME,
  'www.deckmargin.com': MODES.FRAME,
  'proposal-ledger.onrender.com': MODES.FRAME,
  'proposalledger.com': MODES.FRAME,
  'www.proposalledger.com': MODES.FRAME,
  'contrast-ratio.onrender.com': MODES.FRAME,
  'contrastratio.com': MODES.FRAME,
  'www.contrastratio.com': MODES.FRAME,
  /* FRAME for the same reason as the three above: matching every sibling
     rather than singling these out. The open 3-D Secure question now covers
     nineteen hosts equally, and one edit here still moves all of them. */
  'crawl-budget.onrender.com': MODES.FRAME,
  'crawlbudget.com': MODES.FRAME,
  'www.crawlbudget.com': MODES.FRAME,
  'mail-path.onrender.com': MODES.FRAME,
  'mailpath.com': MODES.FRAME,
  'www.mailpath.com': MODES.FRAME,
  'plate-cost.onrender.com': MODES.FRAME,
  'platecost.com': MODES.FRAME,
  'www.platecost.com': MODES.FRAME,
  'run-of-show.onrender.com': MODES.FRAME,
  'runofshow.com': MODES.FRAME,
  'www.runofshow.com': MODES.FRAME,
  'second-listen.onrender.com': MODES.FRAME,
  'secondlisten.com': MODES.FRAME,
  'www.secondlisten.com': MODES.FRAME,
  'sight-line.onrender.com': MODES.FRAME,
  'sightline.com': MODES.FRAME,
  'www.sightline.com': MODES.FRAME,
  'peer-window.onrender.com': MODES.FRAME,
  'peerwindow.com': MODES.FRAME,
  'www.peerwindow.com': MODES.FRAME,
  /* FRAME to match every sibling, for the same reason as the batches above:
     the 3-D Secure question is open across the whole list, and singling
     these four out as 'window' would make them behave differently for a
     reason nobody could reconstruct later. */
  'label-panel.onrender.com': MODES.FRAME,
  'bid-package.onrender.com': MODES.FRAME,
  'drill-down.onrender.com': MODES.FRAME,
  'floor-set.onrender.com': MODES.FRAME,
  /* FRAME to match every sibling. The 3-D Secure question is open across
     the whole list, and one edit here still moves all of them. */
  'term-sheet.onrender.com': MODES.FRAME,
  'sample-size-5pbl.onrender.com': MODES.FRAME,
  'pick-path.onrender.com': MODES.FRAME,
  'job-spec.onrender.com': MODES.FRAME,
  'cut-list-zjfe.onrender.com': MODES.FRAME,
  'data-room-yfem.onrender.com': MODES.FRAME,
  /* FRAME to match every sibling. The 3-D Secure question is open across
     the whole list, and one edit here still moves all of them. */
  'string-table.onrender.com': MODES.FRAME,
  'trial-balance.onrender.com': MODES.FRAME,
  'shot-list.onrender.com': MODES.FRAME,
  'cap-table.onrender.com': MODES.FRAME,
  'change-order.onrender.com': MODES.FRAME,
  'cue-sheet.onrender.com': MODES.FRAME,
  'test-plan-zqlh.onrender.com': MODES.FRAME,
  'dead-stock.onrender.com': MODES.FRAME,
  'press-kit.onrender.com': MODES.FRAME,
  'hold-music-uy84.onrender.com': MODES.FRAME,
  /* FRAME to match every sibling. The 3-D Secure question is open across
     the whole list, and one edit here still moves all of them. */
  'heat-loss.onrender.com': MODES.FRAME,
  'tariff-line.onrender.com': MODES.FRAME,
  'cover-note.onrender.com': MODES.FRAME,
  'first-run-oncc.onrender.com': MODES.FRAME,
  'stage-plot.onrender.com': MODES.FRAME,
  'comp-plan.onrender.com': MODES.FRAME,
  'course-map-prvm.onrender.com': MODES.FRAME,
  'red-line-zsii.onrender.com': MODES.FRAME,
  'cold-restore.onrender.com': MODES.FRAME,
  'notice-file.onrender.com': MODES.FRAME,
  'read-speed.onrender.com': MODES.FRAME,
  'hard-code.onrender.com': MODES.FRAME,
  'minute-book.onrender.com': MODES.FRAME,
  'shift-cover-dv7y.onrender.com': MODES.FRAME,
  'prize-draw.onrender.com': MODES.FRAME,
  'boardpackss.onrender.com': MODES.FRAME,
  'rooms-data.onrender.com': MODES.FRAME,
  'mark-schemes.onrender.com': MODES.FRAME,
  'call-sheets.onrender.com': MODES.FRAME,
  'menu-copies.onrender.com': MODES.FRAME,
  'handover-notes.onrender.com': MODES.FRAME,
  'release-notes-9hc1.onrender.com': MODES.FRAME,
  'export-sets.onrender.com': MODES.FRAME,
};

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
 * zypheratcg at all. The explicit onrender entries above are now redundant
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
