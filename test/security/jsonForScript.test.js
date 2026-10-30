'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const jsonForScript = require('../../helpers/jsonForScript');

/* Locks in the fix for the stored-XSS that started this audit: data embedded
   in an inline <script> must never be able to close the tag. */

test('neutralises a </script> breakout payload', () => {
  const payload = { name: "</script><script>alert('xss')</script>" };
  const out = jsonForScript(payload);
  assert.ok(!/<\/script>/i.test(out), 'output must not contain a raw </script>');
  assert.ok(!/<script/i.test(out), 'output must not contain a raw <script');
});

test('round-trips to the identical value', () => {
  const payload = { name: "</script>", note: 'a & b < c > d "quoted" \'single\'' };
  const parsed = JSON.parse(jsonForScript(payload));
  assert.deepStrictEqual(parsed, payload);
});

test('escapes <, >, & as unicode escapes', () => {
  const out = jsonForScript('<>&');
  assert.strictEqual(out, '"\\u003c\\u003e\\u0026"');
});

test('escapes U+2028 / U+2029 line terminators', () => {
  const out = jsonForScript('a b c');
  assert.ok(out.includes('\\u2028') && out.includes('\\u2029'));
  assert.ok(!out.includes(' ') && !out.includes(' '));
  assert.strictEqual(JSON.parse(out), 'a b c');
});

test('undefined serialises to null, not the string "undefined"', () => {
  assert.strictEqual(jsonForScript(undefined), 'null');
});
