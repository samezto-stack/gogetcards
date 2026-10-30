/**
 * The two emails that are not about a single order.
 *
 * accountAccess is the sign-in link somebody asked for from the website.
 * It is the one email here that a stranger can cause to be sent to an
 * address they do not own — by typing it into the sign-in form — so it
 * is written to be harmless in that case: it states plainly that nothing
 * has happened to the account, and it never reveals whether an account
 * exists.
 *
 * releaseUpdate is the one we send when a preorder's release date moves.
 * It exists because the alternative is silence, and silence on a
 * preorder that has already been paid for is what turns a delay into a
 * dispute. It always states the OLD expectation as well as the new one,
 * because the customer is comparing against what we told them before
 * and making them go and find it is a small insult.
 */

const L = require('./layout');
const company = require('../../../config/company');

/* ── Sign-in link ───────────────────────────────────────── */

function accountAccess(v) {
  const minutes = v.expiresMinutes || 15;
  const lede = 'Use the button below to open your GoGetCards account.';

  const body = [
    L.section(L.heading('Sign in to your account.') + L.lede(L.esc(lede)), { pad: '32px 32px 24px' }),
    L.rule(),
    L.section(
      L.button(v.accessUrl, 'Open my account')
      + L.paragraph(`This link works once and expires in ${L.esc(minutes)} minutes. You do not need a password.`, { size: 13, top: 16 }),
      { pad: '26px 32px' }
    ),
    L.rule(),
    L.section(
      L.label('If you did not ask for this')
      + L.paragraph('Ignore this email. Nothing has changed on any account, no one has been signed in, and the link above stops working on its own. Somebody may simply have mistyped their address.'),
      { pad: '24px 32px' }
    ),
    L.rule(),
    L.section(
      L.paragraph(`Trouble signing in? Write to ${L.link('mailto:' + company.business.supportEmail, company.business.supportEmail)} and we will help.`, { size: 13 }),
      { pad: '22px 32px 26px' }
    ),
  ].join('');

  const subject = 'Your GoGetCards sign-in link';

  return {
    subject,
    html: L.document({ title: subject, preheader: lede, body }),
    text: L.textDocument([
      'SIGN IN TO YOUR ACCOUNT',
      '',
      lede,
      '',
      v.accessUrl,
      '',
      `This link works once and expires in ${minutes} minutes. There is no password.`,
      '',
      'IF YOU DID NOT ASK FOR THIS',
      'Ignore this email. Nothing has changed on any account, no one has been',
      'signed in, and the link stops working on its own.',
      '',
      `Trouble signing in? Write to ${company.business.supportEmail}.`,
    ]),
  };
}

/* ── Preorder release date change ───────────────────────── */

function releaseUpdate(v) {
  const moved = !!(v.previousRelease && v.release.hasDate);
  const lede = v.release.hasDate
    ? `${v.title} now releases on ${v.release.display}.`
    : `We have an update on the release of ${v.title}.`;

  const body = [
    L.section(
      L.heading('An update on your preorder.')
      + L.lede(L.esc(lede)),
      { pad: '32px 32px 26px' }
    ),
    L.rule(),
    L.section(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="stack" valign="top" style="padding-right:12px;">
          ${L.label('Order number')}${L.mono(v.reference)}
        </td>
        ${moved ? `<td class="stack" valign="top" style="padding-right:12px;">
          ${L.label('Previously')}<span class="dm-faint" style="font-family:${L.FONT};font-size:13px;color:${L.C.faint};text-decoration:line-through;">${L.esc(v.previousRelease)}</span>
        </td>` : ''}
        <td class="stack" valign="top">
          ${L.label('New release date')}${L.value(v.release.display || 'To be confirmed', 'text')}
        </td>
      </tr></table>`,
      { pad: '22px 32px' }
    ),
    L.rule(),
    L.section(
      L.lineItem({
        image: v.image, title: v.title, quantity: v.quantity,
        price: v.total, currency: v.currency,
        note: v.release.hasDate ? `Releases ${v.release.display}` : 'Release date to be confirmed',
      }),
      { pad: '24px 32px' }
    ),
    L.rule(),
    L.section(
      L.label('What this changes')
      + L.paragraph(v.message
        ? L.esc(v.message)
        : 'Nothing about your order or your price. Your allocation is still held and still paid for. We dispatch within one business day of the release arriving with us, and you will get a tracking number the moment it leaves.')
      + L.paragraph('If the new date no longer works for you, you can cancel for a full refund at any point before dispatch — from your account, in two clicks.', { top: 12 }),
      { pad: '24px 32px' }
    ),
    L.rule(),
    L.section(
      L.button(v.accessUrl, 'View my preorder'),
      { pad: '24px 32px' }
    ),
    L.rule(),
    L.section(
      L.paragraph(`Questions about the delay? Reply to this email quoting ${L.esc(v.reference)}.`, { size: 13 }),
      { pad: '22px 32px 26px' }
    ),
  ].join('');

  const subject = v.release.hasDate
    ? `New release date for your preorder — ${v.reference}`
    : `An update on your preorder — ${v.reference}`;

  return {
    subject,
    html: L.document({ title: subject, preheader: lede, body }),
    text: L.textDocument([
      'AN UPDATE ON YOUR PREORDER',
      '',
      lede,
      '',
      `Order number: ${v.reference}`,
      moved ? `Previously:   ${v.previousRelease}` : null,
      `New date:     ${v.release.display || 'To be confirmed'}`,
      '',
      `${v.title} (quantity ${v.quantity})`,
      '',
      'WHAT THIS CHANGES',
      v.message || 'Nothing about your order or your price. Your allocation is still held and'
        + '\nstill paid for. We dispatch within one business day of the release arriving'
        + '\nwith us, and you will get a tracking number the moment it leaves.',
      '',
      'If the new date no longer works for you, you can cancel for a full refund',
      'at any point before dispatch, from your account.',
      '',
      'View this preorder (the link signs you in, expires in 7 days):',
      v.accessUrl,
    ]),
  };
}

module.exports = {
  accountAccess: { build: accountAccess },
  releaseUpdate: { build: releaseUpdate },
};
