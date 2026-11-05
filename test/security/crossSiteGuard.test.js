const { test } = require('node:test');
const assert = require('node:assert');
process.env.SITE_URL = process.env.SITE_URL || 'https://gogetcards.com';
const { decide } = require('../../middleware/crossSiteGuard');

const req = (method, path, headers = {}, hostname = 'gogetcards.com') => ({
  method, path, hostname,
  get: (h) => headers[h] || headers[h.toLowerCase()] || undefined,
});

test('reads pass untouched', () => {
  assert.strictEqual(decide(req('GET', '/admin/products/1', { 'Sec-Fetch-Site': 'cross-site' })), null);
});
test('a same-origin browser post passes, whatever Origin says', () => {
  assert.strictEqual(decide(req('POST', '/admin/products/1', { 'Sec-Fetch-Site': 'same-origin', Origin: 'https://gogetcards.com' })), null);
  assert.strictEqual(decide(req('POST', '/admin/products/1', { 'Sec-Fetch-Site': 'same-origin', Origin: 'null' })), null);
  assert.strictEqual(decide(req('POST', '/admin/products/1', { 'Sec-Fetch-Site': 'same-origin' }, 'internal-host.svc')), null);
  assert.strictEqual(decide(req('POST', '/account/profile', { 'Sec-Fetch-Site': 'none' })), null);
});
test('a cross-site browser post is refused', () => {
  assert.match(decide(req('POST', '/admin/products/1', { 'Sec-Fetch-Site': 'cross-site', Origin: 'https://gogetcards.com' })), /cross-site/);
});
test('without Sec-Fetch-Site a foreign Origin is refused and our own passes', () => {
  assert.match(decide(req('POST', '/api/cart/add', { Origin: 'https://evil.example' })), /Origin/);
  assert.strictEqual(decide(req('POST', '/api/cart/add', { Origin: 'https://gogetcards.com' })), null);
  assert.strictEqual(decide(req('POST', '/api/cart/add', { Origin: 'https://www.gogetcards.com' })), null);
  assert.strictEqual(decide(req('POST', '/api/cart/add', {})), null);
});
test('the partner callbacks and unsubscribe are exempt', () => {
  assert.strictEqual(decide(req('POST', '/api/checkout/payment-recorded', { 'Sec-Fetch-Site': 'cross-site' })), null);
  assert.strictEqual(decide(req('POST', '/email/unsubscribe/abc', { Origin: 'https://mail.example' })), null);
});
