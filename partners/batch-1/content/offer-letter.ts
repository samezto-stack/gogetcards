import type { SiteContent } from './types';

/**
 * Offer Letter — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE LETTER. One offer letter is one document, so the
 * ladder is the whole catalogue and rung N is N letters.
 *
 * NOT LEGAL ADVICE, AND THAT IS THE BOUNDARY. What a clause means, whether a
 * term is enforceable, whether the pay is fair, whether to accept, belongs to
 * lawyers and to the candidate. Whether the letter states the figures, dates
 * and conditions that the agreed terms record is a comparison of two
 * documents. The second is the product.
 */
export const site: SiteContent = {
  name: 'Offer Letter',
  strapline: 'The call said guaranteed bonus. The letter says discretionary.',
  whopUrl: 'https://whop.com/offer-letter/',
  returnUrl: 'https://offer-letter-check.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Offer letters, per letter',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/offer-letter-check',

    about: {
      title: 'An offer letter is not a welcome note. It is the written version of what two people agreed in conversation.',
      intro:
        'Offer Letter checks one letter against the terms that were agreed — letter against terms: comparing every figure with the email, summary or term sheet it is meant to record, reading the equity for the number, type, vesting and exercise terms it actually states, checking every date against what was discussed, and listing every condition and contingency in plain words. It gives no legal advice.',
      sections: [
        {
          title: 'What the check does',
          paras: [
            'Offers are negotiated by phone and email over days, and the letter is generated afterwards from a template by someone who was not on every call. Most of it is right. The part that is wrong is the part that changed late: the bonus agreed as guaranteed for year one is written as discretionary, the signing payment is in the email and not the letter, the equity is stated as a number of options with no vesting schedule, the start date is the one before it moved, and the offer is “subject to satisfactory references” with no word on whose satisfaction or by when.',
            'So the check reads the letter against the agreed terms you supply. Every figure is compared — base, bonus, commission, allowances, signing payments. The equity is read for the four things it needs to state: how many, of what type, on what vesting, and on what exercise terms. Every date is checked. And every condition, contingency and probation term is listed in plain words, with anything the agreed terms mention and the letter does not.',
          ],
        },
        {
          title: 'Why the late change is the classic',
          paras: [
            'The final round of a negotiation is usually small and verbal: a bonus guaranteed, a start date moved, a remote day added. Each is agreed in good faith and confirmed in a short email. The letter is then produced from the template and the earlier summary, and the final round is not in either.',
            'The damage is that once a letter is signed, the letter is what both sides look at, and the conversation is a memory. The check compares the letter with the last agreed terms and lists every difference, so they are raised before signing rather than discovered at the first bonus date.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not legal, tax or employment advice, and Offer Letter is not a law firm, an employment lawyer, a recruiter or an HR adviser. No opinion is offered on what a clause means where it is open to argument, whether a term is enforceable or lawful, whether the pay is fair or competitive, the tax treatment of anything, or whether to accept or how to negotiate.',
            'It is also not a drafting service. No letter is rewritten and no clause proposed. The report lists where the letter and the agreed terms differ and what the letter states in plain words; what to do about it is for the parties and their advisers.',
          ],
        },
      ],
      closing: {
        title: 'Who does the checking',
        body:
          'Every letter is read in full against the agreed terms supplied, term by term, because the failures that matter are the last-minute changes that never reached the template. A well-run hiring process can still produce a letter that records the second-to-last version of the deal.',
      },
    },

    standards: {
      intro:
        'This report is about a document people sign their working lives into, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'Not legal or employment advice', body: 'No opinion on what a clause means, whether it is lawful or enforceable, or what anyone’s rights are. Nothing here may be relied on as legal advice. Offer Letter is not a law firm.' },
        { title: 'Not tax or financial advice', body: 'No view on the tax treatment of pay, bonus or equity, or on what equity is worth.' },
        { title: 'No benchmarking and no negotiation', body: 'No view on whether the pay is fair or competitive, or on whether to accept or what to ask for.' },
        { title: 'Nothing is rewritten', body: 'No letter is redrafted and no clause proposed. Your documents are returned exactly as they arrived.' },
        { title: 'Letter against terms', body: 'Findings say where the letter and the agreed terms you supply differ. Terms that were never written down cannot be checked.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for anyone about to sign, or send, an offer.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the letter, any contract or equity documents it refers to, and the agreed terms — the email, summary or term sheet. Names and the company can be redacted freely; figures, dates and conditions are what is checked.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your check is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Offer Letter Check — the letter as received or as drafted.',
        'The agreed terms — the email, summary or term sheet — ideally the most recent one.',
        'Any documents the letter refers to — a contract, an equity plan summary, a benefits sheet.',
      ],
      next:
        'The report comes back term by term: figures that differ from the agreed terms, equity terms that are missing, dates that moved, and every condition listed in plain words.',
    },
  },

  hero: {
    eyebrow: 'Offer letters',
    title: 'The letter is warm and the number at the top is right.',
    titleAccent: 'The bonus agreed as guaranteed is written as discretionary.',
    body:
      'One offer letter read against the terms that were agreed: every figure checked against the email, summary or term sheet, the equity read for the number, type, vesting and exercise terms it states, every date checked, and every condition listed in plain words. Not legal advice.',
    primaryCta: { label: 'Start a brief', to: '/services/offer-letter-check' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'Figures that match the deal', body: 'Every number in the letter — base, bonus, commission, allowances, signing payment — compared with the agreed terms, including whether a figure agreed as fixed is written as a target or discretionary.' },
    { title: 'Equity in four numbers', body: 'The equity read for how many, of what type, on what vesting schedule and cliff, and on what exercise or settlement terms — because a number of options with no schedule is a number, not a grant.' },
    { title: 'Dates that moved', body: 'Start date, probation length, review dates, bonus payment dates and any deadline to accept checked against the latest agreed terms.' },
    { title: 'Conditions in plain words', body: 'Every condition, contingency and probation term listed plainly — references, checks, approvals, notice — with anything the agreed terms mention that the letter does not.' },
  ],

  services: [
    {
      slug: 'offer-letter-check',
      name: 'Offer Letter Check',
      tagline: 'One letter, checked against what was agreed, before it is signed.',
      summary:
        'The full check: every figure against the agreed terms, the equity read for what it states, every date checked, and every condition listed in plain words. Not legal advice.',
      unitLabel: 'Letters',
      unitNoun: 'letter',
      unitNounPlural: 'letters',
      unitRate: 49.99,
      checkoutHeading: 'How many letters?',
      brief: {
        intro:
          'Everything below is used to check the letter against the agreed terms. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'side', label: 'Whose side you are on', type: 'select', required: true, half: true,
            options: ['Candidate — I received it', 'Employer — we are sending it', 'Recruiter or agent'],
            help: 'A candidate is checking what was promised; an employer is checking what will be signed.' },
          { name: 'role', label: 'Kind of role', type: 'text', required: true, half: true,
            placeholder: 'Senior engineer, full-time, hybrid',
            help: 'So the read knows which terms to expect.' },
          { name: 'equity', label: 'Is there equity', type: 'select', required: true, half: true,
            options: ['Yes — options', 'Yes — shares or RSUs', 'Yes — not sure what type', 'No'],
            help: 'Equity is read for number, type, vesting and exercise terms.' },
          { name: 'purpose', label: 'What was agreed that matters most', type: 'area', required: true,
            placeholder: 'Year-one bonus guaranteed at 15%, start date 3 March, two remote days.',
            help: 'In your own words. These terms are checked first.' },
          { name: 'source', label: 'Where the agreed terms are written', type: 'text', required: false, half: true,
            placeholder: 'Recruiter’s email of 14 Feb, attached',
            help: 'So each figure can be compared with its source.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'The equity section gives a number but nothing about vesting.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'Benefits are in a separate handbook the letter refers to.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The letter and the agreed terms',
          required: true,
          requiredNote: 'The check compares the letter with what was agreed, so send both',
          accept: ['.pdf', '.docx', '.txt', '.eml', '.msg', '.png', '.jpg', '.zip'],
          maxMb: 30,
          maxFiles: 10,
          help:
            'The letter, the agreed terms in whatever form they exist, and any documents the letter refers to. Names can be redacted.',
        },
      },
      process: [
        { step: '01', title: 'Read the agreed terms', desc: 'Every term in the email, summary or term sheet written down before the letter is opened.' },
        { step: '02', title: 'Compare every figure', desc: 'Each number in the letter compared with the agreed terms, including whether it is fixed or discretionary.' },
        { step: '03', title: 'Read the equity', desc: 'Number, type, vesting and exercise terms looked for and listed.' },
        { step: '04', title: 'Check every date', desc: 'Start, probation, review, payment and acceptance dates compared.' },
        { step: '05', title: 'List the conditions', desc: 'Every condition and contingency written out in plain words.' },
        { step: '06', title: 'Report', desc: 'Findings term by term inside the stated turnaround, ranked by size of difference.' },
      ],
      included: [
        'Every figure compared with the agreed terms',
        'A figure agreed as fixed but written as target or discretionary, flagged',
        'Payments in the agreed terms that the letter does not mention, listed',
        'The equity read for number, type, vesting and exercise terms',
        'Missing equity terms, listed',
        'Every date compared with the latest agreed terms',
        'Every condition and contingency listed in plain words',
        'References to other documents the letter relies on, listed',
        'What the check was compared against, stated',
        'The largest differences first',
      ],
      turnaround: 'Three business days from the documents arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per letter. A revised letter after a correction is a second letter. Employers sending several offers on one template often send them together, because a template error repeats.',
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
    { step: '01', title: 'Write the brief', desc: 'Whose side you are on, the role, whether there is equity, and what was agreed. Attach the letter and the agreed terms. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The check', desc: 'Term by term against what was agreed: figures, equity, dates and conditions.' },
    { step: '04', title: 'The report', desc: 'Findings term by term inside the stated turnaround, ranked by size of difference.' },
  ],

  limits: [
    { title: 'Not legal or employment advice', body: 'No opinion on what a clause means or whether it is lawful. Offer Letter is not a law firm, a recruiter or an HR adviser.' },
    { title: 'No benchmarking or negotiation', body: 'No view on whether the pay is fair or whether to accept.' },
    { title: 'Nothing is rewritten', body: 'No letter is redrafted. Your documents come back exactly as they arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no figures about offers. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Is this legal advice?', a: 'No, and it must not be relied on as legal advice. The check compares what the letter states with what the agreed terms you supply state, and lists the differences. What a clause means, whether it is enforceable, and what to do are questions for an employment lawyer.' },
    { q: 'Can employers use it as well as candidates?', a: 'Yes. Either side can send the letter and the agreed terms. The report is the same: where the two documents differ.' },
    { q: 'Can you rewrite the letter or tell me what to ask for?', a: 'No. Nothing is drafted and no negotiation advice is given. The report lists each difference with where it is, so the parties can resolve it.' },
    { q: 'Which terms drift most often?', a: 'Bonuses agreed as guaranteed and written as discretionary, equity with no vesting terms, and start dates that moved late. The report checks those first.' },
    { q: 'Nothing was written down except the letter. Can you still check it?', a: 'The comparison needs agreed terms in writing. Without them, the report can only list what the letter states in plain words — figures, equity, dates and conditions — so you can compare it with what you remember.' },
    { q: 'Is the letter confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed. Names and the company can be redacted.' },
  ],

  resources: [
    {
      title: 'The agreed figure has to be the written figure',
      summary: 'Guaranteed on the call, discretionary in the letter.',
      body: [
        'Letters are generated from templates, and templates describe bonuses the usual way. The unusual term agreed in the last round is the one the template does not have.',
        'The response is to compare every figure with the last agreed terms before signing. The check does that and flags differences in kind as well as amount.',
      ],
    },
    {
      title: 'Equity needs four numbers, not one',
      summary: '“10,000 options”, and nothing else.',
      body: [
        'A number of options says almost nothing on its own. What it means depends on the type, the vesting schedule and cliff, and the exercise terms — and those are often left to a plan document nobody sends.',
        'The response is to state all four or point to where they are. The check reads the equity for each and lists what is missing.',
      ],
    },
    {
      title: 'The start date moves in conversation',
      summary: 'The date agreed on Thursday, the letter dated Monday.',
      body: [
        'Start dates move for notice periods, holidays and relocations, usually by email. The letter keeps the first one.',
        'The response is to check every date against the latest correspondence. The check does that for start, probation, review and payment dates.',
      ],
    },
    {
      title: 'A condition has to be stated, not implied',
      summary: '“Subject to satisfactory references.”',
      body: [
        'Conditions are often written in a phrase that hides who decides, by when, and what happens if they are not met.',
        'The response is to state each condition plainly. The check lists every condition and contingency in plain words, so both sides know what the offer depends on.',
      ],
    },
  ],

  legal: {
    entity: 'Offer Letter',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
