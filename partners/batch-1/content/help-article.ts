import type { SiteContent } from './types';

/**
 * Help Article — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE ARTICLE. One help article is one document, so
 * the ladder is the whole catalogue and rung N is N articles.
 *
 * NOTHING IS TESTED, AND THAT IS THE BOUNDARY. Whether the product works,
 * whether the procedure is correct, belongs to the team that built it.
 * Whether the article’s steps use the labels its own screenshots show,
 * whether prerequisites come before step one, and whether the title is the
 * question the article answers, is a fact about a document. The second is
 * the product.
 */
export const site: SiteContent = {
  name: 'Help Article',
  strapline: 'Step four says click Save. The screenshot says Apply.',
  whopUrl: 'https://whop.com/help-article/',
  returnUrl: 'https://help-article-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Help articles, per article',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/help-article-review',

    about: {
      title: 'A help article is not documentation for its own sake. It is the one page a stuck customer reads before they give up.',
      intro:
        'Help Article reads one article the way the customer who is stuck halfway through a task reads it — step against screen: checking that the title is the question the customer would ask, that prerequisites are stated before step one, that every step is one action using the label the screenshot shows, and that the article ends by saying what success looks like and what to do if it does not appear.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'Help articles are written by people who know the product, often the person who built the feature, from memory and a fresh screenshot. Then the product ships three more releases. So the title is the feature’s internal name rather than the question a customer types, the permission you need is mentioned in step six after you have done five steps you cannot finish, step four says “click Save” and the screenshot shows a button labelled Apply, two steps are crammed into one sentence, and the article ends at the last click without saying what should now be on the screen.',
            'So the review reads the article as the stuck customer does. The title is read against the question the article actually answers. Prerequisites — plans, permissions, settings, other features — are looked for before step one. Every step is checked for being one action and for using the exact label the screenshot shows. And the ending is read for a visible result and a next step if the result does not appear.',
          ],
        },
        {
          title: 'Why the label that changed is the classic',
          paras: [
            'Interfaces are relabelled constantly — Save becomes Apply, Settings becomes Preferences, a menu moves — and each change is small and sensible. Articles are written once and updated when someone complains. The customer, following the text, looks for a word that is not on the screen, and concludes either that they are in the wrong place or that the product is broken.',
            'The damage is that a mismatched label stops the customer at exactly the moment they were succeeding. The review compares every label in the text with the label in its screenshot, and flags the ones that disagree, so the article and the screen use the same words.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not technical writing, product testing or support, and Help Article is not a documentation agency, a writer or a support team. Nothing here uses the product, so whether the procedure actually works, or whether the screenshots match the current release, cannot be known; the text is read against the screenshots supplied.',
            'It is also not a writing service. No article is rewritten and no screenshot replaced. The report says where the title does not match the question, where a prerequisite comes too late, where a step disagrees with its screenshot or does two things, and where the ending leaves the reader unsure; fixing the article is yours.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every article is read step by step against its screenshots, as a customer meeting the task for the first time, because the failures that matter are between the text and the screen. A correct article can still lose its reader at step four because one word on one button changed.',
      },
    },

    standards: {
      intro:
        'This report is about the page a customer reads instead of contacting you, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'Not technical writing', body: 'No article is drafted or rewritten. Help Article writes nothing.' },
        { title: 'Not product testing', body: 'Nothing here uses the product. Whether the procedure works on the current release is for your team to confirm.' },
        { title: 'Not support', body: 'Nothing here answers a customer or handles a ticket.' },
        { title: 'Nothing is rewritten', body: 'No article is redrafted and no screenshot replaced. Your materials are returned exactly as they arrived.' },
        { title: 'Text against screenshots', body: 'Findings rest on the article and screenshots supplied. A step with no screenshot is read for clarity alone.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for anyone who maintains a help centre — which is to say, anyone who ships.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the article as published, with its screenshots, and what customers are trying to do when they find it. A link to the live article works if it is public; attachments are better for unpublished drafts.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Help Article Review — the article as published or drafted.',
        'Its screenshots, at full size, so every label can be read.',
        'What customers are trying to do when they find it, in their words if you have them.',
      ],
      next:
        'The report comes back step against screen: a title that is not the question, prerequisites that come too late, steps that disagree with their screenshot or do two things, and an ending that does not show success.',
    },
  },

  hero: {
    eyebrow: 'Help articles',
    title: 'The article is accurate and the screenshots are fresh.',
    titleAccent: 'Step four says Save. The button says Apply.',
    body:
      'One help article read the way the customer who is stuck halfway through reads it: the title checked against the question it answers, prerequisites checked for being stated before step one, every step checked against the label in its screenshot, and the end checked for saying what success looks like.',
    primaryCta: { label: 'Start a brief', to: '/services/help-article-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'A title that is the question', body: 'The title read against the question the article actually answers, in the words a customer would type — not the feature’s internal name — so the customer finds the article before they open a ticket.' },
    { title: 'Prerequisites before step one', body: 'Every plan, permission, setting or other feature the task needs looked for before the first step, so nobody does five steps before learning they cannot do the sixth.' },
    { title: 'Steps that match the screen', body: 'Every step checked for being one action and for using the exact label its screenshot shows, so the customer looks for a word that is actually there.' },
    { title: 'An ending that shows success', body: 'The last step read for what the reader should now see, and what to do if they do not — because an article that stops at the last click leaves the reader unsure it worked.' },
  ],

  services: [
    {
      slug: 'help-article-review',
      name: 'Help Article Review',
      tagline: 'One article, read the way the customer stuck halfway through reads it.',
      summary:
        'The full read: the title against the question, prerequisites before step one, every step against its screenshot, and the ending checked for a visible result and a next step.',
      unitLabel: 'Articles',
      unitNoun: 'article',
      unitNounPlural: 'articles',
      unitRate: 49.99,
      checkoutHeading: 'How many articles?',
      brief: {
        intro:
          'Everything below is used to read the article the way your customers will. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'kind', label: 'What kind of article', type: 'select', required: true, half: true,
            options: ['How-to — a task in steps', 'Troubleshooting', 'Setup or getting started', 'Reference or explanation', 'Something else — say so below'],
            help: 'A how-to is read hardest for steps; troubleshooting for whether it matches the symptom.' },
          { name: 'reader', label: 'Who reads it', type: 'text', required: true, half: true,
            placeholder: 'Account admins at small companies, not technical',
            help: 'The article is read as that customer meeting the task for the first time.' },
          { name: 'product', label: 'Kind of product', type: 'select', required: true, half: true,
            options: ['Web app', 'Mobile app', 'Desktop software', 'Hardware or device', 'Not sure'],
            help: 'So the read knows what kind of screen to expect.' },
          { name: 'purpose', label: 'What customers are trying to do when they find it', type: 'area', required: true,
            placeholder: 'Add a second admin to their account so they can go on holiday.',
            help: 'The title and steps are read against this, and it ranks the findings.' },
          { name: 'tickets', label: 'What customers say when they get stuck', type: 'text', required: false, half: true,
            placeholder: '“I can’t find the invite button”',
            help: 'Optional, but a real quote points straight at the step that fails.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'The settings page was redesigned last month and the screenshots predate it.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'Enterprise customers have a different menu; that is covered in a separate article.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The article and its screenshots',
          required: true,
          requiredNote: 'The review reads every step against its screenshot, so send the article with its images at full size',
          accept: ['.pdf', '.docx', '.html', '.md', '.txt', '.png', '.jpg', '.gif', '.zip'],
          maxMb: 60,
          maxFiles: 25,
          help:
            'The article and its screenshots at full size. A public link in the brief works for published articles.',
        },
      },
      process: [
        { step: '01', title: 'Read the question', desc: 'What customers are trying to do, written down before the article is opened.' },
        { step: '02', title: 'Read the title', desc: 'The title checked against that question, in the customer’s words.' },
        { step: '03', title: 'Look for prerequisites', desc: 'Every plan, permission and setting the task needs looked for before step one.' },
        { step: '04', title: 'Check every step against its screen', desc: 'Each step checked for one action and for matching its screenshot’s labels.' },
        { step: '05', title: 'Read the ending', desc: 'The final step checked for a visible result and a next step if it does not appear.' },
        { step: '06', title: 'Report', desc: 'Findings step by step inside the stated turnaround, ranked by where a customer would stop first.' },
      ],
      included: [
        'The title read against the question the article answers',
        'Prerequisites checked for being stated before step one',
        'Every step checked for being a single action',
        'Every label in the text compared with the label in its screenshot',
        'A label that disagrees with its screenshot, flagged',
        'Steps that depend on something not yet mentioned, located',
        'The ending checked for what success looks like',
        'A missing “if this does not work” path, flagged',
        'Terms used that a customer would not know, listed',
        'Where a customer would stop first, first',
      ],
      turnaround: 'Three business days from the brief arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per article. A set of articles for one task — setup, then first use, then troubleshooting — is several, and worth sending together, because a prerequisite in one article that the next assumes is clearest across both.',
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
    { step: '01', title: 'Write the brief', desc: 'What kind of article, who reads it and what they are trying to do. Attach the article and its screenshots. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'As a stuck customer: title, prerequisites, every step against its screen, and the ending.' },
    { step: '04', title: 'The report', desc: 'Findings step by step inside the stated turnaround, ranked by where a customer would stop first.' },
  ],

  limits: [
    { title: 'Not technical writing', body: 'No article is drafted or rewritten. Help Article is not a writer or an agency.' },
    { title: 'Not product testing', body: 'Nothing here uses the product. The text is read against the screenshots supplied.' },
    { title: 'Nothing is rewritten', body: 'No article is redrafted. Your materials come back exactly as they arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no ticket-reduction figures. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Do you test the steps in our product?', a: 'No. Nothing here uses your product. The review reads the text against the screenshots you supply and says where they disagree, where a prerequisite is late, and where a step is unclear. Whether the procedure works on the current release is for your team to confirm.' },
    { q: 'The engineer who built the feature wrote it. Is a review still worth it?', a: 'The person who built a feature knows it too well to see where a newcomer stops. Their article is usually correct and often skips a prerequisite they never think about. The review reads it as a newcomer.' },
    { q: 'Can you rewrite the article?', a: 'No. Nothing is drafted. The report lists each finding with the step it concerns, so whoever owns the article can fix it.' },
    { q: 'What makes customers give up?', a: 'A label in the text that is not on the screen, and a prerequisite discovered after several steps. The report checks those first.' },
    { q: 'Our screenshots may be out of date. Is that a problem?', a: 'The review reads text against the screenshots supplied, so an outdated screenshot can agree with outdated text. Say in the brief if the interface has changed; the report will flag every label so you can check them against the live product.' },
    { q: 'Is an unpublished article confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed.' },
  ],

  resources: [
    {
      title: 'The title has to be the customer’s question',
      summary: '“Configuring Delegated Access” for “how do I add another admin?”',
      body: [
        'Articles are titled by the people who build features, in the feature’s name. Customers search in their own words for what they are trying to do.',
        'The response is a title in the customer’s words. The review reads each title against the question the article answers.',
      ],
    },
    {
      title: 'Prerequisites go before step one',
      summary: 'Step six: “You will need admin permission.”',
      body: [
        'Writers mention a requirement at the point it bites. The reader has already done five steps and now cannot finish.',
        'The response is a short “before you start” section. The review looks for every prerequisite and flags the ones that arrive late.',
      ],
    },
    {
      title: 'A step has to use the label on the screen',
      summary: 'Save in the text, Apply on the button.',
      body: [
        'Interfaces are relabelled constantly and articles are updated rarely. Every mismatch is a moment the customer thinks they are lost.',
        'The response is to quote labels exactly and check them with every release. The review compares every label in the text with its screenshot.',
      ],
    },
    {
      title: 'An article has to say what success looks like',
      summary: 'The article that ends at the last click.',
      body: [
        'Writers know what happens next, so they stop when the steps stop. The reader does not know whether it worked.',
        'The response is a last line describing the result and what to do if it does not appear. The review reads every ending for both.',
      ],
    },
  ],

  legal: {
    entity: 'Help Article',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
