import type { SiteContent } from './types';

/**
 * Investor Update — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE UPDATE. One investor update is one document, so
 * the ladder is the whole catalogue and rung N is N updates.
 *
 * NO VIEW ON THE COMPANY, AND THAT IS THE BOUNDARY. Whether the company is
 * doing well, whether to raise, what it is worth, belongs to the founders and
 * the investors. Whether a metric kept its definition, whether last month’s
 * promise is answered, and whether cash, burn and runway agree, is a fact
 * about two documents. The second is the product.
 */
export const site: SiteContent = {
  name: 'Investor Update',
  strapline: 'Last month said “closing by the 15th”. This month does not mention it.',
  whopUrl: 'https://whop.com/investor-update/',
  returnUrl: 'https://investor-update-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Investor updates, per update',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/investor-update-review',

    about: {
      title: 'An investor update is not a newsletter. It is a running record the investor reads against the last one.',
      intro:
        'Investor Update reads one update the way the investor who keeps every update reads it — this one against the last: checking that every metric has the same definition as last time, that every promise made last time is answered, that cash, burn and runway agree with each other, and that every ask is specific enough for an investor to act on today.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'Founders write updates at the end of a long month, from memory and a dashboard, in an hour. Investors read them with the last one open, because an update’s value to them is not this month’s news but the trend. So revenue is reported as MRR last month and as annualised bookings this month, the big customer “expected to sign next week” three updates ago has not been mentioned since, burn went up, cash went down by more than burn, runway stayed the same, and the ask is “intros to anyone in fintech”.',
            'So the review reads the update as that investor does. Every metric is compared with its name, definition and basis in the previous update. Every expectation, deadline and commitment in the previous update is listed and followed into this one. Cash, burn and runway are checked for agreeing arithmetically with each other and with last month. And every ask is read for whether an investor could do something with it today.',
          ],
        },
        {
          title: 'Why the unanswered promise is the classic',
          paras: [
            'Every update makes small promises — a deal expected to close, a hire starting next month, a launch by the end of the quarter. When they happen, the next update reports them. When they do not, the next update simply moves on, because the founder is writing about what happened rather than auditing what they said. The investor, reading with last month open, notices the silence before anything else.',
            'The damage is out of proportion to the miss. A slipped deal reported plainly costs a sentence; a slipped deal not mentioned teaches the investor to discount every future expectation. The review lists every promise in the previous update and says where this one answers it.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not investment, financial or legal advice, and Investor Update is not an investor, an adviser, an accountant or a fundraising consultant. No opinion is offered on whether the company is doing well, what it is worth, whether or when to raise, or how to present bad news. No figure is verified against the company’s books.',
            'It is also not a writing service. No sentence is drafted and no update restructured. The report says where a metric changed definition, where a promise goes unanswered, where cash, burn and runway disagree and where an ask cannot be acted on; what to tell investors is the founders’.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every update is read in full with the previous one beside it, as the investor reads it, because the failures that matter are between updates rather than within one. A good month can read as a worrying one because a single promise from last month went unmentioned.',
      },
    },

    standards: {
      intro:
        'This report is about a document a company’s relationship with its investors rests on, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'Not investment or financial advice', body: 'No opinion on the company, its value, its prospects or whether to raise. Investor Update advises on nothing.' },
        { title: 'Not a verification', body: 'No figure is checked against the books. Arithmetic is checked between the figures the updates state, and nothing more.' },
        { title: 'The documents, not the company', body: 'The subject is whether this update agrees with the last and with itself. How the company is doing is for the founders and investors.' },
        { title: 'Nothing is written or rewritten', body: 'No sentence is drafted and no update restructured. Your updates are returned exactly as they arrived.' },
        { title: 'Read as the investor reads it', body: 'Findings rest on the updates you supply. Where the previous update is not supplied, the update is read only against itself.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for founders who write one of these every month. If one note gets last month’s promise answered before an investor asks, it has done its job.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: this update in draft, the previous one as sent, and who receives it. Customer names and absolute figures can be redacted or scaled, as long as the two updates are scaled the same way.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Investor Update Review — this update in its latest draft.',
        'The previous update as it was sent, so metrics and promises can be compared.',
        'Who receives it — lead investor, angels, the whole cap table — so the read is aimed at what they compare first.',
      ],
      next:
        'The report comes back this update against the last: where a metric changed definition, where last time’s promise goes unanswered, where cash, burn and runway disagree, and where an ask cannot be acted on.',
    },
  },

  hero: {
    eyebrow: 'Investor updates',
    title: 'The update is upbeat and the numbers went up.',
    titleAccent: 'Last month’s “closing by the 15th” is not in it.',
    body:
      'One investor update read the way the investor who keeps every update reads it: every metric checked for the same definition as last time, last update’s promises followed into this one, cash, burn and runway checked against each other, and every ask checked for being something an investor can do today.',
    primaryCta: { label: 'Start a brief', to: '/services/investor-update-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'Metrics that keep their definition', body: 'Every number compared with its name, definition and basis last time — MRR or bookings, monthly or annualised, gross or net — so a trend is a trend and not a change of ruler.' },
    { title: 'Last time’s promises answered', body: 'Every expectation, deadline and commitment in the previous update listed and followed into this one, met, slipped or dropped — the first thing an investor checks.' },
    { title: 'Cash, burn and runway that agree', body: 'The three figures checked against each other and against last month, so a runway that stayed flat while cash fell by more than burn is caught before it is read.' },
    { title: 'Asks an investor can act on', body: 'Every ask read for whether a specific person could do a specific thing with it today, because “intros to fintech” produces nothing and a named target produces an email.' },
  ],

  services: [
    {
      slug: 'investor-update-review',
      name: 'Investor Update Review',
      tagline: 'One update, read the way the investor reads it — with the last one open.',
      summary:
        'The full read: every metric compared with last time, every promise from last time followed into this one, cash, burn and runway checked against each other, and every ask checked for whether it can be acted on.',
      unitLabel: 'Updates',
      unitNoun: 'update',
      unitNounPlural: 'updates',
      unitRate: 49.99,
      checkoutHeading: 'How many updates?',
      brief: {
        intro:
          'Everything below is used to read the update the way your investors will. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'cadence', label: 'How often you send updates', type: 'select', required: true, half: true,
            options: ['Monthly', 'Quarterly', 'Irregularly', 'This is the first one'],
            help: 'A monthly update is read against last month; a quarterly one against a longer trend.' },
          { name: 'readers', label: 'Who receives it', type: 'text', required: true, half: true,
            placeholder: 'Lead investor, six angels and two advisers',
            help: 'The update is read for what those readers will compare first.' },
          { name: 'stage', label: 'Company stage', type: 'select', required: true, half: true,
            options: ['Pre-revenue', 'Early revenue', 'Growing', 'Raising now', 'Not sure'],
            help: 'Different stages are read for different numbers first.' },
          { name: 'purpose', label: 'What this update most has to say', type: 'area', required: true,
            placeholder: 'That the slower month was a timing issue and the pipeline is intact — honestly, without spin.',
            help: 'This ranks the findings. An unanswered promise about the round is not the same as a rounding difference in headcount.' },
          { name: 'previous', label: 'The previous update', type: 'select', required: true, half: true,
            options: ['Attached', 'Pasted in the notes below', 'This is the first update'],
            help: 'Metrics and promises are compared with the previous update when it is supplied.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'We switched from MRR to ARR this month and I am not sure we said so.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'The customer we said would sign asked us not to name them again until they announce.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'This update and the last',
          required: true,
          requiredNote: 'The review reads this update against the last, so send both, as drafted and as sent',
          accept: ['.pdf', '.docx', '.txt', '.md', '.xlsx', '.csv', '.eml', '.zip'],
          maxMb: 30,
          maxFiles: 10,
          help:
            'This update in draft and the previous one as sent. Figures can be scaled, as long as both are scaled the same way.',
        },
      },
      process: [
        { step: '01', title: 'Read the last update first', desc: 'Every metric, definition and promise in the previous update written down before this one is opened.' },
        { step: '02', title: 'Compare every metric', desc: 'Each number checked for the same name, definition and basis as last time.' },
        { step: '03', title: 'Follow every promise', desc: 'Each expectation and deadline from last time looked for in this update.' },
        { step: '04', title: 'Check cash, burn and runway', desc: 'The three figures checked against each other and against last time.' },
        { step: '05', title: 'Read the asks', desc: 'Each ask checked for whether an investor could act on it today.' },
        { step: '06', title: 'Report', desc: 'Findings section by section inside the stated turnaround, ranked by what an investor would notice first.' },
      ],
      included: [
        'Every metric compared with its definition and basis last time',
        'A metric that changed definition without saying so, flagged',
        'Every promise from the previous update followed into this one',
        'A promise that goes unanswered, surfaced',
        'Cash, burn and runway checked for agreeing with each other',
        'Figures that disagree between the summary and the detail, listed',
        'Every ask checked for whether it names a person and an action',
        'Good news reported without its comparison, located',
        'Bad news placed where it is least likely to be read, located',
        'What an investor would notice first, first',
      ],
      turnaround: 'Three business days from the brief arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per update. The previous update is read as a source and is included. Founders sometimes send the last three, for a longer view of which promises have been carried forward; that is one update reviewed with three sources.',
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
    { step: '01', title: 'Write the brief', desc: 'How often you send updates, who receives them and what this one most has to say. Attach it and the last one. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'This update against the last: metrics, promises, cash and runway, and the asks.' },
    { step: '04', title: 'The report', desc: 'Findings section by section inside the stated turnaround, ranked by what an investor would notice first.' },
  ],

  limits: [
    { title: 'Not investment or financial advice', body: 'No opinion on the company, its value or whether to raise. Investor Update is not an investor, an adviser or an accountant.' },
    { title: 'Not a verification', body: 'No figure is checked against the books — only against the other figures the updates state.' },
    { title: 'Nothing is written or rewritten', body: 'No sentence is drafted. Your updates come back exactly as they arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no figures about rounds raised. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Will you tell us how the company is doing or whether to raise?', a: 'No, and it is the one thing consistently declined. Those judgements belong to the founders and the investors. What the report answers is whether this update agrees with the last and with itself — which is a fact about two documents.' },
    { q: 'Our investors are friendly. Is a review worth it?', a: 'Friendly investors are the ones who keep every update and read them in sequence, because they care. A changed metric or an unanswered promise is exactly what a careful friend notices, and the first thing that turns a friend into a worried one.' },
    { q: 'Can you rewrite the update?', a: 'No. Nothing is drafted. The update has to be in the founder’s voice, because the investor is reading the founder. The report says where it disagrees with the last one; what to say is yours.' },
    { q: 'What do investors compare first?', a: 'Usually the headline metric against last time, then cash and runway, then whatever was promised last time. The report checks those first.' },
    { q: 'How much can we redact?', a: 'Customer names can go and figures can be scaled, as long as this update and the last are scaled the same way. Arithmetic between figures is what is read.' },
    { q: 'Is the update confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed. Investor communications are sensitive and are treated accordingly.' },
  ],

  resources: [
    {
      title: 'A metric that changes definition has to say so',
      summary: 'MRR last month, annualised bookings this month, both called revenue.',
      body: [
        'Definitions improve as a company learns what to measure, and the improved figure is usually larger. Reported without a note, it reads as growth.',
        'The response is to say what changed and restate last month on the new basis. The review compares every metric with its definition last time and flags the ones that moved.',
      ],
    },
    {
      title: 'Last update’s promise has to be answered',
      summary: 'The deal “closing by the 15th”, three updates ago.',
      body: [
        'Updates report what happened; promises are about what was expected. When an expectation slips, the update moves on, and the investor notices the gap.',
        'The response is to read last month’s update before writing this one and answer every promise in it. The review lists those promises and says where each is answered.',
      ],
    },
    {
      title: 'Burn, cash and runway have to agree',
      summary: 'Cash fell by more than burn, and runway stayed the same.',
      body: [
        'The three figures often come from different places — the bank, a model, a rule of thumb — and each is updated separately. An investor checks them against each other in their head.',
        'The response is to derive runway from cash and burn in the update itself. The review checks the arithmetic between them and against last time.',
      ],
    },
    {
      title: 'An ask has to be something an investor can do today',
      summary: '“Intros to anyone in fintech.”',
      body: [
        'Broad asks feel inclusive and produce nothing, because nobody reading them knows which of their contacts is meant. Specific asks produce emails.',
        'The response is to name the company, the role or the outcome. The review reads every ask for whether a specific investor could act on it today.',
      ],
    },
  ],

  legal: {
    entity: 'Investor Update',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
