import type { SiteContent } from './types';

/**
 * Business Plan — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE PLAN. One business plan is one document, so the
 * ladder is the whole catalogue and rung N is N plans.
 *
 * NO VIEW ON THE BUSINESS, AND THAT IS THE BOUNDARY. Whether the business is
 * viable, whether it will raise, whether the strategy is right, is a judgement
 * belonging to the founder and the people who back it. Whether the narrative
 * and the financials tell the same story, whether the market is sized from the
 * bottom up as well as the top down, and whether the ask matches the use of
 * funds, is a fact about a document. The second is the product; the first is
 * theirs, and the distinction is in the hero, the limits, the footer and the
 * terms.
 */
export const site: SiteContent = {
  name: 'Business Plan',
  strapline: 'The narrative promises 40% growth a month. The model three tabs over says eight.',
  whopUrl: 'https://whop.com/business-plan/',
  returnUrl: 'https://business-plan-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Business plans, per plan',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/business-plan-review',

    about: {
      title: 'A business plan is not a description of the company you want to build. It is a case an investor or a lender reads for whether the story and the numbers are the same story.',
      intro:
        'Business Plan reads one plan the way the investor or lender deciding on it reads it — narrative against model: checking that the growth the words promise is the growth the spreadsheet shows, that the market is sized from the bottom up and not only the top down, that the raise matches what it is said to buy, and that the assumptions the whole thing rests on are stated rather than buried.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'A business plan is written in two halves by two different states of mind. The narrative is written to inspire — the vision, the market, the traction, the team — in the confident present tense of a pitch. The financial model is built separately, often by a different person or the same person on a different day, in the cautious arithmetic of a spreadsheet. Nobody reads the finished plan the way the investor will: narrative in one hand and model in the other, checking that they describe the same company. So the text promises hockey-stick growth the model never produces, the headcount in the story is not the headcount in the salary line, and the market the narrative calls enormous is a number pulled from a report with no path from it to a single sale.',
            'So the review reads the plan as the investor does. The narrative and the model are read against each other, claim by claim: the growth rate the words use against the growth the spreadsheet compounds, the hiring plan against the payroll line, the margins asserted against the margins the model computes. The market is checked for a bottom-up sizing — a path from a real customer and a real price to the total — not just a top-down figure borrowed from an analyst. The ask is checked against the use of funds and the runway it buys, and the key assumptions are checked for whether they are stated where a reader can test them or hidden in a cell.',
          ],
        },
        {
          title: 'Why the narrative that outruns the model is the classic',
          paras: [
            'The two halves of a plan are written to two different audiences in the author’s own head — the narrative to excite, the model to survive scrutiny — and they drift apart precisely because nobody sits them side by side. The founder knows both and holds them together by memory; the investor has only the document, and the first thing a good investor does is check whether the inspiring sentence and the defensible number agree. When the text says the company will triple and the model shows it growing by half, the investor does not conclude the company will triple. They conclude the author either does not understand their own model or is hoping the reader will not open it.',
            'The damage is that it costs the plan its credibility on every other point. An investor who finds the growth rate in the narrative contradicted by the model stops trusting the narrative, and reads the rest of the plan looking for the next gap rather than for the opportunity. The contradiction is invisible to the founder, who wrote each half when it was true to them, and glaring to the reader, who meets them together for the first time. The review reads every number in the narrative against the model that should produce it, so the plan tells one story in two forms rather than two stories that happen to share a cover.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not investment, fundraising or financial advice, and Business Plan is not an investor, an adviser, an accountant or a broker. No opinion is offered on whether the business is viable, whether it will raise, whether the valuation is right, or whether the strategy will work. Nothing here builds the model, writes the plan, sets the valuation, or introduces investors.',
            'It is also not a rewriting service. No section is drafted, no model built, no projection produced and no plan pitched on your behalf. The report says where the narrative and the model disagree, where the market has no bottom-up basis, where the ask does not match the use of funds, and where a load-bearing assumption is unstated; building the business and making the case belongs to the people who own it.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every plan is read in full and as the investor or lender will read it, because the failures that matter are between the story and the numbers rather than in the business itself. A genuinely strong company can fail to raise, because its narrative promised a growth its own model never produced and nobody noticed before the meeting.',
      },
    },

    standards: {
      intro:
        'This report is about a document a raise and sometimes a company turn on, so what it is and is not is stated before anything else.',
      extra: [
        {
          title: 'Not investment or fundraising advice',
          body:
            'No opinion on whether the business is viable, whether it will raise, or whether the valuation is right. Business Plan builds nothing and advises on no raise.',
        },
        {
          title: 'Not a valuation and not an endorsement',
          body:
            'Nothing here sets a valuation, forecasts a return, or endorses the business. No report may be shown to an investor as a valuation, an opinion, or a recommendation to invest.',
        },
        {
          title: 'The document, not the business',
          body:
            'The subject is whether the narrative and the model agree, the market is sized bottom-up, and the ask matches the use of funds. Whether the business will work stays with the founder and the market.',
        },
        {
          title: 'Nothing is written or modelled',
          body:
            'No section is drafted, no projection built and no plan rewritten for you. Your plan and model are returned exactly as they arrived.',
        },
        {
          title: 'Read as the investor reads it',
          body:
            'Findings rest on the plan and the model you supply. The report says where a reader would stop trusting the narrative given something the plan should already have reconciled.',
        },
      ],
    },

    resourcesIntro:
      'Written out in full rather than gated behind an address. If one note here makes the narrative and the model agree before an investor opens both, it has done more than a newsletter would.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the business plan, the financial model behind it, and who will read it — an investor, a bank, an internal board. Redact anything sensitive — the company name, figures can be scaled — freely, as long as the narrative and the model stay linked; what is read is whether they agree, not your absolute numbers.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Business Plan Review — the plan itself, narrative intact, with the section headings as they stand.',
        'The financial model behind it, so the narrative can be read against the numbers it claims.',
        'Who reads it — an investor, a lender, a board — so the plan can be read for what they will test first.',
      ],
      next:
        'The report comes back narrative against model: where the growth in the words is not the growth in the model, where the market has no bottom-up basis, where the ask does not match the use of funds, and where a load-bearing assumption is unstated.',
    },
  },

  hero: {
    eyebrow: 'Business plans',
    title: 'The story is compelling and the model is defensible.',
    titleAccent: 'They are describing two different companies.',
    body:
      'One plan read cold, as an investor or lender reads it: the narrative read against the model claim by claim, the market checked for a bottom-up sizing, the ask checked against the use of funds, and the load-bearing assumptions checked for whether they are stated or buried.',
    primaryCta: { label: 'Start a brief', to: '/services/business-plan-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    {
      title: 'Narrative that matches the model',
      body:
        'Every number in the words read against the number in the spreadsheet — the growth, the headcount, the margins — so the plan tells one story in two forms rather than two stories under one cover.',
    },
    {
      title: 'A market sized from the bottom up',
      body:
        'The market checked for a path from a real customer and a real price to the total, not only a top-down figure borrowed from a report with no route to a single sale.',
    },
    {
      title: 'An ask that matches the use of funds',
      body:
        'The raise checked against what it is said to buy and the runway it gives — the amount, the milestones it reaches, and whether the money and the plan it funds are the same size.',
    },
    {
      title: 'Assumptions stated, not buried',
      body:
        'The drivers the whole model rests on checked for whether they are named where a reader can test them, or hidden in a cell where a reader finds them only by breaking the sheet.',
    },
  ],

  services: [
    {
      slug: 'business-plan-review',
      name: 'Business Plan Review',
      tagline: 'One plan, read the way the investor or lender who will decide on it reads it.',
      summary:
        'The full read: the narrative read against the model claim by claim, the market checked for a bottom-up sizing, the ask checked against the use of funds, and the load-bearing assumptions checked for whether they are stated or buried.',
      unitLabel: 'Plans',
      unitNoun: 'plan',
      unitNounPlural: 'plans',
      unitRate: 74.99,
      checkoutHeading: 'How many plans?',
      brief: {
        intro:
          'Everything below is used to read the plan the way the investor will. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          {
            name: 'kind',
            label: 'What kind of plan',
            type: 'select',
            required: true,
            half: true,
            options: [
              'Equity raise — investor-facing',
              'Debt / bank finance',
              'Internal / board plan',
              'Grant or competition',
              'Something else — say so below',
            ],
            help: 'What the plan is for decides what a reader tests first, so this sets what the read is aimed at.',
          },
          {
            name: 'reader',
            label: 'Who reads it',
            type: 'text',
            required: true,
            half: true,
            placeholder: 'A seed investor, then their analyst',
            help:
              'A plan is read for what its reader will test, so the read is aimed at the person who decides on it.',
          },
          {
            name: 'stage',
            label: 'What stage the business is at',
            type: 'select',
            required: true,
            half: true,
            options: [
              'Pre-revenue / idea',
              'Early revenue',
              'Growing / scaling',
              'Established',
              'Not sure',
            ],
            help: 'A pre-revenue plan is read for whether its assumptions are reasonable; a revenue plan for whether the model matches the actuals.',
          },
          {
            name: 'purpose',
            label: 'What this plan most has to get right',
            type: 'area',
            required: true,
            placeholder:
              'This is going to a lead investor and I need the narrative and the model to agree, and the raise to be clearly justified.',
            help:
              'This ranks the findings. A contradiction between the headline growth and the model is not the same as a typo in the appendix.',
          },
          {
            name: 'raise',
            label: 'The ask, if there is one',
            type: 'text',
            required: false,
            half: true,
            placeholder: '£750k seed for 18 months runway',
            help: 'So the ask can be read against the use of funds and the runway the model actually gives.',
          },
          {
            name: 'concern',
            label: 'Anything you already suspect',
            type: 'area',
            required: false,
            placeholder:
              'I think our market sizing is top-down only, and the hiring plan in the text may not match the salary line in the model.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.',
          },
          {
            name: 'context',
            label: 'Anything deliberate that will look like a gap',
            type: 'area',
            required: false,
            placeholder:
              'The model is conservative on purpose and the narrative describes the upside case — not a contradiction, a deliberate framing I want kept.',
            help:
              'So a deliberate choice is reported as one rather than as a discrepancy. Anything you cannot account for is exactly what the read is for.',
          },
        ],
        attachments: {
          label: 'The plan and the model',
          required: true,
          requiredNote: 'The review reads one against the other, so send both the plan and the model behind it',
          accept: ['.pdf', '.docx', '.xlsx', '.pptx', '.zip'],
          maxMb: 60,
          maxFiles: 15,
          help:
            'The business plan and the financial model it rests on. The company name can be removed and figures scaled, as long as the narrative and the model stay linked; whether they agree, not your absolute numbers, is what is read.',
        },
      },
      process: [
        { step: '01', title: 'Read the plan and its reader', desc: 'The plan, the model and who reads it, so the narrative can be read against the numbers and aimed at what that reader will test first.' },
        { step: '02', title: 'Reconcile narrative to model', desc: 'Every claim in the words followed to the number in the model — growth, headcount, margins — and the ones that disagree flagged.' },
        { step: '03', title: 'Test the market sizing', desc: 'The market checked for a bottom-up path from a real customer and price to the total, not only a top-down figure.' },
        { step: '04', title: 'Check the ask', desc: 'The raise read against the use of funds and the runway the model gives, so the money and the plan it funds are the same size.' },
        { step: '05', title: 'Surface the assumptions', desc: 'The drivers the model rests on checked for whether they are stated where a reader can test them or buried in a cell.' },
        { step: '06', title: 'Report', desc: 'Findings section by section inside the stated turnaround, ranked by what would cost the plan its credibility first.' },
      ],
      included: [
        'The narrative read against the model, claim by claim',
        'Growth promised in the words that the model does not produce, flagged',
        'Headcount, margins and costs in the text that the model contradicts, surfaced',
        'The market checked for a bottom-up sizing, not only top-down',
        'A market figure with no path to a single sale, flagged',
        'The ask read against the use of funds and the runway',
        'A raise that does not match the plan it funds, surfaced',
        'Load-bearing assumptions checked for whether they are stated',
        'Key drivers buried in cells rather than named, located',
        'What would cost the plan its credibility with the reader, first',
      ],
      turnaround: 'Three business days from the brief arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per plan — one version. Founders often send the investor plan and the internal plan together, because the gap that matters — the narrative that outran the model — is clearest when the two are read side by side. A plan and the model it is built on, sent as a pair, is the review in its natural form; a plan with no model can be read only for internal consistency.',
      },
    },
  ],

  plans: [
    { units: 1, planId: 'plan_BjKdJ6liLDiqE', price: 74.99 },
    { units: 2, planId: 'plan_hFjnBbmcYWbqd', price: 149.98 },
    { units: 3, planId: 'plan_2dDG96a38ibSl', price: 224.97 },
    { units: 4, planId: 'plan_NMIAML3SV5BUY', price: 299.96 },
    { units: 5, planId: 'plan_PzT3AmCb1EXiV', price: 374.95 },
    { units: 6, planId: 'plan_4HItAbwaYWz1h', price: 449.94 },
    { units: 7, planId: 'plan_4vxOk0G9435xH', price: 524.93 },
    { units: 8, planId: 'plan_QbVo254IEhVnx', price: 599.92 },
    { units: 9, planId: 'plan_w8LjgbQQWZIRa', price: 674.91 },
    { units: 10, planId: 'plan_5NC15BtpyK4Bf', price: 749.90 },
    { units: 11, planId: 'plan_VFhRf617PfJvF', price: 824.89 },
    { units: 12, planId: 'plan_nfT9LzSZuEfox', price: 899.88 },
  ],

  howItWorks: [
    { step: '01', title: 'Write the brief', desc: 'What kind of plan, who reads it, what stage the business is at, and what it most has to get right. Attach the plan and the model. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'The plan and model together, the narrative reconciled to the numbers, the market, the ask, and the assumptions.' },
    { step: '04', title: 'The report', desc: 'Findings section by section inside the stated turnaround, ranked by what would cost the plan its credibility first.' },
  ],

  limits: [
    {
      title: 'Not investment or fundraising advice',
      body:
        'No opinion on whether the business is viable, whether it will raise, or whether the valuation is right. Business Plan is not an investor, an adviser or an accountant.',
    },
    {
      title: 'Not a valuation or an endorsement',
      body:
        'No report sets a valuation, forecasts a return or endorses the business, and none may be shown to an investor as a valuation or a recommendation to invest.',
    },
    {
      title: 'Nothing is written or modelled',
      body:
        'No section is drafted, no projection built and no plan rewritten. Your plan and model come back exactly as they arrived.',
    },
    {
      title: 'No numbers we cannot stand behind',
      body:
        'There are no client counts on this site, no logos, no testimonials and no figures about plans funded. Not because there is nothing to say, but because nothing here can be verified by you.',
    },
  ],

  faqs: [
    {
      q: 'Will you tell us whether the business will raise or whether it is viable?',
      a: 'No, and it is the one thing consistently declined. Whether a business will raise or is viable depends on the market, the investors and a hundred things no document can show, and the judgement belongs to the founder and the people who back them. What the report answers is whether the narrative and the model tell the same story, whether the market is sized bottom-up, and whether the ask matches the use of funds — which is a fact about a document.',
    },
    {
      q: 'Our plan is strong and our team knows the numbers. Is a review still worth it?',
      a: 'A strong plan written by people who know the numbers is exactly where the classic failure hides, because the authors hold the narrative and the model together by memory and never sit them side by side. The investor does sit them side by side, and a growth rate in the text that the model does not produce reads as carelessness or hope. The review reads the plan as the investor will — both halves at once — for the gaps the authors cannot see because they know what was meant.',
    },
    {
      q: 'Can you write the plan or build the model for us?',
      a: 'No. Nothing is drafted and your plan comes back untouched. The plan and the model have to be yours, because an investor is backing your understanding of the business, not a consultant’s prose. The report says where the narrative and the model disagree and where the market has no bottom-up basis; writing the plan and building the model is yours.',
    },
    {
      q: 'We are raising soon. What will an investor object to first?',
      a: 'The report reads the plan as an investor will: reconciling the narrative to the model, testing the market sizing, and checking the ask against the use of funds. It cannot say whether they will invest, but it finds the contradictions and gaps that cost a plan its credibility in the first read — the ones that make an investor stop reading for the opportunity and start reading for the next problem.',
    },
    {
      q: 'How much can we redact?',
      a: 'The company name can go and figures can be scaled, as long as the narrative and the model stay linked and proportionate — what is read is whether they agree and whether the market is sized bottom-up, which does not depend on your absolute numbers. Keep the model’s structure intact; a plan sent with no model can be read only for internal consistency. Say in the brief what has been changed.',
    },
    {
      q: 'Is the plan confidential?',
      a: 'Material is read and returned. It is not circulated, not used as examples, not retained after the engagement closes, and never discussed. A business plan and its model are commercially sensitive and are treated accordingly. Send it with the company de-named and figures scaled in any case — the read does not need the company identified.',
    },
  ],

  resources: [
    {
      title: 'The narrative and the model have to be the same company',
      summary: 'The growth the words promise that the spreadsheet three tabs over never produces.',
      body: [
        'A business plan is two documents bound as one: a narrative written to inspire and a model built to withstand arithmetic. They are produced by different parts of the same mind, often on different days, and the single most common failure is that they drift apart — the narrative compounds optimism the model never agreed to. The founder holds the two together by memory and never notices the gap; the investor, meeting them for the first time, reads one against the other as the very first test of whether the author understands their own business.',
        'The classic form is the growth rate. The narrative says the company will triple year on year; the model, built cell by cell, grows it by half. Both felt true when written — the narrative in the language of ambition, the model in the language of defensibility — and together they say the author either cannot read their own spreadsheet or hoped the reader would not open it. Neither reading survives contact with a serious investor, and the plan loses the room on a contradiction that had nothing to do with the quality of the business.',
        'The response is to read every number in the narrative against the number in the model that should produce it, and to fix the ones that disagree before anyone outside sees both. The review does exactly this — narrative in one hand, model in the other — and flags the claims the model does not support, so the plan presents one company in two forms rather than two companies that happen to share a title page.',
      ],
    },
    {
      title: 'A market sized top-down is a number, not a plan',
      summary: 'The enormous total addressable market with no path to a single sale.',
      body: [
        'Market sizing is where a plan is most tempted to borrow credibility it has not earned. The top-down figure — "the global market is $400 billion, we need only 1%" — is easy to find, impressive to quote, and almost useless, because it says nothing about whether this company can reach a single customer. Investors have seen the 1% slide a thousand times and discount it on sight, because it describes a market, not a business, and the 1% is an assertion with no mechanism behind it.',
        'The bottom-up sizing is the one that persuades, because it is built from the business rather than onto it: this is a customer, this is what they pay, this is how many we can reach through this channel at this cost, and here is the total those real units add up to. It is harder to produce and easy to check, which is exactly why it carries weight — a reader can follow it from a single sale to the headline, and the number means something because the path to it is visible.',
        'The response is to size the market from the bottom up and use the top-down figure only as a sanity check on the ceiling. The review reads the market section for whether there is a path from a real customer and a real price to the total, and flags a sizing that is top-down only, so the number in the plan is one a reader can trace rather than one they will discount.',
      ],
    },
    {
      title: 'The ask has to be the size of the plan it funds',
      summary: 'The raise that does not match the use of funds or the runway it claims to buy.',
      body: [
        'The ask is where the narrative and the model are supposed to meet: this much money, spent this way, reaches these milestones, over this runway. It is also where they most often fail to meet, because the number is frequently chosen first — the amount the founder wants to raise — and the use of funds and the runway are reverse-engineered to fit it. A reader who adds up the use of funds and finds it does not come to the ask, or divides the ask by the burn and does not get the runway claimed, sees the join come apart.',
        'The failure matters because the ask is the one number the investor is being asked to act on directly. Everything else is context for this: how much, for what, to reach where. An ask that does not reconcile with the plan it funds tells the investor that the most important number in the document was not derived from the others, and if that one was chosen rather than calculated, they will wonder which others were too.',
        'The response is to build the ask from the plan — sum the use of funds, divide by the burn, name the milestones the runway reaches — so the amount is the output of the model, not an input to it. The review checks the ask against the use of funds and the runway the model gives, and flags the raise that does not match the plan it is meant to fund, so the number the investor acts on is one the rest of the plan actually produces.',
      ],
    },
    {
      title: 'A buried assumption is a risk the reader finds by breaking the sheet',
      summary: 'The single driver the whole model rests on, hidden in a cell instead of stated.',
      body: [
        'Every financial model rests on a few load-bearing assumptions — a conversion rate, a churn number, a price, a sales-cycle length — and the quality of the plan depends less on whether those assumptions are right than on whether they are visible. A model that states its key drivers in the open invites the reader to test them, which is what a careful investor wants to do; a model that buries them in cells deep in a tab forces the reader to reverse-engineer the sheet to find what it actually depends on, and a reader who has to break your model to understand it does not trust what they find.',
        'The buried assumption is dangerous in both directions. If it is reasonable, hiding it wastes the credibility it would have earned in the open. If it is heroic — a conversion rate three times the industry norm, a churn figure no comparable company achieves — burying it looks like concealment, and an investor who uncovers a heroic assumption the plan did not flag assumes there are others. Either way, the assumption that is not stated is the one that does the most damage when found.',
        'The response is to surface the handful of drivers the model is most sensitive to and state them where a reader can see and test them. The review traces the model to its load-bearing assumptions and flags the ones that are buried rather than stated, so the plan invites the test it is going to get anyway, and the reader finds the key numbers in the open rather than by pulling the sheet apart.',
      ],
    },
  ],

  legal: {
    entity: 'Business Plan',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-10-09',
  },
};

export default site;
