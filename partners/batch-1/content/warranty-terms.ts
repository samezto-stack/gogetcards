import type { SiteContent } from './types';

/**
 * Warranty Terms — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE WARRANTY. One set of warranty terms is one
 * document, so the ladder is the whole catalogue and rung N is N warranties.
 *
 * NOT LEGAL ADVICE, AND THAT IS THE BOUNDARY. Whether terms are lawful or
 * enforceable, what statutory rights a customer has regardless, belongs to
 * lawyers. Whether the terms agree with what the product page, the box and
 * the checkout tell the customer, and whether the claim process can be
 * completed with what the customer is given, is a comparison of documents.
 * The second is the product.
 */
export const site: SiteContent = {
  name: 'Warranty Terms',
  strapline: 'The box says lifetime warranty. The terms say two years.',
  whopUrl: 'https://whop.com/warranty-terms/',
  returnUrl: 'https://warranty-terms-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Warranty terms, per warranty',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/warranty-terms-review',

    about: {
      title: 'A warranty is not small print. It is a promise a customer reads at the worst moment — when the product has failed.',
      intro:
        'Warranty Terms reads one warranty the way the customer making a claim reads it — terms against what they were told: checking that what is covered matches what the product page and packaging promise, that the period says when it starts and ends, that every step of the claim process can be completed with what the customer is actually given, and that no exclusion contradicts the marketing. It gives no legal advice.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'Warranties are written by one team and promised by several. Legal or operations writes the terms; marketing writes the product page and the box; the checkout says something in a line; support has a macro. Each is written for its own moment. The customer reads them all at once, months later, with a broken product. So the box says “lifetime warranty” and the terms say two years, the period starts “from manufacture” and the customer has no way to know that date, the claim needs the original receipt and the checkout sends a confirmation email that is not a receipt, and water damage is excluded from a product sold as “built for the outdoors”.',
            'So the review reads the warranty against everything that describes it. What is covered is compared with what each customer-facing source promises. The period is checked for a start a customer can know and an end they can calculate. Every step of the claim process is checked for whether the customer has what it asks for — a receipt, a serial number, an address, a form. And every exclusion is read against the marketing for a promise it quietly takes back.',
          ],
        },
        {
          title: 'Why the promise on the box is the classic',
          paras: [
            'Marketing writes for the moment of purchase, and the strongest honest-sounding phrase wins: lifetime, unconditional, no questions asked. The terms are written for the moment of a claim, by people thinking about cost and fraud. Neither reads the other. The customer bought on the box and claims on the terms, and discovers the difference when they are already unhappy.',
            'The damage is that a warranty dispute is about trust, not money, and the customer is holding the box. The review compares every customer-facing promise with the terms and lists every one the terms narrow, so the two can be made to agree before a customer has to point it out.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not legal advice, and Warranty Terms is not a law firm, a consumer-rights adviser or a compliance consultant. No opinion is offered on whether the terms are lawful or enforceable, what statutory or consumer rights apply in addition to them, which jurisdiction governs, or what a warranty should offer.',
            'It is also not a drafting or claims service. No term is rewritten, no marketing copy changed and no claim handled. The report lists where the terms and the customer-facing material disagree, and where the claim process asks for something the customer is not given; what to change is for you and your lawyer.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every warranty is read in full against everything supplied that describes it to customers, because the failures that matter are between documents written by different teams. A generous warranty can still produce angry customers because the box promised more than the terms.',
      },
    },

    standards: {
      intro:
        'This report is about a promise customers rely on, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'Not legal advice', body: 'No opinion on whether terms are lawful, fair or enforceable. Nothing here may be relied on as legal advice. Warranty Terms is not a law firm.' },
        { title: 'No view on statutory rights', body: 'No view on rights customers have in law regardless of the warranty, or on which jurisdiction applies.' },
        { title: 'The documents, not the product', body: 'The subject is whether the terms agree with what customers are told. Whether the product is reliable stays with you.' },
        { title: 'Nothing is rewritten', body: 'No term is redrafted and no copy changed. Your documents are returned exactly as they arrived.' },
        { title: 'Only the material supplied', body: 'Findings rest on the terms and the customer-facing material you send. A promise made somewhere not supplied cannot be read.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for anyone who sells a product with a promise attached.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the warranty terms, and everything that describes the warranty to customers — product pages, packaging, the checkout, confirmation emails, support macros. Screenshots are fine.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Warranty Terms Review — the warranty terms as published.',
        'Everything that describes the warranty to customers — product pages, packaging, checkout, emails, support macros.',
        'What a customer receives after buying — confirmation, receipt, registration — so the claim process can be checked against it.',
      ],
      next:
        'The report comes back term by term: coverage the marketing overstates, a period with no knowable start, claim steps a customer cannot complete, and exclusions that contradict a promise.',
    },
  },

  hero: {
    eyebrow: 'Warranty terms',
    title: 'The terms are careful and the box is confident.',
    titleAccent: 'The box says lifetime. The terms say two years.',
    body:
      'One set of warranty terms read the way the customer making a claim reads them: what is covered checked against what the product page and packaging promise, the period checked for when it starts and ends, every claim step checked for being completable, and every exclusion checked against the marketing. Not legal advice.',
    primaryCta: { label: 'Start a brief', to: '/services/warranty-terms-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'Coverage that matches the promise', body: 'What the terms cover compared with what every product page, box, checkout line and support macro says is covered — so the customer is held to the promise they bought on.' },
    { title: 'A period you can calculate', body: 'The warranty period checked for a start a customer can know — purchase, delivery, registration — and an end they can work out, rather than “from date of manufacture”.' },
    { title: 'A claim you can complete', body: 'Every step of the claim process checked for whether the customer has what it asks for — the receipt, the serial number, the form, the address — given what they actually receive.' },
    { title: 'Exclusions that do not contradict', body: 'Every exclusion read against the marketing for a promise it takes back — water damage on an outdoor product, wear on a product sold as indestructible.' },
  ],

  services: [
    {
      slug: 'warranty-terms-review',
      name: 'Warranty Terms Review',
      tagline: 'One warranty, read the way the customer making a claim reads it.',
      summary:
        'The full read: coverage against every customer-facing promise, the period checked for a knowable start and end, every claim step checked for being completable, and every exclusion checked against the marketing. Not legal advice.',
      unitLabel: 'Warranties',
      unitNoun: 'warranty',
      unitNounPlural: 'warranties',
      unitRate: 49.99,
      checkoutHeading: 'How many warranties?',
      brief: {
        intro:
          'Everything below is used to read the warranty the way your customers will. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'kind', label: 'What the product is', type: 'select', required: true, half: true,
            options: ['Consumer electronics', 'Home or furniture', 'Outdoor or sports equipment', 'Apparel or accessories', 'Business equipment', 'Something else — say so below'],
            help: 'Different products are promised in different ways, so this sets which claims to expect.' },
          { name: 'channel', label: 'Where it is sold', type: 'text', required: true, half: true,
            placeholder: 'Own website and two marketplaces',
            help: 'Each channel may describe the warranty differently.' },
          { name: 'market', label: 'Main market', type: 'select', required: true, half: true,
            options: ['United States', 'United Kingdom', 'European Union', 'Several', 'Not sure'],
            help: 'For context only — no view is given on any jurisdiction’s law.' },
          { name: 'purpose', label: 'What customers are told about the warranty', type: 'area', required: true,
            placeholder: '“Lifetime warranty” on the box and product page; “2-year warranty” at checkout.',
            help: 'In your own words. The terms are read against every promise you list.' },
          { name: 'received', label: 'What a customer receives after buying', type: 'text', required: false, half: true,
            placeholder: 'Order confirmation email; no printed receipt',
            help: 'So the claim process can be checked against what the customer actually has.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'Support keeps refusing claims for missing receipts that customers say they never got.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'Marketplace sales are covered by the marketplace’s own guarantee, not ours.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The terms and the customer-facing material',
          required: true,
          requiredNote: 'The review reads the terms against what customers are told, so send both',
          accept: ['.pdf', '.docx', '.html', '.txt', '.png', '.jpg', '.zip'],
          maxMb: 60,
          maxFiles: 20,
          help:
            'The warranty terms and everything that describes the warranty to customers. Screenshots of product pages, packaging and emails are fine.',
        },
      },
      process: [
        { step: '01', title: 'Collect the promises', desc: 'Every statement about the warranty in the customer-facing material written down first.' },
        { step: '02', title: 'Compare coverage', desc: 'What the terms cover compared with each promise.' },
        { step: '03', title: 'Check the period', desc: 'Start and end checked for being knowable and calculable by a customer.' },
        { step: '04', title: 'Walk the claim', desc: 'Each claim step checked against what the customer actually receives.' },
        { step: '05', title: 'Read the exclusions', desc: 'Each exclusion checked against the marketing for a promise it takes back.' },
        { step: '06', title: 'Report', desc: 'Findings term by term inside the stated turnaround, ranked by what a claiming customer would hit first.' },
      ],
      included: [
        'Every customer-facing promise about the warranty collected',
        'Coverage in the terms compared with each promise',
        'Promises the terms narrow, flagged',
        'The period checked for a start a customer can know',
        'Every claim step checked against what the customer receives',
        'A claim step the customer cannot complete, surfaced',
        'Every exclusion read against the marketing',
        'Differences between channels, listed',
        'What the review was compared against, stated',
        'What a claiming customer would hit first, first',
      ],
      turnaround: 'Three business days from the documents arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per warranty. A range with one warranty is one; a range with different terms per product is one per set of terms. Extended or paid warranties are separate warranties.',
      },
    },
  ],

  plans: [
    { units: 1, planId: 'plan_PENDING_01', price: 49.99 },
    { units: 2, planId: 'plan_PENDING_02', price: 99.98 },
    { units: 3, planId: 'plan_PENDING_03', price: 149.97 },
    { units: 4, planId: 'plan_PENDING_04', price: 199.96 },
    { units: 5, planId: 'plan_PENDING_05', price: 249.95 },
    { units: 6, planId: 'plan_PENDING_06', price: 299.94 },
    { units: 7, planId: 'plan_PENDING_07', price: 349.93 },
    { units: 8, planId: 'plan_PENDING_08', price: 399.92 },
    { units: 9, planId: 'plan_PENDING_09', price: 449.91 },
    { units: 10, planId: 'plan_PENDING_10', price: 499.90 },
    { units: 11, planId: 'plan_PENDING_11', price: 549.89 },
    { units: 12, planId: 'plan_PENDING_12', price: 599.88 },
    { units: 13, planId: 'plan_PENDING_13', price: 649.87 },
    { units: 14, planId: 'plan_PENDING_14', price: 699.86 },
    { units: 15, planId: 'plan_PENDING_15', price: 749.85 },
    { units: 16, planId: 'plan_PENDING_16', price: 799.84 },
    { units: 17, planId: 'plan_PENDING_17', price: 849.83 },
    { units: 18, planId: 'plan_PENDING_18', price: 899.82 },
    { units: 19, planId: 'plan_PENDING_19', price: 949.81 },
    { units: 20, planId: 'plan_PENDING_20', price: 999.80 },
    { units: 21, planId: 'plan_PENDING_21', price: 1049.79 },
    { units: 22, planId: 'plan_PENDING_22', price: 1099.78 },
    { units: 23, planId: 'plan_PENDING_23', price: 1149.77 },
    { units: 24, planId: 'plan_PENDING_24', price: 1199.76 },
  ],

  howItWorks: [
    { step: '01', title: 'Write the brief', desc: 'What the product is, where it is sold and what customers are told. Attach the terms and the customer-facing material. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'As a claiming customer: coverage, period, claim steps and exclusions against every promise.' },
    { step: '04', title: 'The report', desc: 'Findings term by term inside the stated turnaround, ranked by what a claiming customer would hit first.' },
  ],

  limits: [
    { title: 'Not legal advice', body: 'No opinion on whether terms are lawful or enforceable. Warranty Terms is not a law firm or a consumer-rights adviser.' },
    { title: 'No view on statutory rights', body: 'No view on rights customers have in law in addition to the warranty.' },
    { title: 'Nothing is rewritten', body: 'No term is redrafted and no copy changed. Your documents come back exactly as they arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no figures about claims. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Is this legal advice?', a: 'No, and it must not be relied on as legal advice. The review compares the terms with what you tell customers and with what they receive, and lists where they disagree. Whether the terms are lawful, and what statutory rights apply regardless, are questions for your lawyer.' },
    { q: 'Our terms were written by a lawyer. Is this still worth it?', a: 'The lawyer wrote the terms. The product page, the box and the checkout were written by other people at other times. The gaps are between them, and they are what a claiming customer finds.' },
    { q: 'Can you rewrite the terms or the marketing?', a: 'No. Nothing is drafted. The report lists each disagreement with where it is, so you and your lawyer can decide which side to change.' },
    { q: 'What do customers trip on when they claim?', a: 'A period that starts from a date they cannot know, a receipt they were never sent, and an exclusion that contradicts the product page. The report checks those first.' },
    { q: 'We sell in several countries. Does that matter?', a: 'The review compares documents and gives no view on any country’s law. Send the material for each market; differences between markets are listed.' },
    { q: 'Is the material confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed.' },
  ],

  resources: [
    {
      title: 'The box and the terms have to say the same thing',
      summary: 'Lifetime on the box, two years in the terms.',
      body: [
        'Marketing writes for purchase and the terms are written for claims. Neither team reads the other’s work, and the customer reads both at once.',
        'The response is to check every customer-facing promise against the terms before printing. The review collects the promises and lists the ones the terms narrow.',
      ],
    },
    {
      title: 'A period needs a start the customer can know',
      summary: '“Two years from date of manufacture.”',
      body: [
        'Periods are often defined from a date only the manufacturer knows. The customer cannot tell whether they are inside it.',
        'The response is a start the customer can know — purchase, delivery, registration. The review checks every period for one.',
      ],
    },
    {
      title: 'A claim process has to be completable',
      summary: 'The original receipt, which the checkout never sent.',
      body: [
        'Claim processes are written assuming customers keep paperwork that the business never actually gave them.',
        'The response is to walk the claim with only what the customer receives. The review does exactly that and lists the steps that cannot be completed.',
      ],
    },
    {
      title: 'An exclusion cannot contradict the product page',
      summary: 'Water damage excluded on a product “built for the outdoors”.',
      body: [
        'Standard exclusions are copied from a template and are reasonable in general. Against a specific product’s marketing, one of them often takes back the main promise.',
        'The response is to read every exclusion against the product it is attached to. The review does that and flags the contradictions.',
      ],
    },
  ],

  legal: {
    entity: 'Warranty Terms',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
