const { test } = require('node:test');
const assert = require('node:assert');
const fb = require('../services/distribution/feedBuilder');

test('custom_label_0: only the ads-launch tag puts a product in the paid set', () => {
  assert.strictEqual(fb.adLabels({ tags: ['pokemon', 'ads-launch'] }, 4999, 'IN_STOCK').customLabel0, 'ads_launch');
  assert.strictEqual(fb.adLabels({ tags: ['pokemon'] }, 4999, 'IN_STOCK').customLabel0, 'catalog_only');
  // The superseded launch-30 list no longer defines the ad set.
  assert.strictEqual(fb.adLabels({ tags: ['launch-30'] }, 4999, 'IN_STOCK').customLabel0, 'catalog_only');
});

test('custom_label_2: one campaign per product line, every sport in one campaign', () => {
  const c = (tags, title = '') => fb.campaignOf({ tags, title });
  assert.strictEqual(c(['pokemon']), 'pokemon');
  assert.strictEqual(c(['mtg']), 'mtg');
  assert.strictEqual(c(['one-piece']), 'one_piece');
  assert.strictEqual(c(['lorcana']), 'lorcana');
  assert.strictEqual(c(['baseball']), 'sports');
  assert.strictEqual(c(['football']), 'sports');
  assert.strictEqual(c(['basketball']), 'sports');
  assert.strictEqual(c([], 'Disney Lorcana Hyperia City Booster Display Box'), 'lorcana');
  assert.strictEqual(c([], 'Something unrelated'), 'other');
});

test('custom_label_3: price tier follows the row price at the ladder boundaries', () => {
  assert.strictEqual(fb.priceTier(4999), 'price_049');
  assert.strictEqual(fb.priceTier(9998), 'price_050_199');
  assert.strictEqual(fb.priceTier(19996), 'price_050_199');
  assert.strictEqual(fb.priceTier(24995), 'price_200_449');
  assert.strictEqual(fb.priceTier(44991), 'price_200_449');
  assert.strictEqual(fb.priceTier(64987), 'price_450_plus');
  assert.strictEqual(fb.priceTier(119976), 'price_450_plus');
});

test('custom_label_4: availability bucket, lowercase', () => {
  assert.strictEqual(fb.adLabels({}, 4999, 'PREORDER').customLabel4, 'preorder');
  assert.strictEqual(fb.adLabels({}, 4999, 'IN_STOCK').customLabel4, 'in_stock');
});

test('selected mode: the ad set is always submitted, hand selections are kept', () => {
  const sel = { selectionMode: 'selected' };
  assert.strictEqual(fb.isExcluded({ tags: ['ads-launch'] }, 'google', sel), false, 'ad set is in the feed');
  assert.strictEqual(fb.isExcluded({ tags: [], merchant: { included: { google: true } } }, 'google', sel), false, 'hand-picked stays');
  assert.strictEqual(fb.isExcluded({ tags: [] }, 'google', sel), true, 'everything else stays out');
  // "all" mode is unchanged.
  assert.strictEqual(fb.isExcluded({ tags: [] }, 'google', { selectionMode: 'all' }), false);
});
