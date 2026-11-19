const test = require('node:test');
const assert = require('node:assert');
const feed = require('../services/distribution/feedBuilder');
const autofix = require('../services/distribution/autofix');

const base = { slug: 'x', price: 99.98, available: true, imageUrl: 'https://gogetcards.com/x.webp', description: '<p>x</p>' };
const card = { ...base, title: 'Pokémon TCG Elite Trainer Box', tags: ['pokemon'] };

test('card product with no saved category goes out as 6997', () => {
  assert.strictEqual(feed.build(card).googleProductCategory, '6997');
});

test('a saved 3793 (the old default) is treated as unset', () => {
  assert.strictEqual(feed.build({ ...card, merchant: { googleCategory: '3793' } }).googleProductCategory, '6997');
  const lego = { ...base, title: 'LEGO Icons 10316', tags: ['lego'], merchant: { googleCategory: '3793' } };
  assert.strictEqual(feed.build(lego).googleProductCategory, '3287');
});

test('a category typed in on purpose is sent as is', () => {
  assert.strictEqual(feed.build({ ...card, merchant: { googleCategory: '1247' } }).googleProductCategory, '1247');
});

test('LEGO and Gunpla keep their own line categories', () => {
  assert.strictEqual(feed.build({ ...base, title: 'LEGO Star Wars 75192', tags: ['lego'] }).googleProductCategory, '3287');
  assert.strictEqual(feed.build({ ...base, title: 'Bandai PG Unicorn Gundam', tags: ['gunpla'] }).googleProductCategory, '4175');
});

test('the auto-fixer proposes 6997 over a saved 3793', () => {
  const { patch } = autofix.plan({ ...card, merchant: { googleCategory: '3793' } });
  assert.strictEqual(patch['merchant.googleCategory'], '6997');
  assert.ok(!('merchant.googleCategory' in autofix.plan({ ...card, merchant: { googleCategory: '1247' } }).patch));
});
