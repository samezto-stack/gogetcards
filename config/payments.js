/**
 * The payment methods this store actually accepts, in one place.
 *
 * WHY THIS EXISTS: the site advertised PayPal in five separate places
 * ("Secure PayPal Checkout" on every product page, "PayPal protected
 * payment" in the trust bar, a badge in the footer and again in the cart,
 * and a contact FAQ answer naming it), plus Apple Pay, Google Pay and
 * Klarna badges, none of which were tied to what checkout actually
 * renders.
 *
 * This is not a cosmetic detail. Google Merchant Center treats an
 * advertised payment method the buyer cannot use as a Misrepresentation
 * violation, and a reviewer reaching the payment step and finding no
 * PayPal button is exactly how that gets found.
 *
 * Every surface that shows payment information reads from here — the badge
 * row, the trust bar, the checkout chips, the FAQ answer, the Payment
 * Information page and the Organization schema — so a method cannot be
 * advertised on one page and absent from another.
 *
 * THE CURRENT LIST reflects what the Whop checkout presents, which is the
 * mode this store runs on: the three card networks, Apple Pay and Google
 * Pay as wallet buttons, and bank transfer. It is confirmed by what the
 * live payment page shows, not inferred.
 *
 * BEFORE ADDING ANYTHING HERE: an entry is a claim, not a decoration. It
 * must be something you have watched appear on a real payment page. Two
 * things in particular do NOT belong unless verified — PayPal, which was
 * advertised here for a long time and never offered, and any
 * buy-now-pay-later brand, which Google scrutinises separately.
 *
 * If the active checkout mode changes (Shopify rotator or Stripe payment
 * links instead of Whop), re-check this list. The three card networks hold
 * across all three modes; the wallets and bank transfer do not
 * automatically.
 */

/* Each method carries its own inline SVG rather than a remote badge
   sprite: a third-party image that 404s reads as a broken site to a
   reviewer, and an inline mark costs no request. All are drawn on a
   38x24 card so the row aligns regardless of which methods are enabled.

   White card faces on purpose. That is how real payment badges render
   (Stripe's and Shopify's both do it), and against this site's dark footer
   it is what makes them read as payment marks rather than as decoration. */
const METHODS = [
  {
    id: 'visa',
    label: 'Visa',
    svg: '<svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="Visa"><rect width="38" height="24" rx="4" fill="#fff"/><path d="M16.28 16.4h-2.06l1.29-7.93h2.06l-1.29 7.93zm7.46-7.74a5.1 5.1 0 00-1.85-.34c-2.03 0-3.47 1.08-3.48 2.63-.01 1.14 1.02 1.78 1.8 2.16.8.39 1.07.64 1.07 1-.01.53-.65.78-1.24.78-.82 0-1.26-.12-1.93-.41l-.27-.13-.29 1.78c.48.22 1.37.41 2.29.42 2.16 0 3.57-1.06 3.58-2.71.01-.9-.54-1.59-1.72-2.16-.72-.37-1.16-.61-1.16-.99 0-.33.38-.68 1.18-.68.67-.01 1.16.14 1.53.3l.19.09.3-1.74zm5.3-.19h-1.59c-.5 0-.87.14-1.08.66l-3.06 7.27h2.16l.43-1.19h2.64l.25 1.19h1.91l-1.66-7.93zm-2.55 5.11l.82-2.2.19-.54.15.5.47 2.24h-1.63zM12.6 8.47l-2.02 5.41-.21-1.1c-.38-1.27-1.55-2.65-2.87-3.34l1.85 6.96h2.18l3.24-7.93H12.6z" fill="#1434CB"/><path d="M8.73 8.47H5.43l-.03.19c2.58.66 4.29 2.25 5 4.16l-.72-3.66c-.13-.5-.49-.66-.95-.69z" fill="#F7A823"/></svg>',
  },
  {
    id: 'mastercard',
    label: 'Mastercard',
    svg: '<svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="Mastercard"><rect width="38" height="24" rx="4" fill="#fff"/><circle cx="15.2" cy="12" r="6.4" fill="#EB001B"/><circle cx="22.8" cy="12" r="6.4" fill="#F79E1B"/><path d="M19 6.93a6.39 6.39 0 000 10.14 6.39 6.39 0 000-10.14z" fill="#FF5F00"/></svg>',
  },
  {
    id: 'amex',
    label: 'American Express',
    svg: '<svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="American Express"><rect width="38" height="24" rx="4" fill="#1F72CD"/><path d="M6.6 9.1L3.9 15h2.06l.42-1.03h2.15L8.95 15h2.13l-.02-4.35L12.7 15h1.55l1.65-4.36V15h1.83V9.1h-3.02l-1.2 3.36L12.3 9.1H6.6zm.86 1.53l.66 1.63H6.8l.66-1.63zM19.6 9.1V15h4.94v-1.44h-3.1v-.86h3.03v-1.4h-3.03v-.78h3.1V9.1H19.6zm5.62 0l2.19 2.93L25.16 15h2.21l1.3-1.85L29.95 15h2.28l-2.28-2.99L32.2 9.1h-2.2l-1.25 1.83L27.5 9.1h-2.28z" fill="#fff"/></svg>',
  },
  {
    id: 'applepay',
    label: 'Apple Pay',
    svg: '<svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="Apple Pay"><rect width="38" height="24" rx="4" fill="#fff" stroke="#E6E6E6"/><path d="M11.9 8.9c.33-.4.55-.96.49-1.52-.47.02-1.04.31-1.38.71-.3.34-.56.9-.49 1.44.53.04 1.05-.26 1.38-.63zm.48.76c-.76-.05-1.41.43-1.77.43-.37 0-.93-.41-1.53-.4-.79.01-1.51.46-1.91 1.16-.82 1.41-.21 3.5.58 4.65.39.56.85 1.19 1.46 1.17.59-.02.81-.38 1.52-.38.72 0 .92.38 1.54.37.64-.01 1.04-.57 1.42-1.14.45-.65.64-1.28.65-1.31-.02-.01-1.24-.48-1.25-1.88-.01-1.17.96-1.73 1-1.76-.55-.81-1.4-.9-1.71-.91z" fill="#000"/><path d="M18.5 8.6h2.38c1.35 0 2.29.93 2.29 2.28s-.96 2.29-2.33 2.29h-1.5v2.36H18.5V8.6zm.84 1.16v2.25h1.24c.94 0 1.47-.5 1.47-1.12 0-.62-.53-1.13-1.47-1.13h-1.24zm4.63 4.36c0-.87.66-1.4 1.85-1.47l1.32-.08v-.37c0-.54-.36-.85-.98-.85-.57 0-.95.27-1.04.7h-.94c.05-.9.82-1.56 2.01-1.56 1.17 0 1.92.62 1.92 1.58v3.31h-.9v-.79h-.02c-.27.53-.87.87-1.5.87-.98 0-1.72-.6-1.72-1.44zm3.17-.45v-.38l-1.19.07c-.59.04-.93.3-.93.72 0 .43.35.71.89.71.7 0 1.23-.48 1.23-1.12zm1.72 4.03v-.74c.07.02.23.02.31.02.44 0 .68-.19.83-.67l.09-.28-1.65-4.57h1l1.15 3.71h.02l1.15-3.71h.97l-1.71 4.81c-.39 1.11-.84 1.46-1.79 1.46-.08 0-.31 0-.37-.03z" fill="#000"/></svg>',
  },
  {
    id: 'googlepay',
    label: 'Google Pay',
    svg: '<svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="Google Pay"><rect width="38" height="24" rx="4" fill="#fff" stroke="#E6E6E6"/><path d="M18.1 12.24v2.72h-.87V8.24h2.29c.55 0 1.03.19 1.42.56.4.37.6.83.6 1.36 0 .55-.2 1-.6 1.37-.39.37-.86.55-1.42.55h-1.42v.16zm0-3.17v2.18h1.44c.33 0 .6-.11.81-.33.22-.22.33-.48.33-.77 0-.28-.11-.54-.33-.76a1.08 1.08 0 00-.81-.32H18.1z" fill="#5F6368"/><path d="M22.65 10.13c.64 0 1.15.17 1.52.51.37.35.56.82.56 1.41v2.91h-.83v-.64h-.04c-.36.53-.84.79-1.44.79-.51 0-.94-.15-1.28-.45a1.45 1.45 0 01-.52-1.14c0-.48.18-.86.55-1.15.36-.28.85-.42 1.46-.42.52 0 .95.09 1.28.28v-.2c0-.3-.11-.55-.35-.75a1.2 1.2 0 00-.82-.31c-.47 0-.85.2-1.12.6l-.77-.48c.41-.64 1.02-.96 1.8-.96zm-1.12 3.41c0 .22.09.41.28.56.19.15.41.22.66.22.36 0 .68-.13.96-.4.28-.26.42-.58.42-.94-.27-.21-.64-.32-1.12-.32-.35 0-.64.09-.87.25-.22.17-.33.38-.33.63z" fill="#5F6368"/><path d="M29.5 10.28l-2.88 6.63h-.9l1.07-2.32-1.9-4.31h.95l1.37 3.31h.02l1.33-3.31h.94z" fill="#5F6368"/><path d="M14.9 11.66c0-.28-.02-.55-.07-.81h-3.4v1.53h1.95a1.67 1.67 0 01-.72 1.1v.91h1.17c.68-.63 1.07-1.56 1.07-2.73z" fill="#4285F4"/><path d="M11.43 15.18c.97 0 1.79-.32 2.39-.87l-1.17-.91c-.32.22-.74.35-1.22.35-.94 0-1.73-.63-2.02-1.48H8.21v.94a3.61 3.61 0 003.22 1.97z" fill="#34A853"/><path d="M9.41 12.27a2.17 2.17 0 010-1.38v-.94H8.21a3.62 3.62 0 000 3.26l1.2-.94z" fill="#FBBC04"/><path d="M11.43 9.44c.53 0 1.01.18 1.38.54l1.04-1.03a3.6 3.6 0 00-5.64.94l1.2.94c.29-.85 1.08-1.39 2.02-1.39z" fill="#EA4335"/></svg>',
  },
  {
    id: 'banktransfer',
    label: 'Bank transfer',
    svg: '<svg width="38" height="24" viewBox="0 0 38 24" role="img" aria-label="Bank transfer"><rect width="38" height="24" rx="4" fill="#fff" stroke="#E6E6E6"/><path d="M19 5.6l7 3.4v1.2H12V9l7-3.4z" fill="#3C4257"/><rect x="13.6" y="11.4" width="1.9" height="5" fill="#3C4257"/><rect x="18.05" y="11.4" width="1.9" height="5" fill="#3C4257"/><rect x="22.5" y="11.4" width="1.9" height="5" fill="#3C4257"/><rect x="12" y="17.3" width="14" height="1.5" rx="0.4" fill="#3C4257"/></svg>',
  },
];

/** Plain-language list, e.g. "Visa, Mastercard and American Express". */
function methodsSentence() {
  const labels = METHODS.map((m) => m.label);
  if (labels.length <= 1) return labels[0] || '';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/** Just the card networks, for copy that is specifically about cards. */
const CARD_LABELS = METHODS.filter((m) => ['visa', 'mastercard', 'amex'].includes(m.id)).map((m) => m.label);

module.exports = {
  METHODS,
  methodsSentence,

  /* Short strings reused across templates so the wording itself cannot
     drift page to page. "Processed by" names no specific processor: the
     active one depends on the checkout mode, and naming the wrong one is
     the same misrepresentation in a different coat. */
  copy: {
    accepted: `We accept ${methodsSentence()}.`,
    cardsOnly: `${CARD_LABELS.slice(0, -1).join(', ')} and ${CARD_LABELS[CARD_LABELS.length - 1]}`,
    secureCheckout: 'Secure checkout',
    secureCheckoutSub: 'Encrypted, processed off-site',
    // schema.org Organization.paymentAccepted expects a comma-separated list.
    schemaPaymentAccepted: METHODS.map((m) => m.label).join(', '),
  },
};
