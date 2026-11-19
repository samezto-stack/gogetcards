const test = require('node:test');
const assert = require('node:assert');
const csv = require('../services/productCsv');

const stored = [
  { _id: 'a1', slug: 'old-box', sku: 'OLD-1', title: 'Old Box', price: 49.99 },
  { _id: 'b2', slug: 'keep-box', sku: 'KEEP-1', title: 'Keep Box', price: 99.98 },
];
const lookup = ({ slug, sku }) => stored.find((p) => (slug && p.slug === slug) || (sku && p.sku === sku)) || null;

test('delete=true on a matched handle plans a delete and reads nothing else', () => {
  const r = csv.plan('handle,title,price,delete\r\nold-box,,not-a-number,true\r\n', { lookup });
  assert.strictEqual(r.rows[0].action, 'delete');
  assert.strictEqual(r.rows[0].existingId, 'a1');
  assert.deepStrictEqual(r.rows[0].errors, []);
  assert.strictEqual(r.summary.delete, 1);
  assert.deepStrictEqual(r.unknownColumns, []);
});

test('delete on a handle that matches nothing is an error, never a guess', () => {
  const r = csv.plan('handle,delete\r\nno-such-box,true\r\n', { lookup });
  assert.strictEqual(r.rows[0].action, 'error');
  assert.strictEqual(r.summary.delete, 0);
});

test('delete blank or false leaves the row an ordinary update', () => {
  const r = csv.plan('handle,price,delete\r\nkeep-box,149.97,\r\nold-box,99.98,false\r\n', { lookup });
  assert.deepStrictEqual(r.rows.map((x) => x.action), ['update', 'update']);
  assert.strictEqual(r.summary.delete, 0);
});

test('an unexpected delete value is refused', () => {
  const r = csv.plan('handle,delete\r\nold-box,maybe\r\n', { lookup });
  assert.strictEqual(r.rows[0].action, 'error');
});

test('the delete column is never exported or in the template', () => {
  assert.ok(!csv.template().split(/\r?\n/)[0].split(',').includes('delete'));
  assert.ok(!csv.toCsv(stored).split(/\r?\n/)[0].split(',').includes('delete'));
});
