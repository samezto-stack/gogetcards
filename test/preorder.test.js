const { test } = require('node:test');
const assert = require('node:assert');
const pc = require('../config/preorder');

const day = (iso) => new Date(`${iso}T18:00:00Z`);

test('the preorder flag decides, not the calendar', () => {
  const p = { preorder: true, releaseDate: new Date('2026-11-06') };
  assert.strictEqual(pc.isPreorder(p), true);
  assert.strictEqual(pc.awaitingStock(p, day('2026-11-05')), false);
  assert.strictEqual(pc.awaitingStock(p, day('2026-11-06')), true);
  assert.strictEqual(pc.isPreorder({ preorder: false, releaseDate: new Date('2026-12-01') }), false);
});

test('availability date is never in the past while stock is awaited', () => {
  const p = { preorder: true, releaseDate: new Date('2026-11-06') };
  assert.strictEqual(pc.expectedAvailability(p, day('2026-11-01')), '2026-11-06');
  // Friday release, 2 business days -> Tuesday
  assert.strictEqual(pc.expectedAvailability(p, day('2026-11-06')), '2026-11-10');
  assert.ok(pc.expectedAvailability(p, day('2026-11-20')) > '2026-11-20');
});
