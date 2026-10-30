/**
 * Restore an archive written by scripts/backup.js.
 *
 *     node scripts/restore.js backups/zypheratcg-<date>.ndjson.gz
 *     node scripts/restore.js <file> --drop        replace, do not merge
 *     node scripts/restore.js <file> --dry-run     read and count, write nothing
 *
 * IT REFUSES TO RUN BY ACCIDENT. Restoring into a live database is how a
 * bad afternoon becomes a bad week, so it prints the target host and
 * database and requires --yes before writing anything. Point MONGODB_URI
 * at the cluster you mean; there is no other way to choose one.
 *
 * WITHOUT --drop IT MERGES, keyed on _id: a document already present is
 * replaced, one that is absent is inserted, and anything in the database
 * that is not in the archive is left alone. That is the safe default for
 * "we lost some rows". Use --drop for "start again from this snapshot".
 *
 * Extended JSON is parsed back, so ObjectIds, Dates and Decimal128 return
 * as themselves rather than as strings.
 */

require('dotenv').config();
const fs = require('fs');
const zlib = require('zlib');
const readline = require('readline');
const mongoose = require('mongoose');
const { EJSON } = require('bson');

const BATCH = 500;

async function main() {
  const file = process.argv[2];
  const drop = process.argv.includes('--drop');
  const dryRun = process.argv.includes('--dry-run');
  const yes = process.argv.includes('--yes');

  if (!file) {
    console.error('usage: node scripts/restore.js <archive.ndjson.gz> [--drop] [--dry-run] [--yes]');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`No such file: ${file}`);
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;

  console.log(`archive : ${file}`);
  console.log(`target  : ${mongoose.connection.host}/${mongoose.connection.name}`);
  console.log(`mode    : ${dryRun ? 'DRY RUN (writes nothing)' : drop ? 'DROP then insert' : 'merge on _id'}\n`);

  if (!dryRun && !yes) {
    console.error('Refusing to write without --yes. Check the target above first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(file).pipe(zlib.createGunzip()),
    crlfDelay: Infinity,
  });

  const dropped = new Set();
  const counts = {};
  let buffer = [];
  let bufferCollection = null;

  async function flush() {
    if (!buffer.length || dryRun) { buffer = []; return; }
    /* Upsert by _id so a re-run is idempotent and a partial restore can
       simply be run again rather than unpicked. */
    await db.collection(bufferCollection).bulkWrite(
      buffer.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })),
      { ordered: false }
    );
    buffer = [];
  }

  for await (const line of rl) {
    if (!line.trim()) continue;
    const row = EJSON.parse(line);
    if (row.__backup) {
      console.log(`taken   : ${new Date(row.createdAt).toISOString()} from "${row.database}"\n`);
      continue;
    }

    const { c, d } = row;
    if (drop && !dropped.has(c)) {
      dropped.add(c);
      if (!dryRun) await db.collection(c).deleteMany({});
    }
    if (bufferCollection && c !== bufferCollection) await flush();
    bufferCollection = c;
    buffer.push(d);
    counts[c] = (counts[c] || 0) + 1;
    if (buffer.length >= BATCH) await flush();
  }
  await flush();

  for (const [name, n] of Object.entries(counts)) {
    console.log(`  ${name.padEnd(24)} ${String(n).padStart(8)} documents`);
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`\n${total.toLocaleString('en-US')} documents ${dryRun ? 'read (nothing written)' : 'restored'}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('\nRestore failed:', err.message);
  process.exit(1);
});
