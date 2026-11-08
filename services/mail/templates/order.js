/**
 * The confirmation, in its two forms.
 *
 * ONE TEMPLATE, TWO TRUTHS. An in-stock order and a preorder are the
 * same receipt with a different promise attached, and splitting them
 * into two files is how the two slowly stop matching. What differs is
 * stated in one place: the heading, the "what happens next" lines, and
 * whether a release date is shown. Everything else — the line item, the
 * totals, the address, the account block — is identical, because it is
 * identical.
 *
 * THE PREORDER VERSION NEVER IMPLIES DISPATCH. No delivery estimate, no
 * "on its way", no shipping window derived from today's date. A preorder
 * ships after the set is released, and saying anything else in writing
 * is the thing that turns a patient customer into a chargeback.
 */

const L = require('./layout');

function build(v) {
  const preorder = !!v.isPreorder;

  /* The line under the heading. Says the one thing they opened the
     email to find out, and stops. */
  const lede = preorder
    ? `Your allocation is secured and paid for. We prepare and ship it after the official release.`
    : `We have your payment and your order is being prepared.`;

  const next = preorder
    ? [
        v.release.hasDate
          ? `${L.strong(v.release.display)} &mdash; ${L.esc(v.title)} is released. We receive our allocation from the distributor on or shortly after this date.`
          : (v.release.window
            ? `${L.strong(v.release.window)} &mdash; the expected release window. We will email you as soon as the date is confirmed.`
            : `The release date has not been announced yet. We will email you the moment it is confirmed.`),
        `Your order is packed and dispatched within one business day of the release arriving with us.`,
        `You get a dispatch email with a tracking number the moment it leaves us.`,
      ]
    : [
        `Your order is picked and packed from our El Segundo warehouse within one business day.`,
        `You get a dispatch email with a tracking number the moment it leaves us.`,
        `Nothing further is needed from you.`,
      ];

  const body = [
    /* ── Heading ── */
    L.section(
      L.heading(preorder ? 'Your preorder is secured.' : 'Your order is confirmed.')
      + L.lede(L.esc(lede))
      + (v.firstName ? '' : ''),
      { pad: '32px 32px 26px' }
    ),
    L.rule(),

    /* ── The three facts a customer looks for first ── */
    L.section(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="stack" valign="top" style="padding-right:12px;">
          ${L.label('Order number')}${L.mono(v.reference)}
        </td>
        <td class="stack" valign="top" style="padding-right:12px;">
          ${L.label('Order date')}${L.value(L.day(v.placedOn), 'text')}
        </td>
        <td class="stack" valign="top">
          ${L.label(preorder ? 'Status' : 'Payment')}${L.value(preorder ? 'Preorder secured' : 'Paid in full', 'good')}
        </td>
      </tr></table>`,
      { pad: '22px 32px' }
    ),
    L.rule(),

    /* ── What was bought ── */
    L.section(
      (v.lines && v.lines.length
        ? v.lines.map((l) => L.lineItem({
          image: l.image, title: l.title, quantity: l.quantity,
          price: l.price, currency: v.currency,
          note: l.preorder ? (l.releaseDisplay ? `Preorder · releases ${l.releaseDisplay}` : 'Preorder') : 'Factory sealed',
        })).join('')
        : L.lineItem({
          image: v.image, title: v.title, quantity: v.quantity,
          price: v.total, currency: v.currency,
          note: preorder && v.release.hasDate ? `Releases ${v.release.display}` : 'Factory sealed',
        })),
      { pad: '24px 32px' }
    ),
    L.rule(),

    /* ── Money ── */
    L.section(
      L.totals([
        L.totalRow('Subtotal', L.money(v.total, v.currency)),
        L.totalRow('Shipping', 'Free', { good: true }),
        L.totalRow('Total paid', L.money(v.total, v.currency), { strong: true }),
      ]),
      { pad: '22px 32px' }
    ),
    L.rule(),

    /* ── Where it goes ── */
    L.section(
      L.twoUp(
        L.label('Shipping to') + L.addressBlock(v.addressLines),
        L.label('Delivery')
        + L.paragraph(preorder
          ? 'Free tracked shipping, dispatched after release.'
          : 'Free tracked shipping. Most US orders arrive in 2 to 5 business days after dispatch.')
      ),
      { pad: '24px 32px' }
    ),
    L.rule(),

    /* ── What happens next ── */
    L.section(
      L.label('What happens next')
      + next.map((line, i) => `<p class="dm-muted" style="margin:${i ? 10 : 0}px 0 0;font-family:${L.FONT};font-size:14px;line-height:1.65;color:${L.C.muted};">${line}</p>`).join(''),
      { pad: '24px 32px' }
    ),
    L.rule(),

    /* ── The account ── */
    L.section(
      L.label('Your account')
      + L.paragraph('Your GoGetCards account has been created. You can follow this order, see tracking as soon as it exists, and cancel or reorder without emailing anyone.')
      + `<div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>`
      + L.button(v.accessUrl, 'View my order')
      + L.paragraph('The link above signs you in on any device and expires in 7 days. There is no password to set.', { size: 12, top: 16 }),
      { pad: '24px 32px' }
    ),
    L.rule(),

    /* ── Trust, stated once ── */
    L.section(
      L.trustLine(['Factory sealed, never resealed', 'Free tracked shipping', 'Tracking sent on dispatch']),
      { pad: '18px 32px', alt: true }
    ),
    L.rule(),

    /* ── Support ── */
    L.section(
      L.paragraph(`Need help with this order? Reply to this email, or contact us at ${L.link('mailto:' + require('../../../config/company').business.supportEmail, require('../../../config/company').business.supportEmail)}. Quote ${L.esc(v.reference)} and we can find everything about it straight away.`, { size: 13 }),
      { pad: '22px 32px 26px' }
    ),
  ].join('');

  const subject = preorder
    ? `Preorder secured — ${v.reference}`
    : `Order confirmed — ${v.reference}`;

  const text = L.textDocument([
    preorder ? 'YOUR PREORDER IS SECURED' : 'YOUR ORDER IS CONFIRMED',
    '',
    lede,
    '',
    `Order number: ${v.reference}`,
    `Order date:   ${L.day(v.placedOn)}`,
    '',
    ...(v.lines && v.lines.length
      ? v.lines.map((l) => `${l.title} — Quantity ${l.quantity} — ${L.money(l.price, v.currency)}${l.preorder ? (l.releaseDisplay ? ` — Preorder, releases ${l.releaseDisplay}` : ' — Preorder') : ''}`)
      : [`${v.title}`, `Quantity ${v.quantity}`]),
    preorder && v.release.hasDate ? `Releases ${v.release.display}` : null,
    '',
    `Subtotal    ${L.money(v.total, v.currency)}`,
    `Shipping    Free`,
    `Total paid  ${L.money(v.total, v.currency)}`,
    '',
    'SHIPPING TO',
    ...v.addressLines,
    '',
    'WHAT HAPPENS NEXT',
    ...next.map((n) => '- ' + n.replace(/<[^>]+>/g, '')),
    '',
    'YOUR ACCOUNT',
    'Your GoGetCards account has been created. View this order, see tracking and',
    'manage the order here (the link signs you in and expires in 7 days):',
    v.accessUrl,
    '',
    `Questions? Reply to this email and quote ${v.reference}.`,
  ]);

  return { subject, html: L.document({ title: subject, preheader: lede, body }), text };
}

module.exports = {
  orderConfirmation: { build: (v) => build({ ...v, isPreorder: false }) },
  preorderConfirmation: { build: (v) => build({ ...v, isPreorder: true }) },
  /* Exported so a caller that has not decided can pass the order and let
     the view's own preorder flag choose. */
  auto: { build },
};
