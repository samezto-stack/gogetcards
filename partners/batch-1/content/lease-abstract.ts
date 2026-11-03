import type { SiteContent } from './types';

/**
 * Lease Abstract — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE ABSTRACT. One lease abstract is one document, so
 * the ladder is the whole catalogue and rung N is N abstracts.
 *
 * NOT LEGAL ADVICE, AND THAT IS THE BOUNDARY. What a clause means, whether a
 * right exists, whether to break or renew, belongs to lawyers and to the
 * tenant or landlord. Whether the abstract records the date, the figure and
 * the notice window that the clause it cites actually states is a fact about
 * two documents. The second is the product; the distinction is in the hero,
 * the limits, the footer and the terms.
 */
export const site: SiteContent = {
  name: 'Lease Abstract',
  strapline: 'The abstract says the break date. The lease says notice was due six months earlier.',
  whopUrl: 'https://whop.com/lease-abstract/',
  returnUrl: 'https://lease-abstract-check.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Lease abstracts, per abstract',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/lease-abstract-check',

    about: {
      title: 'A lease abstract is not a summary for reading. It is a set of dates someone will act on without opening the lease.',
      intro:
        'Lease Abstract checks one abstract against the lease and amendments it summarises — field by field: every date against the clause it came from, the rent schedule against the review and step provisions, every option against its notice window and conditions, and the clauses that drive cost or obligations against whether they were carried across at all. It gives no legal advice.',
      sections: [
        {
          title: 'What the check does',
          paras: [
            'An abstract exists so that nobody has to read the lease again. It is prepared once — often in a hurry, often from the original lease without the later deed of variation — and then it becomes the lease for every practical purpose: the date in the diary, the figure in the budget, the option somebody remembers to exercise. So the abstract records the break date and not the date by which notice had to be served, carries the original rent with no mention of the review two years in, and lists a renewal option without the condition that the tenant not be in arrears.',
            'So the check reads the abstract against the lease, field by field. Every date is followed to its clause and compared. The rent schedule is read against every review, step and indexation provision. Every option is checked for its notice period, its form and its conditions. And the lease is read for the clauses that most often drive cost — repair, service charge caps, assignment, reinstatement — to see whether the abstract carries them or leaves them out.',
          ],
        },
        {
          title: 'Why the notice date is the classic',
          paras: [
            'A break clause has two dates: the date the lease can end and the date by which notice must be served to make it end. The first is the memorable one and goes in the abstract; the second is the one that matters, and it is six months, or nine, or a year earlier. Whoever relies on the abstract puts the break date in the diary, starts thinking about it a quarter ahead, and finds the window has already closed.',
            'The damage is not a misunderstanding of the law. It is a missing field in a summary, and it costs a lease term. The check reads every option and break for its notice window, form and conditions and says where the abstract does not record them, so the diary holds the date that actually matters.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not legal advice, and Lease Abstract is not a law firm, a solicitor, an attorney, a surveyor or a property adviser. No opinion is offered on what a clause means where its words are open to argument, whether a right exists or has been lost, whether to exercise an option, or how to negotiate. Where the lease is ambiguous the check says so and goes no further.',
            'It is also not an abstracting service. No abstract is rewritten and no new one prepared. The report says, field by field, where the abstract and the lease disagree and where the lease contains something the abstract does not carry; what to do about it, and with whom, is yours.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every abstract is checked against the full lease and every amendment supplied, field by field, because the failures that matter are omissions rather than errors. A carefully prepared abstract can still record the right break date and the wrong diary date, and the difference is only visible with the clause open beside it.',
      },
    },

    standards: {
      intro:
        'This report is about a summary someone will rely on instead of a legal document, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'Not legal advice', body: 'No opinion on what a clause means where it is open to argument, whether a right exists, or what to do. Nothing here may be relied on as legal advice. Lease Abstract is not a law firm.' },
        { title: 'Not a negotiation and not a recommendation', body: 'No view on whether to renew, break, assign or negotiate. The report says what the documents record, not what to do with it.' },
        { title: 'The documents, not the deal', body: 'The subject is whether the abstract records what the lease states. Whether the lease is a good one stays with you and your advisers.' },
        { title: 'Nothing is rewritten', body: 'No abstract is redrafted and no new one prepared. Your documents are returned exactly as they arrived.' },
        { title: 'Only what was supplied', body: 'Findings rest on the lease and amendments you send. An amendment that was not supplied cannot be read, and the report says which documents it was checked against.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for anyone who keeps a portfolio of abstracts. If one note puts a notice date in a diary that only had a break date, it has done its job.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the abstract, the lease, and every deed of variation, side letter, licence or rent memorandum since. Names and addresses can be redacted freely; dates, figures and clause numbers cannot.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your check is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Lease Abstract Check — the abstract as it is used, in whatever format your team keeps it.',
        'The lease and every amendment since — variations, side letters, licences and rent memoranda.',
        'What the abstract is used for — diary dates, budgeting, a portfolio system — so the check can be ranked by what is relied on.',
      ],
      next:
        'The report comes back field by field: where a date disagrees with its clause, where the rent schedule misses a review or step, where an option has no notice window recorded, and where the lease carries a term the abstract leaves out.',
    },
  },

  hero: {
    eyebrow: 'Lease abstracts',
    title: 'The abstract is tidy and the break date is in the diary.',
    titleAccent: 'The notice was due six months before it.',
    body:
      'One lease abstract read against the lease it summarises: every date checked against its clause, the rent schedule against the reviews and steps, every option checked for its notice window and conditions, and the clauses that drive cost checked for whether they were carried across. Not legal advice.',
    primaryCta: { label: 'Start a brief', to: '/services/lease-abstract-check' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'Dates that match their clauses', body: 'Every date in the abstract — commencement, expiry, break, review, rent-free end — followed to the clause it came from and compared, including the amendments that moved it.' },
    { title: 'A rent schedule with its reviews', body: 'The rent figures read against every review, fixed step and indexation provision in the lease, so the abstract carries next year’s rent and not only this year’s.' },
    { title: 'Options with their notice windows', body: 'Every break, renewal and expansion option checked for the date notice must be served, the form it must take and the conditions attached — the fields a diary actually needs.' },
    { title: 'The clauses that were left out', body: 'The lease read for the terms that most often drive cost or obligations — repair, service charge caps, reinstatement, assignment — and the ones the abstract does not carry, listed.' },
  ],

  services: [
    {
      slug: 'lease-abstract-check',
      name: 'Lease Abstract Check',
      tagline: 'One abstract, checked against the lease before someone relies on it at a deadline.',
      summary:
        'The full check: every date against its clause, the rent schedule against its reviews and steps, every option against its notice window and conditions, and the cost-driving clauses checked for whether the abstract carries them. Not legal advice.',
      unitLabel: 'Abstracts',
      unitNoun: 'abstract',
      unitNounPlural: 'abstracts',
      unitRate: 49.99,
      checkoutHeading: 'How many abstracts?',
      brief: {
        intro:
          'Everything below is used to check the abstract against the lease. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'kind', label: 'What kind of lease', type: 'select', required: true, half: true,
            options: ['Office', 'Retail', 'Industrial or warehouse', 'Ground lease', 'Residential block or portfolio', 'Something else — say so below'],
            help: 'Different leases put their cost in different clauses, so this sets where the read looks hardest.' },
          { name: 'side', label: 'Whose abstract it is', type: 'select', required: true, half: true,
            options: ['Tenant', 'Landlord', 'Lender or buyer in due diligence', 'Property or facilities manager'],
            help: 'A tenant relies on option windows; a landlord on reviews and arrears conditions.' },
          { name: 'use', label: 'What the abstract is used for', type: 'text', required: true, half: true,
            placeholder: 'Diary dates and budget in our portfolio system',
            help: 'The fields that are relied on are checked first.' },
          { name: 'purpose', label: 'What matters most in the next two years', type: 'area', required: true,
            placeholder: 'Whether we can break in 2027 and what we have to do by when.',
            help: 'This ranks the findings. A missed notice window is not the same as a misspelled address.' },
          { name: 'amendments', label: 'Amendments since the lease was signed', type: 'text', required: false, half: true,
            placeholder: 'One deed of variation (2022), one rent memorandum (2024)',
            help: 'So the check knows which documents to expect and can say which were read.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'The abstract was prepared before the 2022 variation and may still show the old expiry.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'Service charge is tracked in a separate schedule, so the abstract leaves it out on purpose.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The abstract, the lease and its amendments',
          required: true,
          requiredNote: 'The check reads the abstract against the lease, so send both, with every amendment you have',
          accept: ['.pdf', '.docx', '.xlsx', '.csv', '.txt', '.zip'],
          maxMb: 80,
          maxFiles: 20,
          help:
            'The abstract in whatever form it is kept, the lease, and every variation, side letter, licence or memorandum since. Scans are fine if they are legible.',
        },
      },
      process: [
        { step: '01', title: 'Assemble the documents', desc: 'The lease and its amendments put in order, so every field is checked against the version in force.' },
        { step: '02', title: 'Check every date', desc: 'Each date in the abstract followed to its clause and compared, including dates moved by an amendment.' },
        { step: '03', title: 'Check the rent schedule', desc: 'Rent figures read against every review, step and indexation provision.' },
        { step: '04', title: 'Check every option', desc: 'Each break, renewal and expansion option checked for its notice date, form and conditions.' },
        { step: '05', title: 'Read for what is missing', desc: 'The lease read for cost-driving clauses the abstract does not carry.' },
        { step: '06', title: 'Report', desc: 'Findings field by field inside the stated turnaround, ranked by what is relied on soonest.' },
      ],
      included: [
        'Every date in the abstract checked against its clause',
        'Dates moved by an amendment but not in the abstract, flagged',
        'The rent schedule checked against every review, step and indexation provision',
        'Every break and option checked for its notice date, not only its effective date',
        'Conditions attached to an option — arrears, form of notice, vacant possession — listed',
        'Clause references in the abstract checked to point at the right clause',
        'Cost-driving clauses the abstract does not carry, listed',
        'Fields where the lease is ambiguous, marked as such and not interpreted',
        'Which documents the abstract was checked against, stated',
        'What is relied on soonest, first',
      ],
      turnaround: 'Three business days from the documents arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per abstract — one lease and its amendments. A portfolio is the same rate per abstract; teams often start with the leases whose next notice window falls soonest.',
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
    { step: '01', title: 'Write the brief', desc: 'What kind of lease, whose abstract it is, what it is used for and what matters most. Attach the abstract, the lease and every amendment. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The check', desc: 'Field by field against the lease in force: dates, rent, options and the clauses that were left out.' },
    { step: '04', title: 'The report', desc: 'Findings field by field inside the stated turnaround, ranked by what is relied on soonest.' },
  ],

  limits: [
    { title: 'Not legal advice', body: 'No opinion on what a clause means where it is open to argument, whether a right exists or what to do. Lease Abstract is not a law firm or a property adviser.' },
    { title: 'Not a recommendation', body: 'No view on whether to renew, break, assign or negotiate. The report says what the documents record.' },
    { title: 'Nothing is rewritten', body: 'No abstract is redrafted. Your documents come back exactly as they arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no figures about savings. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Is this legal advice?', a: 'No, and it must not be relied on as legal advice. The check compares what the abstract records with what the lease and amendments state. Where a clause is ambiguous, the report says it is ambiguous and stops; what it means is a question for your lawyer.' },
    { q: 'Our abstract was prepared by a professional. Is a check still worth it?', a: 'Professionally prepared abstracts fail in the same places as any other: an amendment that arrived later, a notice window recorded as an effective date, a review the template had no field for. The check is not a judgement of the preparer; it is a second read against the documents.' },
    { q: 'Can you prepare a corrected abstract?', a: 'No. Nothing is redrafted. The report lists each disagreement with the clause reference, so whoever maintains the abstract can correct it in their own format.' },
    { q: 'Which fields fail most often?', a: 'Notice dates for breaks and options, rent reviews and fixed steps after the first few years, and anything changed by a later amendment. The report checks those first.' },
    { q: 'What if we do not have every amendment?', a: 'Send what you have and say what may be missing. The report states which documents it was checked against, so a missing amendment is visible rather than silently assumed.' },
    { q: 'Are the documents confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed. Names and addresses can be redacted; dates, figures and clause numbers are what is read.' },
  ],

  resources: [
    {
      title: 'A break date is not a notice date',
      summary: 'The date the lease can end, and the earlier date that decides whether it does.',
      body: [
        'Every break clause has two dates and abstracts tend to record the first. The lease can end on the break date; it ends only if notice was served by a date months earlier, in a stated form, sometimes with conditions met on both dates.',
        'The response is a field for each: effective date, last day for notice, form of notice, conditions. The check reads every break and option for all four and says where the abstract stops at one.',
      ],
    },
    {
      title: 'A rent schedule has to carry its reviews',
      summary: 'This year’s rent, with nothing about the review in eighteen months.',
      body: [
        'Abstracts are prepared at a moment, and the rent at that moment goes in. The review, the fixed uplift in year five, the indexation from the third anniversary — those live in a schedule at the back of the lease and are easy to leave for later.',
        'The response is to record the whole schedule, not the current figure. The check reads the rent provisions in full and lists every change the abstract does not show.',
      ],
    },
    {
      title: 'An amendment changes the abstract, not just the file',
      summary: 'The variation that moved the expiry date, filed beside an abstract that did not move.',
      body: [
        'A deed of variation is signed, filed with the lease, and forgotten by whoever maintains the abstract. The lease in force now says one thing and the abstract, which is what everyone reads, says another.',
        'The response is to treat every amendment as a change to the abstract. The check reads the amendments in order and flags each field they changed that the abstract still shows as it was.',
      ],
    },
    {
      title: 'The clause that was left out is the expensive one',
      summary: 'Reinstatement, repair and service charge, which no template had a field for.',
      body: [
        'Abstract templates carry dates and rent well and obligations badly. The clauses that decide what leaving costs — reinstatement, dilapidations, a service charge with no cap — are long, and they are left out because they do not fit a field.',
        'The response is to note their existence even where they cannot be summarised. The check lists the cost-driving clauses the abstract does not carry, so nobody learns of them at the end of the term.',
      ],
    },
  ],

  legal: {
    entity: 'Lease Abstract',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
