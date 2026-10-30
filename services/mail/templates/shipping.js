/**
 * Dispatch, and tracking that arrives afterwards.
 *
 * TWO SEPARATE EMAILS BECAUSE THEY ARE TWO SEPARATE EVENTS. A parcel
 * often leaves before the carrier's number is scannable, and a dispatch
 * email carrying a tracking number that returns "not found" for six
 * hours generates more support mail than sending nothing would. So:
 * "it has shipped" goes out at dispatch with the number if we have one,
 * and "your tracking is live" goes out only when a number is added to an
 * order that already shipped without one.
 *
 * NEITHER EMAIL ESTIMATES A DELIVERY DATE. We hand parcels to a carrier;
 * we do not control what happens next, and a date in writing that the
 * carrier then misses is a promise we broke.
 */

const L = require('./layout');
const company = require('../../../config/company');

function trackingPanel(v) {
  if (!v.trackingNumber && !v.trackingUrl) return '';
  return L.twoUp(
    L.label('Carrier') + `<p style="margin:0">${L.value(v.trackingCarrier || 'Carrier', 'text')}</p>`,
    L.label('Tracking number') + L.mono(v.trackingNumber || 'Available shortly')
  );
}

function build(v, { isUpdate = false } = {}) {
  const lede = isUpdate
    ? 'Your tracking number is now live with the carrier.'
    : 'Your order has left our warehouse.';

  const body = [
    L.section(
      L.heading(isUpdate ? 'Your tracking is live.' : 'Your order is on its way.')
      + L.lede(L.esc(lede)),
      { pad: '32px 32px 26px' }
    ),
    L.rule(),

    L.section(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="stack" valign="top" style="padding-right:12px;">
          ${L.label('Order number')}${L.mono(v.reference)}
        </td>
        <td class="stack" valign="top">
          ${L.label('Dispatched')}${L.value(L.day(v.shippedAt) || L.day(new Date()), 'text')}
        </td>
      </tr></table>`,
      { pad: '22px 32px' }
    ),
    L.rule(),

    L.section(
      L.lineItem({
        image: v.image, title: v.title, quantity: v.quantity,
        price: v.total, currency: v.currency, note: 'Factory sealed',
      }),
      { pad: '24px 32px' }
    ),
    L.rule(),

    (v.trackingNumber || v.trackingUrl) ? L.section(
      trackingPanel(v)
      + (v.trackingUrl
        ? `<div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>` + L.button(v.trackingUrl, 'Track this parcel')
        : L.paragraph('Tracking can take a few hours to appear on the carrier’s site after dispatch.', { size: 12, top: 14 })),
      { pad: '24px 32px' }
    ) : L.section(
      L.label('Tracking')
      + L.paragraph('Your tracking number is being generated and we will email it to you as soon as it is live. Nothing is needed from you in the meantime.'),
      { pad: '24px 32px' }
    ),
    L.rule(),

    L.section(
      L.twoUp(
        L.label('Shipping to') + L.addressBlock(v.addressLines),
        L.label('If it does not arrive')
        + L.paragraph(`Carriers occasionally mark a parcel delivered a day early. If it has not turned up 48 hours after that, reply to this email and we will open a case with ${L.esc(v.trackingCarrier || 'the carrier')}.`, { size: 13 })
      ),
      { pad: '24px 32px' }
    ),
    L.rule(),

    L.section(
      L.paragraph('Everything about this order, including tracking, is in your account.')
      + `<div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>`
      + L.button(v.accessUrl, 'View my order'),
      { pad: '24px 32px' }
    ),
    L.rule(),

    L.section(
      L.trustLine(['Factory sealed, never resealed', 'Tracked delivery', `Support replies within one business day`]),
      { pad: '18px 32px', alt: true }
    ),
  ].join('');

  const subject = isUpdate
    ? `Tracking for your order — ${v.reference}`
    : `Your order has shipped — ${v.reference}`;

  const text = L.textDocument([
    isUpdate ? 'YOUR TRACKING IS LIVE' : 'YOUR ORDER IS ON ITS WAY',
    '',
    lede,
    '',
    `Order number: ${v.reference}`,
    `Dispatched:   ${L.day(v.shippedAt) || L.day(new Date())}`,
    '',
    `${v.title}`,
    `Quantity ${v.quantity}`,
    '',
    v.trackingCarrier ? `Carrier:  ${v.trackingCarrier}` : null,
    v.trackingNumber ? `Tracking: ${v.trackingNumber}` : 'Tracking: being generated, we will email it shortly',
    v.trackingUrl ? `Track it: ${v.trackingUrl}` : null,
    '',
    'SHIPPING TO',
    ...v.addressLines,
    '',
    'View this order in your account (the link signs you in, expires in 7 days):',
    v.accessUrl,
    '',
    `Questions? Reply to this email and quote ${v.reference}.`,
    `Or contact ${company.business.supportEmail}.`,
  ]);

  return { subject, html: L.document({ title: subject, preheader: lede, body }), text };
}

module.exports = {
  shipped: { build: (v) => build(v, { isUpdate: false }) },
  trackingAvailable: { build: (v) => build(v, { isUpdate: true }) },
};
