const { test } = require('node:test');
const assert = require('node:assert');
const cap = require('../helpers/orderCap');

test('no order line may exceed the top of the ladder ($1,199.76)', () => {
  assert.strictEqual(cap.MAX_ORDER_CENTS, 119976);
  assert.strictEqual(cap.maxQuantity({ price: 19996 }), 6);     // 6 × 199.96 = 1,199.76
  assert.strictEqual(cap.maxQuantity({ price: 4999 }), 24);     // 24 × 49.99
  assert.strictEqual(cap.maxQuantity({ price: 119976 }), 1);    // a full case
  assert.strictEqual(cap.maxQuantity({ price: 29998 }), 3);     // 4 would be 1,199.92
  assert.strictEqual(cap.maxQuantity({ price: 14997 }), 8);     // 8 × 149.97 = 1,199.76
});

test('the product allocation limit can only tighten the cap', () => {
  assert.strictEqual(cap.maxQuantity({ price: 4999, allocationLimit: 12 }), 12);
  assert.strictEqual(cap.maxQuantity({ price: 4999, allocationLimit: 30 }), 24);
  assert.strictEqual(cap.maxQuantity({ price: 19996, allocationLimit: 0 }), 6);
});

test('the market price is used when given', () => {
  assert.strictEqual(cap.maxQuantity({ price: 4999 }, 59988), 2);
});

test('clamp never returns less than one and never more than the cap', () => {
  assert.strictEqual(cap.clamp({ price: 19996 }, 50), 6);
  assert.strictEqual(cap.clamp({ price: 19996 }, 0), 1);
  assert.strictEqual(cap.clamp({ price: 19996 }, 'x'), 1);
  assert.strictEqual(cap.clamp({ price: 0 }, 40), 40);     // no price known: no cap applied
});
