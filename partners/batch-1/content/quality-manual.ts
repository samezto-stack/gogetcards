import type { SiteContent } from './types';

/**
 * Quality Manual — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE MANUAL. One quality manual is one document with
 * the set it refers to, so the ladder is the whole catalogue and rung N is N
 * manuals.
 *
 * NOT AN AUDIT, AND THAT IS THE BOUNDARY. Whether the system meets a
 * standard, whether it is followed in practice, whether it would pass an
 * assessment, belongs to the people who run it and the bodies that assess it.
 * Whether every document the manual cites exists under that name and
 * version, whether every role is defined, and whether every required record
 * has a form that creates it, is a fact about a set of documents. The second
 * is the product.
 */
export const site: SiteContent = {
  name: 'Quality Manual',
  strapline: 'Section 7 cites procedure QP-14. QP-14 was renamed QP-21 in 2023.',
  whopUrl: 'https://whop.com/quality-manual/',
  returnUrl: 'https://quality-manual-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Quality manuals, per manual',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/quality-manual-review',

    about: {
      title: 'A quality manual is not a statement of good intentions. It is a map of documents people are expected to follow.',
      intro:
        'Quality Manual reads one manual against the documents it refers to — every reference against what it points to: checking that every procedure, form and work instruction it cites exists in the set supplied under that name and version, that every role it assigns is defined, that every record it requires has a form or system that produces it, and that the revision history agrees with the documents. It is not an audit.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'A quality manual is the top of a pyramid of documents, written once and revised when something forces it. The procedures underneath are revised more often, by different people, and renamed, merged and retired. Nobody walks every reference from the top after each change. So section 7 cites procedure QP-14, which was merged into QP-21 two years ago; the manual assigns approval to the “Quality Lead”, a role defined nowhere and held by nobody on the organisation chart; the manual requires training records that no form in the set creates; and the revision table says revision 6 while the footer says revision 5.',
            'So the review reads the manual against the set as a staff member following it would. Every cross-reference — procedure, form, work instruction, policy, external document — is checked for a document in the set with that identifier, title and version. Every role is checked for a definition and, where an organisation chart is supplied, for being held. Every required record is checked for a form or system that produces it. And the revision history is checked against the headers, footers and the documents it says changed.',
          ],
        },
        {
          title: 'Why the renamed procedure is the classic',
          paras: [
            'Procedures are improved in the usual way: two are merged, one is split, a numbering scheme is tidied. Each change is approved and published. The manual, which cites them by number, is not part of the change, because it was not the document being changed. A staff member following the manual looks for a procedure that no longer exists, and either finds an old copy or improvises.',
            'The damage is that a quality system exists to make people do things one way, and a broken reference is a fork in the road. The review walks every reference in the manual to the document it points to and lists the ones that land nowhere or land on the wrong version.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not an audit, a certification assessment or quality consulting, and Quality Manual is not a certification body, an auditor, a registrar or a consultant. No opinion is offered on whether the system meets any standard, whether it is followed in practice, whether it would pass an assessment, or whether any procedure is adequate. Nothing here observes the organisation.',
            'It is also not a writing service. No manual is rewritten and no procedure drafted. The report says where a reference lands nowhere, where a role is undefined, where a required record has no source and where the revision history disagrees; maintaining the system is yours.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every manual is read in full with the set it refers to, reference by reference, because the failures that matter are between documents revised at different times. A well-run system can still send its staff to a procedure that no longer exists because the manual was not part of the change.',
      },
    },

    standards: {
      intro:
        'This report is about the document at the top of a management system, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'Not an audit', body: 'No opinion on whether the system is followed, effective or adequate. Nothing here may be described as an audit, internal or external.' },
        { title: 'No compliance or certification view', body: 'No view on whether the system meets any standard or would pass any assessment, and nothing is certified.' },
        { title: 'The documents, not the system', body: 'The subject is whether the manual’s references, roles, records and revisions agree with the documents supplied. Whether the system works stays with you.' },
        { title: 'Nothing is rewritten', body: 'No manual is redrafted and no procedure written. Your documents are returned exactly as they arrived.' },
        { title: 'Only the set supplied', body: 'A reference is checked against the documents you send. A document not supplied is reported as not supplied, not as missing from your system.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for anyone who maintains a document system that changes faster than its top-level manual.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the manual, the procedures, forms and work instructions it refers to, and a document register if you keep one. An organisation chart helps role checks. Names and commercial details can be redacted; document identifiers and titles cannot.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Quality Manual Review — the manual in its current revision.',
        'The procedures, forms and work instructions it refers to, and the document register if you have one.',
        'An organisation chart, if you want roles checked against people.',
      ],
      next:
        'The report comes back reference by reference: citations that land nowhere or on the wrong version, undefined roles, required records with no source, and revision histories that disagree.',
    },
  },

  hero: {
    eyebrow: 'Quality manuals',
    title: 'The manual is thorough and it passed its last assessment.',
    titleAccent: 'Section 7 points to a procedure renamed two years ago.',
    body:
      'One quality manual read against the documents it refers to: every procedure, form and instruction it cites checked for existing under that name and version, every role checked for a definition, every required record checked for a form that creates it, and the revision history checked against the documents. Not an audit.',
    primaryCta: { label: 'Start a brief', to: '/services/quality-manual-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'References that land', body: 'Every procedure, form, work instruction and policy the manual cites checked for a document in the set with that identifier, title and version — so a reader sent somewhere arrives.' },
    { title: 'Roles that are defined', body: 'Every role the manual assigns a responsibility to checked for a definition, and against the organisation chart where one is supplied, so “the Quality Lead” is someone.' },
    { title: 'Records with a source', body: 'Every record the manual requires checked for a form, log or system in the set that produces it, because a required record nothing creates is a finding waiting to happen.' },
    { title: 'Revisions that agree', body: 'The revision table checked against headers, footers and the documents it says changed, so the manual and the set describe the same version of the system.' },
  ],

  services: [
    {
      slug: 'quality-manual-review',
      name: 'Quality Manual Review',
      tagline: 'One manual, read against every document it points to.',
      summary:
        'The full read: every cross-reference checked against the set, every role checked for a definition, every required record checked for a source, and the revision history checked for consistency. Not an audit.',
      unitLabel: 'Manuals',
      unitNoun: 'manual',
      unitNounPlural: 'manuals',
      unitRate: 49.99,
      checkoutHeading: 'How many manuals?',
      brief: {
        intro:
          'Everything below is used to read the manual against its documents. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'kind', label: 'What kind of manual', type: 'select', required: true, half: true,
            options: ['Quality manual', 'Integrated management system manual', 'Operations manual', 'Food safety or hygiene manual', 'Something else — say so below'],
            help: 'This sets which references and records are expected.' },
          { name: 'size', label: 'Size of the document set', type: 'text', required: true, half: true,
            placeholder: 'Manual plus about 40 procedures and 60 forms',
            help: 'So the read knows how many references to expect.' },
          { name: 'users', label: 'Who follows it', type: 'text', required: true, half: true,
            placeholder: 'Production and warehouse staff across two sites',
            help: 'The manual is read as a staff member following it.' },
          { name: 'purpose', label: 'What has changed since the manual was last revised', type: 'area', required: true,
            placeholder: 'Procedures renumbered in 2023; purchasing and receiving merged.',
            help: 'Changes since the last revision are where references break, so this ranks the findings.' },
          { name: 'register', label: 'Document register', type: 'select', required: false, half: true,
            options: ['Attached', 'No register', 'Kept in a system — export attached'],
            help: 'A register helps confirm current versions.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'The manual still mentions the old ERP by name.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'Site-specific instructions live in each site’s own folder and are not sent.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The manual and the documents it cites',
          required: true,
          requiredNote: 'The review checks every reference against the documents it points to, so send the manual and the set',
          accept: ['.pdf', '.docx', '.xlsx', '.csv', '.txt', '.zip'],
          maxMb: 150,
          maxFiles: 25,
          help:
            'The manual and its referenced documents. A single zip of the set is easiest. Large sets can be sent as a register plus the documents most cited.',
        },
      },
      process: [
        { step: '01', title: 'Index the set', desc: 'Every document supplied listed with its identifier, title and version.' },
        { step: '02', title: 'Walk every reference', desc: 'Each citation in the manual followed to the document it names.' },
        { step: '03', title: 'Check every role', desc: 'Each role checked for a definition and, where supplied, against the organisation chart.' },
        { step: '04', title: 'Check every required record', desc: 'Each record checked for a form, log or system that produces it.' },
        { step: '05', title: 'Check the revision history', desc: 'Revision table, headers, footers and changed documents compared.' },
        { step: '06', title: 'Report', desc: 'Findings section by section inside the stated turnaround, ranked by what would send a reader the wrong way first.' },
      ],
      included: [
        'Every document in the set indexed by identifier, title and version',
        'Every cross-reference in the manual followed to its document',
        'References that land on nothing, flagged',
        'References that land on a different title or version, listed',
        'Every role checked for a definition',
        'Roles not held by anyone on the organisation chart, where supplied',
        'Every required record checked for a form or system that produces it',
        'Revision table, headers and footers checked for agreement',
        'Documents in the set that nothing references, listed',
        'What would send a reader the wrong way first, first',
      ],
      turnaround: 'Three business days from the documents arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per manual, with the documents it refers to included. An organisation with a group manual and site manuals has several, and they are often worth sending together, because a reference that breaks between levels is clearest across both.',
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
    { step: '01', title: 'Write the brief', desc: 'What kind of manual, how big the set is, who follows it and what has changed. Attach the manual and its documents. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'Reference by reference: documents, roles, records and revisions.' },
    { step: '04', title: 'The report', desc: 'Findings section by section inside the stated turnaround, ranked by what would send a reader the wrong way first.' },
  ],

  limits: [
    { title: 'Not an audit', body: 'No opinion on whether the system is followed or effective. Quality Manual is not an auditor or a consultant.' },
    { title: 'No certification view', body: 'No view on compliance with any standard or readiness for any assessment.' },
    { title: 'Nothing is rewritten', body: 'No manual is redrafted. Your documents come back exactly as they arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no certification badges. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Is this an audit or certification preparation?', a: 'No, and it must never be described as either. Nothing here observes the organisation or judges compliance with any standard. The review checks whether the manual’s references, roles, records and revisions agree with the documents you supply — a question about a set of documents.' },
    { q: 'Our manual passed its last assessment. Is this still worth it?', a: 'Assessments sample. A broken reference in a section nobody sampled survives, and the procedures underneath keep changing after the assessment ends. The review walks every reference, not a sample.' },
    { q: 'Can you update the manual?', a: 'No. Nothing is drafted. The report lists each finding with the section and the document concerned, so whoever maintains the manual can correct it.' },
    { q: 'Which references break most often?', a: 'Procedures that were renumbered or merged, forms that were replaced by a system, and roles renamed in a restructure. The report checks those first.' },
    { q: 'Our document set is very large. What should we send?', a: 'The manual, the document register, and as many of the referenced documents as you can. References to documents not supplied are reported as not supplied, so you can see exactly what was and was not checked.' },
    { q: 'Are the documents confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed.' },
  ],

  resources: [
    {
      title: 'A cross-reference has to land on a real document',
      summary: 'QP-14, merged into QP-21 two years ago.',
      body: [
        'Procedures change through their own approval process. The manual that cites them is not part of that change, and keeps the old numbers.',
        'The response is to walk the manual’s references whenever procedures are renumbered. The review walks every one.',
      ],
    },
    {
      title: 'A role has to be defined once',
      summary: '“Approved by the Quality Lead.” Nobody is the Quality Lead.',
      body: [
        'Roles are renamed in restructures and the manual keeps the old titles, or uses three names for one role in three sections.',
        'The response is a role list in the manual and the same names everywhere. The review checks every role for a definition.',
      ],
    },
    {
      title: 'A required record needs a form',
      summary: 'Training records required; no form creates them.',
      body: [
        'The manual says what must be recorded. Forms and systems are what record it. When a form is retired, the requirement remains with nothing to meet it.',
        'The response is to trace each required record to its source. The review does that and lists records with none.',
      ],
    },
    {
      title: 'The revision table has to agree with the documents',
      summary: 'Revision 6 in the table, revision 5 in the footer.',
      body: [
        'Revision tables are updated by hand, and footers by template. They drift, and a reader cannot tell which version they hold.',
        'The response is to check both on every release. The review compares the table, headers, footers and the documents it says changed.',
      ],
    },
  ],

  legal: {
    entity: 'Quality Manual',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
