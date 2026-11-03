import type { SiteContent } from './types';

/**
 * Maintenance Log — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE LOG. One maintenance log and its schedule is one
 * record, so the ladder is the whole catalogue and rung N is N logs.
 *
 * NOT AN INSPECTION, AND THAT IS THE BOUNDARY. Whether equipment is safe,
 * in good condition or fit for use belongs to the people responsible and
 * their qualified engineers, and nothing here goes near it. Whether every
 * task the schedule requires has an entry inside its interval, whether each
 * entry is complete and signed, and whether each defect is closed out, is a
 * fact about a record. The second is the product.
 */
export const site: SiteContent = {
  name: 'Maintenance Log',
  strapline: 'The schedule says quarterly. The log has no entry for the third quarter.',
  whopUrl: 'https://whop.com/maintenance-log/',
  returnUrl: 'https://maintenance-log-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Maintenance logs, per log',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/maintenance-log-review',

    about: {
      title: 'A maintenance log is not a diary of work done. It is the evidence that a schedule was kept.',
      intro:
        'Maintenance Log reads one log against the schedule it is meant to evidence — log against schedule: checking that every scheduled task has an entry inside its interval, that every entry has a date, a description, the parts used and a signature, that every defect recorded is closed out by a later entry, and that every period where an entry was due and none exists is listed. It is a record check, not an inspection.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'Maintenance is done by people whose job is the equipment, not the paperwork. The work is usually done; the record is written at the end of a shift, from memory, in whatever book or system is to hand. Months later someone needs the log — a buyer, an insurer, an auditor, a lender, an investigation — and reads it the hard way: schedule in one hand, log in the other. So the quarterly task has no entry for the third quarter, the annual service was done fourteen months after the last one, a filter change is recorded with no part number, three entries are unsigned, and a leak reported in March is never mentioned again.',
            'So the review reads the log the way it will be read when it matters. Every task in the schedule is looked for in the log inside its interval, and the gaps listed. Every entry is checked for a date, a description of the work, the parts or materials used where the schedule requires them, and a signature or identifier. Every defect, fault or deferred item is followed through later entries to its close-out. And intervals are measured between entries, so overruns are visible.',
          ],
        },
        {
          title: 'Why the missing quarter is the classic',
          paras: [
            'Work gets done and not written down, or written on a job sheet that never reached the log, or written in the log for a different asset. The team remembers doing it. The log does not. When the record is read later, the missing entry is indistinguishable from work that was never done.',
            'The damage is that a log is only as good as its weakest period, and the reader will judge the whole record by its gaps. The review lists every period where the schedule required an entry and the log has none, so the gap can be traced to a job sheet now rather than explained later.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not an inspection, a survey, a certification or an engineering assessment, and Maintenance Log is not an engineer, an inspector, a maintenance provider or a regulator. No opinion is offered on the condition, safety or fitness for use of any equipment, building or vehicle, whether the schedule is adequate, whether work was done correctly, or what any regulation requires.',
            'It is also not a record-keeping service. No entry is added, altered or backfilled, and nothing is signed. The report lists where the log and the schedule disagree; finding the missing records, and deciding what they mean, is for the people responsible and their qualified engineers.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every log is read entry by entry against its schedule, task by task and interval by interval, because the failures that matter are absences. A well-maintained asset can have a record that reads as neglected because one quarter’s job sheets never reached the book.',
      },
    },

    standards: {
      intro:
        'This report is about a record that may be relied on when safety or money is at stake, so what it is and is not is stated very plainly before anything else.',
      extra: [
        { title: 'Not an inspection', body: 'No opinion on the condition, safety or fitness for use of anything. No report may be described as an inspection, a survey or an engineering assessment.' },
        { title: 'No certification or sign-off', body: 'Nothing here certifies, approves or signs off equipment, work or records, and no report may be presented to a regulator, insurer or buyer as doing so.' },
        { title: 'Not regulatory advice', body: 'No view on what any regulation, licence or manufacturer requires. The schedule is taken as you supply it.' },
        { title: 'Nothing is altered', body: 'No entry is added, changed or signed. Your records are returned exactly as they arrived.' },
        { title: 'Record against schedule', body: 'Findings say where the log and the schedule disagree. Work done but not recorded cannot be seen.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for anyone who keeps a log that someone else will one day read.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the log for the period in question, the schedule it should follow — a manufacturer’s schedule, an internal plan, a contract — and the asset identifiers. Scans of handwritten logs are fine if they are legible. Names can be redacted to initials or roles.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Maintenance Log Review — the log for the period to be checked.',
        'The schedule it should follow — manufacturer, internal plan or contract.',
        'The asset identifiers, so entries for other assets can be told apart.',
      ],
      next:
        'The report comes back task by task: scheduled tasks with no entry in their interval, overruns between entries, incomplete or unsigned entries, and defects never closed out.',
    },
  },

  hero: {
    eyebrow: 'Maintenance logs',
    title: 'The team is careful and the work was done.',
    titleAccent: 'The log has no entry for the third quarter.',
    body:
      'One maintenance log read against the schedule it is meant to evidence: every scheduled task checked for an entry inside its interval, every entry checked for a date, the work, the parts and a signature, every defect checked for being closed out, and every gap listed. A record check, not an inspection.',
    primaryCta: { label: 'Start a brief', to: '/services/maintenance-log-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'Every task in its interval', body: 'Every task in the schedule looked for in the log inside its interval — daily, monthly, quarterly, by hours or by mileage — and every period where an entry was due and none exists, listed.' },
    { title: 'Entries that are complete', body: 'Every entry checked for a date, a description of the work, the parts or materials used where required, and a signature or identifier — the fields a later reader looks for first.' },
    { title: 'Defects closed out', body: 'Every defect, fault or deferred item followed through later entries to the one that closes it, so a problem recorded in March does not simply stop being mentioned.' },
    { title: 'Intervals measured', body: 'The time, hours or distance between entries for each task measured against the schedule, so a service done fourteen months after the last one is visible as an overrun.' },
  ],

  services: [
    {
      slug: 'maintenance-log-review',
      name: 'Maintenance Log Review',
      tagline: 'One log, read against its schedule the way it will be read when it matters.',
      summary:
        'The full check: every scheduled task looked for inside its interval, every entry checked for completeness and signature, every defect followed to close-out, and intervals measured. A record check, not an inspection.',
      unitLabel: 'Logs',
      unitNoun: 'log',
      unitNounPlural: 'logs',
      unitRate: 49.99,
      checkoutHeading: 'How many logs?',
      brief: {
        intro:
          'Everything below is used to read the log against its schedule. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'kind', label: 'What the log covers', type: 'select', required: true, half: true,
            options: ['Machinery or plant', 'Building systems', 'Vehicle or fleet', 'Vessel', 'Equipment in a facility', 'Something else — say so below'],
            help: 'Different assets are scheduled by different measures — time, hours, distance.' },
          { name: 'period', label: 'Period to check', type: 'text', required: true, half: true,
            placeholder: 'January 2024 to June 2025',
            help: 'Intervals are measured within this period.' },
          { name: 'why', label: 'Why it is being checked', type: 'select', required: true, half: true,
            options: ['Sale or purchase', 'Insurance or finance', 'Internal review', 'Contract handover', 'Something else — say so below'],
            help: 'So the findings can be ranked by what the reader will look for.' },
          { name: 'purpose', label: 'What matters most', type: 'area', required: true,
            placeholder: 'That the annual service and quarterly checks are all evidenced for the last 18 months.',
            help: 'This ranks the findings.' },
          { name: 'schedule', label: 'Where the schedule comes from', type: 'text', required: false, half: true,
            placeholder: 'Manufacturer’s manual section 9, attached',
            help: 'The log is read against the schedule as supplied.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'We changed contractor in the summer and their job sheets may not be in the log.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'The unit was out of service from May to July; the shutdown memo is attached.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The log and its schedule',
          required: true,
          requiredNote: 'The review reads the log against its schedule, so send both',
          accept: ['.pdf', '.xlsx', '.csv', '.docx', '.txt', '.png', '.jpg', '.zip'],
          maxMb: 120,
          maxFiles: 25,
          help:
            'The log for the period, the schedule it should follow, and any job sheets you have. Scans of handwritten logs are fine if legible.',
        },
      },
      process: [
        { step: '01', title: 'Read the schedule', desc: 'Every task and its interval written down before the log is opened.' },
        { step: '02', title: 'Index the log', desc: 'Every entry listed by date, asset, task and signature.' },
        { step: '03', title: 'Match tasks to entries', desc: 'Each scheduled task looked for inside each interval.' },
        { step: '04', title: 'Check every entry', desc: 'Each entry checked for date, work, parts and signature.' },
        { step: '05', title: 'Follow every defect', desc: 'Each defect or deferred item followed to its close-out.' },
        { step: '06', title: 'Report', desc: 'Findings task by task inside the stated turnaround, ranked by what a later reader would question first.' },
      ],
      included: [
        'Every scheduled task looked for inside its interval',
        'Periods where an entry was due and none exists, listed',
        'Intervals between entries measured against the schedule',
        'Overruns, flagged',
        'Every entry checked for date, description, parts and signature',
        'Unsigned or incomplete entries, listed',
        'Every defect or deferred item followed to its close-out',
        'Defects never closed out, surfaced',
        'Entries for other assets or out of sequence, located',
        'What a later reader would question first, first',
      ],
      turnaround: 'Three business days from the documents arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per log — usually one asset or one system, with its schedule. A fleet or a building with several systems is one per log; they are often worth sending together, because entries recorded against the wrong asset are clearest across all of them.',
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
    { step: '01', title: 'Write the brief', desc: 'What the log covers, the period, why it is being checked and what matters most. Attach the log and its schedule. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The check', desc: 'Task by task against the schedule: entries, intervals, completeness and defects.' },
    { step: '04', title: 'The report', desc: 'Findings task by task inside the stated turnaround, ranked by what a later reader would question first.' },
  ],

  limits: [
    { title: 'Not an inspection', body: 'No opinion on the condition, safety or fitness of anything. Maintenance Log is not an engineer or an inspector.' },
    { title: 'No certification or sign-off', body: 'Nothing here certifies or signs off equipment, work or records.' },
    { title: 'Nothing is altered', body: 'No entry is added or changed. Your records come back exactly as they arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no figures about assets. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Is this an inspection?', a: 'No, and it must never be described as one. Nothing here looks at equipment or judges its condition, safety or fitness for use. The review compares the log with the schedule you supply and lists where they disagree. What the gaps mean is for the people responsible and their qualified engineers.' },
    { q: 'Our team is careful. Is this still worth it?', a: 'Careful teams do the work. The gaps the review finds are usually records that never reached the log — a job sheet in a van, a contractor’s report in an inbox. They are invisible until someone reads the log against the schedule.' },
    { q: 'Can you fill in the missing entries?', a: 'No. Nothing is added, changed or backfilled, and nothing is signed. The report lists each gap with its task and interval, so you can look for the record.' },
    { q: 'Which gaps are most common?', a: 'A missing interval after a change of contractor or staff, entries without part numbers, and defects that are recorded and never mentioned again. The report checks those first.' },
    { q: 'Our log is handwritten. Can you read it?', a: 'Yes, if the scans are legible. Illegible entries are listed as illegible rather than guessed at.' },
    { q: 'Are the records confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed.' },
  ],

  resources: [
    {
      title: 'A scheduled task needs an entry in its interval',
      summary: 'Quarterly, three times a year.',
      body: [
        'Work done and not written down is indistinguishable, later, from work not done. The commonest cause is a job sheet that never reached the log.',
        'The response is to reconcile job sheets with the log every period. The review lists every interval with no entry, so the job sheet can be found now.',
      ],
    },
    {
      title: 'An entry needs a signature and the parts',
      summary: '“Filter changed.” Which filter, and by whom?',
      body: [
        'Entries written at the end of a shift record that something was done and little else. A later reader needs who did it and what was fitted.',
        'The response is the same fields in every entry. The review checks each entry for them and lists the incomplete ones.',
      ],
    },
    {
      title: 'A defect has to be closed out',
      summary: 'A leak reported in March, never mentioned again.',
      body: [
        'Defects are recorded when found and fixed later, often under a different task. The fix is not linked to the defect, so the record shows a problem that never ended.',
        'The response is an entry that refers back to the defect it closes. The review follows every defect forward and lists the ones with no close-out.',
      ],
    },
    {
      title: 'A missing month is a finding in itself',
      summary: 'The gap that reads as neglect.',
      body: [
        'A reader judges a log by its gaps, not its averages. One empty period colours every other.',
        'The response is to find the record or note why there is none — a shutdown, a sale, an outage. The review lists every gap and reports noted explanations as explanations.',
      ],
    },
  ],

  legal: {
    entity: 'Maintenance Log',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
