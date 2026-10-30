/* One-time, self-running migration: de-inflate visit counts from the window
 * where `saveUninitialized: false` was live (server.js). In that window every
 * anonymous page view got a throwaway req.sessionID, and the Traffic Sources
 * panel — which groups by sessionId, falling back to IP — counted each page
 * view as a separate visitor, inflating the totals ("Direct" most of all).
 *
 * This clears the sessionId on the affected page_view events so they are
 * counted by IP instead (accurate, never inflated). It is surgical: within
 * the window it only touches events whose sessionId appears exactly once —
 * the bug's fingerprint. A real multi-page session (logged-in / cart visitor)
 * has a repeating sessionId and is left alone.
 *
 * Runs itself ONCE, automatically, on the next boot after it ships: guarded
 * by a SiteConfig flag so it never repeats, and idempotent anyway (a cleared
 * sessionId no longer matches). If it errors, the flag is not set and it
 * retries on the next boot. Safe to delete this file and its call in
 * server.js once the flag shows it has run.
 */
const SiteConfig = require('../models/SiteConfig');
const Event = require('../models/Event');

const FLAG = 'migration:deinflateVisits_20261020';
const SINCE = new Date('2026-10-20T01:26:00Z'); // saveUninitialized:false merged
const UNTIL = new Date('2026-10-21T17:12:00Z'); // reverted

async function run() {
  try {
    const state = await SiteConfig.getValue(FLAG, null);
    if (state && state.done) return; // already done — nothing to do

    const windowMatch = {
      type: 'page_view',
      createdAt: { $gte: SINCE, $lt: UNTIL },
      sessionId: { $nin: ['', null] },
    };

    // Keep sessions that repeat in the window — those are real saved sessions.
    const repeated = await Event.aggregate([
      { $match: windowMatch },
      { $group: { _id: '$sessionId', n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
      { $project: { _id: 1 } },
    ]);
    const keep = repeated.map((r) => r._id);

    const target = { ...windowMatch, sessionId: { $nin: ['', null, ...keep] } };
    const res = await Event.updateMany(target, { $set: { sessionId: '' } });

    await SiteConfig.setValue(FLAG, {
      done: true,
      at: new Date(),
      modified: res.modifiedCount,
      keptRealSessions: keep.length,
      window: { since: SINCE.toISOString(), until: UNTIL.toISOString() },
    });

    console.log(`✅ [migration] de-inflated visit counts: cleared sessionId on ` +
      `${res.modifiedCount} page_view event(s); preserved ${keep.length} real session(s).`);
  } catch (err) {
    // Flag stays unset, so this retries next boot. Never throws into boot.
    console.error('⚠️  [migration] deinflateVisits failed (will retry next boot):',
      err && err.message ? err.message : err);
  }
}

module.exports = { run };
