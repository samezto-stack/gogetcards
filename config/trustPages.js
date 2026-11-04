/**
 * The store's trust and policy pages, written out in full.
 *
 * WHY THESE ARE IN CODE RATHER THAN THE DATABASE: the policy pages used to
 * be Page documents seeded once and edited through the admin. Three
 * problems came from that. Their content could contradict the rest of the
 * site with nothing to catch it (they named PayPal as a processor for
 * years after PayPal stopped being offered, and published a shipping rate
 * table that disagreed with both the announcement bar and the Offer
 * schema). They carried no structured data. And a fresh deploy and a
 * running store could hold different text with no way to tell.
 *
 * Facts that appear elsewhere on the site are interpolated from config
 * (shipping, payments, faq, company) rather than retyped, so a policy page
 * cannot state a return window, a payment method or a shipping promise the
 * rest of the site contradicts. That property is the entire point: Google
 * Merchant Center's Misrepresentation criteria are largely about internal
 * consistency, and a reviewer's method is to compare one page against
 * another.
 *
 * ON TONE: these are written to be read, not to pad a word count. Real
 * commitments, plainly stated, with the awkward parts included rather than
 * omitted — what happens when an allocation is cut, who pays return
 * postage on a change of mind, why we will not undervalue a customs
 * declaration. A policy page that only lists what the customer gains reads
 * as marketing and is treated as such.
 *
 * Every claim here must be something the store genuinely does.
 */

const shipping = require('./shipping');
const payments = require('./payments');
const company = require('./company');
const { RETURN_WINDOW_DAYS, FREE_RETURNS } = require('./faq');

const b = company.business;
const RETURN_DAYS = RETURN_WINDOW_DAYS;
const DAMAGE_REPORT_HOURS = 48;

/* Every page's last-reviewed date. A single constant rather than a date
   per page: policy pages carrying different "last updated" stamps look
   like some were forgotten, and bumping one by hand while editing another
   is how that happens. */
const LAST_REVIEWED = 'February 2026';

/** Shorthand for a section: a heading and its body blocks. */
const s = (heading, ...blocks) => ({ heading, blocks });
/** A paragraph. */
const p = (text) => ({ type: 'p', text });
/** An unordered list. */
const ul = (...items) => ({ type: 'ul', items });
/** A definition list: [term, description] pairs. */
const dl = (...pairs) => ({ type: 'dl', pairs });
/** A callout box for the one thing on the page that must not be missed. */
const note = (text) => ({ type: 'note', text });

const PAGES = {
  /* ── Guarantees ──────────────────────────────────────── */

  'authenticity-guarantee': {
    title: 'Authenticity Guarantee',
    nav: 'Authenticity Guarantee',
    group: 'guarantees',
    description:
      'How GoGetCards sources sealed trading card product, what our authenticity guarantee covers, and what happens if a product is ever not what we said it was.',
    intro:
      'Counterfeit and resealed sealed product is the single biggest risk in this category, and the honest answer to "how do I know this is real" is not a badge on a website. It is where the product came from.',
    sections: [
      s('Where our stock comes from',
        p('Every product we list is bought through authorized distribution: the distributors that publishers and manufacturers supply directly. We do not buy sealed product on the secondary market, from liquidation lots, from unverified private sellers, or from marketplaces where provenance cannot be established.'),
        p('That is a commercial constraint as much as an ethical one. It means we sometimes cannot get a set that is trading well, and we would rather list nothing than list something whose history we cannot account for.')),
      s('What the guarantee covers',
        ul(
          'Every product is genuine, manufacturer-produced stock, sold in the condition described on its listing.',
          'Every sealed product arrives factory sealed. We do not open, weigh, search, resell singles from, or reseal anything we ship.',
          'The language and edition stated on the listing is the language and edition you receive. Japanese product is labelled Japanese; English product is labelled English.',
          'The set and product configuration match the listing. A booster box contains the manufacturer\'s stated pack count; a case contains the manufacturer\'s stated box count.',
        )),
      s('If we ever get it wrong',
        p(`If a product you receive from us is not genuine, or is not the language, edition or configuration the listing described, we will refund you in full including all postage, and we will pay the return shipping. That applies with no time limit — not ${RETURN_DAYS} days, not a year. If we sold you something that was not what we said it was, that is ours to fix whenever it comes to light.`),
        p(`Email ${b.supportEmail} with your order number and photographs. We will tell you what we think and what we intend to do about it within ${b.responseTimeHours} hours.`)),
      s('What we will not claim',
        p('We do not grade, authenticate or certify individual cards, and we do not guarantee what is inside a sealed product. Pull rates are set by the manufacturer and are a matter of chance. Nobody can promise you a hit, and any seller who does is telling you something they cannot know.'),
        p('We also do not describe ourselves as an official, authorized or licensed retailer of any publisher. We are an independent retailer that buys through authorized distribution, which is a different and smaller claim, and it is the true one.')),
    ],
  },

  'factory-sealed-guarantee': {
    title: 'Factory-Sealed Guarantee',
    nav: 'Factory-Sealed Guarantee',
    group: 'guarantees',
    description:
      'What "factory sealed" means at GoGetCards, how we handle sealed product, and what to do if a seal arrives damaged.',
    intro:
      '"Factory sealed" is used loosely across this hobby. Here is exactly what we mean by it, and what we do to make sure it stays true between our supplier and your door.',
    sections: [
      s('What factory sealed means here',
        p('The product left the manufacturer sealed and has not been opened by anybody since. Not by the distributor, not by us, not by a previous owner. The shrink wrap or factory seal you receive is the one the manufacturer applied.'),
        p('It specifically excludes anything that has been opened and re-wrapped, however well. Resealing is common enough in this category that the word "sealed" on its own has stopped meaning much, which is why we are spelling it out.')),
      s('How we handle sealed stock',
        ul(
          'Product moves from our distributor into our storage and out to you. We do not open cases to split them unless the listing says the item is a single box from a case, in which case the box itself is still sealed.',
          'We do not weigh boxes or packs. Weighing is how searched product gets identified and it is also how it gets created; we have no interest in either.',
          'Stock is stored away from direct sunlight and away from damp. Sealed cardboard warps, and a warped box is a damaged box even if nobody opened it.',
          'Orders are photographed before they are packed, so if a seal is damaged in transit we can usually tell that it left us intact.',
        )),
      s('If a seal arrives damaged',
        note(`Photograph the outer carton and the product before you unwrap anything further, and email ${b.supportEmail} within ${DAMAGE_REPORT_HOURS} hours of delivery.`),
        p('Transit damage is our problem, not yours. We will replace the item if we have another, or refund you in full if we do not, and we pay the return postage either way. You do not need to argue the point with us and you do not need to deal with the carrier yourself.'),
        p(`The ${DAMAGE_REPORT_HOURS}-hour window exists because carriers give us a limited period to file a claim, not to catch you out. If you were away and opened the parcel late, tell us and we will still sort it out.`)),
    ],
  },

  /* ── Preorders ───────────────────────────────────────── */

  'preorder-policy': {
    title: 'Preorder Policy',
    nav: 'Preorder Policy',
    group: 'buying',
    description:
      'How preorders work at GoGetCards: when you are charged, when the product ships, what happens if the publisher moves the release date, and how to cancel.',
    intro:
      'A preorder is a promise about something that does not exist yet, so the terms matter more than they do on an in-stock order. All of them are here, including the ones that are not in our favour.',
    sections: [
      s('When you are charged',
        note('Your card is charged in full at checkout, not on release day.'),
        p('That payment is what reserves your unit against our distributor allocation. Distributors require us to commit to quantities well before release, and we are paying for that commitment at the time you place the order.'),
        p('If you would rather not pay months ahead of delivery, do not preorder. Wait for release and buy from stock. We would rather say that plainly than have you find out at the wrong moment.')),
      s('When it ships',
        p(`Sealed product cannot legally leave a distributor before the publisher's street date, so nothing ships early, from us or from anyone. We dispatch as soon as stock reaches us: on the publisher's release date, or within ${shipping.DISPATCH.preorderBusinessDaysAfterRelease} business days of it.`),
        p(`Every preorder listing states the release date where the publisher has announced one, and an expected dispatch window. Delivery then takes the usual time for your destination — see the ${'Shipping & Delivery'} page.`)),
      s('Price',
        p('You pay the price shown on the day you order, and it does not change. If the market price rises before release, yours is fixed. If we lower the price before release, we refund you the difference without being asked; you do not have to notice and email us.')),
      s('If the publisher moves the date',
        p('Release dates slip, and that decision belongs to the publisher, not to us. When a date moves we email everyone holding a preorder with the new one as soon as we have it.'),
        p('You can then wait, or cancel for a full refund. There is no penalty for cancelling because of a delay, and there is no time limit on that choice: as long as it has not shipped, you can change your mind.')),
      s('If our allocation is cut',
        p('Distributors sometimes reduce what they send us after preorders have opened, particularly on sets that sell through hard. If that happens and we cannot fill your order, we refund you in full and tell you as soon as we know rather than waiting to see whether more stock appears.'),
        p('We never substitute a different product without asking you first, and we never quietly convert an unfillable preorder into store credit. A refund goes back to the card you paid with.'),
        p('How we decide who gets a reduced allocation is set out on the Allocation Policy page.')),
      s('Cancelling',
        p('Email us at any point before your preorder has been dispatched and we will refund the full amount to your original payment method. No fee, no restocking charge, and no explanation required.'),
        p(`Once a preorder has shipped it is an ordinary order, and the standard ${RETURN_DAYS}-day return terms on the Refund & Return Policy page apply instead.`)),
    ],
  },

  'allocation-policy': {
    title: 'Allocation Policy',
    nav: 'Allocation Policy',
    group: 'buying',
    description:
      'How GoGetCards allocates limited sealed product, what per-customer limits are for, and what happens when a distributor reduces our allocation.',
    intro:
      'Sealed product on a hot set is allocated, not simply ordered. Distributors decide how much we get, and sometimes they revise it downward after we have already taken preorders. This is how we handle that.',
    sections: [
      s('How much we can offer',
        p('Our allocation for a given set is set by our distributor, based on our purchase history and their own supply. We list what we have been allocated. We do not list quantities we hope to be allocated, and we do not take open-ended preorders on the assumption that more will arrive.'),
        p('When a listing shows a remaining figure on a preorder, that is what is left of our allocation, not warehouse stock. We word it that way on purpose: an unreleased product has no warehouse stock, and describing it as though it does would be misleading.')),
      s('Per-customer limits',
        p('Some listings carry a limit on how many units one customer can buy. The limit is shown on the product page and enforced at checkout.'),
        p('The purpose is to get product to people who want to open or keep it rather than to whoever automates the fastest. We are not going to pretend this is perfectly effective, but a limit plus manual review catches most of it.')),
      s('If our allocation is reduced',
        p('If a distributor cuts what they send us after preorders have opened, orders are filled in the sequence they were placed. Earliest order, first unit.'),
        ul(
          'Anyone we cannot fill is refunded in full, to the original payment method, and told as soon as we know.',
          'We do not part-fill a multi-unit order without asking. If you ordered three and we can supply one, we will contact you and let you decide.',
          'We do not offer a different set as a substitute unless you ask for one.',
          'We do not issue store credit in place of a refund.',
        ),
        p('We are aware that "first come, first served" is the answer every retailer gives. The part that actually matters is what happens to the people who miss out, which is the four points above.')),
      s('Cancelled and abandoned orders',
        p('Where an order is cancelled or a payment fails, the unit returns to the pool and is offered to the next order in sequence, not held back or quietly listed at a higher price.')),
    ],
  },

  /* ── Buying and support ──────────────────────────────── */

  'payment-information': {
    title: 'Payment Information',
    nav: 'Payment Information',
    group: 'buying',
    description:
      'Which payment methods GoGetCards accepts, which currency you are charged in, how card details are handled, and when your card is charged.',
    intro:
      'What you can pay with, what you will be charged, and who handles your card details.',
    sections: [
      s('What we accept',
        p(payments.copy.accepted),
        dl(
          ['Cards', `${payments.copy.cardsOnly}. Debit and credit both work, and there is no surcharge for either.`],
          ['Apple Pay and Google Pay', 'Shown as a button on the payment page when your device and browser support it. If you do not see one, your device is not offering it and a card will work normally.'],
          ['Bank transfer', 'Available on the payment page. It clears more slowly than a card, so an order paid this way is dispatched once the transfer lands rather than immediately.'],
        ),
        p('If a payment method is not listed here, we do not accept it. We would rather show a short, accurate list than a wall of logos for methods that never appear at checkout.')),
      s('Currency',
        p(`Every price on this site is shown and charged in ${b.currency}. There is no separate currency selector and no conversion applied by us.`),
        p('If your card is denominated in another currency, your bank converts at their rate and may add a foreign transaction fee. That fee is your bank\'s, not ours, and we never see it.')),
      s('How your payment details are handled',
        ul(
          'Payment details are entered on our payment provider\'s own encrypted page, not on ours. That applies to cards, to wallet payments and to bank transfers alike.',
          'We never see, receive or store your full card number, expiry date or security code, and we never receive your bank credentials. There is nothing on our servers for anyone to take.',
          'A wallet payment sends the provider a one-time token rather than your card number, so we are one step further removed again.',
          'Every page on this site, including checkout, is served over HTTPS.',
        )),
      s('When you are charged',
        dl(
          ['In-stock orders', 'Charged in full at checkout. Dispatched within one business day.'],
          ['Preorders', 'Charged in full at checkout, not on release day. This is set out in detail on the Preorder Policy page.'],
        )),
      s('Failed and declined payments',
        p('If a payment is declined, no order is created and nothing is reserved. Some banks show a temporary authorisation hold on a declined attempt; that is released by your bank, usually within a few business days, and there is nothing for us to refund because we never received it.')),
      s('Refunds',
        p('Refunds go back to whatever you paid with. A card payment is refunded to that card, a wallet payment to the card behind the wallet, and a bank transfer to the account it came from. We cannot redirect a refund to a different card or account.'),
        p('Card and wallet refunds typically appear within 5 to 10 business days depending on your bank. Bank transfer refunds usually take longer. We issue every refund within one business day of agreeing it; the rest of that time is the banking system, not us.')),
    ],
  },

  'secure-checkout': {
    title: 'Secure Checkout',
    nav: 'Secure Checkout',
    group: 'buying',
    description:
      'How checkout works at GoGetCards, what happens to your data at each step, and what to check before you enter a card number on any site.',
    intro:
      'What happens between clicking checkout and getting a confirmation email, and what we do and do not have access to along the way.',
    sections: [
      s('What happens at each step',
        dl(
          ['1. Your details', 'You enter your email and delivery address on our page. This is the information we need to ship the order and to email you about it.'],
          ['2. Payment', 'You choose a card, a wallet or a bank transfer on our payment provider\'s own encrypted page. Whatever you pick is transmitted directly to the provider and never passes through our servers.'],
          ['3. Confirmation', 'The provider tells us the payment succeeded. We create the order and email you a confirmation. If you do not receive one within a few minutes, check your spam folder and then contact us.'],
          ['4. Dispatch', 'You get a second email with a tracking number when the label is created.'],
        )),
      s('What we hold, and what we do not',
        ul(
          'We hold: your name, email address, delivery address, phone number, and what you ordered.',
          'We do not hold: your card number, expiry date, security code, wallet token or bank details. We never receive any of them.',
          'We do not sell or rent customer data to anyone, for any purpose.',
        ),
        p('The Privacy Policy sets out how long we keep what we do hold and what your rights over it are.')),
      s('Checking a site before you pay',
        p('This applies to us and to everyone else, and it is worth saying even though it invites you to check up on us:'),
        ul(
          'The address bar should show HTTPS and the domain you expected. Look at the domain, not at a padlock icon — a padlock only means the connection is encrypted, not that the site is honest.',
          'A legitimate store publishes a business identity, a working contact route and a returns address before you pay, not after.',
          'Be wary of a checkout that asks you to pay by bank transfer, gift card, or a payment app between friends. Those methods have no buyer protection, which is exactly why they get asked for.',
        )),
      s('If something looks wrong',
        p(`Contact us at ${b.supportEmail} before paying, not after. If you believe you have received an email that appears to be from us but is not, forward it to the same address and do not click anything in it.`)),
    ],
  },

  'order-tracking': {
    title: 'Order Tracking',
    nav: 'Track Your Order',
    group: 'support',
    description:
      'How to track a GoGetCards order, when tracking updates appear, and what to do if a parcel stops moving or is marked delivered but has not arrived.',
    intro:
      'Where your tracking number comes from, what the updates mean, and what to do when a parcel goes quiet.',
    sections: [
      s('Finding your tracking number',
        p('You get two emails from us. The first confirms the order. The second is sent when the shipping label is created and carries the tracking number and a link to the carrier.'),
        p(`If you cannot find either, check your spam folder first, then email ${b.supportEmail} with the name and address on the order and we will resend them.`)),
      s('When tracking starts updating',
        ul(
          'A tracking number usually shows nothing at all for a few hours after it is issued. The carrier has to physically scan the parcel before the number means anything.',
          'In-stock orders are dispatched within one business day, so a number issued on a Friday evening may not scan until Monday.',
          'International parcels often go quiet for several days in transit between countries. That is normal and is not a lost parcel.',
        )),
      s('Delivery estimates by destination',
        p('These are counted from dispatch, not from when you ordered, and they are the carrier\'s estimate rather than a guarantee:'),
        { type: 'regions' }),
      s('If a parcel stops moving',
        p('Contact us if there has been no scan for seven business days on a domestic parcel, or fourteen on an international one. We will open a trace with the carrier. You do not need to contact the carrier yourself, and in most cases they will not talk to you about it anyway because we are the shipper.'),
        p('If a parcel is genuinely lost, we replace it if we still have the product and refund you in full if we do not. Either way it is resolved by us, not passed back to you.')),
      s('If it says delivered and it is not there',
        p('This is more often a carrier scanning early than a theft. Before contacting us, check with anyone else at the address, look wherever your carrier usually leaves parcels, and check with immediate neighbours.'),
        p(`If it still has not appeared 24 hours after the delivery scan, email ${b.supportEmail}. We will file a claim and, again, resolve it with a replacement or a full refund.`)),
      s('Customs delays',
        p('International parcels can be held by customs in the destination country. That is outside our control and outside the carrier\'s. Where duty is owed, the carrier will normally contact you to collect it before releasing the parcel, and a parcel can sit still for a week or more waiting for that. See the Shipping & Delivery page for how duties work.')),
    ],
  },

  'customer-support': {
    title: 'Customer Support',
    nav: 'Customer Support',
    group: 'support',
    description:
      'How to reach GoGetCards, when we answer, what to include so we can help on the first reply, and what we will and will not do.',
    intro:
      'Who answers, how quickly, and how to get a useful answer the first time.',
    sections: [
      s('How to reach us',
        dl(
          ['Contact form', 'The form on our Contact page. It reaches the same inbox and lets you attach an order number and a topic, which gets it to the right place faster.'],
          ['Email', `${b.supportEmail} for anything at all.`],
          ['Returns and refunds', `${b.returnsEmail}, if you would rather write straight to that queue.`],
        )),
      s('When we answer',
        p(`We reply within ${b.responseTimeHours} hours, ${b.supportHours ? b.supportHours.charAt(0).toLowerCase() + b.supportHours.slice(1) : 'on business days'}. Messages sent overnight or at a weekend are answered on the next business day.`),
        p('Every message is read and answered by a person. There is no automated first-line system that has to be argued past, and we do not close a ticket without replying to it.')),
      s('What to include',
        p('None of this is required, but every one of them saves a round trip:'),
        ul(
          'Your order number, from the confirmation email.',
          'The email address you ordered with, if it differs from the one you are writing from.',
          'For damage or a wrong item: photographs of the outer carton and of the product as it arrived.',
          'What you would like us to do. If you want a refund rather than a replacement, say so and we will not offer you the other one first.',
        )),
      s('What we can help with',
        ul(
          'Anything about an order you have placed: status, tracking, address changes before dispatch, cancellations.',
          'Whether a product is genuinely in stock, and when a preorder is realistically expected.',
          'Returns, refunds and damage.',
          'Bulk and wholesale enquiries. Use the wholesale topic on the contact form.',
        )),
      s('What we will not do',
        p('We will not tell you what is inside a sealed product, because we do not know and neither does anyone else. We will not give investment advice or predict what a set will be worth. And we will not undervalue or mis-declare a customs form, however it is asked — that is fraud, and the consequence lands on the buyer, not on us.')),
    ],
  },

  /* ── Legal ───────────────────────────────────────────── */

  'refund-policy': {
    title: 'Refund & Return Policy',
    nav: 'Refund & Returns',
    group: 'legal',
    description:
      `The GoGetCards return policy: a ${RETURN_DAYS}-day window on unopened sealed product, free returns on damaged or incorrect items, and full refunds on cancelled preorders.`,
    intro:
      'What you can return, how long you have, who pays the postage, and how long the money takes to come back.',
    sections: [
      s('The short version',
        dl(
          ['Damaged, faulty or not what you ordered', `Tell us within ${DAMAGE_REPORT_HOURS} hours of delivery. We pay return postage. Replacement or full refund, your choice.`],
          ['Changed your mind', `${RETURN_DAYS} days from delivery, provided the product is still factory sealed. ${FREE_RETURNS ? 'We pay return postage.' : 'You pay return postage.'}`],
          ['Preorder not yet shipped', 'Cancel any time, full refund, no fee.'],
          ['Opened product', 'Not returnable, except where it was faulty or not as described.'],
        )),
      s(`The ${RETURN_DAYS}-day window`,
        p(`You have ${RETURN_DAYS} days from the day your order is delivered to tell us you want to return it. The product must still be factory sealed and in the condition it arrived in, including its outer wrapping.`),
        p('We cannot accept a change-of-mind return on opened product. Sealed trading card product has no resale value once the seal is broken, because the buyer can no longer verify what is inside, and neither can we.')),
      s('Damaged, faulty or incorrect items',
        note(`Photograph the outer carton and the product before unwrapping anything further, and email ${b.returnsEmail} within ${DAMAGE_REPORT_HOURS} hours of delivery.`),
        p('If an item arrives damaged, is faulty, or is not the product described on the listing, we cover the return postage and you choose between a replacement and a full refund. We do not ask you to deal with the carrier and we do not require you to accept a replacement if you would rather have the money.'),
        p(`The ${DAMAGE_REPORT_HOURS}-hour window exists because carriers give us a limited period to file a claim. If you were away and opened the parcel late, tell us and we will still help.`)),
      s('How to start a return',
        ul(
          `Email ${b.returnsEmail} with your order number and what is wrong. Photographs if it is a damage or wrong-item claim.`,
          `We reply within ${b.responseTimeHours} hours with a return address and instructions. Do not send anything back before you have those: an unannounced parcel is hard to match to an order and slows your refund down.`,
          'Pack it as it arrived, in a rigid outer box. A sealed box that arrives back crushed is not in returnable condition.',
          FREE_RETURNS
            ? 'Use the tracked label we send you. It is prepaid, and using it is what keeps the parcel insured and traceable while it is on its way back to us.'
            : 'Use a tracked service. On a change-of-mind return the risk in transit is yours, and without tracking neither of us can prove what happened.',
        )),
      /* Spread, not nested. s() takes blocks as rest arguments, so passing
         an array makes `blocks` a list containing one array — the renderer
         finds no `type` on it and emits a heading with nothing under it.
         The audit caught exactly that. */
      s('Who pays return postage',
        ...(FREE_RETURNS
          ? [
            p('We do, on every return. Damaged, faulty, wrong item, or simply not for you after all — the postage back to us is ours, and there is no restocking fee on top of it.'),
            p('Ask for a return by email and we send you a prepaid tracked label. There is no label inside your parcel: an unannounced return is hard to match to an order, and that slows your refund down.'),
          ]
          : [dl(
            ['We pay', 'Damaged, faulty, incorrect item, or an order that should not have been sent.'],
            ['You pay', 'Change of mind. We do not deduct a restocking fee on top of that; the postage is the whole cost to you.'],
          )])),
      s('Refunds',
        p(`Refunds go to the card used for the original payment. We cannot refund to a different card or to a bank account, and we do not issue store credit in place of a refund unless you ask for it.`),
        p('We process a refund within one business day of receiving and checking the return, or within one business day of agreeing it in the case of a cancelled preorder. Card refunds then typically take 5 to 10 business days to appear on your statement; that part is the banking system, not us.'),
        p('Original shipping was free, so there is nothing to deduct for it. You get back exactly what you paid.')),
      s('Preorders',
        p('A preorder can be cancelled at any point before it is dispatched, for a full refund, with no fee and no explanation needed. If we cannot fill your preorder because our allocation was cut, we refund you in full without you having to ask.'),
        p('Once a preorder has shipped it is an ordinary order and everything above applies to it in the normal way. The Preorder Policy page covers the rest.')),
      s('Your statutory rights',
        p('Nothing in this policy limits any right you have under the consumer law that applies where you live. Where that law gives you a longer window or a stronger remedy than this page does, that law wins, and you do not need to argue the point with us.')),
      s('Questions',
        p(`Email ${b.returnsEmail}, or use the contact form and choose "A return or refund". We answer within ${b.responseTimeHours} hours.`)),
    ],
  },

  'terms-of-service': {
    title: 'Terms of Service',
    nav: 'Terms of Service',
    group: 'legal',
    description:
      'The terms you agree to when you buy from GoGetCards: orders and acceptance, pricing and currency, preorders, delivery, returns, and limits of liability.',
    intro:
      'These terms apply to every order placed on this site. They are written to be read rather than to be impenetrable, and where they limit something, they say so plainly.',
    sections: [
      s('Who you are dealing with',
        p(`This site is operated by ${b.legalName || b.tradingName}${b.country ? `, trading from ${b.country}` : ''}. ${b.registrationNumber ? `Registered number ${b.registrationNumber}. ` : ''}Contact details and business information are on the Contact page.`),
        p('By placing an order you confirm you are at least 18, or have the permission of a parent or guardian, and that the payment method is yours to use.')),
      s('Orders and acceptance',
        ul(
          'Placing an order is an offer to buy. A contract exists once we send you an order confirmation email.',
          'We may decline or cancel an order where a price or description was wrong, where stock is not available, where an allocation limit has been exceeded, or where we suspect fraud. If we do, you are refunded in full.',
          'Where we cancel, we tell you why. We do not cancel silently and let you find out from a refund appearing.',
        )),
      s('Prices and currency',
        ul(
          `All prices are shown and charged in ${b.currency}.`,
          'Prices can change at any time, but the price of a confirmed order never changes after purchase, including on preorders.',
          'Import duty, VAT and customs handling fees on international orders are set by the destination country, are collected from you by the carrier or the customs authority, and are not included in the price you pay us. We never receive them.',
          'If your card is in another currency, your bank sets the conversion rate and may add a fee. That is between you and your bank.',
        )),
      s('Payment',
        p(payments.copy.accepted),
        p('Payment is taken in full at checkout, including on preorders. Card details are entered on our payment provider\'s own encrypted page; we never see or store them.')),
      s('Preorders',
        p('Preorders are governed by the Preorder Policy, which forms part of these terms. In summary: you are charged at checkout rather than on release day, your price is locked, release dates are set by the publisher and may move, and you can cancel for a full refund at any point before dispatch.')),
      s('Delivery',
        ul(
          `${shipping.copy.long}.`,
          'In-stock orders are dispatched within one business day. Preorders are dispatched on or shortly after the publisher\'s release date.',
          'Delivery estimates are the carrier\'s and are estimates, not guarantees. We are not liable for a delay caused by a carrier, a customs authority, or an event outside our reasonable control.',
          'Risk in the goods passes to you on delivery, not on dispatch. If a parcel is lost or damaged in transit, that is ours to resolve.',
        )),
      s('Returns',
        p(`Unopened, factory-sealed product may be returned within ${RETURN_DAYS} days of delivery. Damaged, faulty or incorrect items are returned at our cost. The Refund & Return Policy sets out the detail and forms part of these terms.`)),
      s('What we do not warrant',
        p('We warrant that products are genuine, sealed, and as described. We do not warrant what is inside a sealed product: pull rates are set by the manufacturer and are a matter of chance.'),
        p('We make no representation about the future value of anything we sell. Trading card product is not an investment and we do not present it as one.')),
      s('Limits of liability',
        p('Our liability for any order is limited to the amount you paid for it. We are not liable for indirect or consequential loss, including any loss of profit or of anticipated value.'),
        p('Nothing here limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be limited.')),
      s('Acceptable use',
        ul(
          'Do not use automated tools to place orders, evade allocation limits, or scrape this site at a rate that degrades it for other people.',
          'Do not attempt to gain access to any part of this site you have not been granted access to.',
          'We may cancel orders and refuse future ones where these are breached.',
        )),
      s('Intellectual property',
        p('Product names, logos, set names and card images are the property of their respective publishers. We are an independent retailer and are not affiliated with, endorsed by or sponsored by The Pokémon Company, Nintendo, Konami, Wizards of the Coast, Hasbro or Bandai.'),
        p('The text, layout and photography on this site are ours.')),
      s('Changes to these terms',
        p('We may update these terms. The version that applies to your order is the version live when you placed it, and we do not apply changes retroactively.')),
      s('Governing law',
        p(`These terms are governed by the law of ${b.country || 'the country we trade from'}, and nothing in them removes any protection you have under the consumer law that applies where you live.`)),
    ],
  },

  'privacy-policy': {
    title: 'Privacy Policy',
    nav: 'Privacy Policy',
    group: 'legal',
    description:
      'What personal data GoGetCards collects, why, who it is shared with, how long it is kept, and how to exercise your rights over it.',
    intro:
      'What we collect, why we collect it, who else sees it, and how to make us delete it. We do not sell customer data to anybody, for any purpose.',
    sections: [
      s('What we collect',
        dl(
          ['When you order', 'Your name, email address, delivery address, phone number, and what you bought.'],
          ['When you contact us', 'Your name, email address, and whatever you put in the message.'],
          ['Automatically', 'IP address, browser and device type, the pages you viewed, and where you arrived from. Used to understand how the site is used and to detect fraud.'],
          ['Never', 'Your full card number, expiry date or security code. Those go to our payment provider directly and never reach our servers.'],
        )),
      s('Why we hold it',
        ul(
          'To take payment, ship your order, and email you about it. Without this we cannot sell you anything.',
          'To answer your messages.',
          'To meet tax and accounting obligations, which require us to keep transaction records for a set number of years.',
          'To detect and prevent fraud and abuse of allocation limits.',
          'To understand how the site is used in aggregate, so we can improve it.',
        )),
      s('Who we share it with',
        ul(
          'Our payment provider, to take payment. They receive your card details directly; we receive only a confirmation and the last four digits.',
          /* Derived from config/shipping rather than typed, because this
             list had gone stale: it still named Royal Mail after the
             origin moved to California, and Royal Mail is a UK domestic
             carrier that cannot collect a parcel there. A privacy policy
             naming a company that never receives your data is a small
             untruth in the one document specifically about who does. */
          `Carriers (${[...new Set(shipping.REGIONS.flatMap((r) => r.carrier.split(/\s*\/\s*/)).map((c) => c.replace(/\s+(Ground Advantage|Express)$/, '')))].join(', ')}, depending on destination), who need your name and address to deliver the parcel.`,
          'Analytics providers, which currently means Microsoft Clarity, and Meta where advertising is running. These see usage data, not your order details. The Cookie Policy explains this in more detail.',
          'Legal authorities, where we are legally required to disclose something.',
        ),
        note('We do not sell, rent or trade personal data. There is no circumstance in which we would.')),
      s('How long we keep it',
        dl(
          ['Order records', 'Kept for as long as tax and accounting law requires, then deleted.'],
          ['Contact messages', 'Kept for two years, so we have the history if you write again about the same problem.'],
          ['Analytics data', 'Kept in aggregate. Individual session records expire according to the provider\'s own retention settings.'],
        )),
      s('Your rights',
        p('Wherever you live, we will honour these. You do not need to be in a particular jurisdiction to ask.'),
        ul(
          'Ask for a copy of what we hold about you.',
          'Ask us to correct anything wrong.',
          'Ask us to delete it, except where we are legally required to keep a transaction record.',
          'Ask us to stop using it for marketing. Every marketing email has an unsubscribe link that works immediately.',
          'Object to processing, or ask for your data in a portable format.',
        ),
        p(`Email ${b.privacyEmail} and we will respond within 30 days, usually much sooner. We will not ask you why.`)),
      s('Security',
        ul(
          'The whole site, including checkout, is served over HTTPS.',
          'Card details never reach our servers, so there is nothing there to be stolen.',
          'Administrative access requires two-factor authentication.',
          'We keep the data we need and delete what we do not. The most reliable protection for a piece of data is not holding it.',
        )),
      s('Children',
        p('This site is not directed at children under 13 and we do not knowingly collect their data. If you believe a child has given us personal information, email us and we will delete it.')),
      s('Changes',
        p('If we change this policy in a way that materially affects you, we will say so on this page rather than quietly editing it.')),
      s('Contact',
        p(`Privacy questions: ${b.privacyEmail}. Anything else: ${b.supportEmail}.`)),
    ],
  },

  'cookie-policy': {
    title: 'Cookie Policy',
    nav: 'Cookie Policy',
    group: 'legal',
    description:
      'The cookies and similar technologies GoGetCards uses, what each one does, and how to turn off the ones that are not essential.',
    intro:
      'Which cookies this site sets, what each is for, and how to refuse the ones that are not needed to make the site work.',
    sections: [
      s('What we use, and why',
        dl(
          ['Essential', 'A session cookie that remembers your cart and keeps you logged in through checkout. The site cannot function without it, so it is set without asking and cannot be turned off from here.'],
          ['Analytics', 'Microsoft Clarity, which records aggregate usage so we can see where the site confuses people. It captures interactions, not card details or passwords.'],
          ['Advertising', 'The Meta pixel, when advertising is running, which reports that a purchase happened so we can tell which ads work. It is only loaded when a pixel is configured.'],
        )),
      s('Turning them off',
        p('You can block or delete cookies in your browser settings, and every major browser lets you do it per site. Blocking essential cookies will break the cart and checkout, because those are what the cookie is for.'),
        ul(
          'Most browsers: settings, then privacy, then cookies and site data.',
          'To opt out of Meta advertising specifically, use the ad preferences in your Facebook or Instagram account.',
          'Sending a Global Privacy Control or Do Not Track signal is respected for analytics where the provider supports it.',
        )),
      s('What we do not do',
        ul(
          'We do not use cookies to build a profile of you across other websites for our own purposes.',
          'We do not sell data collected through cookies.',
          'We do not use dark patterns to make refusing harder than accepting.',
        )),
      s('Third-party cookies',
        p('Our payment provider sets its own cookies on its own checkout page, which is necessary for the payment to work and for fraud prevention. That happens on their domain under their policy, not ours.')),
      s('Contact',
        p(`Questions about any of this: ${b.privacyEmail}.`)),
    ],
  },

  disclaimer: {
    title: 'Disclaimer',
    nav: 'Disclaimer',
    group: 'legal',
    description:
      'GoGetCards is an independent retailer and is not affiliated with any trading card publisher. What we do and do not claim about the product we sell.',
    intro:
      'Who we are not affiliated with, and what we are not claiming about the things we sell.',
    sections: [
      s('We are independent',
        p('GoGetCards is an independent retailer of sealed trading card product. We are not affiliated with, endorsed by, sponsored by, or licensed by The Pokémon Company, Nintendo, Creatures Inc., GAME FREAK, Wizards of the Coast, Hasbro, Bandai, Ravensburger, Disney, Topps, Panini, Fanatics, Major League Baseball, the National Basketball Association, or the National Football League.'),
        p('We buy through authorized distribution, which is how we can guarantee authenticity, but that is a supply relationship and not an endorsement. Any seller describing itself as an "official" or "authorized" retailer of a publisher without a licence agreement is overstating its position, and we are not going to do that.')),
      s('Trademarks',
        p('All product names, set names, logos, character names and card images are trademarks or copyright of their respective owners. They appear here to identify the product being sold, which is a normal and lawful use, and no claim of ownership is made or implied.')),
      s('What is inside a sealed product',
        p('We do not know, and neither does anybody else. Pull rates, hit rates and card distribution are set by the manufacturer and are a matter of chance. We do not weigh, search or otherwise attempt to determine the contents of a sealed product, and we do not sell any product on the basis of what it might contain.')),
      s('Value and investment',
        p('Trading card product is not an investment, and we do not present it as one. Prices in this category move sharply in both directions, and past price movement predicts nothing.'),
        p('Nothing on this site is financial advice. Buy what you want to own.')),
      s('Third-party links and prices',
        p('Where we link to a publisher\'s announcement or a release schedule, that content belongs to them and can change without us knowing. Release dates in particular are the publisher\'s to move.')),
      s('Accuracy',
        p('We check listings carefully, and we still occasionally get something wrong. Where a description, price or image is wrong, we correct it, and we cancel and refund any affected order rather than shipping something that does not match what you were shown.'),
        p(`If you spot an error, tell us at ${b.supportEmail}. We would rather hear it from you than not.`)),
    ],
  },

  'why-buy-from-gogetcards': {
    title: 'Why Buy From GoGetCards',
    nav: 'Why Buy From GoGetCards',
    group: 'guarantees',
    description:
      'What GoGetCards does differently: authorized distribution, factory-sealed guarantee, free tracked shipping worldwide, and preorder terms written in plain language.',
    intro:
      'There are a lot of places to buy sealed trading card product. Here is what we actually commit to, and where we are deliberately not competing.',
    sections: [
      s('Sourcing you can account for',
        p('Everything is bought through authorized distribution. No secondary-market stock, no liquidation lots, no sellers whose supply cannot be traced. It costs us margin and it occasionally costs us a set we would like to have listed, and it is the reason we can make the guarantee on the Authenticity Guarantee page without qualifying it.')),
      s('Sealed means sealed',
        p('We do not open, weigh, search or reseal anything. Weighing in particular is worth naming: it is the technique that identifies searched product and it is also the technique that creates it. We do not do it, and we do not buy from anyone we believe does.')),
      s('Free tracked shipping, worldwide',
        p(`${shipping.copy.long}. No threshold to reach and no cheaper untracked option to decline. Every order is covered against loss or damage in transit, and orders above $${shipping.SIGNATURE_REQUIRED_OVER_USD} require a signature.`),
        p('If a parcel is lost or arrives damaged, we replace it or refund it and we pay the postage. You are not asked to negotiate with a carrier on our behalf.')),
      s('Preorder terms in plain language',
        p('Our Preorder Policy states that your card is charged today rather than on release day, in the first line, in bold. That is the fact most preorder pages bury, and burying it is how customers end up surprised months later.'),
        p('It also states what happens when a publisher moves a date and when a distributor cuts our allocation, including that you are refunded in full rather than moved onto store credit.')),
      s('Where we are not competing',
        p('We are not the cheapest, and on a hot set we will sometimes be visibly more expensive than a marketplace listing. Sourcing exclusively through distribution costs more than buying wherever stock appears.'),
        p('We also do not run countdown timers on products that are not actually scarce, invent review scores, or claim a number of satisfied customers we cannot evidence. If a figure appears on this site, it is one we can show you the basis for.')),
      s('What you can check for yourself',
        p('Every claim above is written down somewhere you can hold us to: the guarantee pages, the Shipping & Delivery page, the Preorder Policy, the Allocation Policy, and the Refund & Return Policy. They are linked from the footer of every page, and they say the same thing as each other on purpose.')),
    ],
  },
};

/**
 * Page metadata for navigation and the sitemap, in display order.
 * Derived from PAGES so a new page cannot be added to one and forgotten in
 * the other — which is how orphan pages happen.
 */
const GROUPS = {
  guarantees: 'Our Guarantees',
  buying: 'Buying From Us',
  support: 'Help & Support',
  legal: 'Legal & Policies',
};

function allSlugs() {
  return Object.keys(PAGES);
}

function bySlug(slug) {
  return PAGES[slug] || null;
}

function navByGroup() {
  const out = {};
  for (const [key, label] of Object.entries(GROUPS)) {
    out[key] = {
      label,
      items: Object.entries(PAGES)
        .filter(([, page]) => page.group === key)
        .map(([slug, page]) => ({ slug, label: page.nav })),
    };
  }
  return out;
}

module.exports = { PAGES, GROUPS, allSlugs, bySlug, navByGroup, LAST_REVIEWED };
