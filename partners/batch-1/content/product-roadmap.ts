import type { SiteContent } from './types';

/**
 * Product Roadmap — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE ROADMAP. One roadmap is one document, so the
 * ladder is the whole catalogue and rung N is N roadmaps.
 *
 * NO VIEW ON WHAT TO BUILD, AND THAT IS THE BOUNDARY. Which features matter,
 * in what order, for which customers, belongs to the product team. Whether
 * each item serves a goal the roadmap states, whether a quarter holds more
 * than the roadmap’s own capacity, and whether a dependency is scheduled
 * after the thing that needs it, is a fact about a document. The second is
 * the product.
 */
export const site: SiteContent = {
  name: 'Product Roadmap',
  strapline: 'Q2 needs three teams. The capacity slide says one.',
  whopUrl: 'https://whop.com/product-roadmap/',
  returnUrl: 'https://roadmap-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Product roadmaps, per roadmap',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/roadmap-review',

    about: {
      title: 'A product roadmap is not a wish list. It is a set of promises someone will hold the team to.',
      intro:
        'Product Roadmap reads one roadmap the way the executive, the customer or the team who will be held to it reads it — items against goals and capacity: tracing every item to a goal the roadmap states, checking every period against the capacity the roadmap itself gives, checking that every dependency is scheduled before the item that needs it, and checking that commitments are marked apart from hopes.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'Roadmaps are assembled from requests — sales, customers, leadership, engineering — and each item is added because someone made a good case for it. Nobody reads the result as a whole against the goals slide at the front and the capacity slide at the back. So two items serve no stated goal, Q2 holds work that the roadmap’s own team sizes put at three quarters, the new billing feature is in Q1 and the platform migration it depends on is in Q3, and the customer-facing version shows everything in the same colour, so a stretch idea reads as a promise.',
            'So the review reads the roadmap as the people who will hold the team to it. Every item is traced to a stated goal. Every period is compared with the capacity the roadmap or its supporting documents state. Every dependency the roadmap names, or that its own descriptions imply, is checked for being scheduled first. And every item is read for whether a reader would take it as committed, planned or exploratory, and whether that matches what you say it is.',
          ],
        },
        {
          title: 'Why the overloaded quarter is the classic',
          paras: [
            'Items are added one at a time and each one fits. Nobody adds them up, because the roadmap is a picture, not a sum. The quarter that looks balanced on the slide holds three quarters of work by the roadmap’s own estimates, and it will slip in a way that surprises everyone except the engineers.',
            'The damage is that the roadmap’s readers do not see a sum either; they see a promise. When the quarter slips, the roadmap loses credibility for every later quarter too. The review totals each period against the stated capacity and says where the roadmap promises more than it says the team can build.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not product strategy or consulting, and Product Roadmap is not a consultant, a strategist or an agency. No opinion is offered on what to build, which goal matters most, how to prioritise, how long anything will take, or whether the roadmap is ambitious enough. No estimate is made; capacity and effort are taken as stated.',
            'It is also not a planning service. No item is moved, re-sequenced or rewritten. The report says where an item serves no goal, where a period exceeds capacity, where a dependency is out of order and where commitments and hopes look the same; what to do about it is the product team’s.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every roadmap is read in full with its goals and capacity, as the people who will hold the team to it will read it, because the failures that matter are between the items and the numbers behind them. A good set of priorities can still read as broken promises within a quarter because nobody added up the work.',
      },
    },

    standards: {
      intro:
        'This report is about a document teams and customers will be held to, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'No view on what to build', body: 'No opinion on which features, goals or customers matter most. Product Roadmap prioritises nothing.' },
        { title: 'No estimates', body: 'Effort and capacity are taken as the roadmap or your documents state them. Nothing here estimates how long anything will take.' },
        { title: 'The document, not the product', body: 'The subject is whether the roadmap agrees with its own goals, capacity and dependencies. Whether the product is right stays with you.' },
        { title: 'Nothing is moved or rewritten', body: 'No item is re-sequenced and no description rewritten. Your roadmap is returned exactly as it arrived.' },
        { title: 'Read as its audience reads it', body: 'Findings rest on the roadmap and the documents supplied. Where capacity is not stated, periods are not totalled and the report says so.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for product teams who show a roadmap to people who remember it.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the roadmap as it is shown, the goals it serves, and whatever states capacity — team sizes, sizing estimates, a planning sheet. Customer names and unreleased feature names can be replaced with placeholders, consistently.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Roadmap Review — the roadmap as it is shown to its audience.',
        'The goals it serves and whatever states capacity and effort — team sizes, estimates, a planning sheet.',
        'Who it is shown to — leadership, customers, the team — so it can be read for what they will hold you to.',
      ],
      next:
        'The report comes back items against goals and capacity: items that serve no stated goal, periods that exceed capacity, dependencies out of order, and commitments that look the same as hopes.',
    },
  },

  hero: {
    eyebrow: 'Product roadmaps',
    title: 'The roadmap is ambitious and every quarter looks balanced.',
    titleAccent: 'Q2 holds three quarters of work by its own estimates.',
    body:
      'One product roadmap read the way the people who will hold the team to it read it: every item traced to the goal it serves, every period checked against the capacity the roadmap itself states, dependencies checked for being scheduled first, and commitments checked for being marked apart from hopes.',
    primaryCta: { label: 'Start a brief', to: '/services/roadmap-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'Every item has a goal', body: 'Every item on the roadmap traced to an objective the roadmap or its strategy states, and the ones that serve no stated goal listed — usually the ones added for one loud request.' },
    { title: 'Every quarter within capacity', body: 'The work in each period totalled from the roadmap’s own sizing and compared with the capacity it states, so a quarter that holds more than the team is visible before it slips.' },
    { title: 'Dependencies in order', body: 'Every dependency the roadmap names or its descriptions imply checked for being scheduled before the item that needs it, so the feature does not arrive before its foundation.' },
    { title: 'Commitments marked apart from hopes', body: 'Every item read for whether its audience would take it as committed, planned or exploratory, and compared with what you say it is — because a stretch idea shown like a promise becomes one.' },
  ],

  services: [
    {
      slug: 'roadmap-review',
      name: 'Roadmap Review',
      tagline: 'One roadmap, read the way the people who will hold you to it read it.',
      summary:
        'The full read: every item traced to a goal, every period totalled against stated capacity, every dependency checked for order, and every item checked for whether it reads as a commitment or a hope.',
      unitLabel: 'Roadmaps',
      unitNoun: 'roadmap',
      unitNounPlural: 'roadmaps',
      unitRate: 49.99,
      checkoutHeading: 'How many roadmaps?',
      brief: {
        intro:
          'Everything below is used to read the roadmap the way its audience will. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'audience', label: 'Who it is shown to', type: 'select', required: true, half: true,
            options: ['Leadership or board', 'Customers', 'Sales and customer teams', 'The product and engineering team', 'Investors', 'Several — say so below'],
            help: 'A customer reads every item as a promise; leadership reads every quarter as a budget.' },
          { name: 'horizon', label: 'What it covers', type: 'text', required: true, half: true,
            placeholder: 'Four quarters, two product lines',
            help: 'So the read knows how many periods and streams to expect.' },
          { name: 'format', label: 'Format', type: 'select', required: true, half: true,
            options: ['Timeline by quarter or month', 'Now / Next / Later', 'Themes or outcomes', 'Spreadsheet', 'Not sure'],
            help: 'Different formats imply commitment differently.' },
          { name: 'purpose', label: 'What this roadmap most has to convince them of', type: 'area', required: true,
            placeholder: 'That the platform work in H1 is what makes the customer features in H2 possible.',
            help: 'This ranks the findings. An overloaded quarter shown to customers is not the same as a missing goal label.' },
          { name: 'capacity', label: 'Where capacity is stated', type: 'text', required: false, half: true,
            placeholder: 'Planning sheet attached: team sizes and t-shirt estimates',
            help: 'Without stated capacity, periods cannot be totalled, and the report says so.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'Sales promised the integration for Q1 and it is on the roadmap there, but it needs the API rewrite.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'Q4 is deliberately over-full; the bottom three items are explicitly stretch.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The roadmap, its goals and its capacity',
          required: true,
          requiredNote: 'The review reads the roadmap against its goals and capacity, so send them together',
          accept: ['.pdf', '.pptx', '.key', '.xlsx', '.csv', '.docx', '.png', '.zip'],
          maxMb: 60,
          maxFiles: 15,
          help:
            'The roadmap as shown, the goals or strategy it serves, and whatever states team capacity and item sizing.',
        },
      },
      process: [
        { step: '01', title: 'Read the goals and capacity', desc: 'What the roadmap is for and what it says the team can do, written down before the items are read.' },
        { step: '02', title: 'Trace every item to a goal', desc: 'Each item matched to a stated objective, and the ones that match none listed.' },
        { step: '03', title: 'Total every period', desc: 'The work in each period added up from the roadmap’s own sizing and compared with capacity.' },
        { step: '04', title: 'Check dependencies', desc: 'Each named or implied dependency checked for being scheduled first.' },
        { step: '05', title: 'Read it as the audience', desc: 'Each item read for whether it looks committed, planned or exploratory to the people it is shown to.' },
        { step: '06', title: 'Report', desc: 'Findings section by section inside the stated turnaround, ranked by what would break a promise first.' },
      ],
      included: [
        'Every item traced to a stated goal',
        'Items that serve no stated goal, listed',
        'Every period totalled against stated capacity',
        'A period that holds more than the roadmap says the team can build, flagged',
        'Every named or implied dependency checked for order',
        'An item scheduled before something it needs, surfaced',
        'Every item read for whether it looks like a commitment or a hope',
        'Items that differ between versions shown to different audiences, listed',
        'What capacity and sizing the review was totalled against, stated',
        'What would break a promise first, first',
      ],
      turnaround: 'Three business days from the brief arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per roadmap. An internal roadmap and its customer-facing version are two, and are often worth sending together, because an item that is stretch internally and committed externally is clearest side by side.',
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
    { step: '01', title: 'Write the brief', desc: 'Who it is shown to, what it covers and what it most has to convince them of. Attach the roadmap, its goals and its capacity. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'Items against goals, periods against capacity, dependencies in order, and commitments against hopes.' },
    { step: '04', title: 'The report', desc: 'Findings section by section inside the stated turnaround, ranked by what would break a promise first.' },
  ],

  limits: [
    { title: 'No view on what to build', body: 'No opinion on features, priorities or strategy. Product Roadmap is not a consultant or a strategist.' },
    { title: 'No estimates', body: 'Effort and capacity are taken as stated. Nothing here estimates how long anything will take.' },
    { title: 'Nothing is moved or rewritten', body: 'No item is re-sequenced. Your roadmap comes back exactly as it arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no figures about roadmaps delivered. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Will you tell us what to prioritise?', a: 'No, and it is the one thing consistently declined. What to build belongs to the product team. What the report answers is whether the roadmap agrees with its own goals, capacity and dependencies — which is a fact about a document.' },
    { q: 'The team agreed the roadmap together. Is a review still worth it?', a: 'Agreement is item by item; overload is a sum. A roadmap every team agreed to can still hold more than every team can build, because nobody added it up. The review adds it up.' },
    { q: 'Can you re-plan it for us?', a: 'No. Nothing is moved. The report lists each finding with the item or period it concerns, so the team can decide what to change.' },
    { q: 'What does leadership check first?', a: 'Usually whether the next quarter is believable and whether each item ties to a goal they set. The report checks those first.' },
    { q: 'We have no capacity figures. Can you still review it?', a: 'Yes, but periods cannot be totalled without stated capacity and sizing, and the report will say so. Goals, dependencies and commitment are still read.' },
    { q: 'Is the roadmap confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed. Unreleased plans are sensitive and are treated accordingly.' },
  ],

  resources: [
    {
      title: 'Every item needs a goal',
      summary: 'The feature added for one loud request.',
      body: [
        'Items arrive with good arguments from people who need them. Some of those arguments are about a goal the roadmap states; some are about a customer, a deal or a frustration. The latter look identical on a timeline.',
        'The response is to label each item with the goal it serves. The review traces every item to a stated goal and lists the ones that serve none.',
      ],
    },
    {
      title: 'A quarter cannot hold more than its capacity',
      summary: 'Three quarters of work, drawn in one.',
      body: [
        'A roadmap is a picture, and pictures are not added up. Each item fits on the slide, and the sum is never taken.',
        'The response is to total every period against stated capacity before the roadmap is shown. The review does that sum and flags the periods that overflow.',
      ],
    },
    {
      title: 'A dependency has to come first',
      summary: 'Billing in Q1, the platform it needs in Q3.',
      body: [
        'Dependencies are obvious to the engineer who knows them and invisible on a timeline that shows only outcomes. Items get placed where they are wanted, not where they can go.',
        'The response is to state dependencies and schedule them first. The review checks every named or implied dependency for order.',
      ],
    },
    {
      title: 'A commitment has to look different from a hope',
      summary: 'A stretch idea, drawn in the same colour as a promise.',
      body: [
        'Internally everyone knows which items are firm. Externally every item on a roadmap is read as a promise unless it visibly is not one.',
        'The response is to mark commitment on every item shown outside the team. The review reads each item for how its audience will take it and compares that with what you say it is.',
      ],
    },
  ],

  legal: {
    entity: 'Product Roadmap',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
