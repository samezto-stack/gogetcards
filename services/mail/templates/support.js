/**
 * The two emails around the contact form.
 *
 * contactReceived goes to us the moment somebody submits the form. Before
 * it existed the form only wrote a database row, so a message sat unread
 * until someone happened to open /admin/messages — which is how a customer
 * asking where their preorder was went four days without an answer. It is
 * the only template addressed to the shop rather than to a customer, and
 * the only one that sets its own Reply-To, so hitting reply in the support
 * inbox writes back to the person who asked rather than to ourselves.
 *
 * supportReply is the answer, sent from /admin/messages. It quotes what the
 * customer originally wrote underneath the reply, because a bare answer to
 * a message sent days ago reads as a non-sequitur — and because the person
 * reading it may have written to several shops that week.
 *
 * NEITHER IS MARKETING and neither carries an unsubscribe link: one is
 * internal, the other is a direct answer to a question the recipient asked
 * us. Both inherit the transactional footer from layout.document().
 */

const L = require('./layout');
const company = require('../../../config/company');
const site = require('../../../config/site');

/* The support queues the contact form offers, spelled for a human. Kept
   here rather than derived from the enum so the email never shows a raw
   value like "wholesale" if the enum ever grows an awkward one. */
const TOPICS = {
  general: 'General',
  order: 'An order',
  shipping: 'Shipping',
  returns: 'Returns',
  preorder: 'A preorder',
  wholesale: 'Wholesale',
};

/**
 * Renders a customer's message as HTML paragraphs.
 *
 * Escaped first, then newlines become <br>. Doing it in that order is the
 * whole point: the message is a stranger's free text, so every angle
 * bracket is neutralised before any markup of ours is introduced.
 */
function quoteBlock(message) {
  return L.esc(String(message || ''))
    .split(/\n{2,}/)
    .map((para) => L.paragraph(para.replace(/\n/g, '<br>')))
    .join('');
}

/* ── To us: somebody used the contact form ──────────────── */

function contactReceived(v) {
  const topic = TOPICS[v.topic] || 'General';
  const lede = `${v.name || 'Someone'} <${v.email}> sent a message through the contact form.`;

  const rows = [
    L.twoUp(L.label('From') + L.value(v.name || '—'), L.label('Topic') + L.value(topic)),
    L.twoUp(
      L.label('Email') + L.value(v.email || '—'),
      L.label('Order number') + L.value(v.orderNumber || 'not given')
    ),
  ].join('');

  const body = [
    L.section(L.heading('New contact-form message.') + L.lede(L.esc(lede)), { pad: '32px 32px 20px' }),
    L.rule(),
    L.section(rows, { pad: '22px 32px' }),
    L.rule(),
    L.section(L.label('Message') + quoteBlock(v.message), { pad: '22px 32px' }),
    L.rule(),
    L.section(
      L.button(`${site.origin()}/admin/messages`, 'Open it in the admin')
      + L.paragraph('Or just hit reply — this email\'s Reply-To is the customer\'s own address, so your answer goes straight to them. Replying that way does not mark the message answered in the admin; the reply box there does.', { size: 13, top: 16 }),
      { pad: '26px 32px 30px' }
    ),
  ].join('');

  /* The topic and the name go in the subject because this lands in a
     mailbox alongside every order confirmation: "New message" alone is
     unsortable and unsearchable a week later. */
  const subject = `Contact form: ${topic} — ${v.name || v.email}`;

  return {
    subject,
    html: L.document({ title: subject, preheader: lede, body }),
    text: L.textDocument([
      'NEW CONTACT-FORM MESSAGE',
      '',
      `From:   ${v.name || '—'} <${v.email}>`,
      `Topic:  ${topic}`,
      v.orderNumber ? `Order:  ${v.orderNumber}` : null,
      '',
      'MESSAGE',
      '',
      String(v.message || ''),
      '',
      `Open in the admin: ${site.origin()}/admin/messages`,
      'Or reply to this email — it goes straight to the customer.',
    ].filter((line) => line !== null)),
  };
}

/* ── To the customer: our answer ────────────────────────── */

function supportReply(v) {
  const lede = v.name
    ? `${v.name}, thanks for writing to us. Here is our answer.`
    : 'Thanks for writing to us. Here is our answer.';

  const body = [
    L.section(L.heading('Re: your message.') + L.lede(L.esc(lede)), { pad: '32px 32px 22px' }),
    L.rule(),
    L.section(quoteBlock(v.reply), { pad: '24px 32px' }),
    L.rule(),
    /* Their own words, underneath. A reply to something sent days ago is
       hard to place without them, and the customer may have written to
       several shops in the same week. */
    L.section(
      L.label('You wrote') + quoteBlock(v.message),
      { pad: '22px 32px', alt: true }
    ),
    L.rule(),
    L.section(
      L.paragraph(`Still need a hand? Reply to this email and it reaches us, or write to ${L.link('mailto:' + company.business.supportEmail, company.business.supportEmail)}.`, { size: 13 }),
      { pad: '22px 32px 28px' }
    ),
  ].join('');

  const subject = 'Re: your message to GoGetCards';

  return {
    subject,
    html: L.document({ title: subject, preheader: lede, body }),
    text: L.textDocument([
      'RE: YOUR MESSAGE TO GOGETCARDS',
      '',
      lede,
      '',
      String(v.reply || ''),
      '',
      '---',
      'YOU WROTE',
      '',
      String(v.message || ''),
      '',
      `Reply to this email, or write to ${company.business.supportEmail}.`,
    ]),
  };
}

module.exports = {
  contactReceived: { build: contactReceived },
  supportReply: { build: supportReply },
};
