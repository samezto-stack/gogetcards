import type { SiteContent } from './types';

/**
 * Privacy Notice — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE NOTICE. One privacy notice is one document, so
 * the ladder is the whole catalogue and rung N is N notices.
 *
 * NOT LEGAL ADVICE, AND THAT IS THE BOUNDARY. Whether a notice is lawful,
 * what a regulation requires, whether a basis is valid, belongs to lawyers.
 * Whether the notice mentions the tools, purposes and periods that the
 * customer’s own inventory lists is a comparison of two documents. The
 * second is the product. Nothing here scans or audits the product; the
 * inventory is the customer’s and is taken as supplied.
 */
export const site: SiteContent = {
  name: 'Privacy Notice',
  strapline: 'The notice lists four tools. The product sends data to nine.',
  whopUrl: 'https://whop.com/privacy-notice/',
  returnUrl: 'https://privacy-notice-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Privacy notices, per notice',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/privacy-notice-review',

    about: {
      title: 'A privacy notice is not a page of reassurance. It is a description of what a product does with people’s data.',
      intro:
        'Privacy Notice reads one notice against your own inventory of the product — statement against practice: checking that every category of data the product collects is in the notice, that every purpose describes what the data is actually used for, that every tool or company the product sends data to is named, and that every retention period matches what the product is set to do. It gives no legal advice.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'A privacy notice is usually written once, from a template or by a lawyer, at a moment when the product looked a particular way. Then the product keeps shipping. A chat widget is added, an analytics tool replaced, a data warehouse connected, a retention job changed from ninety days to a year. Nobody owns telling the notice. So it lists four recipients and the product sends data to nine, it says data is used to provide the service and the marketing team also uses it to build audiences, and it promises deletion after thirty days to a database that keeps everything.',
            'So the review reads the notice against the product as you describe it. You supply the inventory — the data collected, the tools and companies it goes to, what it is used for, how long it is kept — and every statement in the notice is checked against it. Data the notice does not mention, purposes it does not state, recipients it does not name and periods that disagree are listed, along with statements in the notice that the inventory gives no basis for.',
          ],
        },
        {
          title: 'Why the unnamed tool is the classic',
          paras: [
            'Integrations are added by whoever needs them — support, marketing, engineering — and each one is a decision about data that nobody experiences as a decision about the notice. A tag added to the website on a Tuesday is a recipient by Wednesday. Over a year a product acquires several, and the notice still lists the ones that existed when it was written.',
            'The damage is that the notice is the product’s public description of itself, and the gap is visible to anyone who opens a browser’s network panel. The review compares every recipient in your inventory with the notice and lists the ones it does not name, so the description matches the product.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not legal advice, and Privacy Notice is not a law firm, a data protection officer or a compliance consultant. No opinion is offered on whether the notice is lawful, whether a legal basis is valid, which regulation applies, or whether anything must be disclosed. Nothing here assesses or certifies compliance with anything.',
            'It is also not an audit of the product. Nothing is scanned, crawled or tested; the inventory is yours, taken as supplied, and the review is only as complete as it is. No notice is rewritten. The report lists where the notice and the inventory disagree; what the notice should say is a question for your lawyer.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every notice is read in full against the inventory supplied, statement by statement, because the failures that matter are omissions rather than errors. A carefully drafted notice can be out of date by the second release, and the gap is visible only when the notice and the product are read side by side.',
      },
    },

    standards: {
      intro:
        'This report is about a document with legal consequences, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'Not legal advice', body: 'No opinion on whether the notice is lawful, which law applies or what must be said. Nothing here may be relied on as legal advice. Privacy Notice is not a law firm.' },
        { title: 'Not a compliance assessment or certification', body: 'Nothing here assesses, audits or certifies compliance with any regulation, and no report may be described as doing so.' },
        { title: 'Not an audit of the product', body: 'Nothing is scanned, crawled or tested. The inventory is yours and is taken as supplied; the comparison is only as complete as it is.' },
        { title: 'Nothing is rewritten', body: 'No notice is redrafted. Your notice and inventory are returned exactly as they arrived.' },
        { title: 'Statement against inventory', body: 'Findings say where the notice and the inventory disagree. What to change, and whether it matters legally, is for your lawyer.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for anyone who owns a notice and a product that keeps shipping. If one note gets a new tool into the notice before a customer finds it, it has done its job.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the notice as published, and your own inventory — the data collected, the tools and companies it is sent to, what each is used for and how long it is kept. A spreadsheet is ideal; a list in the brief works. No personal data of any customer is needed or wanted.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Privacy Notice Review — the notice as it is published, with its date.',
        'Your inventory — what is collected, which tools and companies receive it, for what, and for how long.',
        'Do not send any customer’s personal data. The review needs categories, not records.',
      ],
      next:
        'The report comes back statement against inventory: data the notice does not mention, purposes it does not state, recipients it does not name, retention periods that disagree, and statements the inventory gives no basis for.',
    },
  },

  hero: {
    eyebrow: 'Privacy notices',
    title: 'The notice is thorough and the lawyer signed it off.',
    titleAccent: 'It names four tools. The product now sends data to nine.',
    body:
      'One privacy notice read against your own inventory of the product: every category of data checked against what is collected, every purpose against what the data is used for, every recipient against your integrations, and every retention period against your settings. Not legal advice.',
    primaryCta: { label: 'Start a brief', to: '/services/privacy-notice-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'Everything collected, mentioned', body: 'Every category of data in your inventory checked against the notice — forms, cookies, device data, uploads, support conversations — so the notice describes what the product actually gathers.' },
    { title: 'Purposes that describe the use', body: 'Every use your inventory records checked for a purpose in the notice that describes it, because “to provide the service” does not describe building an advertising audience.' },
    { title: 'Every recipient named', body: 'Every tool, processor and company your inventory says receives data checked against the notice, including the ones added since it was written.' },
    { title: 'Periods that match the settings', body: 'Every retention period in the notice compared with the period your inventory says the product actually keeps data for.' },
  ],

  services: [
    {
      slug: 'privacy-notice-review',
      name: 'Privacy Notice Review',
      tagline: 'One notice, read against what the product actually does.',
      summary:
        'The full comparison: data collected, purposes, recipients and retention, read statement by statement against your inventory of the product. Not legal advice and not an audit of the product.',
      unitLabel: 'Notices',
      unitNoun: 'notice',
      unitNounPlural: 'notices',
      unitRate: 49.99,
      checkoutHeading: 'How many notices?',
      brief: {
        intro:
          'Everything below is used to read the notice against the product. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'kind', label: 'What kind of product', type: 'select', required: true, half: true,
            options: ['Website', 'Web app or SaaS', 'Mobile app', 'Online shop', 'Several of these — say so below'],
            help: 'Different products collect in different places, so this sets where the read looks hardest.' },
          { name: 'users', label: 'Who the users are', type: 'text', required: true, half: true,
            placeholder: 'Small business owners, mostly in the US',
            help: 'So the notice is read for the people it is written to.' },
          { name: 'inventory', label: 'How the inventory is supplied', type: 'select', required: true, half: true,
            options: ['Spreadsheet attached', 'Listed in the notes below', 'Exported from a consent or tag tool', 'Not yet — help me know what to list'],
            help: 'The review compares the notice with your inventory, so it needs one. If you have none, the report lists what the notice claims so you can check it.' },
          { name: 'purpose', label: 'What has changed since the notice was written', type: 'area', required: true,
            placeholder: 'New chat widget, moved analytics provider, added a data warehouse in March.',
            help: 'This ranks the findings. Changes since the notice are where gaps usually are.' },
          { name: 'date', label: 'When the notice was last updated', type: 'text', required: false, half: true,
            placeholder: 'January 2025',
            help: 'So the read can focus on what has shipped since.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'The notice says 30 days; we think the backups keep everything for a year.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'Our payment provider has its own notice we link to rather than repeat.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The notice and your inventory',
          required: true,
          requiredNote: 'The review reads the notice against the product, so send the notice and your inventory of data, tools, uses and retention',
          accept: ['.pdf', '.docx', '.xlsx', '.csv', '.txt', '.html', '.zip'],
          maxMb: 40,
          maxFiles: 10,
          help:
            'The notice as published and your own inventory. Do not send any customer’s personal data — categories, not records.',
        },
      },
      process: [
        { step: '01', title: 'Read the notice', desc: 'Every statement about data written down: what, why, to whom and for how long.' },
        { step: '02', title: 'Read the inventory', desc: 'Your list of data, tools, uses and retention put in the same shape.' },
        { step: '03', title: 'Compare what is collected', desc: 'Every category in the inventory looked for in the notice.' },
        { step: '04', title: 'Compare uses and recipients', desc: 'Every use checked for a purpose that describes it, every recipient for a mention.' },
        { step: '05', title: 'Compare retention', desc: 'Every period in the notice compared with the period in the inventory.' },
        { step: '06', title: 'Report', desc: 'Findings section by section inside the stated turnaround, ranked by the size of the gap.' },
      ],
      included: [
        'Every category of data in the inventory looked for in the notice',
        'Data collected but not mentioned, flagged',
        'Every use in the inventory checked for a stated purpose that describes it',
        'Every tool and company that receives data checked for a mention',
        'Recipients added since the notice was written, listed',
        'Every retention period compared with the inventory',
        'Statements in the notice the inventory gives no basis for, listed',
        'Statements that contradict each other within the notice, located',
        'What the review was compared against, stated',
        'The largest gaps first',
      ],
      turnaround: 'Three business days from the brief arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per notice. A product with a website notice, an app notice and a cookie notice has three, and they are often worth sending together, because a tool named in one and missing from another is clearest side by side.',
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
    { step: '01', title: 'Write the brief', desc: 'What kind of product, who the users are and what has changed. Attach the notice and your inventory. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The comparison', desc: 'Statement by statement against your inventory: collected, purposes, recipients and retention.' },
    { step: '04', title: 'The report', desc: 'Findings section by section inside the stated turnaround, ranked by the size of the gap.' },
  ],

  limits: [
    { title: 'Not legal advice', body: 'No opinion on whether the notice is lawful or what it must say. Privacy Notice is not a law firm or a data protection officer.' },
    { title: 'Not a compliance assessment', body: 'Nothing here assesses, audits or certifies compliance with any regulation, and nothing scans or tests the product.' },
    { title: 'Nothing is rewritten', body: 'No notice is redrafted. Your documents come back exactly as they arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no compliance badges. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Is this legal advice or a compliance check?', a: 'Neither. The review compares what the notice says with what your inventory says the product does, and lists where they disagree. Whether the notice is lawful, and what it should say, are questions for your lawyer. Nothing here may be described as a compliance assessment or certification.' },
    { q: 'A lawyer wrote our notice. Is this still worth it?', a: 'The lawyer wrote it for the product as it was described to them on that day. The commonest gaps come later — tools added, uses extended, retention changed — and they are gaps between the notice and the product, not errors in the drafting.' },
    { q: 'Can you rewrite the notice?', a: 'No. Nothing is drafted. The report lists each gap with the statement and the inventory line it concerns, so your lawyer can decide what to change.' },
    { q: 'Why do you need our inventory? Can’t you just look at the product?', a: 'Nothing here scans, crawls or tests a product. The review compares two documents, and the inventory is the one that describes the product. If you do not have one, the report lists every claim the notice makes so you can check each against the product yourself.' },
    { q: 'Do you need customer data?', a: 'No, and please do not send any. The review needs categories of data, not records.' },
    { q: 'Is our inventory confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed. A list of your tools and data flows is sensitive and is treated accordingly.' },
  ],

  resources: [
    {
      title: 'Every tool that receives data has to be in the notice',
      summary: 'The chat widget added on a Tuesday, missing on Wednesday.',
      body: [
        'Tools are added by teams solving their own problems, and nobody experiences adding a tag as changing a public document. The notice keeps its original list while the product acquires new recipients release by release.',
        'The response is to make adding a recipient a change to the notice. The review compares every recipient in your inventory with the notice and lists the ones it does not name.',
      ],
    },
    {
      title: 'A purpose has to describe the use',
      summary: '“To provide the service”, covering an advertising audience.',
      body: [
        'Purposes are written broadly so they will not go out of date, and they end up describing nothing. A reader cannot tell from “to improve our services” that their email is matched against an ad platform.',
        'The response is to name each use plainly. The review checks every use in your inventory for a purpose in the notice that a reader would recognise as describing it.',
      ],
    },
    {
      title: 'The retention period has to match the setting',
      summary: 'Thirty days in the notice, a year in the backups.',
      body: [
        'Retention is promised in the notice and implemented in a job, a setting or a backup policy owned by someone else. The two are set at different times and drift.',
        'The response is to write the notice from the setting, not the other way round. The review compares every period in the notice with your inventory and flags the ones that disagree.',
      ],
    },
    {
      title: 'A notice goes stale with every release',
      summary: 'Accurate on the day it was signed, and not since.',
      body: [
        'A notice is not wrong when it is written; it becomes wrong as the product changes. The date at the bottom tells the reader how long it has had to drift.',
        'The response is a read against the product after every significant change. The review is built for exactly that read, and states what it was compared against.',
      ],
    },
  ],

  legal: {
    entity: 'Privacy Notice',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
