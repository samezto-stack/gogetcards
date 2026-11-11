const { test } = require('node:test');
const assert = require('node:assert');
const { ByteLru, gate, MAX_RENDERS } = require('../services/imageMemory');

const entry = (n) => ({ buf: Buffer.alloc(n) });

test('ByteLru stays within its byte budget, dropping the least recently used', () => {
  const c = new ByteLru(100);
  c.set('a', entry(40));
  c.set('b', entry(40));
  c.get('a'); // a is now the most recent
  c.set('c', entry(40));
  assert.ok(c.bytes <= 100);
  assert.ok(c.has('a') && c.has('c'));
  assert.ok(!c.has('b'));
});

test('ByteLru ignores an entry larger than the whole budget', () => {
  const c = new ByteLru(10);
  c.set('big', entry(11));
  assert.strictEqual(c.size, 0);
  assert.strictEqual(c.bytes, 0);
});

test('ByteLru replacing a key does not double-count bytes', () => {
  const c = new ByteLru(100);
  c.set('a', entry(30));
  c.set('a', entry(50));
  assert.strictEqual(c.bytes, 50);
  c.delete('a');
  assert.strictEqual(c.bytes, 0);
});

test('gate never runs more than MAX_RENDERS jobs at once', async () => {
  let now = 0, peak = 0;
  const job = () => gate(async () => {
    now++; peak = Math.max(peak, now);
    await new Promise((r) => setTimeout(r, 5));
    now--;
  });
  await Promise.all(Array.from({ length: 10 }, job));
  assert.strictEqual(peak, MAX_RENDERS);
});

test('a failing job releases its slot', async () => {
  await assert.rejects(gate(async () => { throw new Error('x'); }));
  await Promise.all(Array.from({ length: MAX_RENDERS + 1 }, () => gate(async () => 1)));
});
