const { test } = require('node:test');
const assert = require('node:assert');
const pc = require('../config/preorder');

const at = (iso) => new Date(`${iso}T18:00:00Z`);

test('availabilityState: the calendar advances a passed release date to in stock', () => {
  // Not released yet, flagged → preorder.
  const future = { preorder: true, releaseDate: new Date('2026-12-01'), available: true };
  assert.strictEqual(pc.availabilityState(future, at('2026-11-07')), 'PREORDER');
  // Released, still flagged → IN STOCK (the calendar decides, no untick needed).
  const released = { preorder: true, releaseDate: new Date('2026-11-06'), available: true };
  assert.strictEqual(pc.availabilityState(released, at('2026-11-07')), 'IN_STOCK');
  assert.strictEqual(pc.isBackorder(released, at('2026-11-07')), false);
  // Flag cleared → in stock.
  const live = { preorder: false, releaseDate: new Date('2026-11-06'), available: true };
  assert.strictEqual(pc.availabilityState(live, at('2026-11-07')), 'IN_STOCK');
  // Unavailable → out of stock, whatever the flag.
  assert.strictEqual(pc.availabilityState({ ...released, available: false }, at('2026-11-07')), 'OUT_OF_STOCK');
});

test('a preorder flips to in stock the day its release date arrives', () => {
  const p = { preorder: true, releaseDate: new Date('2026-11-13'), available: true };
  assert.strictEqual(pc.availabilityState(p, at('2026-11-12')), 'PREORDER');
  // On the release day itself it is in stock, not a preorder and not a backorder.
  assert.strictEqual(pc.availabilityState(p, at('2026-11-13')), 'IN_STOCK');
});

test('isActivePreorder: flagged AND not yet released', () => {
  const future = { preorder: true, releaseDate: new Date('2026-12-01') };
  const released = { preorder: true, releaseDate: new Date('2026-11-06') };
  const noDate = { preorder: true };
  const notFlagged = { preorder: false, releaseDate: new Date('2026-12-01') };
  assert.strictEqual(pc.isActivePreorder(future, at('2026-11-07')), true);
  assert.strictEqual(pc.isActivePreorder(released, at('2026-11-07')), false, 'a released product is no longer an active preorder');
  assert.strictEqual(pc.isActivePreorder(noDate, at('2026-11-07')), true, 'no date: there is nothing to pass, so it stays a preorder');
  assert.strictEqual(pc.isActivePreorder(notFlagged, at('2026-11-07')), false);
});

test('backorder is only ever reached through an explicit override', () => {
  // Released and flagged is in stock, NOT backorder, unless forced.
  const released = { preorder: true, releaseDate: new Date('2026-11-06'), available: true };
  assert.strictEqual(pc.availabilityState(released, at('2026-11-07')), 'IN_STOCK');
  const forced = { ...released, availabilityOverride: 'backorder' };
  assert.strictEqual(pc.availabilityState(forced, at('2026-11-07')), 'BACKORDER');
  assert.strictEqual(pc.isBackorder(forced, at('2026-11-07')), true);
});

test('availabilityOverride forces a state without touching the flag', () => {
  const p = { preorder: true, releaseDate: new Date('2026-11-06'), available: true, availabilityOverride: 'out_of_stock' };
  assert.strictEqual(pc.availabilityState(p, at('2026-11-07')), 'OUT_OF_STOCK');
  assert.strictEqual(pc.availabilityState({ ...p, availabilityOverride: 'in_stock' }, at('2026-11-07')), 'IN_STOCK');
  assert.strictEqual(pc.availabilityState({ ...p, availabilityOverride: 'preorder' }, at('2026-11-07')), 'PREORDER');
  // An unrecognised value is ignored and the state is derived (released → in stock).
  assert.strictEqual(pc.availabilityState({ ...p, availabilityOverride: 'nonsense' }, at('2026-11-07')), 'IN_STOCK');
});

test('schema.org availability matches the state', () => {
  assert.strictEqual(pc.schemaAvailability({ preorder: true, releaseDate: new Date('2026-12-01'), available: true }, at('2026-11-07')), 'https://schema.org/PreOrder');
  // Released and flagged is in stock on the landing page, matching the feed.
  assert.strictEqual(pc.schemaAvailability({ preorder: true, releaseDate: new Date('2026-11-06'), available: true }, at('2026-11-07')), 'https://schema.org/InStock');
  assert.strictEqual(pc.schemaAvailability({ preorder: true, releaseDate: new Date('2026-11-06'), available: true, availabilityOverride: 'backorder' }, at('2026-11-07')), 'https://schema.org/BackOrder');
  assert.strictEqual(pc.schemaAvailability({ preorder: false, available: true }, at('2026-11-07')), 'https://schema.org/InStock');
  assert.strictEqual(pc.schemaAvailability({ available: false }, at('2026-11-07')), 'https://schema.org/OutOfStock');
});

test('a forced backorder still carries an availability date that is not in the past', () => {
  const forced = { preorder: true, releaseDate: new Date('2026-11-06'), available: true, availabilityOverride: 'backorder' };
  const info = pc.releaseInfo(forced);
  assert.ok(info.hasDate, 'a released product has a date');
  assert.ok(pc.expectedAvailability(forced, at('2026-11-07')) >= '2026-11-07', 'the date is not in the past');
});
