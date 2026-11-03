import type { SiteContent } from './types';

/**
 * Launch Plan — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE PLAN. One launch plan is one document, so the
 * ladder is the whole catalogue and rung N is N plans.
 *
 * NO VIEW ON THE LAUNCH, AND THAT IS THE BOUNDARY. Whether to launch, when,
 * with what message, belongs to the team. Whether every task has one owner
 * and a date, whether dependencies finish first, whether go/no-go is stated
 * and the announcement matches the scope, is a fact about documents. The
 * second is the product.
 */
export const site: SiteContent = {
  name: 'Launch Plan',
  strapline: 'The embargo lifts at nine. The feature flag flips at eleven.',
  whopUrl: 'https://whop.com/launch-plan/',
  returnUrl: 'https://launch-plan-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Launch plans, per plan',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/launch-plan-review',

    about: {
      title: 'A launch plan is not a checklist of good intentions. It is the script for a day that cannot be repeated.',
      intro:
        'Launch Plan reads one plan the way the person running launch day reads it — tasks against owners, dates and dependencies: checking that every task has one owner and a date, that every dependency finishes before the task that needs it, that go/no-go criteria are stated and measurable, that a rollback exists, and that the announcement claims only what actually ships.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'Launch plans are built by many teams in one shared document, each adding their own tasks with their own sense of timing. Marketing plans the announcement, engineering plans the release, support plans the help content, sales plans the outreach. Nobody reads the whole thing in time order with a clock. So the press embargo lifts at nine and the feature flag flips at eleven, the help article is due the day after launch, “final QA” is owned by “Eng/Product”, go/no-go is a meeting with no criteria, and the announcement describes the export feature that was cut from scope last week.',
            'So the review reads the plan as launch day does. Every task is checked for exactly one owner and a date or time. Every dependency — stated, or implied by what the task needs — is checked for finishing first. The go/no-go section is read for criteria a person could measure on the morning. The rollback is looked for. And every claim in the announcement, release notes or sales material is checked against the scope the plan says ships.',
          ],
        },
        {
          title: 'Why the order of the morning is the classic',
          paras: [
            'Each team times its own tasks sensibly. The announcement goes at nine because that is when the audience reads; the release goes at eleven because that is when engineering is all online. Neither is wrong. Together they mean customers read about a feature and click through to a product that does not have it.',
            'The damage is concentrated in the first hour, which is the hour that is remembered. The review lays every timed task on one clock and checks each dependency against it, so the morning happens in the order it has to.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not project management, marketing or launch consulting, and Launch Plan is not an agency, a project manager or a consultant. No opinion is offered on whether to launch, when, with what message, at what price or to whom. No go/no-go decision is made or recommended.',
            'It is also not a planning service. No task is moved, reassigned or rewritten and no message drafted. The report says where a task has no single owner, where a dependency is out of order, where go/no-go has no criteria, where there is no rollback and where the announcement claims what does not ship; running the launch is yours.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every plan is read in full in time order, with the announcement beside it, because the failures that matter are between teams. A well-prepared launch can stumble in its first hour because two sensible timings were never put on the same clock.',
      },
    },

    standards: {
      intro:
        'This report is about a plan for a day that cannot be repeated, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'No view on the launch', body: 'No opinion on whether to launch, when, with what message or to whom. Launch Plan decides nothing.' },
        { title: 'Not project management or marketing', body: 'Nothing here runs a task, writes a message or manages a team.' },
        { title: 'The document, not the product', body: 'The subject is whether the plan’s owners, dates, dependencies and claims agree. Whether the product is ready stays with you.' },
        { title: 'Nothing is moved or rewritten', body: 'No task is moved or reassigned and no message drafted. Your plan is returned exactly as it arrived.' },
        { title: 'Read as launch day reads it', body: 'Findings rest on the plan and materials supplied. Scope is taken as the plan states it.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for teams who launch rarely enough to forget what went wrong last time.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the plan, the announcement and any release notes or sales material, and the final scope. Unreleased names can be replaced with placeholders, consistently.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Launch Plan Review — the plan in its current version.',
        'The announcement, release notes or sales material that go out with it.',
        'The final scope — what ships and what was cut — so the announcement can be read against it.',
      ],
      next:
        'The report comes back tasks against owners, dates and dependencies: tasks without one owner, dependencies out of order, go/no-go without criteria, a missing rollback, and claims that do not match scope.',
    },
  },

  hero: {
    eyebrow: 'Launch plans',
    title: 'The plan is detailed and every team signed up.',
    titleAccent: 'The embargo lifts two hours before the feature is live.',
    body:
      'One launch plan read the way the person running launch day reads it: every task checked for one owner and a date, every dependency checked for finishing first, go/no-go criteria checked for being measurable, the rollback checked for existing, and the announcement checked against what ships.',
    primaryCta: { label: 'Start a brief', to: '/services/launch-plan-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'One owner, one date', body: 'Every task checked for exactly one named owner and a date or time, because a task owned by “Eng/Product” is owned by whoever notices it is late.' },
    { title: 'Dependencies on one clock', body: 'Every timed task laid on one timeline and every dependency checked for finishing first — the release before the announcement, the help article before the support queue opens.' },
    { title: 'Go/no-go with a number', body: 'The go/no-go section read for criteria someone could measure on the morning — error rate, test pass, sign-off by name — rather than a meeting where people say how they feel.' },
    { title: 'Claims that match scope', body: 'Every claim in the announcement, release notes and sales material checked against what the plan says ships, so the feature cut last week is not announced this week.' },
  ],

  services: [
    {
      slug: 'launch-plan-review',
      name: 'Launch Plan Review',
      tagline: 'One plan, read the way the person running launch day reads it.',
      summary:
        'The full read: every task checked for one owner and a date, dependencies on one clock, go/no-go checked for measurable criteria, the rollback looked for, and the announcement checked against scope.',
      unitLabel: 'Plans',
      unitNoun: 'plan',
      unitNounPlural: 'plans',
      unitRate: 49.99,
      checkoutHeading: 'How many plans?',
      brief: {
        intro:
          'Everything below is used to read the plan the way launch day will. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'kind', label: 'What is launching', type: 'select', required: true, half: true,
            options: ['Software feature or release', 'New product', 'Physical product', 'Campaign', 'Event or programme', 'Something else — say so below'],
            help: 'A software release is read hardest for timing; a physical product for stock and logistics tasks.' },
          { name: 'date', label: 'Launch date', type: 'text', required: true, half: true,
            placeholder: '14 March, 09:00 New York',
            help: 'So the plan can be read on one clock, in one time zone.' },
          { name: 'teams', label: 'Teams involved', type: 'text', required: true, half: true,
            placeholder: 'Engineering, marketing, support, sales, partners',
            help: 'So the read knows whose tasks to expect.' },
          { name: 'purpose', label: 'What must not go wrong', type: 'area', required: true,
            placeholder: 'Customers must not be able to read about the feature before they can use it.',
            help: 'This ranks the findings.' },
          { name: 'scope', label: 'Where the final scope is stated', type: 'text', required: false, half: true,
            placeholder: 'Scope doc v3, attached; export cut on 2 March',
            help: 'So the announcement can be checked against what actually ships.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'Nobody seems to own the status page update.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'Rollback is a separate runbook owned by the platform team.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The plan and what goes out with it',
          required: true,
          requiredNote: 'The review reads the plan against the announcement and scope, so send them together',
          accept: ['.pdf', '.xlsx', '.csv', '.docx', '.pptx', '.txt', '.md', '.zip'],
          maxMb: 60,
          maxFiles: 15,
          help:
            'The launch plan, the announcement and any release notes or sales material, and the final scope.',
        },
      },
      process: [
        { step: '01', title: 'Put it on one clock', desc: 'Every timed task laid on a single timeline in one time zone.' },
        { step: '02', title: 'Check every owner', desc: 'Each task checked for exactly one named owner and a date or time.' },
        { step: '03', title: 'Check every dependency', desc: 'Each stated or implied dependency checked for finishing first.' },
        { step: '04', title: 'Read go/no-go and rollback', desc: 'Criteria checked for being measurable, the rollback looked for.' },
        { step: '05', title: 'Read the announcement against scope', desc: 'Each claim checked against what the plan says ships.' },
        { step: '06', title: 'Report', desc: 'Findings section by section inside the stated turnaround, ranked by what would go wrong first on the day.' },
      ],
      included: [
        'Every task checked for exactly one owner',
        'Every task checked for a date or time',
        'All timed tasks laid on one clock in one time zone',
        'Every dependency checked for finishing before what needs it',
        'Go/no-go criteria checked for being stated and measurable',
        'The rollback looked for, and its trigger checked for being stated',
        'Every claim in the announcement checked against scope',
        'Customer-facing tasks — help, support, status — checked for being ready at launch',
        'Tasks that appear in one team’s list and not the master plan, listed',
        'What would go wrong first on the day, first',
      ],
      turnaround: 'Three business days from the brief arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per plan, with its announcement and scope included. A launch in several regions on different days is usually one plan per region, because the clock is different.',
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
    { step: '01', title: 'Write the brief', desc: 'What is launching, when, which teams and what must not go wrong. Attach the plan, the announcement and the scope. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'On one clock: owners, dates, dependencies, go/no-go, rollback and the announcement against scope.' },
    { step: '04', title: 'The report', desc: 'Findings section by section inside the stated turnaround, ranked by what would go wrong first on the day.' },
  ],

  limits: [
    { title: 'No view on the launch', body: 'No opinion on whether or when to launch. Launch Plan is not an agency, a project manager or a consultant.' },
    { title: 'No go/no-go decision', body: 'Nothing here makes or recommends the call. The report says whether the criteria exist.' },
    { title: 'Nothing is moved or rewritten', body: 'No task is moved and no message drafted. Your plan comes back exactly as it arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no figures about launches. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Will you tell us whether we are ready to launch?', a: 'No, and it is the one thing consistently declined. Readiness is the team’s call. What the report answers is whether the plan gives the team what it needs to make that call and run the day — owners, order, criteria and a way back.' },
    { q: 'We have launched many times. Is this still worth it?', a: 'Experienced teams write good plans in their own sections. The failures are between sections — two sensible timings on different clocks — and they are the same failures every time because nobody reads the whole plan in order.' },
    { q: 'Can you fix the plan?', a: 'No. Nothing is moved or reassigned. The report lists each finding with the task it concerns, so the launch owner can fix it.' },
    { q: 'What fails most often on the day?', a: 'Announcements that go before the release, customer-facing content that is not ready, and tasks with two owners. The report checks those first.' },
    { q: 'How close to launch can we send it?', a: 'Any time, but the turnaround is three business days, so send it with enough room to act on the findings.' },
    { q: 'Is the plan confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed. Unannounced launches are sensitive and are treated accordingly.' },
  ],

  resources: [
    {
      title: 'A task with two owners has none',
      summary: '“Final QA — Eng/Product.”',
      body: [
        'Shared ownership feels collaborative when the plan is written and becomes nobody’s on the day, because each owner reasonably assumes the other has it.',
        'The response is one name per task, with others as contributors. The review checks every task for one owner.',
      ],
    },
    {
      title: 'The embargo cannot lift before the feature is live',
      summary: 'Nine o’clock news, eleven o’clock release.',
      body: [
        'Each team times its own work well. Marketing goes when the audience reads; engineering when the team is online. Nobody puts both on one clock.',
        'The response is one timeline for the whole morning. The review lays every timed task on one clock and checks each dependency against it.',
      ],
    },
    {
      title: 'Go/no-go needs a number',
      summary: 'A meeting where people say how they feel.',
      body: [
        'Go/no-go meetings without criteria become meetings about confidence, and confidence on launch morning is always high. The decision gets made by momentum.',
        'The response is measurable criteria agreed in advance. The review reads the go/no-go section for criteria someone could check on the morning.',
      ],
    },
    {
      title: 'A launch without a rollback is a bet',
      summary: 'The plan that only goes forward.',
      body: [
        'Rollback is planned by people who expect not to need it, so it is often left for later. Later is during the incident.',
        'The response is a rollback with a trigger, an owner and steps. The review looks for one and says what it lacks.',
      ],
    },
  ],

  legal: {
    entity: 'Launch Plan',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
