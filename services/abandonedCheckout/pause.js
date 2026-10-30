/**
 * Cap how far the recovery sequence is allowed to run, without losing
 * anybody's place.
 *
 * NOT A BOOLEAN, AND NOT A SKIP. The cap is the highest step that may be
 * sent: 6 is the full sequence, 1 sends only the 30-minute reminder and
 * holds the rest, 0 holds everything. A held step is not cancelled — the
 * row waits at that step until the cap is raised, and then continues.
 *
 * WHY RAISING THE CAP HAS TO RESCHEDULE. The schedule is anchored to
 * abandonedAt with absolute offsets — 30 minutes, 4 hours, 12, 24, 48, 72.
 * Those are measured from a fixed point in the past, so while a step is
 * held the clock does not stop; it runs on past every due time. Raising the
 * cap without touching the dates would therefore make every held row due AT
 * ONCE, and the sweep would empty the backlog in a couple of passes —
 * dozens of reminders in minutes, to people who abandoned a cart days ago.
 *
 * That is the exact burst that gets a sending domain rate-limited, and on a
 * provider allowance of a hundred a day it would also swallow the allowance
 * that order confirmations and sign-in links depend on. The hold would have
 * caused the incident it was meant to prevent.
 *
 * So raising the cap SHIFTS EACH HELD ROW'S TIMELINE FORWARD by however
 * long that row was actually held. Someone ninety minutes from their next
 * reminder when the cap dropped is ninety minutes from it when the cap goes
 * back up, and the spacing of their remaining steps is unchanged.
 *
 * ONLY HELD ROWS MOVE. Rows below the cap were sending normally throughout
 * and must not be pushed back for a hold that never applied to them.
 *
 * Confirmations, sign-in links, refunds and every other lifecycle email are
 * outside this entirely. It governs the recovery sequence alone.
 */

const SiteConfig = require('../../models/SiteConfig');
const AbandonedCheckout = require('../../models/AbandonedCheckout');

const { MAX_STEP } = AbandonedCheckout;

/* The cap, and the instant it was last lowered. The instant is what makes
   the shift computable — a boolean could not say how long anything waited. */
const CAP_KEY = 'abandonedRecovery.maxStep';
const SINCE_KEY = 'abandonedRecovery.cappedAt';
const BY_KEY = 'abandonedRecovery.cappedBy';

function clampStep(n) {
  const v = parseInt(n, 10);
  if (isNaN(v)) return MAX_STEP;
  return Math.max(0, Math.min(MAX_STEP, v));
}

/** Current cap. Cheap enough to read on every sweep. */
async function state() {
  const [raw, since, by] = await Promise.all([
    SiteConfig.getValue(CAP_KEY, null),
    SiteConfig.getValue(SINCE_KEY, null),
    SiteConfig.getValue(BY_KEY, ''),
  ]);

  const maxStep = raw === null || raw === undefined ? MAX_STEP : clampStep(raw);
  const at = since ? new Date(since) : null;
  const cappedAt = at && !isNaN(at) ? at : null;

  return {
    maxStep,
    fullMaxStep: MAX_STEP,
    /* "Restricted" covers both a partial cap and a full stop, because the
       page needs to say something is being held either way. */
    restricted: maxStep < MAX_STEP,
    paused: maxStep === 0,
    cappedAt,
    cappedBy: by || '',
  };
}

/** How many rows are sitting at or past a given cap, i.e. currently held. */
async function heldCount(cap) {
  if (cap >= MAX_STEP) return 0;
  return AbandonedCheckout.countDocuments({
    status: 'abandoned',
    suppressedAt: null,
    nextEmailAt: { $ne: null },
    recoveryStep: { $gte: cap },
  });
}

/**
 * Set the cap.
 *
 * Lowering it records the instant, so a later raise knows how long the held
 * rows waited. Raising it shifts those rows forward by that amount before
 * letting the sweep see them again.
 */
async function setMaxStep(next, by = '') {
  const cur = await state();
  const target = clampStep(next);
  if (target === cur.maxStep) {
    return { changed: false, maxStep: target, held: await heldCount(target) };
  }

  const now = new Date();

  /* ── Lowering: start the clock, touch no dates ────────────────────
     Rows keep their due times; the sweep simply stops acting on the steps
     above the cap. Rescheduling now would be guesswork, because how long
     the hold lasts is not yet known. */
  if (target < cur.maxStep) {
    await SiteConfig.setValue(CAP_KEY, target);
    /* Only stamp the instant on the FIRST lowering. Dropping 6→2→1 is one
       continuous hold, and restamping would forget the earlier part of it
       and under-shift on the way back up. */
    if (!cur.restricted || !cur.cappedAt) {
      await SiteConfig.setValue(SINCE_KEY, now.toISOString());
    }
    await SiteConfig.setValue(BY_KEY, String(by || ''));
    return { changed: true, direction: 'down', maxStep: target, held: await heldCount(target) };
  }

  /* ── Raising: give back the time that was taken ───────────────────── */
  const since = cur.cappedAt || now;

  /* Exactly the rows the old cap was blocking. A row below it was sending
     all along and must not be pushed back. */
  const filter = {
    status: 'abandoned',
    suppressedAt: null,
    nextEmailAt: { $ne: null },
    recoveryStep: { $gte: cur.maxStep },
  };

  /* Counted as "rows that will actually move", not "rows the cap was
     holding" — the ones already in the future are left alone, and
     reporting them as shifted would overstate what happened. */
  const shifted = await AbandonedCheckout.countDocuments(
    Object.assign({}, filter, { nextEmailAt: { $ne: null, $lte: now } })
  );
  const held = await AbandonedCheckout.countDocuments(filter);

  if (held) {
    /* One aggregation-pipeline update so the shift lands atomically. A
       sweep running against a half-applied shift would send the un-moved
       half immediately — the burst this exists to prevent. */
    await AbandonedCheckout.updateMany(filter, [
      {
        $set: {
          /* How long THIS row was actually held.
           *
           * A row whose next step is still in the FUTURE was never blocked
           * — the cap stopped it being claimed, but its time had not come
           * anyway. Moving it would delay it for a hold it never
           * experienced, so it stays exactly where it is. Its due time is
           * already a spread-out future instant, so leaving it cannot
           * contribute to a burst.
           *
           * For a row that IS overdue, the shift is measured from the later
           * of the hold's start and the row's own abandonedAt: one
           * abandoned before the cap waited the whole hold, one abandoned
           * during it only waited from its own start. Shifting every
           * overdue row by the same amount preserves the spacing they
           * originally had, so they come due spread out after the raise
           * rather than all together. Never negative. */
          __shiftMs: {
            $cond: [
              { $gt: ['$nextEmailAt', now] },
              0,
              { $max: [0, { $subtract: [now, { $max: ['$abandonedAt', since] }] }] },
            ],
          },
        },
      },
      {
        $set: {
          /* abandonedAt moves too, because nextEmailTime() reads it to
             place every REMAINING step. Shifting only nextEmailAt would
             fix the next email and leave the ones after it computed from
             the original anchor — step 4 on time, step 5 already overdue. */
          abandonedAt: { $add: ['$abandonedAt', '$__shiftMs'] },
          nextEmailAt: { $add: ['$nextEmailAt', '$__shiftMs'] },
          resumedAt: now,
        },
      },
      { $unset: '__shiftMs' },
    ]);
  }

  await SiteConfig.setValue(CAP_KEY, target);
  await SiteConfig.setValue(BY_KEY, String(by || ''));
  /* Back to the full sequence means the hold is over. A partial raise
     (1 → 3) is still a hold, so the clock keeps running for the steps that
     are still capped. */
  if (target >= MAX_STEP) await SiteConfig.setValue(SINCE_KEY, null);

  return {
    changed: true,
    direction: 'up',
    maxStep: target,
    shifted,
    released: held,
    heldMs: now - since,
    since,
  };
}

module.exports = { state, setMaxStep, heldCount, clampStep, MAX_STEP, CAP_KEY };
