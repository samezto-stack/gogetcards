import type { SiteContent } from './types';

/**
 * Data Dictionary — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE DICTIONARY. One data dictionary is one document
 * with its schema, so the ladder is the whole catalogue and rung N is N
 * dictionaries.
 *
 * NOTHING IS BUILT, AND THAT IS THE BOUNDARY. What the data should mean,
 * how it should be modelled, which metric is right, belongs to the data
 * team and the business. Whether every column has an entry, every entry a
 * column, every type matches, and every documented value list matches the
 * sample, is a fact about documents and data supplied. The second is the
 * product.
 */
export const site: SiteContent = {
  name: 'Data Dictionary',
  strapline: 'The dictionary lists four status values. The table holds seven.',
  whopUrl: 'https://whop.com/data-dictionary/',
  returnUrl: 'https://data-dictionary-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Data dictionaries, per dictionary',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/data-dictionary-review',

    about: {
      title: 'A data dictionary is not documentation for its own sake. It is the contract between the people who store data and the people who use it.',
      intro:
        'Data Dictionary reads one dictionary the way the analyst or engineer who has to use the data reads it — definition against schema and sample: checking that every column has an entry and every entry a column, that every type and unit agrees with the schema, that every list of allowed values matches what the sample actually holds, and that every definition agrees with the other definitions and the metric documents that rely on it.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'Dictionaries are written when a dataset is new, by the people who built it, and maintained when someone remembers. The schema changes with every release. So a column renamed from cust_id to customer_id is documented under its old name, three new columns have no entry, amount is documented as dollars and stored in cents, the status field is documented with four values and the data holds seven, and “active customer” means one thing in the dictionary and another in the metrics guide that the finance team uses.',
            'So the review reads the dictionary as a user does. Every column in the schema is matched to an entry and every entry to a column. Every type, length, nullability and unit is compared with the schema. Every documented set of allowed values is compared with the distinct values in the sample. And every definition is read against the other entries and against any metric or business glossary supplied, for the same word meaning two things.',
          ],
        },
        {
          title: 'Why the undocumented value is the classic',
          paras: [
            'Enumerations grow quietly. A new status is added for an edge case, a migration leaves a legacy value behind, a null creeps in. The code handles it; the dictionary does not mention it. The analyst filters on the four documented values and silently drops a few percent of rows, and the report that results is wrong in a way nobody can see.',
            'The damage is that the dictionary is trusted precisely so that users do not have to profile the data themselves. The review compares every documented value list with the distinct values in the sample supplied, and lists the ones the dictionary does not mention.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not data engineering, consulting or governance, and Data Dictionary is not a consultancy or an engineering team. No opinion is offered on how the data should be modelled, which definition of a metric is right, whether data quality is acceptable, or whether anything complies with any regulation. Nothing here connects to your systems; only the files you send are read.',
            'It is also not a writing service. No definition is rewritten and no schema changed. The report lists where the dictionary, the schema, the sample and the glossary disagree; deciding which is right is yours.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every dictionary is read entry by entry against its schema and sample, because the failures that matter are the differences between what is documented and what is stored. A well-built dataset can still produce a wrong report because one value nobody documented was filtered out.',
      },
    },

    standards: {
      intro:
        'This report is about a document people make decisions from, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'Nothing is built', body: 'No schema is designed, no query written and no data moved. Data Dictionary builds nothing.' },
        { title: 'No definitions chosen', body: 'No view on which definition of a metric or term is right. Disagreements are reported, not resolved.' },
        { title: 'No data-quality certification', body: 'Nothing here certifies data quality, and no report may be presented as doing so.' },
        { title: 'Nothing is rewritten', body: 'No definition is redrafted. Your documents and sample are returned exactly as they arrived.' },
        { title: 'Only the files supplied', body: 'Nothing connects to your systems. Value checks are only as complete as the sample.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for anyone who maintains a dictionary that a schema keeps outrunning.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the dictionary, the schema it documents — a DDL export, a schema file, an information-schema query result — and, if you can, a sample or a list of distinct values for coded columns. Personal data should be removed from samples; distinct values of coded columns are what is needed.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Data Dictionary Review — the dictionary in whatever form it is kept.',
        'The schema it documents, exported from the database or tool.',
        'A sample or distinct-value list for coded columns, with personal data removed.',
      ],
      next:
        'The report comes back table by table: columns with no entry, entries with no column, types and units that disagree, values the dictionary does not mention, and terms that mean two things.',
    },
  },

  hero: {
    eyebrow: 'Data dictionaries',
    title: 'The dictionary is thorough and every table is documented.',
    titleAccent: 'It lists four status values. The data holds seven.',
    body:
      'One data dictionary read the way the analyst who has to use the data reads it: every column checked for an entry and every entry for a column, every type and unit compared with the schema, every list of allowed values checked against a sample, and every definition checked against the metric documents that use it.',
    primaryCta: { label: 'Start a brief', to: '/services/data-dictionary-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'Every column, every entry', body: 'Every column in the schema matched to a dictionary entry and every entry to a column that exists — so renamed, added and dropped columns are all visible.' },
    { title: 'Types and units that agree', body: 'Every type, length, nullability and unit in the dictionary compared with the schema, so an amount documented in dollars and stored in cents is caught before it is summed.' },
    { title: 'Values that are really there', body: 'Every documented list of allowed values compared with the distinct values in the sample, so the status nobody documented is not silently filtered out of every report.' },
    { title: 'One word, one meaning', body: 'Every definition read against the other entries and against any metric or business glossary supplied, so “active customer” means the same thing to engineering and to finance.' },
  ],

  services: [
    {
      slug: 'data-dictionary-review',
      name: 'Data Dictionary Review',
      tagline: 'One dictionary, read the way the person who has to use the data reads it.',
      summary:
        'The full read: every column matched to an entry, types and units compared with the schema, allowed values checked against a sample, and definitions checked against each other and your glossary.',
      unitLabel: 'Dictionaries',
      unitNoun: 'dictionary',
      unitNounPlural: 'dictionaries',
      unitRate: 49.99,
      checkoutHeading: 'How many dictionaries?',
      brief: {
        intro:
          'Everything below is used to read the dictionary against the data. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'kind', label: 'What the data is', type: 'select', required: true, half: true,
            options: ['Application database', 'Data warehouse or lake', 'Dataset shared with partners', 'API or event schema', 'Something else — say so below'],
            help: 'Different sources drift in different ways, so this sets where the read looks hardest.' },
          { name: 'size', label: 'Size', type: 'text', required: true, half: true,
            placeholder: '12 tables, about 180 columns',
            help: 'So the read knows how many entries to expect.' },
          { name: 'users', label: 'Who uses the dictionary', type: 'text', required: true, half: true,
            placeholder: 'Analysts in finance and product; one external partner',
            help: 'The dictionary is read as those users would read it.' },
          { name: 'purpose', label: 'What decisions rely on this data', type: 'area', required: true,
            placeholder: 'Monthly revenue and churn reporting to the board.',
            help: 'This ranks the findings — columns behind those reports first.' },
          { name: 'sample', label: 'Sample supplied', type: 'select', required: false, half: true,
            options: ['Sample rows attached', 'Distinct values for coded columns attached', 'No sample'],
            help: 'Without a sample, allowed values cannot be checked against the data, and the report says so.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'The orders table was refactored in spring and the dictionary predates it.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'Internal audit columns are intentionally undocumented.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The dictionary, schema and sample',
          required: true,
          requiredNote: 'The review reads the dictionary against the schema and data, so send the dictionary and a schema export at least',
          accept: ['.pdf', '.xlsx', '.csv', '.json', '.sql', '.yaml', '.yml', '.md', '.txt', '.zip'],
          maxMb: 80,
          maxFiles: 20,
          help:
            'The dictionary, a schema export, and a sample or distinct-value list for coded columns. Remove personal data from samples.',
        },
      },
      process: [
        { step: '01', title: 'Index the schema', desc: 'Every table and column listed with type, length and nullability.' },
        { step: '02', title: 'Match entries to columns', desc: 'Each entry matched to a column and each column to an entry.' },
        { step: '03', title: 'Compare types and units', desc: 'Each documented type and unit compared with the schema.' },
        { step: '04', title: 'Check values against the sample', desc: 'Each documented value list compared with the distinct values supplied.' },
        { step: '05', title: 'Read the definitions', desc: 'Each definition read against the others and against the glossary.' },
        { step: '06', title: 'Report', desc: 'Findings table by table inside the stated turnaround, ranked by the decisions that rely on them.' },
      ],
      included: [
        'Every column in the schema matched to an entry',
        'Columns with no entry, listed',
        'Entries for columns that no longer exist, listed',
        'Types, lengths and nullability compared with the schema',
        'Units checked for being stated and consistent',
        'Documented value lists compared with values in the sample',
        'Values in the data the dictionary does not mention, flagged',
        'Terms defined differently in two places, surfaced',
        'Keys and relationships documented but absent from the schema, located',
        'What the important reports rely on, first',
      ],
      turnaround: 'Three business days from the files arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per dictionary, with its schema and sample included. A warehouse with a dictionary per domain has several, and they are often worth sending together, because a term defined two ways is clearest across domains.',
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
    { step: '01', title: 'Write the brief', desc: 'What the data is, its size, who uses it and what decisions rely on it. Attach the dictionary, schema and sample. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'Entry by entry against the schema and sample: columns, types, units, values and meanings.' },
    { step: '04', title: 'The report', desc: 'Findings table by table inside the stated turnaround, ranked by the decisions that rely on them.' },
  ],

  limits: [
    { title: 'Nothing is built', body: 'No schema designed, no query written. Data Dictionary is not a consultancy or an engineering team.' },
    { title: 'No data-quality certification', body: 'Nothing here certifies data quality or compliance.' },
    { title: 'Nothing is rewritten', body: 'No definition is redrafted. Your files come back exactly as they arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no figures about datasets. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Will you fix the dictionary or the schema?', a: 'No. Nothing is built or rewritten. The report lists where the dictionary, schema, sample and glossary disagree, and which side each finding is on, so your team can decide which is right.' },
    { q: 'Our dictionary is generated from the schema. Is this still worth it?', a: 'Generated dictionaries match column names and types, and usually lose units, allowed values and meaning — the parts users actually need. The review reads those against the sample and the glossary.' },
    { q: 'Do you connect to our database?', a: 'No. Nothing here connects to any system. Only the files you send are read.' },
    { q: 'What do analysts trip on first?', a: 'Undocumented values in coded columns, units that are not stated, and terms that mean different things in different documents. The report checks those first.' },
    { q: 'What about personal data in the sample?', a: 'Remove it. Coded columns — statuses, types, flags — are what the value check needs, and a list of their distinct values is enough.' },
    { q: 'Are the files confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed.' },
  ],

  resources: [
    {
      title: 'Every column needs an entry, and every entry a column',
      summary: 'cust_id in the dictionary, customer_id in the table.',
      body: [
        'Schemas change with every release; dictionaries change when someone remembers. Renamed columns appear twice — once undocumented, once documented and gone.',
        'The response is to diff the dictionary against the schema on every release. The review does that diff.',
      ],
    },
    {
      title: 'A number needs a unit',
      summary: '“amount — the order amount.” In cents.',
      body: [
        'Units are obvious to the person who chose them and invisible to everyone else. A sum in the wrong unit is wrong by a factor nobody notices until it is presented.',
        'The response is a unit in every numeric entry. The review checks each one for a unit and for agreement with the schema.',
      ],
    },
    {
      title: 'Allowed values have to be the values in the data',
      summary: 'Four documented statuses; seven in the table.',
      body: [
        'Enumerations grow without anyone updating the documentation. Analysts filter on what is documented and silently lose rows.',
        'The response is to profile coded columns and update the list. The review compares every documented list with the sample supplied.',
      ],
    },
    {
      title: 'One word cannot mean two things',
      summary: '“Active customer”, defined differently by engineering and finance.',
      body: [
        'The same term is defined in the dictionary, the metrics guide and a dashboard tooltip, each slightly differently. Reports built on each disagree.',
        'The response is one definition, referenced everywhere. The review reads every definition against the others and lists the ones that conflict.',
      ],
    },
  ],

  legal: {
    entity: 'Data Dictionary',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
