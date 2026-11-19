const test = require('node:test');
const assert = require('node:assert');
const csv = require('../services/productCsv');

const stored = [{ _id: 'a1', slug: 'etb', title: 'ETB', price: 99.98, tags: ['pokemon', 'etb', 'ads-launch'], collections: ['pokemon'] }];
const lookup = ({ slug }) => stored.find((p) => p.slug === slug) || null;
const tagsOf = (r) => r.rows[0].body.tags.split(',').map((s) => s.trim());

test('add_tags appends without touching the other tags', () => {
  const r = csv.plan('handle,add_tags\r\netb,campaign-x|sealed\r\n', { lookup });
  assert.deepStrictEqual(tagsOf(r), ['pokemon', 'etb', 'ads-launch', 'campaign-x', 'sealed']);
  assert.deepStrictEqual(r.unknownColumns, []);
});

test('remove_tags removes only the named tag, case-insensitively', () => {
  const r = csv.plan('handle,remove_tags\r\netb,ADS-LAUNCH\r\n', { lookup });
  assert.deepStrictEqual(tagsOf(r), ['pokemon', 'etb']);
});

test('adding a tag the product already has does not duplicate it', () => {
  const r = csv.plan('handle,add_tags\r\netb,ads-launch\r\n', { lookup });
  assert.deepStrictEqual(tagsOf(r), ['pokemon', 'etb', 'ads-launch']);
});

test('the control columns are never exported or in the template', () => {
  const head = csv.template().split(/\r?\n/)[0].split(',');
  assert.ok(!head.includes('add_tags') && !head.includes('remove_tags'));
});
