import type { SiteContent } from './types';

/**
 * Safety Plan — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE PLAN. One safety plan is one document, so the
 * ladder is the whole catalogue and rung N is N plans.
 *
 * NOT A SAFETY ASSESSMENT, AND THAT IS THE BOUNDARY. Whether anything is
 * safe, whether a control is adequate, what the law requires, belongs to the
 * people responsible and their competent advisers, and nothing here goes near
 * it. Whether the plan mentions every activity in its own running order,
 * names an owner for each control, and sends people to an assembly point that
 * is on its own map, is a fact about documents. The second is the product.
 */
export const site: SiteContent = {
  name: 'Safety Plan',
  strapline: 'The running order has a fireworks finale. The hazard list does not.',
  whopUrl: 'https://whop.com/safety-plan/',
  returnUrl: 'https://safety-plan-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Safety plans, per plan',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/safety-plan-review',

    about: {
      title: 'A safety plan is not a document for the file. It is a set of instructions people follow on the day.',
      intro:
        'Safety Plan reads one plan against the documents it describes — plan against schedule, map and roster: checking that every activity in the running order appears in the hazard section, that every control has a named owner, that every role is filled by someone actually rostered, and that the emergency procedures send people to places that exist on the map. It is a document check, not a safety assessment.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'A safety plan is usually written early, adapted from the last event or the last job, and approved before the details settle. Then the running order changes, the site map is redrawn, the staffing list is filled. Each change is made in its own document by its own owner. So the plan’s hazard section covers last year’s activities and not the fireworks added in August, the controls say “stewards will” without saying which, the first-aid lead is someone who is not on the roster, and the assembly point is in a field that the new map shows as the car park.',
            'So the review reads the plan against its own supporting documents. Every activity in the running order and every area on the site map is looked for in the hazard section. Every control is checked for a named person or role. Every role in the plan is checked against the staffing list. And every emergency procedure — routes, assembly points, contacts, rendezvous for services — is checked against the map and the contact list.',
          ],
        },
        {
          title: 'Why the late addition is the classic',
          paras: [
            'The plan is approved, and then the event improves. An extra act, a new attraction, a changed load-in time, a second stage. Each is a programming decision made by someone thinking about the audience, and none of them feels like a change to the safety plan. The plan that is filed describes an event that no longer exists.',
            'The damage is that the activity most recently added is the one least thought about, and it is not in the document people will consult on the day. The review compares every activity in the current running order with the hazard section and lists the ones it does not cover, so the people responsible can decide what to do about them.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not a safety assessment, a risk assessment or an inspection, and Safety Plan is not a safety consultant, a competent person, an inspector or a regulator. No opinion is offered on whether any activity is safe, whether a control is adequate, what the law or a licence requires, or whether the plan is fit for approval. Nothing here visits a site.',
            'It is also not a writing service. No plan is rewritten, no hazard assessed and no control proposed. The report says where the plan and its supporting documents disagree; what to do about each gap is for the people responsible for the event or the work and their competent advisers.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every plan is read in full against the schedule, map and roster supplied, because the failures that matter are between documents owned by different people. A careful plan can describe last month’s event perfectly, and the gap is visible only when it is read beside this month’s running order.',
      },
    },

    standards: {
      intro:
        'This report is about a document people’s safety may depend on, so what it is and is not is stated very plainly before anything else.',
      extra: [
        { title: 'Not a safety or risk assessment', body: 'No opinion on whether anything is safe or whether any control is adequate. No report may be described as a safety assessment, a risk assessment or an inspection.' },
        { title: 'No approval, certification or sign-off', body: 'Nothing here approves, certifies or signs off a plan, and no report may be presented to a licensing authority, client or insurer as doing so.' },
        { title: 'Not legal or regulatory advice', body: 'No view on what any law, regulation, licence or standard requires.' },
        { title: 'Nothing is rewritten', body: 'No plan is redrafted and no control proposed. Your documents are returned exactly as they arrived.' },
        { title: 'Documents against documents', body: 'Findings say where the plan and its supporting documents disagree. Nothing here visits a site, and the report is only as complete as the documents supplied.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for organisers and managers who keep a plan and a running order in different files.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the plan, the current running order or programme of work, the site map, and the staffing list or roster. Personal phone numbers can be redacted; roles and names on the roster cannot, since that is what is checked.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Safety Plan Review — the plan in its current version.',
        'The current running order or programme of work, the site map and the staffing list.',
        'Who approves the plan and when, so the findings can be ranked by what must be resolved first.',
      ],
      next:
        'The report comes back plan against documents: activities the hazard section does not cover, controls without an owner, roles not on the roster, and emergency procedures that do not match the map.',
    },
  },

  hero: {
    eyebrow: 'Safety plans',
    title: 'The plan is thorough and it was approved in June.',
    titleAccent: 'The fireworks were added in August.',
    body:
      'One safety plan read against its own running order, site map and staffing list: every activity checked for appearing in the hazard section, every control checked for a named owner, every role checked against the roster, and the emergency procedures checked against the map. A document check, not a safety assessment.',
    primaryCta: { label: 'Start a brief', to: '/services/safety-plan-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'Every activity in the hazard section', body: 'Every item in the current running order or programme of work, and every area on the site map, looked for in the plan’s hazard section — including the ones added after the plan was written.' },
    { title: 'Every control with an owner', body: 'Every control checked for a named person or role responsible for it, because “stewards will monitor” is an intention until someone in particular is doing it.' },
    { title: 'Every role on the roster', body: 'Every role the plan relies on — first aid, safety lead, stewards, radio control — checked against the people actually rostered for the day.' },
    { title: 'Emergency routes on the map', body: 'Every route, assembly point, access gate and rendezvous in the emergency procedures checked against the current site map and contact list.' },
  ],

  services: [
    {
      slug: 'safety-plan-review',
      name: 'Safety Plan Review',
      tagline: 'One plan, read against the schedule, map and roster it is supposed to describe.',
      summary:
        'The full comparison: activities against the hazard section, controls against named owners, roles against the roster, and emergency procedures against the map. A document check, not a safety assessment.',
      unitLabel: 'Plans',
      unitNoun: 'plan',
      unitNounPlural: 'plans',
      unitRate: 49.99,
      checkoutHeading: 'How many plans?',
      brief: {
        intro:
          'Everything below is used to read the plan against its supporting documents. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'kind', label: 'What the plan covers', type: 'select', required: true, half: true,
            options: ['Public event', 'Private or corporate event', 'Sports event', 'Construction or maintenance work', 'Filming or production', 'Something else — say so below'],
            help: 'This sets which documents are expected alongside the plan.' },
          { name: 'scale', label: 'Scale', type: 'text', required: true, half: true,
            placeholder: 'One day, about 3,000 attendees, two stages',
            help: 'So the read knows how many activities and areas to expect.' },
          { name: 'approval', label: 'Who approves the plan', type: 'text', required: true, half: true,
            placeholder: 'Local authority safety advisory group, in three weeks',
            help: 'Findings are ranked by what must be resolved before that point.' },
          { name: 'purpose', label: 'What has changed since the plan was written', type: 'area', required: true,
            placeholder: 'Added a second stage and moved the bar; new site map dated 12 August.',
            help: 'Changes since the plan are where gaps usually are, so this ranks the findings.' },
          { name: 'documents', label: 'Supporting documents supplied', type: 'text', required: false, half: true,
            placeholder: 'Running order v6, site map v4, staffing rota',
            help: 'So the report can say which versions it was checked against.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'The first-aid provider changed and the plan still names the old one.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'The pyrotechnics contractor has its own plan, referenced but not reproduced.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The plan and its supporting documents',
          required: true,
          requiredNote: 'The review reads the plan against the running order, site map and roster, so send them together',
          accept: ['.pdf', '.docx', '.xlsx', '.csv', '.png', '.jpg', '.zip'],
          maxMb: 80,
          maxFiles: 20,
          help:
            'The plan, the current running order or programme, the site map and the staffing list. Personal phone numbers can be redacted.',
        },
      },
      process: [
        { step: '01', title: 'Read the supporting documents', desc: 'The running order, map and roster read first, so the plan can be checked against the event as it now is.' },
        { step: '02', title: 'Match activities to hazards', desc: 'Every activity and area looked for in the hazard section.' },
        { step: '03', title: 'Check every control for an owner', desc: 'Each control checked for a named person or role.' },
        { step: '04', title: 'Check roles against the roster', desc: 'Each role the plan relies on checked against the people rostered.' },
        { step: '05', title: 'Check emergency procedures against the map', desc: 'Routes, assembly points, gates and contacts checked against the map and contact list.' },
        { step: '06', title: 'Report', desc: 'Findings section by section inside the stated turnaround, ranked by what must be resolved before approval.' },
      ],
      included: [
        'Every activity in the running order looked for in the hazard section',
        'Activities added since the plan was written, listed',
        'Every area on the site map looked for in the plan',
        'Every control checked for a named owner',
        'Every role checked against the staffing list',
        'Emergency routes and assembly points checked against the map',
        'Contacts in the plan checked against the contact list',
        'Statements that contradict each other within the plan, located',
        'Which document versions the plan was checked against, stated',
        'What must be resolved before approval, first',
      ],
      turnaround: 'Three business days from the documents arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per plan. A plan with separate build, show and break plans is usually one plan with three sections; a festival with a separate plan per site is one per site. When in doubt, say so in the brief.',
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
    { step: '01', title: 'Write the brief', desc: 'What the plan covers, its scale, who approves it and what has changed. Attach the plan and its supporting documents. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The comparison', desc: 'The plan against the running order, map and roster: activities, controls, roles and emergency procedures.' },
    { step: '04', title: 'The report', desc: 'Findings section by section inside the stated turnaround, ranked by what must be resolved before approval.' },
  ],

  limits: [
    { title: 'Not a safety assessment', body: 'No opinion on whether anything is safe or any control adequate. Safety Plan is not a safety consultant, a competent person or an inspector.' },
    { title: 'No approval or certification', body: 'Nothing here approves, certifies or signs off a plan, and no report may be presented as doing so.' },
    { title: 'Nothing is rewritten', body: 'No plan is redrafted and no control proposed. Your documents come back exactly as they arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no figures about events. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Is this a safety or risk assessment?', a: 'No, and it must never be described as one. Nothing here judges whether an activity is safe, whether a control is adequate, or whether the plan meets any requirement. The review compares the plan with its own supporting documents and lists where they disagree. What to do about each gap is for the people responsible and their competent advisers.' },
    { q: 'Our organiser is very experienced. Is this still worth it?', a: 'Experience is what writes a good plan. The gaps the review finds are not judgement errors but changes made later in other documents by other people — an activity added, a map redrawn, a role reassigned. They are invisible from inside the plan.' },
    { q: 'Can you update the plan for us?', a: 'No. Nothing is redrafted and no hazard is assessed. The report lists each gap with where it is, so whoever owns the plan can update it.' },
    { q: 'What fails most often?', a: 'Activities added after the plan was written, controls with no named owner, and emergency procedures that refer to an older version of the site map.' },
    { q: 'Will you visit the site?', a: 'No. Nothing here visits a site or observes an event. The review is a comparison of documents and is only as complete as the documents supplied.' },
    { q: 'Are the documents confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed.' },
  ],

  resources: [
    {
      title: 'Every activity has to appear in the hazard section',
      summary: 'The finale added in August to a plan approved in June.',
      body: [
        'Programming changes are made to improve the event, by people thinking about the audience. None of them feels like a change to the safety plan, so the plan describes an earlier event.',
        'The response is to treat every running-order change as a question for the plan. The review compares the current running order with the hazard section and lists what it does not cover.',
      ],
    },
    {
      title: 'A control needs a name',
      summary: '“Stewards will monitor crowd density.”',
      body: [
        'Controls are written as things that will happen. On the day, things happen because a particular person does them. A control with no owner is one everyone assumes someone else has.',
        'The response is a named person or role for every control. The review checks each control for one and lists those without.',
      ],
    },
    {
      title: 'The emergency plan has to match the map',
      summary: 'An assembly point in a field the new map shows as the car park.',
      body: [
        'Maps are redrawn for good reasons — a new stage, a moved bar, a changed entrance — and the emergency section refers to the map as it was.',
        'The response is to re-read the emergency section every time the map changes. The review checks every route, assembly point and gate against the current map.',
      ],
    },
    {
      title: 'The plan has to match the roster',
      summary: 'A first-aid lead who is not on the staffing list.',
      body: [
        'Plans name roles and sometimes people; rosters are filled later. A role the plan relies on can end up unfilled, or filled by someone the plan does not name.',
        'The response is to check the plan against the final roster. The review compares every role in the plan with the staffing list supplied.',
      ],
    },
  ],

  legal: {
    entity: 'Safety Plan',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
