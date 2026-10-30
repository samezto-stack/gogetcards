/*
 * Every address from the pooled-email era, written to CSV.
 *
 * The gathering lives in services/partnerEmailHistory.js, which the admin
 * download uses too — one implementation, so the file you get by clicking
 * and the file you get by running this cannot disagree.
 *
 * Run:
 *   MONGODB_URI=... node scripts/export-partner-emails.js
 *   MONGODB_URI=... node scripts/export-partner-emails.js --out ./pooled.csv
 *
 * Writes two files:
 *   <name>.csv          one row per address, with totals
 *   <name>-detail.csv   one row per hand-off, with the real customer email
 *
 * READ-ONLY. It opens no write, so it is safe against production.
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const history = require('../services/partnerEmailHistory');

const args = process.argv.slice(2);
const i = args.indexOf('--out');
const OUT = (i >= 0 && args[i + 1]) || `./partner-emails-${new Date().toISOString().slice(0, 10)}.csv`;
const DETAIL = OUT.replace(/\.csv$/i, '') + '-detail.csv';

const URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!URI) {
  console.error('Set MONGODB_URI to the database you want to read.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(URI);
  console.log('connected\n');

  const { rows, detail, stats } = await history.collect();

  console.log(`PartnerEmail   : ${stats.poolRows} rows `
    + `(${stats.converted} converted, ${stats.used} used, ${stats.available} available)`);
  console.log(`CheckoutSession: ${stats.sessions} hand-offs carrying a pooled address`);
  console.log(`Event          : ${stats.events} clicks carrying one, ${stats.eventOnly} not already covered by a session`);
  console.log(`Order          : ${stats.orders} orders recorded against a pooled address\n`);

  fs.writeFileSync(OUT, history.toSummaryCsv(rows));
  fs.writeFileSync(DETAIL, history.toDetailCsv(detail));

  console.log(`${stats.addresses} addresses in total, ${stats.everUsed} of them actually used`);
  console.log(`  ${stats.handoffs} hand-offs, ${stats.paid} of which were paid`);
  console.log(`\nwrote ${path.resolve(OUT)}`);
  console.log(`wrote ${path.resolve(DETAIL)}`);

  if (stats.unknowable) {
    console.log(`\n${stats.unknowable} address(es) appear only in the pool, marked available,`);
    console.log('with no hand-off on record. Either never used, or used and released');
    console.log('before the session/event record began — the release sweep wiped');
    console.log('usedFor, so the pool row alone cannot tell those two apart.');
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch { /* already down */ }
  process.exit(1);
});
