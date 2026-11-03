import type { SiteContent } from './types';

/**
 * Case Study — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE STUDY. One customer case study is one document,
 * so the ladder is the whole catalogue and rung N is N studies.
 *
 * NO VIEW ON THE CAMPAIGN, AND THAT IS THE BOUNDARY. Whether the study will
 * convert, which customer to feature, whether the product is any good, is a
 * judgement belonging to the people who sell it. Whether the headline claim
 * is produced by a figure in the body, whether that figure has a baseline and
 * a period, whether the quote describes something the customer did, and
 * whether the product is shown doing the work it is credited with, is a fact
 * about a document. The second is the product; the first is theirs, and the
 * distinction is in the hero, the limits, the footer and the terms.
 */
export const site: SiteContent = {
  name: 'Case Study',
  strapline: 'The headline says 3x pipeline. Nothing in the body says what it was before.',
  whopUrl: 'https://whop.com/case-study/',
  returnUrl: 'https://case-study-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Case studies, per study',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/case-study-review',

    about: {
      title: 'A case study is not a story about a happy customer. It is a claim a sceptical prospect reads for whether the evidence is really there.',
      intro:
        'Case Study reads one customer story the way the prospect deciding on it reads it — claim against evidence: checking that the headline figure is produced by a number somewhere in the body, that every number has a baseline and a period, that the quote describes something the customer actually did, and that the product is shown doing the work the study credits it with rather than standing beside it.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'A case study is written by two parties with the same interest and different memories. The vendor writes the frame — the headline result, the before and after, the product at the centre — in the confident tense of marketing. The customer supplies a quote and an approval, usually in a hurry, usually without the numbers in front of them. Nobody reads the finished study the way a prospect will: headline in one hand and body in the other, looking for the sentence that produces the figure on the cover. So the headline says pipeline tripled and the body never says what pipeline was, the quote praises a feature the customer did not buy, and the result arrived in the same quarter the customer also doubled its sales team.',
            'So the review reads the study as the prospect does. The headline claim is followed into the body to the figure that should produce it, and flagged when nothing does. Every number is checked for a baseline, a period and a unit — a percentage with no before is a decoration. The quote is read against the rest of the study for whether the customer describes something they did, in words a person would say. And the narrative is read for whether the product is shown doing the work, or whether the result is placed next to the product and the reader is left to connect them.',
          ],
        },
        {
          title: 'Why the headline the body never produces is the classic',
          paras: [
            'The headline is written last and biggest. It is the one line the campaign will quote, so it is pushed to the roundest, boldest figure the result can bear, and then the body — written earlier, from the customer’s own numbers — is left as it was. The two were true to the author at different moments. The prospect meets them together and does the only thing a careful reader does with a bold number: looks for where it comes from. When the body says conversion improved from 2.1% to 3.4% and the cover says 3x, the prospect does not conclude the product is strong. They conclude the vendor rounds, and they read every other figure as rounded.',
            'The damage is that a study exists to lend the vendor the customer’s credibility, and a headline the body does not support spends that credibility instead. A prospect who finds one gap stops reading for the result and starts reading for the next gap, and the quote they would have trusted now reads as something the vendor wrote. The contradiction is invisible to the author, who knows what the number meant, and glaring to the reader, who has only the page. The review reads every claim on the cover against the figure in the body that should produce it, so the study makes one argument rather than two that happen to share a logo.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not marketing, sales or research advice, and Case Study is not an agency, a copywriter, an analyst or a reference-checker. No opinion is offered on whether the study will convert, which customer to feature, whether the product is good, or whether the campaign is right. Nothing here contacts the customer, verifies the figures with them, sources new numbers or approves the study for publication.',
            'It is also not a rewriting service. No sentence is drafted, no headline rewritten, no quote tidied and no study redesigned. The report says where the headline is not produced by the body, where a number has no baseline or period, where the quote does not describe something the customer did, and where the product is credited with work the study never shows it doing; writing the study and standing behind it belongs to the people who publish it.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every study is read in full and as the sceptical prospect will read it, because the failures that matter are between the claim and the evidence rather than in the product. A genuinely strong result can fail to persuade, because its cover promised a figure its own body never produced and nobody checked before it went on the website.',
      },
    },

    standards: {
      intro:
        'This report is about a document a sales cycle and sometimes a customer relationship turn on, so what it is and is not is stated before anything else.',
      extra: [
        {
          title: 'Not marketing or sales advice',
          body:
            'No opinion on whether the study will convert, which customer to feature, or whether the product is good. Case Study writes nothing and advises on no campaign.',
        },
        {
          title: 'Not a verification and not an endorsement',
          body:
            'Nothing here contacts the customer, confirms the figures with them, or vouches for the result. No report may be shown to a prospect as independent verification of a claim.',
        },
        {
          title: 'The document, not the product',
          body:
            'The subject is whether the headline is produced by the body, the numbers have baselines, the quote describes something done, and the product is shown doing the work. Whether the product deserves the result stays with the customer and the market.',
        },
        {
          title: 'Nothing is written or rewritten',
          body:
            'No headline is rewritten, no quote tidied and no study redrafted for you. Your study and its source material are returned exactly as they arrived.',
        },
        {
          title: 'Read as the prospect reads it',
          body:
            'Findings rest on the study and the material you supply. The report says where a reader would stop trusting the claim given something the study should already have shown.',
        },
      ],
    },

    resourcesIntro:
      'Written out in full rather than gated behind an address. If one note here puts a baseline under a headline before a prospect asks for it, it has done more than a newsletter would.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the case study, the material its figures came from, and who it is written for — a prospect at a particular stage, a procurement reader, a partner. Redact anything sensitive — the customer’s name, the absolute figures can be scaled — freely, as long as the headline and the body stay in proportion; what is read is whether they agree, not the customer’s identity.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Case Study Review — the study as it will be published, headline, body and quote together.',
        'The material the figures came from — the dashboard export, the customer’s email, the call notes — so each claim can be read against its source.',
        'Who reads it — a prospect, procurement, a partner — so the study can be read for what they will doubt first.',
      ],
      next:
        'The report comes back claim against evidence: where the headline is not produced by the body, where a number has no baseline or period, where the quote does not describe something the customer did, and where the product is credited with work the study never shows.',
    },
  },

  hero: {
    eyebrow: 'Case studies',
    title: 'The headline is bold and the quote is glowing.',
    titleAccent: 'The body never says what the number was before.',
    body:
      'One case study read cold, as the sceptical prospect reads it: the headline claim followed into the body to the figure that should produce it, every number checked for a baseline and a period, the quote checked against what the customer did, and the story checked for whether the product is shown doing the work it is credited with.',
    primaryCta: { label: 'Start a brief', to: '/services/case-study-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    {
      title: 'A headline the body produces',
      body:
        'Every figure on the cover followed into the body to the number that should produce it — the multiple, the percentage, the saving — so the study makes one claim in two places rather than a bold one on top and a smaller one underneath.',
    },
    {
      title: 'Numbers with a before, a period and a unit',
      body:
        'Every result checked for a stated baseline, the period it was measured over and what was counted, because a 40% improvement with no before, no when and no what is an anecdote wearing a percentage.',
    },
    {
      title: 'A quote that describes something done',
      body:
        'The customer’s words read against the rest of the study for whether they describe a thing the customer did with the product, in words a person would say, rather than praise for a feature the body never shows them using.',
    },
    {
      title: 'The product shown doing the work',
      body:
        'The narrative read for whether the result follows from something the product did, or whether the result is placed beside the product and the reader is left to assume the connection — the gap a sceptical prospect finds first.',
    },
  ],

  services: [
    {
      slug: 'case-study-review',
      name: 'Case Study Review',
      tagline: 'One study, read the way the prospect who will decide on it reads it.',
      summary:
        'The full read: the headline claim followed into the body, every number checked for a baseline and a period, the quote checked against what the customer did, and the narrative checked for whether the product is shown doing the work it is credited with.',
      unitLabel: 'Studies',
      unitNoun: 'study',
      unitNounPlural: 'studies',
      unitRate: 49.99,
      checkoutHeading: 'How many studies?',
      brief: {
        intro:
          'Everything below is used to read the study the way the prospect will. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          {
            name: 'kind',
            label: 'What kind of study',
            type: 'select',
            required: true,
            half: true,
            options: [
              'Written case study — web or PDF',
              'Slide for a sales deck',
              'Video script or transcript',
              'Customer story for a proposal',
              'Something else — say so below',
            ],
            help: 'Where the study will be read decides what a reader tests first, so this sets what the read is aimed at.',
          },
          {
            name: 'reader',
            label: 'Who reads it',
            type: 'text',
            required: true,
            half: true,
            placeholder: 'A head of sales evaluating us against two others',
            help:
              'A study is read for what its reader will doubt, so the read is aimed at the person who decides on it.',
          },
          {
            name: 'stage',
            label: 'Where it sits in the sale',
            type: 'select',
            required: true,
            half: true,
            options: [
              'Top of funnel — website or ads',
              'Mid-funnel — sent by a rep',
              'Late stage — procurement or references',
              'Partner or investor material',
              'Not sure',
            ],
            help: 'A top-of-funnel study is read for whether its headline is believable; a late-stage one for whether its numbers survive a question.',
          },
          {
            name: 'purpose',
            label: 'What this study most has to prove',
            type: 'area',
            required: true,
            placeholder:
              'That the time saving is real and came from the product, not from the customer also hiring two people that quarter.',
            help:
              'This ranks the findings. A headline the body does not produce is not the same as a missing unit in the sidebar.',
          },
          {
            name: 'source',
            label: 'Where the figures came from',
            type: 'text',
            required: false,
            half: true,
            placeholder: 'Customer’s own dashboard export, Q2 vs Q4',
            help: 'So each number can be read against the material that should support it rather than taken on trust.',
          },
          {
            name: 'concern',
            label: 'Anything you already suspect',
            type: 'area',
            required: false,
            placeholder:
              'The 3x in the headline was rounded up from 2.6x, and the quote was written by us and approved by the customer rather than said by them.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.',
          },
          {
            name: 'context',
            label: 'Anything deliberate that will look like a gap',
            type: 'area',
            required: false,
            placeholder:
              'The customer asked that the baseline not be published — the before figure is deliberately absent, not forgotten.',
            help:
              'So a deliberate choice is reported as one rather than as a gap. Anything you cannot account for is exactly what the read is for.',
          },
        ],
        attachments: {
          label: 'The study and its sources',
          required: true,
          requiredNote: 'The review reads the claims against their evidence, so send the study and the material the figures came from',
          accept: ['.pdf', '.docx', '.pptx', '.xlsx', '.csv', '.txt', '.zip'],
          maxMb: 60,
          maxFiles: 15,
          help:
            'The case study as it will be published and whatever the numbers were drawn from — an export, an email, call notes. The customer can be de-named and figures scaled, as long as the headline and the body stay in proportion; whether they agree, not who the customer is, is what is read.',
        },
      },
      process: [
        { step: '01', title: 'Read the study and its reader', desc: 'The study, its sources and who reads it, so each claim can be read against its evidence and aimed at what that reader will doubt first.' },
        { step: '02', title: 'Follow the headline into the body', desc: 'Every figure on the cover traced to the number in the body that should produce it, and the ones nothing produces flagged.' },
        { step: '03', title: 'Check every number for a before', desc: 'Each result checked for a stated baseline, a period and a unit, so a percentage is a measurement rather than a decoration.' },
        { step: '04', title: 'Read the quote against the story', desc: 'The customer’s words checked for whether they describe something the customer did with the product, in words a person would say.' },
        { step: '05', title: 'Test the connection', desc: 'The narrative read for whether the product is shown doing the work it is credited with, or placed beside a result the reader is left to attribute.' },
        { step: '06', title: 'Report', desc: 'Findings section by section inside the stated turnaround, ranked by what would cost the study its credibility first.' },
      ],
      included: [
        'The headline claim followed into the body, figure by figure',
        'A cover number that nothing in the body produces, flagged',
        'Every result checked for a stated baseline, period and unit',
        'A percentage with no before, no when or no what, surfaced',
        'The quote read against the study for whether it describes something done',
        'Praise for a feature the body never shows the customer using, flagged',
        'The narrative checked for the product doing the work it is credited with',
        'A result placed beside the product rather than produced by it, located',
        'Figures that disagree between the headline, the body and the sidebar, listed',
        'What would cost the study its credibility with the reader, first',
      ],
      turnaround: 'Three business days from the brief arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per study — one customer, one version. Teams often send the long-form study and the one-slide version together, because the gap that matters — the headline that drifted from the body — is clearest when the two are read side by side. A study with the material its figures came from, sent as a pair, is the review in its natural form; a study with no sources can be read only for internal consistency.',
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
    { step: '01', title: 'Write the brief', desc: 'What kind of study, who reads it, where it sits in the sale, and what it most has to prove. Attach the study and its sources. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'The study and its sources together, the headline followed into the body, the numbers, the quote, and the connection between product and result.' },
    { step: '04', title: 'The report', desc: 'Findings section by section inside the stated turnaround, ranked by what would cost the study its credibility first.' },
  ],

  limits: [
    {
      title: 'Not marketing or sales advice',
      body:
        'No opinion on whether the study will convert, which customer to feature, or whether the product is good. Case Study is not an agency, a copywriter or an analyst.',
    },
    {
      title: 'Not a verification or an endorsement',
      body:
        'No report contacts the customer, confirms a figure with them or vouches for a result, and none may be shown to a prospect as independent verification.',
    },
    {
      title: 'Nothing is written or rewritten',
      body:
        'No headline is rewritten, no quote tidied and no study redrafted. Your study and its sources come back exactly as they arrived.',
    },
    {
      title: 'No numbers we cannot stand behind',
      body:
        'There are no client counts on this site, no logos, no testimonials and no figures about studies that converted. Not because there is nothing to say, but because nothing here can be verified by you.',
    },
  ],

  faqs: [
    {
      q: 'Will you tell us whether the study will convert or whether to publish it?',
      a: 'No, and it is the one thing consistently declined. Whether a study converts depends on the prospect, the product and the deal, and the judgement belongs to the people who sell it. What the report answers is whether the headline is produced by the body, whether the numbers have baselines, whether the quote describes something done, and whether the product is shown doing the work — which is a fact about a document.',
    },
    {
      q: 'The customer approved the study and our numbers are real. Is a review still worth it?',
      a: 'An approved study with real numbers is exactly where the classic failure hides, because the customer approved the quote and the vendor wrote the headline, and nobody read the two against each other. The prospect does read them against each other, and a cover figure the body does not produce reads as rounding or hope whatever the underlying truth. The review reads the study as the prospect will — cover and body at once — for the gaps the authors cannot see because they know what was meant.',
    },
    {
      q: 'Can you write or rewrite the study for us?',
      a: 'No. Nothing is drafted and your study comes back untouched. The claim and the quote have to be yours and the customer’s, because a prospect is trusting the customer’s experience, not a consultant’s prose. The report says where the headline is not produced by the body and where a number has no baseline; writing the study is yours.',
    },
    {
      q: 'We are putting this in front of procurement. What will they doubt first?',
      a: 'The report reads the study as a sceptical reader will: following the headline into the body, checking every number for its before and its period, and testing whether the product is shown doing the work. It cannot say whether they will buy, but it finds the gaps that cost a study its credibility in the first read — the ones that make a reader stop looking for the result and start looking for the next rounded number.',
    },
    {
      q: 'How much can we redact?',
      a: 'The customer can be de-named and the figures scaled, as long as the headline and the body stay in proportion — what is read is whether they agree and whether each number has a baseline, which does not depend on the customer’s identity. Keep the source material’s structure intact; a study sent with no sources can be read only for internal consistency. Say in the brief what has been changed.',
    },
    {
      q: 'Is the study confidential?',
      a: 'Material is read and returned. It is not circulated, not used as examples, not retained after the engagement closes, and never discussed. A customer’s figures and an unpublished study are commercially sensitive and are treated accordingly. Send it with the customer de-named in any case — the read does not need them identified.',
    },
  ],

  resources: [
    {
      title: 'The headline has to be produced by the body',
      summary: 'The 3x on the cover that no sentence underneath it ever arrives at.',
      body: [
        'A case study is two documents bound as one: a headline written to be quoted and a body written to be believed. They are produced at different moments — the body from the customer’s numbers, the headline last and biggest, pushed to the roundest figure the result will bear — and the single most common failure is that they drift apart. The author holds the two together by knowing what the number meant; the prospect, meeting them for the first time, reads one against the other as the very first test of whether the vendor is careful.',
        'The classic form is the multiple. The cover says pipeline tripled; the body says qualified pipeline rose from $1.2m to $3.1m over two quarters, which is 2.6x, which was rounded because 3x is a better headline. Both felt true when written. Together they tell the prospect that the vendor rounds, and a reader who has learned that rounds every other figure down on the vendor’s behalf. The study loses its force on a gap that had nothing to do with the result.',
        'The response is to make the headline a figure that appears, as itself, somewhere in the body, and to let the body’s number be the headline even when it is less round. The review follows every cover claim into the body and flags the ones nothing produces, so the study makes one argument at two sizes rather than two arguments that happen to share a logo.',
      ],
    },
    {
      title: 'A result without a baseline is an anecdote',
      summary: 'The 40% improvement with no before, no period and no unit.',
      body: [
        'Percentages are where a study is most tempted to sound like evidence without being any. "Response time improved 40%" is easy to write and almost impossible to check, because it does not say what response time was, over what period it was measured, or what was counted. A prospect who sells to the same market as the customer knows roughly what the numbers should be, and a percentage with no before invites them to assume the before was convenient.',
        'The baseline is what turns a claim into a measurement: this is what it was, this is what it is, this is the period and this is what was counted. It is harder to publish because it exposes the customer’s starting point, and it is precisely the thing a careful reader wants, because it lets them judge whether the improvement is large for a company like theirs or only large in isolation. A study that gives the before earns the after.',
        'The response is to state the baseline, the period and the unit beside every result, and where the customer will not allow the baseline, to say so rather than leave the gap. The review checks every number for the three, flags the ones that float, and distinguishes a deliberate omission from a forgotten one, so the study’s figures read as measurements rather than as marketing.',
      ],
    },
    {
      title: 'The quote has to describe something the customer did',
      summary: 'The glowing sentence that praises a feature the body never shows them using.',
      body: [
        'The quote is the one part of a study the vendor does not get to write, which is why it carries the weight it does — and why it is so often written by the vendor anyway, sent to the customer for a nod, and approved by someone who did not have the study in front of them. The result is a sentence in marketing’s voice attributed to a customer, praising capabilities in the abstract, and a prospect can hear the difference between something a person said and something a person signed.',
        'The test is specific: does the quote describe a thing the customer did with the product, in words a person would use? "The platform transformed our go-to-market motion" describes nothing. "We stopped exporting the list to a spreadsheet every Monday" describes a Monday. The second is less polished and far more persuasive, because it is checkable against the body, which should show that same Monday being saved.',
        'The response is to ask the customer for what changed in their week and quote that, and to make sure the body shows the thing the quote names. The review reads the quote against the study for whether it describes something done and whether the body shows it being done, and flags praise that floats free of the story, so the one sentence the prospect trusts most is the one that most deserves it.',
      ],
    },
    {
      title: 'The product has to be seen doing the work',
      summary: 'The result placed beside the product, with the connection left to the reader.',
      body: [
        'Every study rests on one claim the others serve: that the product caused the result. It is also the claim most often implied rather than made, because stating it means showing the mechanism — what the product did, in the customer’s process, that produced the number — and the mechanism is harder to write than the outcome. So the study introduces the product, reports the result, and lets proximity do the arguing. A prospect who sells a competing product knows the customer also hired, reorganised and had a good quarter, and asks which of those produced the number.',
        'The failure matters because causation is the whole purchase. The prospect is not buying the customer’s result; they are buying the mechanism that produced it, on the theory that the same mechanism will work for them. A study that shows the outcome but not the mechanism gives them nothing to buy, and a sceptical reader will attribute the result to anything else in the story before they attribute it to the product.',
        'The response is to write the middle of the study — what the customer did with the product, step by step, that led to the number — and to name the other things that changed in the same period rather than leave the reader to find them. The review reads the narrative for whether the product is shown doing the work it is credited with and flags a result placed beside the product rather than produced by it, so the study sells a mechanism and not a coincidence.',
      ],
    },
  ],

  legal: {
    entity: 'Case Study',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
