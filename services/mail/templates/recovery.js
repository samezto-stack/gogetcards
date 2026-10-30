/**
 * The six checkout reminders.
 *
 * ONE BUILDER, SIX TONES — the same reason order.js keeps its two
 * confirmations together. Six separate files describing the same order
 * would drift, and the drift would be in the numbers.
 *
 * WHAT THESE ARE NOT. No discount, no coupon, no "price going up", no
 * "only N left", no countdown. The customer already decided to buy; the
 * job is to remove the friction that stopped them, not to invent a reason
 * to hurry. Fabricated scarcity on a preorder is also a factual claim
 * about allocation that nobody here can stand behind.
 *
 * THE SEQUENCE GETS SHORTER, NOT LOUDER. Reminder 1 assumes they were
 * interrupted and barely explains itself. By 5 and 6 the customer has
 * seen the details four times, so the later mails drop to the product,
 * the price and the button. The last one says it is the last one, which
 * is both a courtesy and the thing that stops it reading like a machine
 * that will never shut up.
 *
 * `total` IS IN CENTS, like every other template here, because that is
 * what L.money() expects and what Product.price stores. The view builder
 * in services/mail/recoveryLifecycle.js does the conversion once.
 *
 * EVERY ONE CARRIES AN UNSUBSCRIBE. Passed through to layout.document(),
 * which swaps the transactional footer for the commercial one.
 */

const L = require('./layout');

/**
 * A product title cut down to fit in a subject line.
 *
 * TCG product titles in this catalogue are long by nature — set, product
 * type, language, print run, all of it load-bearing on a product page.
 * "Magic: The Gathering | The Lord of the Rings: Tales of Middle-earth
 * Collector Booster Display Box (Sealed, English, 1st Print Run)" is 137
 * characters on its own, and dropped whole into a subject it produced a
 * 163-character line. Every mail client truncates it: Gmail's web list
 * shows roughly 70, iOS Mail around 35, so the customer sees the shop's
 * template wording and none of the part that identifies their order.
 *
 * Cut at a word boundary rather than mid-word, and only when it actually
 * overflows, so a short title is untouched. The full title is still in the
 * body — this shortens what a subject line was never going to show anyway.
 */
function shortTitle(title, max) {
  const t = String(title || '').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  /* Only honour a word boundary that is not absurdly early; a title with
     no spaces in its first max chars is cut hard rather than gutted. */
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

/* Tone per step. `detail` controls how much of the order is restated:
   'full' shows the line item, totals and fulfilment; 'brief' shows the
   line item and total; 'minimal' shows one line.

   Each subject that interpolates a title budgets for it, so the finished
   line lands near 70 characters — what a mail client actually displays —
   instead of being however long the product happens to be named. */
const STEPS = {
  1: {
    subject: (v) => `Your ${shortTitle(v.title, 52)} checkout is saved`,
    heading: 'Your checkout is saved.',
    lede: (v) =>
      v.firstName
        ? `${v.firstName}, you were part-way through checking out. Everything is still here.`
        : `You were part-way through checking out. Everything is still here.`,
    detail: 'full',
    cta: 'Return to checkout',
  },
  2: {
    subject: (v) => `Still interested in ${shortTitle(v.title, 56)}?`,
    heading: 'Your order is waiting.',
    lede: () => `Here is what you had in your checkout. Nothing has been charged.`,
    detail: 'full',
    cta: 'Return to checkout',
  },
  3: {
    subject: (v) => `Your checkout is still available`,
    heading: 'Your checkout is still available.',
    lede: () =>
      `You can pick it up where you left off. Your details are already filled in.`,
    detail: 'full',
    cta: 'Return to checkout',
  },
  4: {
    subject: () => `Still thinking it over?`,
    heading: 'Still thinking it over?',
    lede: () =>
      `Your saved checkout is below. If you have a question before ordering, replying to this email reaches a person.`,
    detail: 'brief',
    cta: 'Return to checkout',
  },
  5: {
    subject: (v) => `${shortTitle(v.title, 60)} — your checkout`,
    heading: 'Your checkout, one more time.',
    lede: () => `Still saved, still nothing charged.`,
    detail: 'minimal',
    cta: 'Return to checkout',
  },
  6: {
    subject: () => `Last reminder about your checkout`,
    heading: 'Last reminder.',
    lede: () =>
      `This is the final email about this checkout. We will not send any more about it.`,
    detail: 'minimal',
    cta: 'Return to checkout',
  },
};

function build(step, v) {
  const cfg = STEPS[step];
  if (!cfg) throw new Error(`recovery: unknown step ${step}`);

  const preorder = !!v.isPreorder;
  const subject = cfg.subject(v);
  const lede = cfg.lede(v);

  const body = [];

  body.push(
    L.section(L.heading(cfg.heading) + L.lede(L.esc(lede)), { pad: '32px 32px 24px' }),
    L.rule()
  );

  /* ── What they were buying ── */
  body.push(
    L.section(
      L.lineItem({
        image: v.image,
        title: v.title,
        quantity: v.quantity,
        price: v.total,
        currency: v.currency,
        note: preorder
          ? (v.release.hasDate ? `Preorder &middot; releases ${v.release.display}` : 'Preorder')
          : 'Factory sealed',
      }),
      { pad: '24px 32px' }
    )
  );

  /* ── Totals. Shown while the detail level justifies it; the total
       itself is never hidden, because the price is the single thing a
       reminder must not make somebody go and look up. ── */
  if (cfg.detail === 'full') {
    body.push(
      L.rule(),
      L.section(
        L.totals([
          L.totalRow('Subtotal', L.money(v.total, v.currency)),
          L.totalRow('Shipping', 'Free', { good: true }),
          L.totalRow('Taxes', 'Included'),
          L.totalRow('Total', L.money(v.total, v.currency), { strong: true }),
        ]),
        { pad: '22px 32px' }
      )
    );
  } else {
    body.push(
      L.rule(),
      L.section(
        L.totals([L.totalRow('Total', L.money(v.total, v.currency), { strong: true })]),
        { pad: '20px 32px' }
      )
    );
  }

  /* ── The button. Returns them to the checkout; it never pays. ── */
  body.push(
    L.rule(),
    L.section(
      L.button(v.recoveryUrl, cfg.cta) +
        L.paragraph(
          'This link takes you back to your checkout. Nothing is charged until you complete payment yourself.'
        ),
      { pad: '26px 32px' }
    )
  );

  /* ── Fulfilment, on the mails that still explain themselves. Preorder
       terms are the commonest reason a TCG checkout stalls, so they are
       worth restating early and dropping later. ── */
  if (cfg.detail === 'full' && preorder) {
    body.push(
      L.rule(),
      L.section(
        L.label('Preorder terms') +
          L.paragraph(
            v.release.hasDate
              ? `Released ${L.esc(v.release.display)}. Payment is collected when you order, and it ships within two business days of release.`
              : `Payment is collected when you order, and it ships within two business days of release. We email you as soon as the date is confirmed.`
          ) +
          L.paragraph('Free tracked shipping. Cancel any time before dispatch for a full refund.'),
        { pad: '22px 32px 28px' }
      )
    );
  } else if (cfg.detail === 'full') {
    body.push(
      L.rule(),
      L.section(
        L.label('Shipping') +
          L.paragraph('Free tracked shipping, dispatched within one business day of your order.'),
        { pad: '22px 32px 28px' }
      )
    );
  }

  const text = L.textDocument(
    [
      cfg.heading.toUpperCase().replace(/\.$/, ''),
      '',
      lede,
      '',
      v.title,
      `Quantity ${v.quantity}`,
      preorder && v.release.hasDate ? `Preorder - releases ${v.release.display}` : null,
      '',
      `Total  ${L.money(v.total, v.currency)}`,
      cfg.detail === 'full' ? 'Shipping free, taxes included.' : null,
      '',
      'RETURN TO CHECKOUT',
      v.recoveryUrl,
      'Nothing is charged until you complete payment yourself.',
      '',
      cfg.detail === 'full' && preorder
        ? 'Preorder: payment is collected when you order and it ships within two business days of release. Cancel any time before dispatch for a full refund.'
        : null,
      '',
      'To stop these reminders:',
      v.unsubscribeUrl,
    ].filter((line) => line !== null)
  );

  return {
    subject,
    html: L.document({
      title: subject,
      preheader: lede,
      body,
      unsubscribeUrl: v.unsubscribeUrl,
    }),
    text,
  };
}

module.exports = {
  recoveryReminder1: { build: (v) => build(1, v) },
  recoveryReminder2: { build: (v) => build(2, v) },
  recoveryReminder3: { build: (v) => build(3, v) },
  recoveryReminder4: { build: (v) => build(4, v) },
  recoveryReminder5: { build: (v) => build(5, v) },
  recoveryReminder6: { build: (v) => build(6, v) },
  STEPS,
};
