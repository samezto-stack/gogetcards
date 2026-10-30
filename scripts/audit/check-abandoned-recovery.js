#!/usr/bin/env node
/**
 * Drives the abandoned-checkout recovery system against a real MongoDB.
 *
 * Not a unit test of the pieces — the pieces are easy. This exercises the
 * things that actually go wrong in production: a payment landing between
 * the scheduler claiming a row and the message being sent, two workers
 * sweeping at the same moment, one customer with three abandoned sessions,
 * a product pulled from the catalogue mid-sequence, and pooled-email mode
 * hiding a real payment behind an address the checkout never saw.
 *
 *   node scripts/audit/check-abandoned-recovery.js
 *
 * Uses mongodb-memory-server, so it needs no running database and touches
 * nothing real. SMTP is stubbed: every send is recorded rather than
 * delivered, which is what makes "exactly once" assertable.
 */

const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.THANK_YOU_SIGNING_SECRET = process.env.THANK_YOU_SIGNING_SECRET || 'test-secret-for-audit';
process.env.SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://gogetcards.com';
/* Force the SMTP transport, because that is the one this test stubs. Without
   it, an ambient ZEPTOMAIL_TOKEN / SMTP_PASS in a developer's .env would flip
   services/mail to the HTTPS API and every "send" would try a real network
   call instead of being recorded. */
process.env.MAIL_TRANSPORT = 'smtp';

const ROOT = path.join(__dirname, '..', '..');
const AbandonedCheckout = require(path.join(ROOT, 'models/AbandonedCheckout'));
const EmailSuppression = require(path.join(ROOT, 'models/EmailSuppression'));
const Order = require(path.join(ROOT, 'models/Order'));
const Product = require(path.join(ROOT, 'models/Product'));
const Event = require(path.join(ROOT, 'models/Event'));
const service = require(path.join(ROOT, 'services/abandonedCheckout'));
const cron = require(path.join(ROOT, 'cron/abandonedCheckout'));

/* ── SMTP stub ──
   services/mail sends through nodemailer's transport. Replacing the
   transport getter records every message instead of delivering it, so a
   duplicate is a test failure rather than an email in somebody's inbox. */
const mail = require(path.join(ROOT, 'services/mail'));
const SENT = [];
mail.getTransport = () => ({
  sendMail: async (opts) => {
    SENT.push({ to: opts.to, subject: opts.subject, html: opts.html || '', text: opts.text || '' });
    return { messageId: `<stub-${SENT.length}@test>` };
  },
  verify: async () => true,
});

const results = [];
const ok = (name, detail) => results.push({ pass: true, name, detail });
const bad = (name, detail) => results.push({ pass: false, name, detail });
function check(cond, name, detail) { (cond ? ok : bad)(name, detail); return !!cond; }

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/** Winds a checkout's clock back so a step becomes due, without waiting. */
async function makeDue(checkoutId, agoMs) {
  const doc = await AbandonedCheckout.findOne({ checkoutId });
  const when = new Date(Date.now() - agoMs);
  doc.lastActivityAt = when;
  if (doc.abandonedAt) doc.abandonedAt = when;
  if (doc.nextEmailAt) doc.nextEmailAt = new Date(Date.now() - MIN);
  await doc.save();
  return doc;
}

async function capture(id, email, over = {}) {
  return service.capture({
    checkoutId: id,
    email,
    firstName: 'Alex',
    lastName: 'Moreau',
    productSlug: 'op09-booster-box',
    productName: 'One Piece TCG: OP-09 Booster Box',
    quantity: 1,
    total: '299.98',
    currency: 'USD',
    availability: 'preorder',
    ...over,
  });
}

async function main() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'audit' });

  await Product.create({
    title: 'One Piece TCG: OP-09 Booster Box',
    slug: 'op09-booster-box',
    price: 29998,
    available: true,
    preorder: true,
    releaseDate: new Date(Date.now() + 90 * 24 * HOUR),
  });

  /* ─────────── 1-11: the full six-step sequence, once each ─────────── */
  await capture('zc_seq', 'seq@example.com');
  let doc = await AbandonedCheckout.findOne({ checkoutId: 'zc_seq' });
  check(doc && doc.status === 'active', '1-2 checkout captured as ACTIVE', doc && doc.status);

  /* Not abandoned while they are still active. */
  await cron.runOnce();
  doc = await AbandonedCheckout.findOne({ checkoutId: 'zc_seq' });
  check(doc.status === 'active' && SENT.length === 0,
    '3 no email while the customer is still active', `status=${doc.status} sent=${SENT.length}`);

  await makeDue('zc_seq', 31 * MIN);
  await cron.runOnce();
  doc = await AbandonedCheckout.findOne({ checkoutId: 'zc_seq' });
  check(doc.status === 'abandoned' && doc.recoveryStep === 1 && SENT.length === 1,
    '4-5 30-minute email sent exactly once', `step=${doc.recoveryStep} sent=${SENT.length}`);

  /* Running again immediately must do nothing — step 2 is not due yet. */
  const before = SENT.length;
  await cron.runOnce();
  check(SENT.length === before, '5b re-running the sweep sends nothing', `sent=${SENT.length}`);

  const offsets = [4 * HOUR, 12 * HOUR, 24 * HOUR, 48 * HOUR, 72 * HOUR];
  for (let i = 0; i < offsets.length; i++) {
    const stepNo = i + 2;
    doc = await AbandonedCheckout.findOne({ checkoutId: 'zc_seq' });
    doc.abandonedAt = new Date(Date.now() - offsets[i] - MIN);
    doc.nextEmailAt = new Date(Date.now() - MIN);
    await doc.save();
    await cron.runOnce();
    doc = await AbandonedCheckout.findOne({ checkoutId: 'zc_seq' });
    check(doc.recoveryStep === stepNo && SENT.length === stepNo,
      `${5 + i} step ${stepNo} sent exactly once`, `step=${doc.recoveryStep} sent=${SENT.length}`);
  }

  doc = await AbandonedCheckout.findOne({ checkoutId: 'zc_seq' });
  check(doc.status === 'expired' && doc.nextEmailAt === null,
    '11 sequence stops after the 72-hour email', `status=${doc.status}`);

  /* Nothing more, ever. */
  const afterSix = SENT.length;
  await makeDue('zc_seq', 200 * HOUR).catch(() => {});
  await cron.runOnce();
  check(SENT.length === afterSix, '11b an expired sequence never sends again', `sent=${SENT.length}`);

  const subjects = SENT.map((s) => s.subject);
  check(new Set(subjects).size === 6, '11c all six emails were different', subjects.length + ' sent');
  check(/Last reminder/i.test(subjects[5]), '11d the sixth says it is the last', subjects[5]);
  check(SENT.every((s) => /unsubscribe/i.test(s.html)), '11e every email carries an unsubscribe link');

  /* ─────────── 12-16: payment wins ─────────── */
  SENT.length = 0;
  await capture('zc_paid', 'paid@example.com');
  await makeDue('zc_paid', 31 * MIN);
  await Order.create({
    orderId: 'ORD-PAID-1', customerEmail: 'paid@example.com', customerName: 'Alex Moreau',
    productName: 'x', totalPrice: 29998, currency: 'USD', source: 'whop',
  });
  await cron.runOnce();
  doc = await AbandonedCheckout.findOne({ checkoutId: 'zc_paid' });
  /* Paid closes the row and stops every send, whichever way they paid.
     This one never clicked a reminder, so the sequence gets no credit for
     it: PURCHASED, not RECOVERED. */
  check(AbandonedCheckout.PAID_STATUSES.includes(doc.status) && SENT.length === 0,
    '12-16 a paid customer is closed and never emailed', `status=${doc.status} sent=${SENT.length}`);
  check(doc.status === 'purchased',
    '16a paying without clicking a reminder is NOT counted as recovered', `status=${doc.status}`);
  check(!doc.recoveryTokenHash, '16b the recovery link is revoked on payment');

  /* The same, but pooled-email mode: the Order carries the POOLED address,
     not the one the customer typed. An email-only check misses this. */
  SENT.length = 0;
  await capture('zc_pooled', 'real-customer@example.com');
  await Event.create({ type: 'checkout_click', checkoutId: 'zc_pooled', pooledEmail: 'pool-42@partner.test' });
  await Order.create({
    orderId: 'ORD-POOL-1', customerEmail: 'pool-42@partner.test', customerName: 'Alex Moreau',
    productName: 'x', totalPrice: 29998, currency: 'USD', source: 'whop',
  });
  await makeDue('zc_pooled', 31 * MIN);
  await cron.runOnce();
  doc = await AbandonedCheckout.findOne({ checkoutId: 'zc_pooled' });
  check(AbandonedCheckout.PAID_STATUSES.includes(doc.status) && SENT.length === 0,
    '16c pooled-email payment is detected (the address on the Order differs)',
    `status=${doc.status} sent=${SENT.length}`);

  /* ── The other half of the split ──────────────────────────────────
     Same ending, different cause: this one used the link in a reminder
     before paying, which is the only thing that makes a sale the
     sequence's to claim. Without this pair, the two statuses could be
     swapped and every other assertion would still pass. */
  SENT.length = 0;
  await capture('zc_clicked', 'clicked@example.com');
  await AbandonedCheckout.updateOne(
    { checkoutId: 'zc_clicked' },
    { $set: { lastRecoveryClickAt: new Date() }, $inc: { recoveryLinkClicks: 1 } }
  );
  await Order.create({
    orderId: 'ORD-CLICK-1', customerEmail: 'clicked@example.com', customerName: 'Alex Moreau',
    productName: 'x', totalPrice: 29998, currency: 'USD', source: 'whop',
  });
  await makeDue('zc_clicked', 31 * MIN);
  await cron.runOnce();
  doc = await AbandonedCheckout.findOne({ checkoutId: 'zc_clicked' });
  check(doc.status === 'recovered' && SENT.length === 0,
    '16d paying after clicking a reminder IS counted as recovered',
    `status=${doc.status} sent=${SENT.length}`);

  /* And the sequence must still stop for both. */
  check(!doc.recoveryTokenHash && !doc.nextEmailAt,
    '16e a recovered row is closed as firmly as a purchased one');

  /* ─────────── 17-18: unsubscribe ─────────── */
  SENT.length = 0;
  await capture('zc_unsub', 'unsub@example.com');
  await makeDue('zc_unsub', 31 * MIN);
  await cron.runOnce();                       // step 1 goes out
  await EmailSuppression.suppress('unsub@example.com', 'unsubscribed');
  await AbandonedCheckout.updateOne({ checkoutId: 'zc_unsub' },
    { $set: { abandonedAt: new Date(Date.now() - 5 * HOUR), nextEmailAt: new Date(Date.now() - MIN) } });
  const sentBeforeUnsub = SENT.length;
  await cron.runOnce();
  doc = await AbandonedCheckout.findOne({ checkoutId: 'zc_unsub' });
  check(SENT.length === sentBeforeUnsub && doc.status === 'suppressed',
    '17-18 unsubscribing stops the sequence immediately', `status=${doc.status}`);

  /* A suppressed address never re-enters, even on a brand new checkout. */
  const fresh = await capture('zc_unsub_2', 'unsub@example.com');
  check(fresh.status === 'suppressed', '18b a suppressed address cannot start a new sequence', fresh.status);

  /* ─────────── 19-20: hard bounce ─────────── */
  SENT.length = 0;
  await capture('zc_bounce', 'bounce@example.com');
  await EmailSuppression.suppress('bounce@example.com', 'hard_bounce', { providerDetail: '550 no such user' });
  await makeDue('zc_bounce', 31 * MIN);
  await cron.runOnce();
  doc = await AbandonedCheckout.findOne({ checkoutId: 'zc_bounce' });
  check(SENT.length === 0 && doc.status !== 'abandoned',
    '19-20 a hard-bounced address is never emailed', `status=${doc.status} sent=${SENT.length}`);

  /* ─────────── 21-22: product withdrawn ─────────── */
  SENT.length = 0;
  await Product.create({ title: 'Gone', slug: 'gone-box', price: 19999, available: false, preorder: true });
  await capture('zc_gone', 'gone@example.com', { productSlug: 'gone-box', total: '199.99' });
  await makeDue('zc_gone', 31 * MIN);
  await cron.runOnce();
  doc = await AbandonedCheckout.findOne({ checkoutId: 'zc_gone' });
  check(SENT.length === 0 && doc.status === 'expired',
    '21-22 an unbuyable product stops the sequence', `status=${doc.status} reason=${doc.stoppedReason}`);

  /* ─────────── 23-24: price changed ─────────── */
  SENT.length = 0;
  await Product.create({ title: 'Moved', slug: 'moved-box', price: 15999, available: true, preorder: false });
  await capture('zc_price', 'price@example.com', { productSlug: 'moved-box', total: '149.99' });
  await makeDue('zc_price', 31 * MIN);
  await cron.runOnce();
  doc = await AbandonedCheckout.findOne({ checkoutId: 'zc_price' });
  check(SENT.length === 0 && doc.status === 'expired',
    '23-24 a changed price stops the sequence rather than misquoting',
    `status=${doc.status} reason=${doc.stoppedReason}`);

  /* ─────────── 25-26: three sessions, one customer ─────────── */
  SENT.length = 0;
  await capture('zc_multi_a', 'multi@example.com');
  await capture('zc_multi_b', 'multi@example.com');
  await capture('zc_multi_c', 'multi@example.com');
  for (const id of ['zc_multi_a', 'zc_multi_b', 'zc_multi_c']) await makeDue(id, 31 * MIN);
  await cron.runOnce();
  const multi = await AbandonedCheckout.find({ email: 'multi@example.com' }).lean();
  const live = multi.filter((m) => m.status === 'abandoned');
  check(SENT.length === 1 && live.length === 1,
    '25-26 three abandoned sessions produce ONE sequence, not three',
    `sent=${SENT.length} live=${live.length} statuses=${multi.map((m) => m.status).join(',')}`);

  /* ─────────── 27-28: two schedulers at once ─────────── */
  SENT.length = 0;
  await capture('zc_race', 'race@example.com');
  await makeDue('zc_race', 31 * MIN);
  /* First promote it, so both racing runs find a row that is already due
     and are competing for the SEND rather than for the promotion. */
  await service.sweepToAbandoned();
  await AbandonedCheckout.updateOne({ checkoutId: 'zc_race' }, { $set: { nextEmailAt: new Date(Date.now() - MIN) } });
  await Promise.all([cron.runOnce(), cron.runOnce(), cron.runOnce()]);
  doc = await AbandonedCheckout.findOne({ checkoutId: 'zc_race' });
  const raceSends = SENT.filter((s) => s.to === 'race@example.com').length;
  check(raceSends === 1 && doc.recoveryStep === 1,
    '27-28 three concurrent sweeps send exactly one email',
    `sent=${raceSends} step=${doc.recoveryStep}`);

  /* ─────────── returning customer resets the sequence ─────────── */
  SENT.length = 0;
  await capture('zc_return', 'return@example.com');
  await makeDue('zc_return', 31 * MIN);
  await cron.runOnce();                            // step 1 out
  await capture('zc_return', 'return@example.com', { city: 'El Segundo' });   // they came back
  doc = await AbandonedCheckout.findOne({ checkoutId: 'zc_return' });
  check(doc.status === 'active' && doc.nextEmailAt === null,
    'returning to the checkout puts it back to ACTIVE', `status=${doc.status}`);

  /* ─────────── recovery token ─────────── */
  const tokenDoc = await AbandonedCheckout.findOne({ checkoutId: 'zc_seq' });
  const plaintext = tokenDoc.issueRecoveryToken();
  await tokenDoc.save();
  const byHash = await AbandonedCheckout.findOne({
    recoveryTokenHash: AbandonedCheckout.hashRecoveryToken(plaintext),
  });
  check(byHash && byHash.checkoutId === 'zc_seq', 'a recovery token resolves to its own checkout');
  check(plaintext.length >= 43 && !/[^A-Za-z0-9_-]/.test(plaintext),
    'the token is long and URL-safe', `${plaintext.length} chars`);
  const stored = await AbandonedCheckout.findOne({ checkoutId: 'zc_seq' }).lean();
  check(!JSON.stringify(stored).includes(plaintext),
    'the plaintext token is NOT stored in the database');

  /* ─────────── unsubscribe token cannot be forged ─────────── */
  const good = EmailSuppression.unsubscribeToken('victim@example.com', 'zc_x');
  check(EmailSuppression.verifyUnsubscribeToken(good, 'victim@example.com', 'zc_x'),
    'a real unsubscribe token verifies');
  check(!EmailSuppression.verifyUnsubscribeToken(good, 'someone-else@example.com', 'zc_x'),
    'an unsubscribe token cannot be replayed against another address');

  /* ─────────── the emails themselves ─────────── */
  const recoveryMail = require(path.join(ROOT, 'services/mail/recoveryLifecycle'));
  const v = recoveryMail.view(
    await AbandonedCheckout.findOne({ checkoutId: 'zc_seq' }),
    await Product.findOne({ slug: 'op09-booster-box' }).lean(),
    'PLAINTEXT'
  );
  check(v.total === 29998, 'the email quotes the LIVE product price', String(v.total));
  check(v.recoveryUrl.includes('/checkout/recover/PLAINTEXT'), 'the button links to the recovery route');
  const templates = require(path.join(ROOT, 'services/mail/templates'));
  const rendered = templates.recoveryReminder1.build(v);
  check(/\$299\.98/.test(rendered.html), 'the rendered email shows $299.98');
  check(!/only \d+ left|hurry|act now|discount|coupon|% off/i.test(rendered.html),
    'no fake scarcity, urgency or invented discount in the email');

  await mongoose.disconnect();
  await mongod.stop();

  /* ── report ── */
  const failed = results.filter((r) => !r.pass);
  for (const r of results) {
    console.log(`${r.pass ? '  PASS  ' : '  FAIL  '}${r.name}${r.detail ? '  ::  ' + r.detail : ''}`);
  }
  console.log('\n' + '='.repeat(66));
  console.log(failed.length
    ? `${failed.length} FAILED of ${results.length}`
    : `ALL ${results.length} CHECKS PASSED`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('audit crashed:', err);
  process.exit(1);
});
