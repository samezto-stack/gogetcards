import type { SiteContent } from './types';

/**
 * Annual Report — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE REPORT. One annual report is one document, so the
 * ladder is the whole catalogue and rung N is N reports.
 *
 * NOT AN AUDIT, AND THAT IS THE BOUNDARY. Whether the accounts are true and
 * fair is a matter for the preparers and the auditors and nothing here goes
 * near it. Whether the chair’s letter describes the same year as the tables,
 * whether last year’s targets are reported against, and whether a KPI kept
 * its definition, is a fact about a document a reader can check. The second
 * is the product; the distinction is in the hero, the limits, the footer and
 * the terms.
 */
export const site: SiteContent = {
  name: 'Annual Report',
  strapline: 'The chair’s letter says a record year. The table on page forty does not.',
  whopUrl: 'https://whop.com/annual-report/',
  returnUrl: 'https://annual-report-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Annual reports, per report',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/annual-report-review',

    about: {
      title: 'An annual report is not a brochure about a good year. It is a record its readers check against itself and against last year.',
      intro:
        'Annual Report reads one report the way the member, donor or investor who reads it end to end reads it — narrative against figures: checking that what the front half announces is carried by the numbers in the back half, that last year’s targets are reported against, that every KPI keeps its definition, and that the risk section describes the year that actually happened. It is not an audit and gives no assurance.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'An annual report is assembled by many hands on one deadline. The chair’s letter and the chief executive’s review are written by people describing the year as they lived it; the tables come from finance; the KPIs from whoever owns each one; the risk section from a register updated once a year. Nobody reads the result the way a careful reader does — with last year’s report open beside it. So the letter calls it a record year and the five-year table shows the third best, a target announced with confidence last year has vanished from this year’s report, and the customer-retention figure rose because it is now measured over a different period.',
            'So the review reads the report as that reader does. Every claim in the narrative is followed to the figure that should support it. Last year’s report is read for the targets and commitments it made, and this year’s for whether each is reported against. Every KPI is checked for the same definition, period and basis as last year. And the risk section is read against the events the rest of the report describes.',
          ],
        },
        {
          title: 'Why the vanished target is the classic',
          paras: [
            'Targets are announced in the good year and reported in the next one, by which time the person who announced them may have moved on and the target may have been missed. Nobody decides to drop it. It simply is not in anyone’s section, and the report goes out describing the year in terms of the targets that were met. The reader who kept last year’s report — the member, the funder, the analyst — notices the absence first, because the absence is the one thing they were looking for.',
            'The damage is that a missed target reported plainly costs a paragraph, and a missed target omitted costs the reader’s trust in every target that was reported. The review lists every target and commitment in last year’s report and says where this year’s reports against it, so the report answers the question its most careful reader will ask.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not an audit, a review engagement, or any form of assurance, and Annual Report is not an auditor, an accountant or an adviser. No opinion is offered on whether the financial statements are true and fair, whether they comply with any standard or regulation, whether a disclosure is required, or whether the strategy is right. The financial statements are read only as a source of figures the narrative refers to.',
            'It is also not a writing service. No letter is drafted, no section restructured and no figure restated. The report says where the narrative is not carried by the figures, where a target goes unreported, where a KPI changed definition, and where the risk section does not describe the year; writing the report and standing behind it belongs to the people who sign it.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every report is read in full with last year’s beside it, as its most careful reader will, because the failures that matter are between the sections rather than within them. A genuinely good year can read as a defensive one because one target went unmentioned and nobody compared the two reports before printing.',
      },
    },

    standards: {
      intro:
        'This report is about a document an organisation is held to, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'Not an audit and not assurance', body: 'No opinion on the financial statements, the controls or compliance with any standard. Nothing here may be described to anyone as an audit, a review engagement or assurance of any kind.' },
        { title: 'Not accounting or disclosure advice', body: 'No view on what must be disclosed, how anything should be accounted for, or whether the strategy is sound. Annual Report advises on nothing.' },
        { title: 'The document, not the year', body: 'The subject is whether the narrative matches the figures, targets are reported against and KPIs keep their definitions. Whether the year was good is for the reader.' },
        { title: 'Nothing is written or rewritten', body: 'No letter is drafted, no section restructured and no figure restated. Your report is returned exactly as it arrived.' },
        { title: 'Read as the careful reader reads it', body: 'Findings rest on the reports you supply. Where last year’s report is not supplied, targets are read only within this year’s.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for anyone putting a report together this season. If one note sends someone back to last year’s targets before a member does, it has done its job.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: this year’s report in its latest draft, last year’s as published, and who reads it — members, donors, investors, a regulator. Drafts are fine; say which sections are still moving.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Annual Report Review — this year’s report in its latest draft, all sections together.',
        'Last year’s report as published, so targets and KPI definitions can be compared.',
        'Who reads it — members, donors, investors — so the report can be read for what they compare first.',
      ],
      next:
        'The report comes back narrative against figures: where a claim is not carried by the numbers, where last year’s target is not reported against, where a KPI changed definition, and where the risk section does not describe the year.',
    },
  },

  hero: {
    eyebrow: 'Annual reports',
    title: 'The letter says a record year and the design is beautiful.',
    titleAccent: 'Last year’s target is nowhere in it.',
    body:
      'One annual report read cold, as the member, donor or investor who reads it end to end reads it: the narrative read against the figures, last year’s targets checked for whether they are reported against, every KPI checked for the same definition, and the risks read against the year that happened. Not an audit.',
    primaryCta: { label: 'Start a brief', to: '/services/annual-report-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'A narrative the figures carry', body: 'Every claim in the letters and reviews followed to the number in the tables that should support it — record, growth, best-ever, on track — so the front of the report describes the same year as the back.' },
    { title: 'Last year’s targets reported against', body: 'Every target and commitment in last year’s report listed, and this year’s read for where each is reported, met or missed — the comparison the most careful reader makes first.' },
    { title: 'KPIs that keep their definition', body: 'Every headline measure checked for the same period, basis and definition as last year, because a KPI that changed how it is counted is a new KPI wearing an old name.' },
    { title: 'Risks that mention the year', body: 'The risk section read against the events the rest of the report describes, so a risk that materialised is not still listed as a possibility in the same document that reports it happening.' },
  ],

  services: [
    {
      slug: 'annual-report-review',
      name: 'Annual Report Review',
      tagline: 'One report, read the way its most careful reader reads it — with last year’s open beside it.',
      summary:
        'The full read: the narrative followed into the figures, last year’s targets followed into this year, every KPI checked for a consistent definition, and the risk section read against the year. Not an audit and not assurance.',
      unitLabel: 'Reports',
      unitNoun: 'report',
      unitNounPlural: 'reports',
      unitRate: 49.99,
      checkoutHeading: 'How many reports?',
      brief: {
        intro:
          'Everything below is used to read the report the way its readers will. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'kind', label: 'What kind of organisation', type: 'select', required: true, half: true,
            options: ['Charity or nonprofit', 'Membership body or association', 'Private company', 'Listed company', 'Public body', 'Something else — say so below'],
            help: 'Different readers compare different things first, so this sets what the read is aimed at.' },
          { name: 'reader', label: 'Who reads it most closely', type: 'text', required: true, half: true,
            placeholder: 'Our members, ahead of the AGM vote',
            help: 'The report is read for what that reader will check, so the read is aimed at them.' },
          { name: 'stage', label: 'Where the draft is', type: 'select', required: true, half: true,
            options: ['Early — sections still being written', 'Full draft — before design', 'Designed — before sign-off', 'Published — reviewing for next year', 'Not sure'],
            help: 'An early draft can be changed freely; a designed one is read for what must change before sign-off.' },
          { name: 'purpose', label: 'What this report most has to show', type: 'area', required: true,
            placeholder: 'That the turnaround plan announced last year is working, without overstating a year that was only partly better.',
            help: 'This ranks the findings. A missing target in the chair’s letter is not the same as a rounding difference in an appendix.' },
          { name: 'lastyear', label: 'Last year’s report', type: 'select', required: true, half: true,
            options: ['Attached', 'Linked in the notes below', 'There was no report last year'],
            help: 'Targets and KPI definitions are read against last year’s report when it is supplied.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'Retention is now measured over 12 months instead of 6, and the letter calls it our best year for retention.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'The volunteer-hours target was withdrawn by the board in March; the minute is attached.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'This year’s report and last year’s',
          required: true,
          requiredNote: 'The review reads the report against itself and against last year’s, so send the draft and, if there was one, last year’s published report',
          accept: ['.pdf', '.docx', '.pptx', '.xlsx', '.csv', '.txt', '.zip'],
          maxMb: 80,
          maxFiles: 15,
          help:
            'This year’s draft and last year’s as published. Supporting KPI workbooks help but are not required.',
        },
      },
      process: [
        { step: '01', title: 'Read both years', desc: 'This year’s draft and last year’s report, so every target and definition has something to be compared with.' },
        { step: '02', title: 'List last year’s promises', desc: 'Every target and commitment made last year written down before this year’s report is read.' },
        { step: '03', title: 'Follow the narrative into the figures', desc: 'Each claim in the letters and reviews traced to the number that should support it.' },
        { step: '04', title: 'Compare every KPI', desc: 'Each headline measure checked for the same period, basis and definition as last year.' },
        { step: '05', title: 'Read the risks against the year', desc: 'The risk section checked against the events the rest of the report describes.' },
        { step: '06', title: 'Report', desc: 'Findings section by section inside the stated turnaround, ranked by what the careful reader would notice first.' },
      ],
      included: [
        'Every narrative claim followed to the figure that should carry it',
        '“Record”, “best-ever” and “on track” checked against the tables',
        'Every target from last year’s report listed and followed into this year',
        'A target that is not reported against, flagged',
        'Every KPI checked for the same definition, period and basis',
        'A KPI that changed how it is counted, surfaced',
        'The risk section read against the events the report describes',
        'Figures that disagree between the letter, the review and the tables, listed',
        'Terms and measures used before they are explained, located',
        'What the careful reader would notice first, first',
      ],
      turnaround: 'Three business days from the brief arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per report. Last year’s report is read as a source, not as a second report, and is included. Groups with a summary report and a full report often send both, because the figure rounded for the summary is clearest beside the full table.',
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
    { step: '01', title: 'Write the brief', desc: 'What kind of organisation, who reads the report, where the draft is and what it most has to show. Attach this year’s and last year’s. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'Both years side by side: the narrative against the figures, last year’s targets, every KPI definition and the risk section.' },
    { step: '04', title: 'The report', desc: 'Findings section by section inside the stated turnaround, ranked by what the careful reader would notice first.' },
  ],

  limits: [
    { title: 'Not an audit and not assurance', body: 'No opinion on the financial statements, the controls or compliance with any standard. Annual Report is not an auditor, an accountant or an adviser.' },
    { title: 'Not disclosure or strategy advice', body: 'No view on what must be disclosed or whether the strategy is right. The report is about whether the document agrees with itself and with last year.' },
    { title: 'Nothing is written or rewritten', body: 'No letter is drafted and no figure restated. Your report comes back exactly as it arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no figures about reports reviewed. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Is this an audit?', a: 'No, and it must never be described as one. Nothing here gives an opinion on the financial statements, tests a control or assures anything. The financial statements are read only as the source of the figures the narrative refers to. What the report answers is whether the document agrees with itself and with last year’s — which is a question about a document, not about the accounts.' },
    { q: 'Our accounts are audited. Is this still worth it?', a: 'The audit covers the financial statements. The front half — the letters, the review, the KPIs and the targets — is where the classic failures sit, and it is the half most readers actually read. A record year the tables do not show, or a vanished target, is invisible to the people who lived the year and obvious to the member who kept last year’s report.' },
    { q: 'Can you rewrite the chair’s letter?', a: 'No. Nothing is drafted and your report comes back untouched. The report says where the letter is not carried by the figures; what the chair says about the year is the chair’s.' },
    { q: 'What will our members compare first?', a: 'Usually last year’s targets and the headline KPIs. The report lists both and says where this year’s report answers them, so the question the AGM will ask is answered before it is asked.' },
    { q: 'Can we withhold sections?', a: 'Yes. Send the sections that carry the narrative, the KPIs and the targets, and say what has been withheld. Figures can be read only where they are supplied.' },
    { q: 'Is the draft confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed. An unpublished report is sensitive and is treated accordingly.' },
  ],

  resources: [
    {
      title: 'The chair’s letter has to match the tables',
      summary: 'The record year that the five-year summary ranks third.',
      body: [
        'The letter is written from memory and mood, often before the figures are final, and it describes the year as it felt from the top. "Our strongest year" can mean strongest in income, in reach, in morale or in the second half. The reader takes it to mean the figure in the five-year table, and finds that it is not.',
        'The response is to check every superlative in the narrative against the table that measures it, and to name the measure where it is true. The review follows each claim to its figure, so the letter and the tables describe one year.',
      ],
    },
    {
      title: 'Last year’s targets have to be reported against',
      summary: 'The commitment that simply is not in anyone’s section this year.',
      body: [
        'A target announced is a promise to the reader, and the reader remembers it longer than the organisation does. When it is missed, nobody decides to omit it; it falls between sections because nobody owns reporting it.',
        'The response is to list last year’s targets before writing this year’s report and give each a line, met or not. The review does that list for you and says where each is answered.',
      ],
    },
    {
      title: 'A KPI that changes definition is a new KPI',
      summary: 'Retention, now over twelve months instead of six.',
      body: [
        'Measures get better definitions over time, which is good, and the improvement is reported as an improvement in the measure, which is not. A retention rate counted over a longer window, a reach figure that now includes online, an average that became a median — each produces a better number for reasons that have nothing to do with the year.',
        'The response is to state the change and restate last year on the new basis, or keep the old basis for one more year. The review checks every KPI against last year’s definition and flags the ones that moved.',
      ],
    },
    {
      title: 'The risk section has to mention the year',
      summary: 'The risk listed as possible in the report that describes it happening.',
      body: [
        'Risk sections are updated from the register, and registers are updated slowly. The result is a report whose operational review describes a supplier failure in some detail and whose risk section lists supplier failure as a possibility with a medium rating and no change since last year.',
        'The response is to read the risk section last, against the rest of the report. The review does exactly that, and flags risks that the year has already answered.',
      ],
    },
  ],

  legal: {
    entity: 'Annual Report',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
