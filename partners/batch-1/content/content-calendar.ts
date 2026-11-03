import type { SiteContent } from './types';

/**
 * Content Calendar — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE CALENDAR. One content calendar is one document,
 * so the ladder is the whole catalogue and rung N is N calendars.
 *
 * NO VIEW ON THE CONTENT, AND THAT IS THE BOUNDARY. Which topics, which
 * channels, whether a post will do well, belongs to the team. Whether every
 * entry has an owner and a draft date before it publishes, whether a week
 * holds more than the team’s stated capacity, and whether dates agree with
 * the launches they depend on, is a fact about a document. The second is
 * the product.
 */
export const site: SiteContent = {
  name: 'Content Calendar',
  strapline: 'The launch moved to the 20th. The launch post is still on the 13th.',
  whopUrl: 'https://whop.com/content-calendar/',
  returnUrl: 'https://content-calendar-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Content calendars, per calendar',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/content-calendar-review',

    about: {
      title: 'A content calendar is not a grid of ideas. It is a production schedule a team has to deliver.',
      intro:
        'Content Calendar reads one calendar the way the team who has to produce it reads it — entries against owners, deadlines and dates: checking that every entry has an owner and a draft deadline before its publish date, that no week holds more than the team’s stated capacity, that every piece serves a stated theme or goal, and that every date agrees with the launches, holidays and events it depends on.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'Content calendars are planned in a burst of good ideas at the start of a quarter, in a grid where every cell looks the same size. A short post and a long guide take one cell each. Then the quarter happens: a launch moves, a writer goes on leave, a holiday falls on a publish day. So one writer owns nine pieces in the week before a long weekend, the launch post is still scheduled for the day before the new launch date, half the entries have a publish date and no draft date, and three pieces serve no theme on the themes tab.',
            'So the review reads the calendar as production does. Every entry is checked for an owner, a draft deadline and a review step before its publish date. Every week is totalled per person against the capacity you state. Every piece is traced to a theme or goal the calendar names. And every date is checked against the key dates you supply — launches, events, holidays, blackout days.',
          ],
        },
        {
          title: 'Why the date that did not move is the classic',
          paras: [
            'A launch slips, a product team updates its plan, and nobody tells the calendar. The posts that depended on the old date stay where they were. They are drafted, approved and scheduled on time, and they announce something that is not there yet.',
            'The damage is public and fast, and it is caused by a date in one document not matching a date in another. The review checks every entry tied to a launch, event or holiday against the key dates you supply and lists the ones that disagree.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not content creation or marketing advice, and Content Calendar is not an agency, a social media manager or a consultant. No opinion is offered on topics, channels, formats, tone or whether a piece will perform. Nothing is written or scheduled.',
            'It is also not a planning service. No entry is moved, reassigned or rewritten. The report says where an entry has no owner or draft date, where a week exceeds capacity, where a piece serves no theme and where a date disagrees with a key date; what to change is the team’s.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every calendar is read in full week by week with the team’s capacity and key dates, because the failures that matter are between the grid and the people and dates behind it. A strong plan can collapse in its busiest week because nobody counted the cells per person.',
      },
    },

    standards: {
      intro:
        'This report is about a schedule a team has to deliver in public, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'No view on the content', body: 'No opinion on topics, channels, formats or tone. Content Calendar writes nothing and advises on no campaign.' },
        { title: 'No predictions', body: 'Nothing here predicts engagement, reach, traffic or sales.' },
        { title: 'The document, not the content', body: 'The subject is whether the calendar’s owners, deadlines, capacity and dates agree. Whether the content is good stays with you.' },
        { title: 'Nothing is moved or rewritten', body: 'No entry is moved or reassigned. Your calendar is returned exactly as it arrived.' },
        { title: 'Read as the team reads it', body: 'Capacity and key dates are taken as you supply them. Without capacity, weeks cannot be totalled, and the report says so.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for teams who plan a quarter at a time and live it a week at a time.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the calendar, the team and what each person can produce in a week, and the key dates — launches, events, holidays, blackout days. Unreleased names can be replaced with placeholders, consistently.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Content Calendar Review — the calendar as the team uses it.',
        'Who produces what, and roughly how many pieces each person can produce in a week.',
        'The key dates it depends on — launches, events, holidays, blackout days.',
      ],
      next:
        'The report comes back week by week: entries without an owner or draft date, weeks over capacity, pieces with no theme, and dates that disagree with key dates.',
    },
  },

  hero: {
    eyebrow: 'Content calendars',
    title: 'The calendar is full and every week looks balanced.',
    titleAccent: 'One writer owns nine pieces in the week before the holiday.',
    body:
      'One content calendar read the way the team who has to produce it reads it: every entry checked for an owner and a draft deadline before its publish date, every week totalled against stated capacity, every piece traced to a theme, and every date checked against the launches, holidays and events it depends on.',
    primaryCta: { label: 'Start a brief', to: '/services/content-calendar-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'An owner and a draft date', body: 'Every entry checked for a named owner, a draft deadline and a review step before its publish date — because a publish date alone tells nobody when to start.' },
    { title: 'Weeks within capacity', body: 'Every week totalled per person against the capacity you state, so the week one writer owns nine pieces is visible before it arrives.' },
    { title: 'Every piece has a reason', body: 'Every entry traced to a theme, pillar or goal the calendar names, and the ones that serve none listed — usually the ones added to fill a gap.' },
    { title: 'Dates that match the world', body: 'Every entry tied to a launch, event or holiday checked against the key dates you supply, so the post does not go out for a launch that moved.' },
  ],

  services: [
    {
      slug: 'content-calendar-review',
      name: 'Content Calendar Review',
      tagline: 'One calendar, read the way the team who has to produce it reads it.',
      summary:
        'The full read: every entry checked for an owner and draft deadline, every week totalled against capacity, every piece traced to a theme, and every date checked against launches, events and holidays.',
      unitLabel: 'Calendars',
      unitNoun: 'calendar',
      unitNounPlural: 'calendars',
      unitRate: 49.99,
      checkoutHeading: 'How many calendars?',
      brief: {
        intro:
          'Everything below is used to read the calendar the way your team will. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'channels', label: 'What the calendar covers', type: 'select', required: true, half: true,
            options: ['Blog and website', 'Social media', 'Email and newsletters', 'Several channels together', 'Something else — say so below'],
            help: 'Different channels have different production times, so this sets what a sensible draft lead looks like.' },
          { name: 'period', label: 'Period covered', type: 'text', required: true, half: true,
            placeholder: 'Q2 — April to June',
            help: 'So the read knows how many weeks to expect.' },
          { name: 'team', label: 'Who produces it', type: 'text', required: true, half: true,
            placeholder: 'Two writers, one designer, one editor; freelancers for video',
            help: 'Weeks are totalled per person, so the read needs the people.' },
          { name: 'purpose', label: 'What this quarter most has to support', type: 'area', required: true,
            placeholder: 'The product launch in May — everything in April should build to it.',
            help: 'This ranks the findings.' },
          { name: 'capacity', label: 'What each person can produce in a week', type: 'text', required: false, half: true,
            placeholder: 'Writers: 3 short or 1 long; designer: 8 assets',
            help: 'Without capacity, weeks cannot be totalled, and the report says so.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'The launch date moved and I am not sure every post moved with it.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'Reactive posts are left unassigned on purpose; whoever is on rota takes them.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The calendar and its key dates',
          required: true,
          requiredNote: 'The review reads the calendar against capacity and key dates, so send them together',
          accept: ['.xlsx', '.csv', '.pdf', '.docx', '.txt', '.png', '.zip'],
          maxMb: 40,
          maxFiles: 10,
          help:
            'The calendar as an export or screenshot, and the key dates — launches, events, holidays. A spreadsheet export is easiest to read.',
        },
      },
      process: [
        { step: '01', title: 'Read the key dates', desc: 'Launches, events, holidays and blackout days written down before the calendar is opened.' },
        { step: '02', title: 'Check every entry', desc: 'Each entry checked for an owner, a draft date and a review step before publish.' },
        { step: '03', title: 'Total every week', desc: 'Each person’s entries counted per week and compared with stated capacity.' },
        { step: '04', title: 'Trace every piece to a theme', desc: 'Each entry matched to a named theme or goal.' },
        { step: '05', title: 'Check dates against the world', desc: 'Each date-dependent entry checked against the key dates.' },
        { step: '06', title: 'Report', desc: 'Findings week by week inside the stated turnaround, ranked by what would break soonest.' },
      ],
      included: [
        'Every entry checked for a named owner',
        'Every entry checked for a draft deadline before its publish date',
        'Entries with no review or approval step, listed',
        'Every week totalled per person against stated capacity',
        'Weeks where one person is over capacity, flagged',
        'Every piece traced to a stated theme or goal',
        'Entries tied to launches or events checked against key dates',
        'Entries scheduled on holidays or blackout days, listed',
        'Duplicates and near-duplicates across channels, located',
        'What would break soonest, first',
      ],
      turnaround: 'Three business days from the brief arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per calendar. A team with separate calendars per channel has several, and they are often worth sending together, because one person’s total load is only visible across all of them.',
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
    { step: '01', title: 'Write the brief', desc: 'What the calendar covers, the period, the team and what it most has to support. Attach it and its key dates. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'Week by week: owners, draft dates, capacity, themes and key dates.' },
    { step: '04', title: 'The report', desc: 'Findings week by week inside the stated turnaround, ranked by what would break soonest.' },
  ],

  limits: [
    { title: 'No view on the content', body: 'No opinion on topics, channels or tone. Content Calendar is not an agency or a social media manager.' },
    { title: 'No predictions', body: 'Nothing here predicts engagement, traffic or sales.' },
    { title: 'Nothing is moved or rewritten', body: 'No entry is moved or reassigned. Your calendar comes back exactly as it arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no engagement figures. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Will you tell us what to post?', a: 'No, and it is the one thing consistently declined. Topics and channels belong to the team. What the report answers is whether the calendar can be produced as planned — owners, deadlines, capacity and dates.' },
    { q: 'We planned it together as a team. Is a review still worth it?', a: 'Teams plan by idea; overload is a count per person per week, and dates drift as other plans change. Neither is visible in a planning session. The review counts and compares.' },
    { q: 'Can you rearrange the calendar?', a: 'No. Nothing is moved. The report lists each finding with the entry or week it concerns, so whoever owns the calendar can rearrange it.' },
    { q: 'What fails first in a busy month?', a: 'Entries with a publish date and no draft date, and one person owning too much in one week. The report checks those first.' },
    { q: 'We do not track capacity. Can you still review it?', a: 'Yes, but weeks cannot be totalled against capacity, and the report will say so. Owners, deadlines, themes and dates are still read, and per-person counts are still given.' },
    { q: 'Is the calendar confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed. Unannounced plans are sensitive and are treated accordingly.' },
  ],

  resources: [
    {
      title: 'A publish date needs a draft date',
      summary: 'The cell that tells everyone when it goes out and nobody when to start.',
      body: [
        'Calendars are organised by publish date because that is what the audience sees. Production runs on draft and review dates, which often are not in the calendar at all.',
        'The response is a draft deadline and a review step for every entry. The review checks each entry for both.',
      ],
    },
    {
      title: 'One writer cannot own a whole week',
      summary: 'Nine cells, one name, the week before a holiday.',
      body: [
        'In a grid every cell is the same size, so a heavy week looks the same as a light one. The only way to see load is to count per person.',
        'The response is to total each person’s week against what they can produce. The review does that count and flags the weeks that overflow.',
      ],
    },
    {
      title: 'Every piece needs a reason to exist',
      summary: 'The entry added to fill an empty Tuesday.',
      body: [
        'Gaps in a calendar invite filler, and filler takes the same production time as anything else. It is also the first thing to be published late, because nobody is attached to it.',
        'The response is to tie every piece to a theme or goal, or remove it. The review traces each entry to a stated theme and lists those with none.',
      ],
    },
    {
      title: 'The calendar has to move when the launch does',
      summary: 'A launch post for a launch that slipped a week.',
      body: [
        'Launch dates change in product plans; calendars are owned by someone else. The posts tied to the old date stay where they were.',
        'The response is to check the calendar every time a key date moves. The review checks every date-dependent entry against the key dates supplied.',
      ],
    },
  ],

  legal: {
    entity: 'Content Calendar',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
