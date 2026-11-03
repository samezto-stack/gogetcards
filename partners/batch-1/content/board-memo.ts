import type { SiteContent } from './types';

/**
 * Board Memo — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE MEMO. One board memo is one document, so the
 * ladder is the whole catalogue and rung N is N memos.
 *
 * NO VIEW ON THE DECISION, AND THAT IS THE BOUNDARY. Which option is right,
 * whether the board should approve, what directors’ duties require, belongs
 * to the board and its advisers. Whether the memo states the decision, whether
 * the options are compared on the same terms, and whether its figures agree
 * with their sources, is a fact about a document. The second is the product.
 */
export const site: SiteContent = {
  name: 'Board Memo',
  strapline: 'Option C costs £2.1m on page two and £2.6m in the appendix.',
  whopUrl: 'https://whop.com/board-memo/',
  returnUrl: 'https://board-memo-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Board memos, per memo',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/board-memo-review',

    about: {
      title: 'A board memo is not a report on a project. It is a request for a decision a director must be able to make from the memo alone.',
      intro:
        'Board Memo reads one memo the way the director who has twenty minutes before the meeting reads it — recommendation against options: checking that the decision being asked for is stated on the first page, that the options are real alternatives compared on the same terms, that every figure agrees with the appendix and the rest of the pack, and that every risk has an owner and a consequence.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'Board memos are written by the people closest to the decision, who have usually already made it. They write to explain a conclusion, not to equip someone else to reach one. So the decision being asked for appears on page four after the history of the project, the alternative options are described in a paragraph each while the recommendation gets two pages, the cost of the recommended option is £2.1m in the summary and £2.6m in the appendix, and the risk section lists risks with no owner and no say on what happens if they occur.',
            'So the review reads the memo as the director does. The decision is looked for on the first page and stated in a sentence. The options are read for whether they are genuine alternatives, compared on the same criteria with the same depth. Every figure is checked against the appendix, the financials and the other papers supplied. And every risk is read for an owner, a likelihood, a consequence and what is being done about it.',
          ],
        },
        {
          title: 'Why the option set up to lose is the classic',
          paras: [
            'The author knows which option they want, and the alternatives are included because a board expects alternatives. So one option is “do nothing”, described only by its downside, and another is the recommendation at twice the cost. Neither is something anyone would choose. The director can see that the memo offers one option and two decoys, and either rubber-stamps it or starts asking the questions the memo should have answered.',
            'The damage is to the board’s ability to decide. A choice between one option and two straw men is not a choice, and a careful director will take the decision to the next meeting rather than make it. The review reads each option for whether it is described with the same depth, costed on the same basis and assessed against the same criteria as the one recommended.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not governance, legal or financial advice, and Board Memo is not a company secretary, a lawyer, a governance consultant or a director. No opinion is offered on which option is right, whether the board should approve, what directors’ duties require, or whether the paper is sufficient for any legal or regulatory purpose. No figure is verified against the books.',
            'It is also not a writing service. No paragraph is drafted and no memo restructured. The report says where the decision is buried, where an option is not a real alternative, where a figure disagrees with its source and where a risk has no owner; writing the memo and standing behind it belongs to its author.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every memo is read in full with the papers it relies on, as a director preparing for the meeting will read it, because the failures that matter are between the summary and the appendix and between the options. A sound recommendation can be deferred a quarter because the memo made it look like the only option and the director noticed.',
      },
    },

    standards: {
      intro:
        'This report is about a document a board will rely on to make a decision, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'No view on the decision', body: 'No opinion on which option is right or whether the board should approve. Board Memo recommends nothing.' },
        { title: 'Not governance, legal or financial advice', body: 'No view on directors’ duties, procedure, disclosure or the adequacy of the paper for any formal purpose. Nothing here may be relied on as advice.' },
        { title: 'The document, not the decision', body: 'The subject is whether the memo states the decision, compares the options fairly and agrees with its sources. The decision stays with the board.' },
        { title: 'Nothing is written or rewritten', body: 'No paragraph is drafted and no memo restructured. Your memo and papers are returned exactly as they arrived.' },
        { title: 'Read as the director reads it', body: 'Figures are checked against the papers you supply, not against the books. A figure with no source supplied is reported as unsourced.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for anyone writing to a board. If one note moves a decision from page four to page one, it has done its job.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the memo, its appendices, and any other papers in the pack it relies on. Names and figures can be redacted or scaled, as long as the memo and its sources are treated the same way.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Board Memo Review — the memo as it will go in the pack.',
        'Its appendices and any other papers it relies on — financials, a business case, a prior paper.',
        'What the board is being asked to decide, in your own words, so the memo can be read against it.',
      ],
      next:
        'The report comes back recommendation against options: where the decision is buried, where an option is not a real alternative, where a figure disagrees with the appendix, and where a risk has no owner.',
    },
  },

  hero: {
    eyebrow: 'Board memos',
    title: 'The memo is clear and the recommendation is confident.',
    titleAccent: 'The cost on page two is not the cost in the appendix.',
    body:
      'One board memo read the way the director with twenty minutes before the meeting reads it: the decision checked for being stated on the first page, the options checked for being real alternatives compared on the same terms, every figure checked against the appendix, and every risk checked for an owner and a consequence.',
    primaryCta: { label: 'Start a brief', to: '/services/board-memo-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'The decision on page one', body: 'The decision being asked for looked for on the first page and stated in a sentence — approve, note, choose between — so a director knows what they are reading for before they read it.' },
    { title: 'Options that are real', body: 'Every option read for the same depth, the same costing basis and the same criteria as the one recommended, so the board is choosing between alternatives and not between one option and two decoys.' },
    { title: 'Figures that match the pack', body: 'Every number in the memo checked against the appendix, the financials and the other papers supplied, so the summary and its sources describe the same proposal.' },
    { title: 'Risks with an owner', body: 'Every risk read for who owns it, how likely it is, what happens if it occurs and what is being done — because a risk without those is a worry, and a board cannot weigh a worry.' },
  ],

  services: [
    {
      slug: 'board-memo-review',
      name: 'Board Memo Review',
      tagline: 'One memo, read the way a director preparing for the meeting reads it.',
      summary:
        'The full read: the decision checked for being stated early, the options compared for depth and basis, every figure checked against the appendix and the pack, and every risk checked for an owner and a consequence.',
      unitLabel: 'Memos',
      unitNoun: 'memo',
      unitNounPlural: 'memos',
      unitRate: 49.99,
      checkoutHeading: 'How many memos?',
      brief: {
        intro:
          'Everything below is used to read the memo the way a director will. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'kind', label: 'What kind of paper', type: 'select', required: true, half: true,
            options: ['Decision paper', 'Investment or capital request', 'Strategy paper', 'Paper for noting', 'Committee paper', 'Something else — say so below'],
            help: 'A decision paper is read for its options; a paper for noting for what it asks directors to accept.' },
          { name: 'board', label: 'Which board or committee', type: 'text', required: true, half: true,
            placeholder: 'Main board — seven directors, three non-executive',
            help: 'The memo is read for what those directors will look for first.' },
          { name: 'organisation', label: 'Kind of organisation', type: 'select', required: true, half: true,
            options: ['Private company', 'Venture-backed company', 'Charity or nonprofit', 'Public body', 'Listed company', 'Not sure'],
            help: 'Different boards read with different expectations.' },
          { name: 'purpose', label: 'What the board is being asked to decide', type: 'area', required: true,
            placeholder: 'Approve a £2.1m capital spend on a second warehouse, or defer to Q3.',
            help: 'In your own words. The memo is read against this, and the first finding is whether it says the same.' },
          { name: 'papers', label: 'Other papers it relies on', type: 'text', required: false, half: true,
            placeholder: 'Business case appendix and the Q2 management accounts',
            help: 'So figures can be checked against their sources.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'The do-nothing option is described in two lines and a director will call it out.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'The legal risk is covered in a separate confidential paper to the same meeting.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The memo and its sources',
          required: true,
          requiredNote: 'The review reads the memo against its appendices and sources, so send them together',
          accept: ['.pdf', '.docx', '.pptx', '.xlsx', '.csv', '.txt', '.zip'],
          maxMb: 60,
          maxFiles: 15,
          help:
            'The memo as it will go in the pack, its appendices, and any other papers it relies on.',
        },
      },
      process: [
        { step: '01', title: 'State the decision', desc: 'What the board is asked to decide, written down from your brief and then looked for in the memo.' },
        { step: '02', title: 'Read the options', desc: 'Each option checked for depth, costing basis and criteria against the one recommended.' },
        { step: '03', title: 'Check every figure', desc: 'Each number in the memo compared with the appendix and the papers supplied.' },
        { step: '04', title: 'Read the risks', desc: 'Each risk checked for an owner, a likelihood, a consequence and a response.' },
        { step: '05', title: 'Read it in twenty minutes', desc: 'The memo read once more as a director pressed for time, for what they would miss or misread.' },
        { step: '06', title: 'Report', desc: 'Findings section by section inside the stated turnaround, ranked by what a director would question first.' },
      ],
      included: [
        'The decision asked for, checked for being stated early and plainly',
        'A memo whose decision differs from your brief, flagged',
        'Every option read for depth, costing basis and criteria',
        'An option set up to lose, surfaced',
        'Every figure checked against the appendix and other papers',
        'A figure that differs between the summary and its source, listed',
        'Every risk checked for an owner, likelihood, consequence and response',
        'Terms and acronyms used before they are explained, located',
        'What a director would have to ask that the memo should answer',
        'What a director would question first, first',
      ],
      turnaround: 'Three business days from the brief arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per memo. Its appendices are read as sources and are included. A pack with several decision papers is several memos, and they are often worth sending together, because a figure that disagrees between two papers is clearest side by side.',
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
    { step: '01', title: 'Write the brief', desc: 'What kind of paper, which board, and what it is being asked to decide. Attach the memo and its sources. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'The memo with its sources: the decision, the options, every figure and every risk.' },
    { step: '04', title: 'The report', desc: 'Findings section by section inside the stated turnaround, ranked by what a director would question first.' },
  ],

  limits: [
    { title: 'No view on the decision', body: 'No opinion on which option is right. Board Memo is not a director, an adviser or a company secretary.' },
    { title: 'Not governance or legal advice', body: 'No view on duties, procedure or whether the paper is sufficient for any formal purpose.' },
    { title: 'Nothing is written or rewritten', body: 'No paragraph is drafted. Your memo comes back exactly as it arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no figures about decisions approved. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Will you tell us whether the board should approve?', a: 'No, and it is the one thing consistently declined. The decision is the board’s. What the report answers is whether the memo equips a director to make it — the decision stated, the options real, the figures consistent and the risks owned.' },
    { q: 'The executive team has agreed the memo. Is a review still worth it?', a: 'An agreed memo is written by people who have already decided, which is exactly why its gaps are invisible to them. The director has not decided, and reads for what the memo assumes. The review reads it that way.' },
    { q: 'Can you rewrite the memo?', a: 'No. Nothing is drafted. The report lists each finding with where it is, so the author can fix it in their own voice.' },
    { q: 'What does a director look for first?', a: 'What they are being asked to do, then what it costs, then what the alternatives were. The report checks those first.' },
    { q: 'How much can we redact?', a: 'Names and figures can be redacted or scaled, as long as the memo and its sources are treated the same way. Agreement between figures is what is read.' },
    { q: 'Is the memo confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed. Board papers are sensitive and are treated accordingly.' },
  ],

  resources: [
    {
      title: 'The decision has to be on the first page',
      summary: 'The request, on page four, after the history of the project.',
      body: [
        'Authors write in the order they lived it: background, work done, findings, recommendation. Directors read in the order they need it: what am I deciding, and why. A decision on page four is read last and remembered least.',
        'The response is one sentence at the top saying what the board is asked to do. The review looks for it and says where it actually is.',
      ],
    },
    {
      title: 'An option set up to lose is not an option',
      summary: '“Do nothing”, described only by its downside.',
      body: [
        'Boards expect alternatives, so alternatives are supplied — often ones nobody would choose. A director can tell, and either rubber-stamps or defers.',
        'The response is to describe each option with the same depth, the same costing basis and the same criteria. The review reads every option against the recommended one for exactly that.',
      ],
    },
    {
      title: 'The figure in the memo has to match the appendix',
      summary: '£2.1m in the summary, £2.6m in the business case.',
      body: [
        'Summaries are written from an earlier version of the numbers, and appendices are updated later. The two drift, and the director who checks one against the other stops trusting both.',
        'The response is to write the summary last, from the appendix. The review checks every figure in the memo against its source.',
      ],
    },
    {
      title: 'A risk without an owner is a worry',
      summary: 'A list of risks with no one responsible and no consequence stated.',
      body: [
        'Risk sections list what could go wrong. A board needs to know who is watching it, what it would cost, and what is being done — otherwise it cannot weigh the risk against the benefit.',
        'The response is an owner, a likelihood, a consequence and a response for each. The review checks every risk for all four.',
      ],
    },
  ],

  legal: {
    entity: 'Board Memo',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
