import type { SiteContent } from './types';

/**
 * Partner Brief — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE BRIEF. One brief to a partner is one document, so
 * the ladder is the whole catalogue and rung N is N briefs.
 *
 * NO VIEW ON THE WORK, AND THAT IS THE BOUNDARY. What to commission, which
 * partner, at what price, belongs to the client. Whether every deliverable is
 * listed, has acceptance criteria and a date that allows for review, and
 * whether one person is named to sign it off, is a fact about a document.
 * The second is the product.
 */
export const site: SiteContent = {
  name: 'Partner Brief',
  strapline: 'The brief asks for “a set of assets”. The agency will count them differently.',
  whopUrl: 'https://whop.com/partner-brief/',
  returnUrl: 'https://partner-brief-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Partner briefs, per brief',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/partner-brief-review',

    about: {
      title: 'A brief is not a description of what you want. It is the only document a partner can hold you to.',
      intro:
        'Partner Brief reads one brief to an agency, freelancer or partner the way the partner receiving it reads it — deliverables against acceptance, dates and approval: checking that every deliverable is listed and countable, that each has a written meaning of “done”, that each date allows for the inputs and review rounds it needs, that the budget covers the scope it describes, and that one named person decides when it is finished.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'Briefs are written by the person who has the picture in their head, quickly, because the partner is waiting. The partner reads it with a different question: what exactly am I being paid for, and how will I know I have finished? So the brief asks for “a launch toolkit” without listing what is in it, “high quality” is the only acceptance criterion, the final deadline leaves no room for the two review rounds the brief also promises, the budget is for a scope half this size, and approval sits with “the marketing team”.',
            'So the review reads the brief as the partner does. Every deliverable is listed and checked for whether it can be counted. Each is checked for acceptance criteria — format, size, quantity, standard, what will be checked. Every date is checked against the inputs the client owes and the review rounds the brief describes. The budget is read against the scope. And approval is checked for being one named person, with how many rounds of changes are included.',
          ],
        },
        {
          title: 'Why the uncountable deliverable is the classic',
          paras: [
            'The client writes the deliverable as a category — a toolkit, a set of assets, a campaign — because they know what they mean. The partner prices it by counting, and counts what the words allow. When the work comes back, the client counts differently, and the difference is a dispute about a sentence nobody thought was ambiguous.',
            'The damage is to the relationship as much as the budget, because each side is right about what the brief said. The review lists every deliverable as the partner would have to count it, and flags each one where the count depends on who is counting.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not procurement, project management, contract or legal advice, and Partner Brief is not an agency, a consultant, a project manager or a lawyer. No opinion is offered on what to commission, which partner to use, what the work should cost, whether the brief is creatively strong, or what any contract should say.',
            'It is also not a writing service. No brief is rewritten and no deliverable defined for you. The report says where a deliverable cannot be counted, where “done” is not defined, where a date does not allow for review, where the budget and scope disagree and where approval is unclear; writing the brief is yours.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every brief is read in full as the partner receiving it, because the failures that matter are the questions the partner will either ask or quietly answer for themselves. A clear vision can still produce a disputed invoice because one deliverable could be counted two ways.',
      },
    },

    standards: {
      intro:
        'This report is about a document two businesses will hold each other to, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'No view on the work', body: 'No opinion on what to commission, which partner to use, or whether the brief is creatively strong. Partner Brief advises on nothing.' },
        { title: 'Not procurement, contract or legal advice', body: 'No view on pricing, supplier selection or what a contract should say. Nothing here may be relied on as legal advice.' },
        { title: 'The document, not the project', body: 'The subject is whether the brief’s deliverables, criteria, dates, budget and approval agree. Whether the project is right stays with you.' },
        { title: 'Nothing is rewritten', body: 'No brief is redrafted. Your documents are returned exactly as they arrived.' },
        { title: 'Read as the partner reads it', body: 'Findings rest on the brief and references supplied. The budget is read only against the scope the brief describes.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for anyone who commissions work from people outside the building.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the brief, anything it refers to — brand guidelines, previous work, a statement of work — and who receives it. Names and figures can be redacted, as long as the budget stays in proportion to the scope.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Partner Brief Review — the brief as it will be sent.',
        'Anything it refers to — guidelines, examples, a statement of work.',
        'Who receives it and what must come back, in your own words.',
      ],
      next:
        'The report comes back deliverable by deliverable: what cannot be counted, where “done” is undefined, dates that leave no room for review, budget against scope, and who signs it off.',
    },
  },

  hero: {
    eyebrow: 'Partner briefs',
    title: 'The brief is inspiring and the partner is keen.',
    titleAccent: 'It asks for “a set of assets” and never says how many.',
    body:
      'One brief to an agency, freelancer or partner read the way the partner receiving it reads it: every deliverable listed and checked for being countable, each checked for what “done” means, every date checked against the review rounds it needs, the budget checked against the scope, and one named person checked for signing it off.',
    primaryCta: { label: 'Start a brief', to: '/services/partner-brief-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'Deliverables you can count', body: 'Every deliverable listed as the partner would have to count it — how many, in what formats, at what sizes — and each one flagged where the count depends on who is counting.' },
    { title: '“Done” written down', body: 'Every deliverable checked for acceptance criteria — what standard, what will be checked, what counts as finished — because “high quality” is a hope, not a criterion.' },
    { title: 'Dates with room for review', body: 'Every deadline checked against the inputs the client owes and the review rounds the brief promises, so the final date is reachable with the process it describes.' },
    { title: 'One person signs it off', body: 'Approval checked for one named decision-maker and a stated number of change rounds, because “the team” approving means every member can reopen it.' },
  ],

  services: [
    {
      slug: 'partner-brief-review',
      name: 'Partner Brief Review',
      tagline: 'One brief, read the way the partner receiving it reads it.',
      summary:
        'The full read: every deliverable listed and counted, acceptance criteria checked, every date against its review rounds, the budget against the scope, and approval checked for one named person.',
      unitLabel: 'Briefs',
      unitNoun: 'brief',
      unitNounPlural: 'briefs',
      unitRate: 49.99,
      checkoutHeading: 'How many briefs?',
      brief: {
        intro:
          'Everything below is used to read the brief the way your partner will. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'kind', label: 'What kind of work', type: 'select', required: true, half: true,
            options: ['Creative or design', 'Marketing or campaign', 'Software or web build', 'Research', 'Content or copy', 'Something else — say so below'],
            help: 'Different work is counted differently, so this sets how deliverables are read.' },
          { name: 'partner', label: 'Who receives it', type: 'text', required: true, half: true,
            placeholder: 'A design agency we have not worked with before',
            help: 'A new partner reads more literally than one who knows you.' },
          { name: 'stage', label: 'Where the brief is', type: 'select', required: true, half: true,
            options: ['Draft — before sending', 'Sent — before kickoff', 'In progress — something has gone wrong', 'Not sure'],
            help: 'A draft can change freely; a brief in progress is read for where the disagreement came from.' },
          { name: 'purpose', label: 'What must come back', type: 'area', required: true,
            placeholder: 'A launch toolkit: social assets, an email header and a landing page hero, by 1 May.',
            help: 'In your own words. The brief is read against this, and the first finding is whether it says the same.' },
          { name: 'budget', label: 'Budget and how it is set', type: 'text', required: false, half: true,
            placeholder: 'Fixed fee, $12k, two rounds of changes included',
            help: 'So the budget can be read against the scope.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'We think the agency will read “assets” as five and we mean twenty.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'Quantities are left open on purpose; we want their recommendation in the proposal.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The brief and its references',
          required: true,
          requiredNote: 'The review reads the brief as the partner will, so send it and anything it refers to',
          accept: ['.pdf', '.docx', '.pptx', '.xlsx', '.txt', '.md', '.zip'],
          maxMb: 60,
          maxFiles: 15,
          help:
            'The brief and anything it refers to — guidelines, examples, a statement of work or contract schedule.',
        },
      },
      process: [
        { step: '01', title: 'Read what must come back', desc: 'Your own description of the outcome, written down before the brief is read.' },
        { step: '02', title: 'List every deliverable', desc: 'Each deliverable listed as the partner would have to count it.' },
        { step: '03', title: 'Check acceptance', desc: 'Each deliverable checked for what “done” means.' },
        { step: '04', title: 'Check dates and budget', desc: 'Deadlines against inputs and review rounds; budget against scope.' },
        { step: '05', title: 'Check approval', desc: 'One named decision-maker and a stated number of change rounds looked for.' },
        { step: '06', title: 'Report', desc: 'Findings deliverable by deliverable inside the stated turnaround, ranked by what would be disputed first.' },
      ],
      included: [
        'Every deliverable listed as the partner would count it',
        'A deliverable that could be counted two ways, flagged',
        'Every deliverable checked for acceptance criteria',
        'Every deadline checked against client inputs and review rounds',
        'The budget read against the scope described',
        'Approval checked for one named person',
        'Change rounds checked for being stated',
        'Inputs the client owes — content, access, assets — listed with dates',
        'Differences between the brief and what you said must come back, compared',
        'What would be disputed first, first',
      ],
      turnaround: 'Three business days from the brief arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per brief. A brief and its statement of work are often worth sending together as one, because a deliverable described one way in each is clearest side by side.',
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
    { step: '01', title: 'Write the brief', desc: 'What kind of work, who receives it and what must come back. Attach the brief and its references. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'As the partner: deliverables, acceptance, dates, budget and approval.' },
    { step: '04', title: 'The report', desc: 'Findings deliverable by deliverable inside the stated turnaround, ranked by what would be disputed first.' },
  ],

  limits: [
    { title: 'No view on the work', body: 'No opinion on what to commission or which partner to use. Partner Brief is not an agency or a consultant.' },
    { title: 'Not procurement or legal advice', body: 'No view on price, supplier selection or contract terms.' },
    { title: 'Nothing is rewritten', body: 'No brief is redrafted. Your documents come back exactly as they arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no figures about projects. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Will you tell us whether the brief is good?', a: 'No, and it is the one thing consistently declined. Whether the idea is strong is yours. What the report answers is whether the partner can tell what to deliver, when it is done, and who says so.' },
    { q: 'We have briefed agencies for years. Is this still worth it?', a: 'Experience writes briefs that are clear to people who know you. The disputes come from the sentences that are clear to you and countable two ways by someone else. The review reads it as someone else.' },
    { q: 'Can you rewrite the brief?', a: 'No. Nothing is drafted. The report lists each finding with where it is, so you can fix it in your own words.' },
    { q: 'What do partners ask first?', a: 'How many, by when, and who approves. The report checks those first.' },
    { q: 'The project has already gone wrong. Is it too late?', a: 'No. Send the brief as it was sent; the report shows where the disagreement could have come from, which is usually the fastest way to resolve it.' },
    { q: 'Is the brief confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed.' },
  ],

  resources: [
    {
      title: 'Every deliverable needs a count',
      summary: '“A set of assets.”',
      body: [
        'Categories are clear to the person who wrote them and countable in many ways by the person who prices them.',
        'The response is to list deliverables as countable items with formats and sizes. The review lists each one as the partner would count it.',
      ],
    },
    {
      title: '“Done” has to be written down',
      summary: '“High quality, on brand.”',
      body: [
        'Without acceptance criteria, finished means whatever the approver feels on the day, and feelings change across review rounds.',
        'The response is criteria that could be checked by someone else. The review checks each deliverable for them.',
      ],
    },
    {
      title: 'A deadline has to include the review rounds',
      summary: 'Two rounds of changes, and no time for either.',
      body: [
        'Final dates are set backwards from a launch; review rounds are added as a courtesy. Together they often do not fit.',
        'The response is a schedule that includes client inputs and review time. The review checks each date against them.',
      ],
    },
    {
      title: 'One person has to sign it off',
      summary: '“Approval by the marketing team.”',
      body: [
        'A team approving means any member can reopen the work. The partner cannot tell which feedback is final.',
        'The response is one named approver and a stated number of rounds. The review checks the brief for both.',
      ],
    },
  ],

  legal: {
    entity: 'Partner Brief',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
