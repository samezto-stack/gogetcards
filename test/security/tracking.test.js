'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const tracking = require('../../middleware/tracking');

/* Minimal req stub: detectSource only reads headers and req.query. */
function reqWith(query, headers = {}) {
  return {
    query,
    get(name) { return headers[name.toLowerCase()] || ''; },
  };
}

/* REGRESSION (input side): an unknown utm_source is stored and later shown in
   the admin dashboard. It must be stripped of markup before storage so it can
   never carry an XSS payload into any page. */
test('detectSource strips markup from an unknown utm_source', () => {
  const evil = "</script><script>alert('xsss-utm_source18')</script>";
  const out = tracking.detectSource(reqWith({ utm_source: evil }, { referer: 'https://x.test' }));
  assert.ok(!/[<>]/.test(out), 'no angle brackets may survive: ' + out);
  assert.ok(!/script/i.test(out) || out.length <= 80);
});

test('detectSource caps length and trims', () => {
  const long = 'a'.repeat(500);
  const out = tracking.detectSource(reqWith({ utm_source: long }, { referer: 'https://x.test' }));
  assert.ok(out.length <= 80, 'label must be capped at 80 chars');
});

test('detectSource does not throw on an array-valued utm_source', () => {
  assert.doesNotThrow(() => {
    tracking.detectSource(reqWith({ utm_source: ['a', 'b'] }, { referer: 'https://x.test' }));
  });
});

test('detectSource still recognises a known channel', () => {
  const out = tracking.detectSource(reqWith({ utm_source: 'google' }, {}));
  assert.strictEqual(out, 'Google');
});

test('Google ad clicks: iOS ids are paid, partner referrers split out, srsltid is organic', () => {
  assert.strictEqual(tracking.detectSource(reqWith({ gbraid: 'x' }, {})), 'Google Ads');
  assert.strictEqual(tracking.detectSource(reqWith({ wbraid: 'x' }, {})), 'Google Ads');
  assert.strictEqual(tracking.detectSource(reqWith({ gclid: 'x' }, { referer: 'https://www.google.com/' })), 'Google Ads');
  assert.strictEqual(tracking.detectSource(reqWith({ gclid: 'x' }, { referer: 'https://www.youtube.com/' })), 'Google Ads Partners');
  assert.strictEqual(tracking.detectSource(reqWith({ gclid: 'x' }, { referer: 'not a url' })), 'Google Ads');
  assert.strictEqual(tracking.detectSource(reqWith({ srsltid: 'x' }, {})), 'Google');
});
