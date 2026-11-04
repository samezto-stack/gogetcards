/**
 * The store's answers to the questions a buyer (and a Merchant Center
 * reviewer) asks before ordering, in one place.
 *
 * WHY THIS EXISTS: these answers were hardcoded inside views/pages/contact.ejs
 * as a template-local array, so nothing else could reach them. Two problems
 * came out of that. The payment answer named PayPal, which this store does
 * not offer, with no connection to the badge row claiming the same thing
 * elsewhere. And the questions carried no FAQPage markup, so the one page
 * that directly answers Google's trust questions was invisible as
 * structured data.
 *
 * Both the rendered accordion and the FAQPage JSON-LD are built from this
 * array, so the visible answer and the marked-up answer are the same string
 * by construction. Google issues manual actions for FAQPage markup that
 * does not match the visible page, so that is not a nicety.
 *
 * Every answer must be something the store genuinely does. These are read
 * as commitments by customers and as policy statements by reviewers.
 */

const payments = require('./payments');
const shipping = require('./shipping');
const company = require('./company');

const RETURN_WINDOW_DAYS = 14;

/* Who pays return postage.
 *
 * Set true when the store covers it on EVERY return, including change of
 * mind. Google's return-policy setup offers no "customer pays" label
 * option, so declaring free returns there and charging for them here would
 * be a policy the shopper is shown and then refused — the mismatch class
 * that causes trouble. One flag, so the Refund Policy, the FAQ and the
 * MerchantReturnPolicy markup cannot say different things.
 *
 * NOTE THE COST. Every surface below promises it unconditionally, on a
 * catalogue where a single case is four figures. Flip this back to false
 * and the copy reverts everywhere at once. */
const FREE_RETURNS = true;

/** @returns {{q: string, a: string}[]} */
function faqs() {
  const b = company.business;
  const responseTime = b.responseTimeHours
    ? `within ${b.responseTimeHours} hours`
    : 'as quickly as we can';

  return [
    {
      q: 'Are your products guaranteed to be factory sealed?',
      a: 'Yes. Everything we list is sealed product sourced through authorized distribution, and it reaches you exactly as it left the manufacturer. We do not open, weigh, search or reseal anything. If a seal is damaged in transit, that is covered under our returns policy.',
    },
    {
      q: 'How do preorders work?',
      a: `A preorder reserves you a unit from our distributor allocation at the price shown on the day you order. Payment is taken in full at checkout, not on release day. We dispatch as soon as the product reaches us: on the publisher's release date, or within ${shipping.preorderBusinessDaysAfterRelease} business days of it. The expected shipping window is stated on every preorder listing.`,
    },
    {
      q: 'What happens if a preorder is delayed or my allocation is cut?',
      a: 'Release dates are set by the publisher and do move. If a date shifts we email you with the new one, and you can wait or cancel for a full refund. If our distributor reduces our allocation and we cannot fill your order, we refund you in full and tell you as soon as we know. We never substitute a different product without asking you first.',
    },
    {
      q: 'Can I cancel a preorder?',
      a: 'Yes, at any time before it ships, for a full refund to your original payment method. Email us and we will process it. Once a preorder has been dispatched it is treated as a normal order under the returns policy below.',
    },
    {
      q: `What is your return policy?`,
      a: `You can return unopened, still-sealed product within ${RETURN_WINDOW_DAYS} days of delivery for a refund. If an item arrives damaged or is not what you ordered, we cover return shipping and you choose between a replacement and a full refund. ${FREE_RETURNS ? 'Changed your mind? We cover the return postage on that too.' : 'For a change of mind, the return postage is yours.'} Full detail is on our Refund Policy page.`,
    },
    {
      q: 'What if my order arrives damaged?',
      a: 'Email us within 48 hours of delivery with photographs of the outer box and the product. We will arrange a replacement or a full refund, whichever you prefer, and we pay the return postage. We photograph orders before dispatch, so we can usually tell straight away whether damage happened in transit.',
    },
    {
      q: 'How much is shipping, and where do you ship?',
      a: `${shipping.copy.long}. There is no threshold to reach and no cheaper untracked option to decline: every order goes tracked, at our cost, wherever you are. ${shipping.copy.dutiesCaveat} Those are not our charges and we never collect them.`,
    },
    {
      q: 'How long until my order ships?',
      a: 'In-stock orders are dispatched within one business day. You get a tracking number by email the moment the label is created. Preorders ship when the product is released, not when you order.',
    },
    {
      q: 'What payment methods do you accept?',
      a: `${payments.copy.accepted} Whichever you choose, the payment itself happens on our payment provider's own encrypted page: card numbers, wallet tokens and bank details never reach our servers and we never see them. Apple Pay and Google Pay appear as buttons on that page when your device supports them. All prices are shown and charged in ${b.currency}.`,
    },
    {
      q: 'How do I contact you, and how quickly will you reply?',
      a: `Use the form on this page or email ${b.supportEmail}. We answer ${responseTime}${b.supportHours ? `, ${b.supportHours.charAt(0).toLowerCase()}${b.supportHours.slice(1)}` : ''}. Include your order number if you have one and it will be faster.`,
    },
  ];
}

/** FAQPage JSON-LD built from the same array the page renders. */
function faqSchema(url) {
  return {
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: faqs().map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

module.exports = { faqs, faqSchema, RETURN_WINDOW_DAYS, FREE_RETURNS };
