#!/usr/bin/env node
/*
 * One-off cleanup for the visit-count inflation caused by a window where
 * `saveUninitialized: false` was live (server.js). During that window no
 * session cookie was set for anonymous visitors, so every page view got a
 * throwaway, unique req.sessionID. The Traffic Sources panel groups by
 * sessionId (falling back to IP), so each page view was counted as a
 * separate visitor — inflating the totals, "Direct" most of all.
 *
 * This blanks the sessionId on the affected page_view events so the panel
 * falls back to counting them by IP (accurate, never inflated). It is
 * surgical: within the window it only touches page_view events whose
 * sessionId appears EXACTLY ONCE — the bug's fingerprint. A legitimate
 * multi-page session (logged-in / cart visitor) has a sessionId that
 * repeats and is left untouched, so real session-based counting is kept.
 *
 * Nothing is deleted; only the sessionId field is cleared on matched rows.
 *
 * Window (UTC) defaults to when the bug was live on main:
 *   since  2026-10-20T01:26:00Z  (saveUninitialized:false merged)
 *   until  2026-10-21T17:12:00Z  (reverted)
 * Override with --since / --until if your deploy times differ.
 *
 * DRY RUN by default; pass --apply to write.
 *
 *   MONGODB_URI=... node scripts/fix-visit-session-inflation.js
 *   MONGODB_URI=... node scripts/fix-visit-session-inflation.js --apply
 */
const mongoose = require('mongoose');
const Event = require('../models/Event');

function argVal(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const APPLY = process.argv.includes('--apply');
const SINCE = new Date(argVal('--since', '2026-10-20T01:26:00Z'));
const UNTIL = new Date(argVal('--until', '2026-10-21T17:12:00Z'));

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('✗ MONGODB_URI is not set. Refusing to run.'); process.exit(1); }
  if (isNaN(SINCE) || isNaN(UNTIL) || SINCE >= UNTIL) {
    console.error('✗ Bad window. --since must be a valid date before --until.'); process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`✅ Connected: ${mongoose.connection.host}`);
  console.log(`Window: ${SINCE.toISOString()} → ${UNTIL.toISOString()}`);
  console.log(APPLY ? '⚙  APPLY mode — changes WILL be written.\n' : '🔎 DRY RUN — no changes written. Pass --apply to commit.\n');

  const windowMatch = {
    type: 'page_view',
    createdAt: { $gte: SINCE, $lt: UNTIL },
    sessionId: { $nin: ['', null] },
  };

  // sessionIds that REPEAT in the window — legitimate saved sessions. Keep them.
  const repeated = await Event.aggregate([
    { $match: windowMatch },
    { $group: { _id: '$sessionId', n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
    { $project: { _id: 1 } },
  ]);
  const keep = repeated.map((r) => r._id);
  console.log(`Legitimate multi-hit sessions preserved: ${keep.length}`);

  // Everything else in the window (the one-off, churned sessions) gets blanked.
  const target = { ...windowMatch, sessionId: { $nin: ['', null, ...keep] } };

  const affected = await Event.countDocuments(target);
  const distinctIps = (await Event.distinct('ip', target)).filter(Boolean).length;
  console.log(`page_view events to blank: ${affected}`);
  console.log(`…which collapse to ~${distinctIps} visitors by IP (the corrected count for this slice).\n`);

  if (!APPLY) {
    console.log('Dry run complete. Re-run with --apply to write.');
  } else if (affected > 0) {
    const res = await Event.updateMany(target, { $set: { sessionId: '' } });
    console.log(`✅ Applied. Cleared sessionId on ${res.modifiedCount} event(s).`);
  } else {
    console.log('Nothing to change in this window.');
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => { console.error('✗ Failed:', err.message); process.exit(1); });
