/**
 * Delete collections by handle, and take them off any product that lists them.
 *
 *     node scripts/remove-collections.js yugioh palworld                       -> dry run
 *     node scripts/remove-collections.js yugioh palworld --confirm gogetcards  -> deletes
 *
 * The products themselves are kept: only the handle is removed from their
 * `collections` list, so nothing points at a collection that no longer
 * exists. Refuses any database not named `gogetcards`, the same guard as
 * scripts/reset-store.js.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const EXPECTED_DB = 'gogetcards';

(async () => {
  const URI = process.env.MONGODB_URI;
  if (!URI) { console.error('MONGODB_URI is not set.'); process.exit(1); }

  const args = process.argv.slice(2);
  const ci = args.indexOf('--confirm');
  const confirmed = ci !== -1 && args[ci + 1] === EXPECTED_DB;
  const handles = args.filter((a, i) => !a.startsWith('--') && (ci === -1 || i !== ci + 1))
    .map((h) => String(h).trim().toLowerCase()).filter(Boolean);
  if (!handles.length) { console.error('Name at least one collection handle, e.g. yugioh palworld'); process.exit(1); }

  await mongoose.connect(URI, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  if (db.databaseName !== EXPECTED_DB) {
    console.error(`Refusing: connected to database "${db.databaseName}", not "${EXPECTED_DB}".`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const cols = db.collection('collections');
  const prods = db.collection('products');
  const found = await cols.find({ handle: { $in: handles } }).project({ handle: 1, name: 1 }).toArray();
  const tagged = await prods.countDocuments({ collections: { $in: handles } });

  console.log(`Database: ${db.databaseName}\n`);
  for (const h of handles) {
    const c = found.find((x) => x.handle === h);
    console.log(`  ${c ? `"${c.name}" (${h})` : `${h}: not found`}`);
  }
  console.log(`  ${tagged} product(s) list one of these; the handle is removed from them, the products are kept.\n`);

  if (!confirmed) {
    console.log(`Nothing was changed. To delete, run:\n  node scripts/remove-collections.js ${handles.join(' ')} --confirm ${EXPECTED_DB}`);
  } else {
    const del = await cols.deleteMany({ handle: { $in: handles } });
    const upd = await prods.updateMany({ collections: { $in: handles } }, { $pull: { collections: { $in: handles } } });
    console.log(`Deleted ${del.deletedCount} collection(s); updated ${upd.modifiedCount} product(s).`);
  }
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Failed:', err.message);
  try { await mongoose.disconnect(); } catch (_) { /* ignore */ }
  process.exit(1);
});
