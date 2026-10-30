'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { verifySignature, canonicalizeFields } = require('../../services/orderPipeline/signatureVerifier');

const SECRET = 'test-shared-secret';

function sign(fields, iat, secret = SECRET) {
  const canonical = canonicalizeFields(fields, String(iat));
  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
}

test('accepts a correctly signed, fresh token', () => {
  const iat = Date.now();
  const q = { orderId: 'A1', amount: '7499', iat: String(iat) };
  q.sig = sign(q, iat);
  assert.strictEqual(verifySignature(q, SECRET).valid, true);
});

test('fails CLOSED when no secret is configured', () => {
  const iat = Date.now();
  const q = { orderId: 'A1', iat: String(iat), sig: 'deadbeef' };
  assert.strictEqual(verifySignature(q, '').valid, false);
  assert.strictEqual(verifySignature(q, undefined).valid, false);
});

test('rejects a tampered field (signature no longer matches)', () => {
  const iat = Date.now();
  const q = { orderId: 'A1', amount: '7499', iat: String(iat) };
  q.sig = sign(q, iat);
  q.amount = '1'; // tamper after signing
  assert.strictEqual(verifySignature(q, SECRET).valid, false);
});

test('rejects a wrong secret', () => {
  const iat = Date.now();
  const q = { orderId: 'A1', iat: String(iat) };
  q.sig = sign(q, iat, 'other-secret');
  assert.strictEqual(verifySignature(q, SECRET).valid, false);
});

test('rejects an expired token', () => {
  const iat = Date.now() - 60 * 60 * 1000; // 1h ago, past the 30m window
  const q = { orderId: 'A1', iat: String(iat) };
  q.sig = sign(q, iat);
  assert.strictEqual(verifySignature(q, SECRET).reason, 'expired');
});

test('rejects a token missing sig or iat', () => {
  assert.strictEqual(verifySignature({ orderId: 'A1' }, SECRET).valid, false);
  assert.strictEqual(verifySignature({ sig: 'x' }, SECRET).valid, false);
});
