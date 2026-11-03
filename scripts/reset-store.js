/**
 * Wipe the test data so the store starts fresh, keeping how it is set up.
 *
 *     node scripts/reset-store.js                       -> dry run: counts only, deletes nothing
 *     node scripts/reset-store.js --confirm gogetcards  -> deletes
 *
 * DELETES (everything a shopper, an order or a visit created):
 *   products, orders, customers and their sign-in sessions and links,
 *   checkout sessions, pending payments, abandoned checkouts, analytics
 *   events (page views, checkouts), live visitors, chat and contact
 *   messages, newsletter leads, the email log and suppression list,
 *   partner email records, and storefront browser sessions.
 *
 * KEEPS (how the store is configured):
 *   admin users (your login), site settings, distribution / channel
 *   settings, content pages and collections.
 *
 * GUARDS. It refuses to run unless the database it is connected to is
 * named `gogetcards`, so a URI pointing at Zyphera, at `test` or at
 * anything else cannot be wiped by mistake. Nothing is deleted without
 * `--confirm gogetcards` typed out. Take a backup first:
 *     node scripts/backup.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const EXPECTED_DB = 'gogetcards';

/* Mongo collection names (Mongoose pluralises the model name). */
const WIPE = [
  ['products', 'Products'],
  ['orders', 'Orders'],
  ['customers', 'Customers'],
  ['customersessions', 'Customer sign-in sessions'],
  ['magiclinks', 'Sign-in links'],
  ['checkoutsessions', 'Checkout sessions'],
  ['pendingpayments', 'Pending payments'],
  ['abandonedcheckouts', 'Abandoned checkouts'],
  ['events', 'Analytics events (views, checkouts)'],
  ['visitors', 'Live visitors'],
  ['chatmessages', 'Live chat messages'],
  ['contactmessages', 'Contact form messages'],
  ['leads', 'Newsletter leads'],
  ['emaillogs', 'Email log'],
  ['emailsuppressions', 'Email suppressions'],
  ['partneremails', 'Partner email records'],
  ['sessions', 'Browser sessions (everyone is signed out)'],
];
const KEEP = [
  ['users', 'Admin users'],
  ['siteconfigs', 'Site settings'],
  ['channelconfigs', 'Distribution settings'],
  ['pages', 'Content pages'],
  ['collections', 'Collections'],
];

async function count(db, name) {
  const exists = (await db.listCollections({ name }).toArray()).length > 0;
  return exists ? db.collection(name).countDocuments() : 0;
}

(async () => {
  const URI = process.env.MONGODB_URI;
  if (!URI) { console.error('MONGODB_URI is not set.'); process.exit(1); }

  const args = process.argv.slice(2);
  const i = args.indexOf('--confirm');
  const confirmed = i !== -1 && args[i + 1] === EXPECTED_DB;

  await mongoose.connect(URI, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;

  if (db.databaseName !== EXPECTED_DB) {
    console.error(`Refusing: connected to database "${db.databaseName}", not "${EXPECTED_DB}".`);
    console.error('Check that MONGODB_URI ends in /gogetcards (before any ?options).');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Database: ${db.databaseName}\n`);
  console.log(confirmed ? 'DELETING:' : 'Would delete (dry run, nothing changes):');
  let total = 0;
  for (const [name, label] of WIPE) {
    const n = await count(db, name);
    total += n;
    if (confirmed && n > 0) await db.collection(name).deleteMany({});
    console.log(`  ${String(n).padStart(7)}  ${label}`);
  }
  console.log(`  ${String(total).padStart(7)}  in total\n`);

  console.log('Keeping:');
  for (const [name, label] of KEEP) {
    console.log(`  ${String(await count(db, name)).padStart(7)}  ${label}`);
  }

  console.log(confirmed
    ? '\nDone. The store is empty and ready for new products.'
    : `\nNothing was deleted. To delete, run:\n  node scripts/reset-store.js --confirm ${EXPECTED_DB}`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Failed:', err.message);
  try { await mongoose.disconnect(); } catch (_) { /* ignore */ }
  process.exit(1);
});
