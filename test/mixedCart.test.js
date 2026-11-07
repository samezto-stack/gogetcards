const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

/* The cart is priced from the catalogue and charged as ONE ladder plan for
   its total. These tests stub the two database reads (Product, SiteConfig)
   so the real pricing, cap and plan arithmetic run end to end. */
const Product = require('../models/Product');
const SiteConfig = require('../models/SiteConfig');
const session = require('../services/checkout/session');

const PLANS = Array.from({ length: 24 }, (_, i) => `plan_${i + 1}`);
const CONFIG = { enabled: true, savedSites: [{ id: 's1', name: 'Site', url: 'https://partner.example', enabled: true, unitCents: 4999, plans: PLANS }] };

const CATALOGUE = {
  bundle: { slug: 'bundle', title: '30th Booster Bundle', price: 4999, available: true, packSize: 1 },
  box: { slug: 'box', title: 'OP-17 Booster Box', price: 19996, available: true, packSize: 1 },
  hobby: { slug: 'hobby', title: 'Bowman Chrome Hobby', price: 39992, available: true, packSize: 1 },
  gone: { slug: 'gone', title: 'Sold out', price: 4999, available: false, packSize: 1 },
};

beforeEach(() => {
  Product.findOne = (q) => ({ lean: async () => (CATALOGUE[q.slug] ? { ...CATALOGUE[q.slug] } : null), select() { return this; } });
  SiteConfig.getValue = async () => CONFIG;
});

test('two products price as one order and one plan for the total', async () => {
  const r = await session.priceCart([{ slug: 'bundle', quantity: 2 }, { slug: 'box', quantity: 1 }]);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.total, 2 * 4999 + 19996);          // $299.94
  assert.strictEqual(r.whopPlanId, 'plan_6');              // 6 steps of $49.99
  assert.strictEqual(r.lines.length, 2);
  assert.strictEqual(r.product.slug, 'bundle', 'single-product fields mirror the first line');
});

test('the whole order may not pass $1,199.76', async () => {
  const atCap = await session.priceCart([{ slug: 'hobby', quantity: 2 }, { slug: 'box', quantity: 2 }]);
  assert.strictEqual(atCap.ok, true);
  assert.strictEqual(atCap.total, 119976);
  assert.strictEqual(atCap.whopPlanId, 'plan_24');
  const over = await session.priceCart([{ slug: 'hobby', quantity: 2 }, { slug: 'box', quantity: 2 }, { slug: 'bundle', quantity: 1 }]);
  assert.strictEqual(over.ok, false);
  assert.strictEqual(over.reason, 'over_cap');
});

test('duplicate lines merge; an unavailable product refuses the cart', async () => {
  const merged = session.normaliseLines([{ slug: 'box', quantity: 1 }, { slug: 'box', quantity: 2 }, { slug: '' }]);
  assert.deepStrictEqual(merged, [{ slug: 'box', quantity: 3 }]);
  const r = await session.priceCart([{ slug: 'box', quantity: 1 }, { slug: 'gone', quantity: 1 }]);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'unavailable');
});

test('one line takes the unchanged single-product path', async () => {
  const r = await session.priceCart([{ slug: 'box', quantity: 1 }]);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.total, 19996);
  assert.strictEqual(r.lines, undefined);
});
