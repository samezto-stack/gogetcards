#!/usr/bin/env node
/*
 * One-off cleanup: neutralise traffic-source / utm values poisoned by an
 * XSS scanner (values like "</script><script>alert('xsss-utm_source18')
 * </script>" that were stored raw before the input fix landed).
 *
 * The code fix already renders these inert, so this is housekeeping: it
 * stops the junk strings from polluting the Traffic Sources panel and the
 * channel analytics. It sanitises in place rather than deleting, so the
 * visit still counts — it just lands under a clean label (or "Other").
 *
 * Runs DRY by default (reports what it would change). Pass --apply to write.
 *
 *   MONGODB_URI=... node scripts/clean-xss-events.js          # dry run
 *   MONGODB_URI=... node scripts/clean-xss-events.js --apply  # apply
 *
 * On Northflank, run it from a shell on the service (MONGODB_URI is already
 * in the environment there) or as a one-off job with the same image.
 */
const mongoose = require('mongoose');
const Event = require('../models/Event');

const APPLY = process.argv.includes('--apply');

// A value is suspect if it carries markup or control characters — the only
// things a legitimate source/utm label never contains.
const SUSPECT = /[<>"'`\\\u0000-\u001F\u007F]/;

// Same rule the tracking middleware now applies on input.
function cleanLabel(value) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001F\u007F<>"'`&\\]/g, '')
    .trim()
    .slice(0, 80);
}

const FIELDS = ['source', 'utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm'];

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('✗ MONGODB_URI is not set. Refusing to run.');
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`✅ Connected: ${mongoose.connection.host}`);
  console.log(APPLY ? '⚙  APPLY mode — changes WILL be written.\n' : '🔎 DRY RUN — no changes will be written. Pass --apply to commit.\n');

  const or = FIELDS.map((f) => ({ [f]: SUSPECT }));
  const cursor = Event.find({ $or: or }).select(FIELDS.join(' ')).lean().cursor();

  let scanned = 0;
  let changed = 0;
  const ops = [];
  const samples = [];

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    scanned++;
    const set = {};
    for (const f of FIELDS) {
      const v = doc[f];
      if (typeof v === 'string' && SUSPECT.test(v)) {
        let cleaned = cleanLabel(v);
        if (f === 'source' && !cleaned) cleaned = 'Other';
        set[f] = cleaned;
      }
    }
    if (Object.keys(set).length) {
      changed++;
      if (samples.length < 10) {
        samples.push({ _id: String(doc._id), from: FIELDS.filter((f) => set[f] !== undefined).map((f) => `${f}: ${JSON.stringify(doc[f])} -> ${JSON.stringify(set[f])}`) });
      }
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: set } } });
    }
  }

  console.log(`Scanned ${scanned} suspect document(s); ${changed} need cleaning.\n`);
  if (samples.length) {
    console.log('Sample changes:');
    for (const s of samples) { console.log(`  ${s._id}`); s.from.forEach((l) => console.log(`    ${l}`)); }
    console.log('');
  }

  if (!APPLY) {
    console.log('Dry run complete. Re-run with --apply to write these changes.');
  } else if (ops.length) {
    const res = await Event.bulkWrite(ops, { ordered: false });
    console.log(`✅ Applied. Modified ${res.modifiedCount} document(s).`);
  } else {
    console.log('Nothing to apply — database is already clean.');
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('✗ Failed:', err.message);
  process.exit(1);
});
