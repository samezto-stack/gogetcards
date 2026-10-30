/**
 * Cancellation, and the two halves of a refund.
 *
 * THE WORDING IS THE FEATURE. These three emails are the only place
 * this business makes a statement about somebody's money, and each one
 * says exactly what the record says and nothing further:
 *
 *   cancellation      the order is stopped and a refund is QUEUED
 *   refundInitiated   a refund is queued on an order (no cancellation)
 *   refundCompleted   the money has been sent back
 *
 * Refunds here are issued by hand in the payment provider. Until an
 * admin records that one was actually sent, nothing may say it was.
 * "Your refund has been processed" is the sentence that generates a
 * chargeback nine days later when it has not appeared, so it does not
 * appear in the first two templates at all — they say "being
 * processed", give the 7 to 10 business day window, and promise a
 * second email when it is really gone.
 *
 * NO APOLOGY THEATRE, no "we're sorry to see you go", no win-back
 * offer. Somebody cancelling an order wants confirmation that it is
 * cancelled and that their money is coming back. Anything else in this
 * email reads as a company trying to talk them out of it.
 */

const L = require('./layout');
const company = require('../../../config/company');
const faq = require('../../../config/faq');

const REFUND_WINDOW = 'Please allow 7 to 10 business days for it to appear, depending on your bank or card issuer.';

function header(v, title, lede) {
  return L.section(L.heading(title) + L.lede(L.esc(lede)), { pad: '32px 32px 26px' });
}

function facts(v, rightLabel, rightValue, rightTone) {
  return L.section(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="stack" valign="top" style="padding-right:12px;">
        ${L.label('Order number')}${L.mono(v.reference)}
      </td>
      <td class="stack" valign="top" style="padding-right:12px;">
        ${L.label('Refund amount')}${L.mono(L.money(v.refundAmount, v.currency))}
      </td>
      <td class="stack" valign="top">
        ${L.label(rightLabel)}${L.value(rightValue, rightTone)}
      </td>
    </tr></table>`,
    { pad: '22px 32px' }
  );
}

function item(v) {
  return L.section(
    L.lineItem({
      image: v.image, title: v.title, quantity: v.quantity,
      price: v.total, currency: v.currency, note: 'Cancelled',
    }),
    { pad: '24px 32px' }
  );
}

function support(v) {
  return L.section(
    L.paragraph(`Anything unclear about this refund? Reply to this email or write to ${L.link('mailto:' + company.business.supportEmail, company.business.supportEmail)}, quoting ${L.esc(v.reference)}.`, { size: 13 }),
    { pad: '22px 32px 26px' }
  );
}

/* ── Cancelled, refund queued ───────────────────────────── */

function cancellation(v) {
  const lede = 'Your cancellation request has been confirmed and this order has been stopped.';

  const body = [
    header(v, 'Your order has been cancelled.', lede),
    L.rule(),
    facts(v, 'Status', 'Refund processing', 'warn'),
    L.rule(),
    item(v),
    L.rule(),
    L.section(
      L.label('Your refund')
      + L.paragraph(`${L.strong(L.money(v.refundAmount, v.currency))} is being refunded to your original payment method. ${REFUND_WINDOW}`)
      + L.paragraph('Our team issues refunds by hand, normally within one business day. We will email you again the moment it has actually been sent, so you never have to wonder whether it happened.', { top: 12 }),
      { pad: '24px 32px' }
    ),
    L.rule(),
    v.isPreorder ? L.section(
      L.label('Your allocation')
      + L.paragraph('The allocation held for you has been released and offered to the next buyer. If you change your mind, you are welcome to order again while stock lasts, at the price shown on the day.'),
      { pad: '24px 32px' }
    ) + L.rule() : '',
    L.section(
      L.paragraph('This order stays visible in your account with its full cancellation and refund history.')
      + `<div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>`
      + L.button(v.accessUrl, 'View this order'),
      { pad: '24px 32px' }
    ),
    L.rule(),
    support(v),
  ].join('');

  const subject = `Your Zyphera TCG order has been cancelled — ${v.reference}`;

  return {
    subject,
    html: L.document({ title: subject, preheader: lede, body }),
    text: L.textDocument([
      'YOUR ORDER HAS BEEN CANCELLED',
      '',
      lede,
      '',
      `Order number:  ${v.reference}`,
      `Refund amount: ${L.money(v.refundAmount, v.currency)}`,
      `Status:        Refund processing`,
      '',
      `${v.title} (quantity ${v.quantity}) — cancelled`,
      '',
      'YOUR REFUND',
      `${L.money(v.refundAmount, v.currency)} is being refunded to your original payment method.`,
      REFUND_WINDOW,
      'Our team issues refunds by hand, normally within one business day, and we',
      'will email you again once it has actually been sent.',
      '',
      v.isPreorder ? 'Your allocation has been released and offered to the next buyer.' : null,
      v.isPreorder ? '' : null,
      'View this order in your account (the link signs you in, expires in 7 days):',
      v.accessUrl,
      '',
      `Questions? Reply to this email and quote ${v.reference}.`,
    ]),
  };
}

/* ── Refund queued, without a cancellation ──────────────── */

function refundInitiated(v) {
  const lede = 'A refund has been started on your order.';

  const body = [
    header(v, 'Your refund is being processed.', lede),
    L.rule(),
    facts(v, 'Status', 'Refund processing', 'warn'),
    L.rule(),
    L.section(
      L.label('What this means')
      + L.paragraph(`${L.strong(L.money(v.refundAmount, v.currency))} is being returned to the payment method you used. ${REFUND_WINDOW}`)
      + L.paragraph('We will email you again once the money has actually left us. Until then nothing further is needed from you.', { top: 12 }),
      { pad: '24px 32px' }
    ),
    L.rule(),
    L.section(
      L.button(v.accessUrl, 'View this order'),
      { pad: '24px 32px' }
    ),
    L.rule(),
    support(v),
  ].join('');

  const subject = `Refund started for your order — ${v.reference}`;

  return {
    subject,
    html: L.document({ title: subject, preheader: lede, body }),
    text: L.textDocument([
      'YOUR REFUND IS BEING PROCESSED',
      '',
      lede,
      '',
      `Order number:  ${v.reference}`,
      `Refund amount: ${L.money(v.refundAmount, v.currency)}`,
      '',
      `${L.money(v.refundAmount, v.currency)} is being returned to the payment method you used.`,
      REFUND_WINDOW,
      'We will email you again once the money has actually left us.',
      '',
      'View this order in your account (the link signs you in, expires in 7 days):',
      v.accessUrl,
    ]),
  };
}

/* ── Refund actually sent ───────────────────────────────── */

function refundCompleted(v) {
  const lede = 'Your refund has been sent back to your original payment method.';

  const body = [
    header(v, 'Your refund has been issued.', lede),
    L.rule(),
    facts(v, 'Issued', L.day(v.refundedAt) || L.day(new Date()), 'good'),
    L.rule(),
    L.section(
      L.label('What to expect')
      + L.paragraph(`${L.strong(L.money(v.refundAmount, v.currency))} has left us and is on its way back to you. How quickly it shows up is up to your bank: most cards post it within 3 to 5 business days, some take up to 10.`)
      + L.paragraph('It usually appears as a credit from the original payment provider rather than from Zyphera TCG, which is normal and is not a second charge.', { top: 12 }),
      { pad: '24px 32px' }
    ),
    L.rule(),
    L.section(
      L.paragraph(`If it has not appeared after 10 business days, reply to this email with ${L.esc(v.reference)} and we will send you the refund confirmation from the payment provider to give your bank.`, { size: 13 })
      + `<div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>`
      + L.button(v.accessUrl, 'View this order'),
      { pad: '24px 32px' }
    ),
    L.rule(),
    L.section(
      L.trustLine([`${faq.RETURN_WINDOW_DAYS}-day returns`, 'Factory sealed, never resealed', 'Support replies within one business day']),
      { pad: '18px 32px', alt: true }
    ),
  ].join('');

  const subject = `Your refund has been issued — ${v.reference}`;

  return {
    subject,
    html: L.document({ title: subject, preheader: lede, body }),
    text: L.textDocument([
      'YOUR REFUND HAS BEEN ISSUED',
      '',
      lede,
      '',
      `Order number:  ${v.reference}`,
      `Refund amount: ${L.money(v.refundAmount, v.currency)}`,
      `Issued:        ${L.day(v.refundedAt) || L.day(new Date())}`,
      '',
      `${L.money(v.refundAmount, v.currency)} has left us and is on its way back to you.`,
      'Most cards post it within 3 to 5 business days, some take up to 10.',
      'It usually appears as a credit from the original payment provider rather',
      'than from Zyphera TCG. That is normal and is not a second charge.',
      '',
      `If it has not appeared after 10 business days, reply quoting ${v.reference}.`,
      '',
      'View this order in your account (the link signs you in, expires in 7 days):',
      v.accessUrl,
    ]),
  };
}

module.exports = {
  cancellation: { build: cancellation },
  refundInitiated: { build: refundInitiated },
  refundCompleted: { build: refundCompleted },
};
