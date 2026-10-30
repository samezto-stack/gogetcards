/**
 * Release day, in three emails.
 *
 * THE SITUATION THEY EXIST FOR. A preorder taken months ago finally
 * lands, in volume. Two groups of people are owed a message that day,
 * and they are owed different ones:
 *
 *   releaseReady    everyone whose order is still open. The set is here,
 *                   it is being dispatched, this is when to expect it.
 *
 *   reinstateOffer  everyone who cancelled while waiting and whose refund
 *                   has NOT yet been issued. The set is here; before the
 *                   money goes back, do they still want it? One email,
 *                   one deadline, no follow-up. Doing nothing means the
 *                   refund proceeds exactly as promised.
 *
 *   reinstated      the confirmation for somebody who pressed the button.
 *
 * ONE EMAIL PER PERSON, NOT PER ORDER. Somebody who placed three orders
 * gets one message listing three references, not three messages a minute
 * apart. The view carries `orders` (every order the message covers) and
 * the single-order fields are filled from the first, so the shared
 * layout pieces still work.
 *
 * WORDING RULES THIS FILE OBEYS, same as the rest of the set:
 *   - the delivery window is the one the admin typed, never derived
 *   - nothing says a refund was issued unless the record says so
 *   - the offer is not a win-back: no discount, no scarcity, no "last
 *     chance". The customer said no once; they are asked once whether
 *     that still stands, and told plainly what silence means.
 */

const L = require('./layout');
const company = require('../../../config/company');

/** Every order the message covers, as line items, oldest first.
 *
 * ONE IMAGE, on the first line only. The set's own one-image rule is a
 * spam-filter decision, not a style one — and every order here is the
 * same product, so repeating the photo would say nothing anyway. */
function orderItems(v, note) {
  return ordersOf(v).map((o, i) => L.lineItem({
    image: i === 0 ? v.image : '', title: v.title, quantity: o.quantity,
    price: o.total, currency: o.currency || v.currency, note: note(o),
  })).join(`<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>`);
}

/** The orders the message covers. A single-order view (the preview, a
 *  retry rebuilt from one order) is treated as a list of one. */
function ordersOf(v) {
  if (v.orders && v.orders.length) return v.orders;
  return [{
    reference: v.reference, orderId: v.orderId, quantity: v.quantity, total: v.total,
    currency: v.currency, refundAmount: v.refundAmount, cancelledAt: v.cancelledAt,
  }];
}

function refList(v) {
  return ordersOf(v).map((o) => o.reference).join(', ');
}

function support(v, what) {
  return L.section(
    L.paragraph(`${what} Reply to this email quoting ${L.esc(refList(v))}, or write to ${L.link('mailto:' + company.business.supportEmail, company.business.supportEmail)}.`, { size: 13 }),
    { pad: '22px 32px 26px' }
  );
}

/* ── It's here ──────────────────────────────────────────── */

function releaseReady(v) {
  const many = ordersOf(v).length > 1;
  const win = v.deliveryWindow || '5 to 7 business days';
  const lede = many
    ? `${v.title} has been released, and your ${ordersOf(v).length} orders are now being prepared for dispatch.`
    : `${v.title} has been released, and your order is now being prepared for dispatch.`;

  const body = [
    L.section(L.heading('Your preorder is here.') + L.lede(L.esc(lede)), { pad: '32px 32px 26px' }),
    L.rule(),
    L.section(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="stack" valign="top" style="padding-right:12px;">
          ${L.label(many ? 'Order numbers' : 'Order number')}${L.mono(refList(v))}
        </td>
        <td class="stack" valign="top" style="padding-right:12px;">
          ${L.label('Status')}${L.value('Preparing shipment', 'good')}
        </td>
        <td class="stack" valign="top">
          ${L.label('Expected delivery')}${L.value(`Within ${win}`, 'text')}
        </td>
      </tr></table>`,
      { pad: '22px 32px' }
    ),
    L.rule(),
    L.section(orderItems(v, () => 'Released'), { pad: '24px 32px' }),
    L.rule(),
    L.section(
      L.label('What happens now')
      + L.paragraph(`Orders are packed in the order they were placed. Yours should be with you within ${L.strong(win)}. You will get a separate email with a tracking number the moment it leaves us.`)
      + L.paragraph('Nothing further is needed from you. If your delivery address has changed since you ordered, reply to this email before it ships and we will update it.', { top: 12 }),
      { pad: '24px 32px' }
    ),
    L.rule(),
    L.section(L.button(v.accessUrl, many ? 'View my orders' : 'View my order'), { pad: '24px 32px' }),
    L.rule(),
    support(v, 'Questions about your delivery?'),
  ].join('');

  const subject = many
    ? `${v.title} is here — your orders are being prepared`
    : `${v.title} is here — ${ordersOf(v)[0].reference}`;

  return {
    subject,
    html: L.document({ title: subject, preheader: lede, body }),
    text: L.textDocument([
      'YOUR PREORDER IS HERE',
      '',
      lede,
      '',
      `${many ? 'Order numbers' : 'Order number'}: ${refList(v)}`,
      `Status:            Preparing shipment`,
      `Expected delivery: within ${win}`,
      '',
      ...ordersOf(v).map((o) => `${v.title} (quantity ${o.quantity}) — ${o.reference}`),
      '',
      'WHAT HAPPENS NOW',
      `Orders are packed in the order they were placed. Yours should be with you`,
      `within ${win}. You will get a separate email with a tracking number the`,
      'moment it leaves us. Nothing further is needed from you.',
      '',
      'If your delivery address has changed since you ordered, reply to this email',
      'before it ships and we will update it.',
      '',
      'View your order (the link signs you in, expires in 7 days):',
      v.accessUrl,
      '',
      `Questions? Reply to this email quoting ${refList(v)}.`,
    ]),
  };
}

/* ── Before the refund goes out ─────────────────────────── */

function reinstateOffer(v) {
  const many = ordersOf(v).length > 1;
  const win = v.deliveryWindow || '5 to 7 business days';
  const deadline = v.deadlineDisplay || L.day(v.deadline);
  const totalRefund = ordersOf(v).reduce((n, o) => n + (Number(o.refundAmount) || 0), 0);
  const cancelledOn = L.day(ordersOf(v)[0].cancelledAt);

  const lede = many
    ? `You cancelled ${ordersOf(v).length} orders for ${v.title} and their refunds are queued. The set has now been released, so we are checking once before the money goes back.`
    : `You cancelled order ${ordersOf(v)[0].reference}${cancelledOn ? ` on ${cancelledOn}` : ''} and its refund is queued. ${v.title} has now been released, so we are checking once before the money goes back.`;

  const body = [
    L.section(L.heading('One question before your refund goes out.') + L.lede(L.esc(lede)), { pad: '32px 32px 26px' }),
    L.rule(),
    L.section(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="stack" valign="top" style="padding-right:12px;">
          ${L.label(many ? 'Order numbers' : 'Order number')}${L.mono(refList(v))}
        </td>
        <td class="stack" valign="top" style="padding-right:12px;">
          ${L.label('Refund queued')}${L.mono(L.money(totalRefund, v.currency))}
        </td>
        <td class="stack" valign="top">
          ${L.label('Reply by')}${L.value(deadline, 'warn')}
        </td>
      </tr></table>`,
      { pad: '22px 32px' }
    ),
    L.rule(),
    L.section(orderItems(v, () => 'Cancelled — refund queued'), { pad: '24px 32px' }),
    L.rule(),
    L.section(
      L.label('If you would still like it')
      + L.paragraph(`Press the button below before the end of ${L.strong(deadline)}. Your original order is put back on at the price you already paid — ${L.strong('nothing is charged again')} — and it ships with everybody else's. You would receive it within ${L.esc(win)}.`)
      + `<div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>`
      + L.button(v.accessUrl, many ? 'Keep my orders' : 'Keep my order'),
      { pad: '24px 32px' }
    ),
    L.rule(),
    L.section(
      L.label('If you would rather have the refund')
      + L.paragraph(`Do nothing. Your refund of ${L.strong(L.money(totalRefund, v.currency))} goes ahead as planned after ${L.esc(deadline)}, to your original payment method, and we will email you the moment it has been sent.`)
      + L.paragraph(`This is the only time we will ask. The button stops working after ${L.esc(deadline)}, and once the refund has been issued the order cannot be put back.`, { top: 12 }),
      { pad: '24px 32px' }
    ),
    L.rule(),
    support(v, 'Not sure, or something else changed?'),
  ].join('');

  const subject = many
    ? `Before we refund your ${v.title} orders — it is now in stock`
    : `Before we refund ${ordersOf(v)[0].reference} — ${v.title} is now in stock`;

  return {
    subject,
    html: L.document({ title: subject, preheader: lede, body }),
    text: L.textDocument([
      'ONE QUESTION BEFORE YOUR REFUND GOES OUT',
      '',
      lede,
      '',
      `${many ? 'Order numbers' : 'Order number'}: ${refList(v)}`,
      `Refund queued: ${L.money(totalRefund, v.currency)}`,
      `Reply by:      ${deadline}`,
      '',
      ...ordersOf(v).map((o) => `${v.title} (quantity ${o.quantity}) — ${o.reference} — cancelled, refund queued`),
      '',
      'IF YOU WOULD STILL LIKE IT',
      `Open the link below before the end of ${deadline}. Your original order is put`,
      'back on at the price you already paid — nothing is charged again — and it ships',
      `with everybody else's. You would receive it within ${win}.`,
      '',
      v.accessUrl,
      '',
      'IF YOU WOULD RATHER HAVE THE REFUND',
      `Do nothing. Your refund of ${L.money(totalRefund, v.currency)} goes ahead as planned after`,
      `${deadline}, to your original payment method, and we will email you the moment`,
      'it has been sent.',
      '',
      `This is the only time we will ask. The link stops working after ${deadline},`,
      'and once the refund has been issued the order cannot be put back.',
      '',
      `Questions? Reply to this email quoting ${refList(v)}.`,
    ]),
  };
}

/* ── Back on ────────────────────────────────────────────── */

function reinstated(v) {
  const win = v.deliveryWindow || '5 to 7 business days';
  const lede = `You chose to keep order ${v.reference}. The cancellation and the queued refund have been withdrawn, and your order is being prepared with the rest.`;

  const body = [
    L.section(L.heading('Your order is back on.') + L.lede(L.esc(lede)), { pad: '32px 32px 26px' }),
    L.rule(),
    L.section(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="stack" valign="top" style="padding-right:12px;">
          ${L.label('Order number')}${L.mono(v.reference)}
        </td>
        <td class="stack" valign="top" style="padding-right:12px;">
          ${L.label('Charged again')}${L.value('Nothing', 'good')}
        </td>
        <td class="stack" valign="top">
          ${L.label('Expected delivery')}${L.value(`Within ${win}`, 'text')}
        </td>
      </tr></table>`,
      { pad: '22px 32px' }
    ),
    L.rule(),
    L.section(
      L.lineItem({
        image: v.image, title: v.title, quantity: v.quantity,
        price: v.total, currency: v.currency, note: 'Reinstated',
      }),
      { pad: '24px 32px' }
    ),
    L.rule(),
    L.section(
      L.label('What this means')
      + L.paragraph(`The ${L.strong(L.money(v.total, v.currency))} you paid when you ordered still covers this — there is no new charge and no refund on its way. Your order is packed in the order it was originally placed, and you will get a tracking number by email the moment it leaves us.`)
      + L.paragraph('If you change your mind again before it ships, you can cancel from your account as before.', { top: 12 }),
      { pad: '24px 32px' }
    ),
    L.rule(),
    L.section(L.button(v.accessUrl, 'View my order'), { pad: '24px 32px' }),
    L.rule(),
    L.section(
      L.paragraph(`Anything unclear? Reply to this email quoting ${L.esc(v.reference)}, or write to ${L.link('mailto:' + company.business.supportEmail, company.business.supportEmail)}.`, { size: 13 }),
      { pad: '22px 32px 26px' }
    ),
  ].join('');

  const subject = `Your order is back on — ${v.reference}`;

  return {
    subject,
    html: L.document({ title: subject, preheader: lede, body }),
    text: L.textDocument([
      'YOUR ORDER IS BACK ON',
      '',
      lede,
      '',
      `Order number:      ${v.reference}`,
      `Charged again:     Nothing`,
      `Expected delivery: within ${win}`,
      '',
      `${v.title} (quantity ${v.quantity}) — reinstated`,
      '',
      'WHAT THIS MEANS',
      `The ${L.money(v.total, v.currency)} you paid when you ordered still covers this — there is no`,
      'new charge and no refund on its way. Your order is packed in the order it was',
      'originally placed, and you will get a tracking number by email the moment it',
      'leaves us.',
      '',
      'If you change your mind again before it ships, you can cancel from your',
      'account as before.',
      '',
      'View your order (the link signs you in, expires in 7 days):',
      v.accessUrl,
    ]),
  };
}

module.exports = {
  releaseReady: { build: releaseReady },
  reinstateOffer: { build: reinstateOffer },
  reinstated: { build: reinstated },
};
