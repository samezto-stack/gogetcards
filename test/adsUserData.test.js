const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { adsUserData } = require('../helpers/adsUserData');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

test('hashes normalised email (gmail dots removed) and sends no plaintext', () => {
  const ud = adsUserData({ email: ' John.Doe@Gmail.com ', firstName: 'John', lastName: 'Doe', postalCode: '73301', country: 'us' });
  assert.strictEqual(ud.sha256_email_address, sha('johndoe@gmail.com'));
  assert.strictEqual(ud.address.sha256_first_name, sha('john'));
  assert.strictEqual(ud.address.country, 'US');
  assert.ok(!JSON.stringify(ud).includes('Doe') && !JSON.stringify(ud).includes('john'));
});

test('omits what is missing or malformed', () => {
  assert.strictEqual(adsUserData({ email: 'not-an-email' }), null);
  assert.strictEqual(adsUserData({ email: 'a@b.co', phone: '555-0100' }).sha256_phone_number, undefined);
  assert.strictEqual(adsUserData({ email: 'a@b.co', firstName: 'A' }).address, undefined);
});
