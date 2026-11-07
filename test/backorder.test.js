const { test } = require('node:test');
const assert = require('node:assert');
const pc = require('../config/preorder');

const at = (iso) => new Date(`${iso}T18:00:00Z`);

test('availabilityState: the four Google states', () => {
  // Not released yet, flagged → preorder.
  const future = { preorder: true, releaseDate: new Date('2026-12-01'), available: true };
  assert.strictEqual(pc.availabilityState(future, at('2026-11-07')), 'PREORDER');
  // Released, still flagged → backorder (not preorder).
  const released = { preorder: true, releaseDate: new Date('2026-11-06'), available: true };
  assert.strictEqual(pc.availabilityState(released, at('2026-11-07')), 'BACKORDER');
  assert.strictEqual(pc.isBackorder(released, at('2026-11-07')), true);
  // Flag cleared → in stock.
  const live = { preorder: false, releaseDate: new Date('2026-11-06'), available: true };
  assert.strictEqual(pc.availabilityState(live, at('2026-11-07')), 'IN_STOCK');
  // Unavailable → out of stock, whatever the flag.
  assert.strictEqual(pc.availabilityState({ ...released, available: false }, at('2026-11-07')), 'OUT_OF_STOCK');
});

test('a preorder is never also a backorder on the same day', () => {
  const p = { preorder: true, releaseDate: new Date('2026-11-13'), available: true };
  assert.strictEqual(pc.availabilityState(p, at('2026-11-12')), 'PREORDER');
  assert.strictEqual(pc.availabilityState(p, at('2026-11-13')), 'BACKORDER');
});

test('availabilityOverride forces a state without touching the flag', () => {
  const p = { preorder: true, releaseDate: new Date('2026-11-06'), available: true, availabilityOverride: 'out_of_stock' };
  assert.strictEqual(pc.availabilityState(p, at('2026-11-07')), 'OUT_OF_STOCK');
  assert.strictEqual(pc.availabilityState({ ...p, availabilityOverride: 'in_stock' }, at('2026-11-07')), 'IN_STOCK');
  // An unrecognised value is ignored and the state is derived.
  assert.strictEqual(pc.availabilityState({ ...p, availabilityOverride: 'nonsense' }, at('2026-11-07')), 'BACKORDER');
});

test('schema.org availability matches the state', () => {
  assert.strictEqual(pc.schemaAvailability({ preorder: true, releaseDate: new Date('2026-12-01'), available: true }, at('2026-11-07')), 'https://schema.org/PreOrder');
  assert.strictEqual(pc.schemaAvailability({ preorder: true, releaseDate: new Date('2026-11-06'), available: true }, at('2026-11-07')), 'https://schema.org/BackOrder');
  assert.strictEqual(pc.schemaAvailability({ preorder: false, available: true }, at('2026-11-07')), 'https://schema.org/InStock');
  assert.strictEqual(pc.schemaAvailability({ available: false }, at('2026-11-07')), 'https://schema.org/OutOfStock');
});

test('backorder still carries an availability date (never a preorder without one)', () => {
  const released = { preorder: true, releaseDate: new Date('2026-11-06'), available: true };
  const info = pc.releaseInfo(released);
  assert.ok(info.hasDate, 'a released-and-flagged product has a date');
  assert.ok(pc.expectedAvailability(released, at('2026-11-07')) >= '2026-11-07', 'the date is not in the past');
});
