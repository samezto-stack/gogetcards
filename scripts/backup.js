/**
 * Dump every collection to one gzipped file.
 *
 *     node scripts/backup.js                 -> backups/zypheratcg-<date>.ndjson.gz
 *     node scripts/backup.js /path/out.gz    -> that file
 *
 * WHY THIS EXISTS RATHER THAN mongodump. mongodump ships in the MongoDB
 * Database Tools, a separate download from the server and from any driver.
 * This needs nothing that `npm install` has not already put in
 * node_modules, so it runs anywhere the app itself runs.
 *
 * WHAT IT WRITES. One gzipped file of newline-delimited JSON, one document
 * per line, in EXTENDED JSON — so an ObjectId comes back an ObjectId, a
 * Date comes back a Date, and a Decimal128 does not quietly become a float.
 * Plain JSON.stringify loses all of that, and you find out at restore time,
 * which is the worst moment to find out anything.
 *
 * IT STREAMS. Documents are written as they arrive from the cursor and the
 * gzip stream is flushed with backpressure, so the memory used does not
 * grow with the size of the database. A collection larger than RAM is fine.
 *
 * THE URI IS NEVER WRITTEN DOWN. It is read from MONGODB_URI (or .env) and
 * never printed, never logged, never included in the archive. The output
 * says which host it connected to, not how.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const mongoose = require('mongoose');
const { EJSON } = require('bson');

const URI = process.env.MONGODB_URI;

function human(bytes) {
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < u.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toFixed(i ? 1 : 0)} ${u[i]}`;
}

async function main() {
  if (!URI) {
    console.error('MONGODB_URI is not set. Put it in .env, or:');
    console.error('  MONGODB_URI="mongodb+srv://..." node scripts/backup.js');
    process.exit(1);
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const out = process.argv[2] || path.join(__dirname, '..', 'backups', `zypheratcg-${stamp}.ndjson.gz`);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  await mongoose.connect(URI, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  console.log(`connected to ${mongoose.connection.host}/${mongoose.connection.name}\n`);

  const collections = (await db.listCollections().toArray())
    .filter((c) => c.type !== 'view')          // a view has no documents of its own
    .map((c) => c.name)
    .sort();

  const gzip = zlib.createGzip({ level: 9 });
  const file = fs.createWriteStream(out);
  const done = pipeline(gzip, file);

  /* Written before the documents so a restore knows what it is holding
     without reading the whole archive first. */
  gzip.write(EJSON.stringify({
    __backup: 1,
    database: mongoose.connection.name,
    createdAt: new Date(),
    collections,
  }) + '\n');

  let grand = 0;
  for (const name of collections) {
    const cursor = db.collection(name).find({});
    let n = 0;
    /* Readable.from consumes the cursor lazily and pipes with backpressure,
       so this never holds a whole collection in memory. */
    await pipeline(
      Readable.from((async function* () {
        for await (const doc of cursor) {
          n++;
          yield EJSON.stringify({ c: name, d: doc }) + '\n';
        }
      })()),
      /* end:false — every collection shares one gzip stream. */
      new (require('stream').Writable)({
        write(chunk, _enc, cb) { gzip.write(chunk) ? cb() : gzip.once('drain', cb); },
      })
    );
    grand += n;
    console.log(`  ${name.padEnd(24)} ${String(n).padStart(8)} documents`);
  }

  gzip.end();
  await done;

  const size = fs.statSync(out).size;
  console.log(`\n${grand.toLocaleString('en-US')} documents from ${collections.length} collections`);
  console.log(`-> ${out}  (${human(size)})`);
  console.log('\nRestore with:  node scripts/restore.js ' + path.basename(out));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('\nBackup failed:', err.message);
  process.exit(1);
});
