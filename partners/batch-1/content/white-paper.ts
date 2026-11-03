import type { SiteContent } from './types';

/**
 * White Paper — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE PAPER. One white paper is one document, so the
 * ladder is the whole catalogue and rung N is N papers.
 *
 * NO VIEW ON THE MARKET, AND THAT IS THE BOUNDARY. Whether the paper will
 * generate leads, whether the product is good, whether the thesis is right
 * about the industry, belongs to the people who publish it. Whether each
 * cited figure says what its source says, whether the thesis is stated and
 * argued, and whether the turn to the product follows from the argument, is
 * a fact about a document. The second is the product.
 */
export const site: SiteContent = {
  name: 'White Paper',
  strapline: 'Page four cites a study. The study measured something narrower.',
  whopUrl: 'https://whop.com/white-paper/',
  returnUrl: 'https://white-paper-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'White papers, per paper',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/white-paper-review',

    about: {
      title: 'A white paper is not a long brochure. It is an argument a technical reader tests for whether its evidence holds.',
      intro:
        'White Paper reads one paper the way the engineer, the analyst or the buyer deciding on it reads it — thesis against sources: checking that the problem is framed honestly, that the thesis is stated before it is defended, that every cited figure says what its source says, and that the turn to the product is arrived at rather than jumped to.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'A white paper borrows the form of research to make a commercial argument, and its reader knows it. They read it with the sources open, because the paper’s whole value is that its claims are supposed to rest on something other than the vendor’s say-so. So the statistic on page four is checked against the report it cites, and the report turns out to have surveyed a different population, in a different year, about a narrower question. The thesis is assembled from three sections that each assume it. And on page nine the argument becomes a feature list, and the reader notices the exact sentence where it happened.',
            'So the review reads the paper as that reader does. The problem is read for whether it is framed so that only one kind of product could solve it. The thesis is looked for, stated, and then followed through the sections that should defend it. Every cited figure is read against the source supplied for it — population, date, wording, and what was actually measured. And the turn to the product is read for whether the argument arrives there or the paper simply changes subject.',
          ],
        },
        {
          title: 'Why the citation that says something narrower is the classic',
          paras: [
            'Citations are gathered early and quoted late. A writer finds a useful figure, notes it in a sentence of their own, and by the final draft the sentence has been tightened, generalised and moved to a section about something slightly different. "64% of mid-market IT leaders surveyed in 2023 said" becomes "most companies now". Each edit was small. Together they turn a source into a decoration, and the technical reader, who clicks the footnote, finds the gap within a minute.',
            'The damage is not confined to that sentence. A paper is trusted precisely because it cites, and one citation that overstates its source tells the reader that the citations are ornaments. From then on every figure is discounted and every claim is read as the vendor’s, which is the one reading a white paper exists to avoid. The review reads each cited figure against its source, so the paper’s evidence says what the evidence says.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not marketing, research or technical advice, and White Paper is not an agency, a ghostwriter, an analyst or a peer reviewer. No opinion is offered on whether the thesis is right about the industry, whether the product is good, which topic to choose, or whether the paper will generate leads. Nothing here finds new sources, tests the product or verifies a study’s method.',
            'It is also not a rewriting service. No sentence is drafted, no section restructured and no claim softened for you. The report says where a figure overstates its source, where the thesis is assumed rather than argued, where the problem is framed for one product, and where the argument jumps to the pitch; writing the paper and standing behind it belongs to the people who publish it.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every paper is read in full, with its sources open, as the technical reader will read it, because the failures that matter are between the claim and the citation rather than in the prose. A sound argument can fail to persuade because one figure on page four said more than its source did and nobody checked before it went behind a form.',
      },
    },

    standards: {
      intro:
        'This report is about a document a buying decision can turn on, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'Not marketing or research advice', body: 'No opinion on whether the paper will generate leads, which topic to choose, or whether the thesis is right about the market. White Paper writes nothing and advises on no campaign.' },
        { title: 'Not a verification and not a peer review', body: 'Nothing here re-runs a study, tests a method or vouches for a source. No report may be presented to a reader as independent verification of the paper.' },
        { title: 'The document, not the product', body: 'The subject is whether each figure says what its source says, the thesis is argued, and the pitch is earned. Whether the product deserves it stays with the reader and the market.' },
        { title: 'Nothing is written or rewritten', body: 'No section is redrafted, no claim softened and no source replaced for you. Your paper and its sources are returned exactly as they arrived.' },
        { title: 'Read as the technical reader reads it', body: 'Findings rest on the paper and the sources you supply. A figure with no source supplied is reported as unsourced, not guessed at.' },
      ],
    },

    resourcesIntro:
      'Written out in full rather than gated behind a form — which, for a site about white papers, seemed the least we could do.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the paper, the sources it cites, and who it is written for — an engineer, an analyst, a buyer at a particular stage. Unpublished data can be described rather than attached, as long as the brief says so; what is read is whether each claim matches the source it points to.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'White Paper Review — the paper as it will be published, with its footnotes or reference list.',
        'The sources it cites — the reports, studies and datasets — or links to them, so each figure can be read against its origin.',
        'Who reads it — an engineer, an analyst, a buyer — so the paper can be read for what they will test first.',
      ],
      next:
        'The report comes back thesis against sources: where a figure says more than its source, where the thesis is assumed rather than argued, where the problem is framed for one product, and where the argument jumps to the pitch.',
    },
  },

  hero: {
    eyebrow: 'White papers',
    title: 'The argument is confident and the footnotes are there.',
    titleAccent: 'The study on page four measured something narrower.',
    body:
      'One white paper read cold, as the technical buyer reads it: the problem checked for honest framing, the thesis checked for being stated and defended, every cited figure read against what its source actually says, and the turn to the product checked for whether the argument earned it.',
    primaryCta: { label: 'Start a brief', to: '/services/white-paper-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'Figures that say what the source says', body: 'Every cited number read against the source supplied for it — the population surveyed, the year, the question asked and what was actually measured — so a footnote supports its sentence rather than decorating it.' },
    { title: 'A thesis stated, then defended', body: 'The paper’s central claim looked for in the opening pages and followed through the sections that should argue for it, so the argument is made rather than assumed by every section in turn.' },
    { title: 'A problem framed honestly', body: 'The problem read for whether it is described as the reader experiences it, or narrowed until only one kind of product could solve it — the framing a technical reader recognises as a pitch on page one.' },
    { title: 'A pivot the argument earns', body: 'The turn from analysis to product read for whether the preceding pages lead there, or whether the paper simply changes subject and hopes the reader carries the authority across.' },
  ],

  services: [
    {
      slug: 'white-paper-review',
      name: 'White Paper Review',
      tagline: 'One paper, read the way the technical buyer who will judge it reads it.',
      summary:
        'The full read: the problem checked for honest framing, the thesis followed through the sections that should defend it, every cited figure read against its source, and the turn to the product checked for whether the argument arrives there.',
      unitLabel: 'Papers',
      unitNoun: 'paper',
      unitNounPlural: 'papers',
      unitRate: 49.99,
      checkoutHeading: 'How many papers?',
      brief: {
        intro:
          'Everything below is used to read the paper the way its reader will. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'kind', label: 'What kind of paper', type: 'select', required: true, half: true,
            options: ['Technical white paper', 'Market or industry paper', 'Research report with original data', 'Policy or position paper', 'Something else — say so below'],
            help: 'A technical paper is tested on its mechanism; a market paper on its numbers. This sets what the read is aimed at.' },
          { name: 'reader', label: 'Who reads it', type: 'text', required: true, half: true,
            placeholder: 'A platform engineer shortlisting three vendors',
            help: 'A paper is read for what its reader will check, so the read is aimed at the person who decides on it.' },
          { name: 'gate', label: 'How it is distributed', type: 'select', required: true, half: true,
            options: ['Behind a form', 'Open on the website', 'Sent by sales', 'Submitted to a client or tender', 'Not sure'],
            help: 'A gated paper is judged in the first two pages; one sent by sales is read to the end.' },
          { name: 'purpose', label: 'What this paper most has to establish', type: 'area', required: true,
            placeholder: 'That batch reconciliation is the bottleneck, before we mention that we fix it.',
            help: 'This ranks the findings. A figure that overstates its source in the opening is not the same as a dated footnote in an appendix.' },
          { name: 'sources', label: 'How the sources are supplied', type: 'text', required: false, half: true,
            placeholder: 'Links in the reference list; two PDFs attached',
            help: 'So each figure can be read against its origin rather than taken on trust.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'The 70% figure in the introduction came from a vendor blog that cites a survey we never found.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'Our own benchmark data is summarised but not published — the raw numbers are under NDA.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The paper and its sources',
          required: true,
          requiredNote: 'The review reads the claims against their sources, so send the paper and as many of the cited sources as you have',
          accept: ['.pdf', '.docx', '.pptx', '.xlsx', '.csv', '.txt', '.zip'],
          maxMb: 60,
          maxFiles: 15,
          help:
            'The paper as it will be published and the reports, studies or data it cites. Where a source is online, a working link in the reference list is enough.',
        },
      },
      process: [
        { step: '01', title: 'Read the paper and its reader', desc: 'The paper, its sources and who reads it, so each claim can be aimed at what that reader will test first.' },
        { step: '02', title: 'Find the thesis', desc: 'The central claim located, stated in a sentence, and checked for whether the opening pages make it or assume it.' },
        { step: '03', title: 'Open every footnote', desc: 'Each cited figure read against its source for population, year, wording and what was measured.' },
        { step: '04', title: 'Read the problem as framed', desc: 'The problem statement checked for whether it describes the reader’s situation or one narrowed to fit the product.' },
        { step: '05', title: 'Test the pivot', desc: 'The turn to the product read for whether the argument arrives there or the paper changes subject.' },
        { step: '06', title: 'Report', desc: 'Findings section by section inside the stated turnaround, ranked by what would cost the paper its credibility first.' },
      ],
      included: [
        'Every cited figure read against the source supplied for it',
        'A statistic generalised beyond its population or year, flagged',
        'A figure with no source supplied, listed as unsourced',
        'The thesis located, stated and followed through the paper',
        'A section that assumes the thesis rather than arguing it, surfaced',
        'The problem read for framing that only one product could answer',
        'The turn to the product checked for whether it is earned',
        'Terms used before they are defined, located',
        'Figures that disagree between the summary, the body and the charts, listed',
        'What would cost the paper its credibility with the reader, first',
      ],
      turnaround: 'Three business days from the brief arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per paper. Teams often send a long paper and its executive summary together, because the figure that drifted — the one rounded up for the summary — is clearest when the two are read side by side. A paper sent without its sources can be read only for internal consistency.',
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
    { step: '01', title: 'Write the brief', desc: 'What kind of paper, who reads it, how it is distributed and what it most has to establish. Attach the paper and its sources. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'The paper with its sources open: the thesis, every footnote, the framing of the problem and the turn to the product.' },
    { step: '04', title: 'The report', desc: 'Findings section by section inside the stated turnaround, ranked by what would cost the paper its credibility first.' },
  ],

  limits: [
    { title: 'Not marketing or research advice', body: 'No opinion on whether the paper will generate leads, which topic to choose or whether the thesis is right. White Paper is not an agency, a ghostwriter or an analyst.' },
    { title: 'Not a verification or a peer review', body: 'No report re-runs a study, tests a product or vouches for a source, and none may be presented to a reader as independent verification.' },
    { title: 'Nothing is written or rewritten', body: 'No section is redrafted and no claim softened. Your paper and its sources come back exactly as they arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no figures about papers that performed. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Will you tell us whether the paper will generate leads?', a: 'No, and it is the one thing consistently declined. Whether a paper performs depends on the audience, the distribution and the product, and that judgement belongs to the people who publish it. What the report answers is whether each figure says what its source says, whether the thesis is argued, and whether the turn to the product is earned — which is a fact about a document.' },
    { q: 'Every figure in our paper has a footnote. Is a review still worth it?', a: 'A footnoted paper is exactly where the classic failure hides, because the footnote makes the figure look checked. The technical reader clicks it, and the question is not whether a source exists but whether it measured what the sentence says it measured. The review reads each figure against its source for population, year, wording and scope.' },
    { q: 'Can you rewrite the weak sections for us?', a: 'No. Nothing is drafted and your paper comes back untouched. The argument has to be yours, because the reader is trusting your understanding of the problem. The report says where a figure overstates its source and where the thesis is assumed; fixing it is yours.' },
    { q: 'It goes to engineers. What will they test first?', a: 'Usually the mechanism and the numbers: whether the problem is described as they experience it, and whether the figures that size it survive a click on the footnote. The report reads the paper that way and ranks findings by what would cost it credibility first.' },
    { q: 'How much can we redact?', a: 'Client names and unpublished data can be removed or described, as long as the brief says what has changed. A figure whose source cannot be supplied is reported as unsourced rather than guessed at.' },
    { q: 'Is the paper confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed. An unpublished paper is commercially sensitive and is treated accordingly.' },
  ],

  resources: [
    {
      title: 'A cited figure has to say what the source says',
      summary: 'The 64% of surveyed IT leaders that became “most companies”.',
      body: [
        'A figure is found early, paraphrased once, and edited many times. "64% of 412 mid-market IT leaders surveyed in 2023 said they planned to" becomes "nearly two-thirds of companies plan to", then "most companies now". Every edit was a small improvement to the sentence and a small departure from the source, and the reader who opens the footnote sees all of them at once.',
        'The response is to carry the source’s own limits into the sentence — who, when, how many, and what was asked — even where it makes the sentence longer. The review reads every cited figure against its source and flags the ones that have drifted, so the paper’s evidence says exactly what the evidence says.',
      ],
    },
    {
      title: 'A problem framed for one product reads as a pitch',
      summary: 'The problem statement narrowed until the answer is obvious.',
      body: [
        'The most persuasive part of a white paper is the problem, because a reader who recognises their own situation keeps reading. The temptation is to describe the problem so that it already contains the product: not "reconciliation is slow" but "teams lack real-time automated reconciliation". The reader hears the solution in the problem, and from page one reads the paper as advertising.',
        'The response is to describe the problem as the reader would describe it to a colleague, and let the paper earn its narrowing. The review reads the problem statement for framing that only one kind of product could answer, so the paper starts where the reader is.',
      ],
    },
    {
      title: 'A thesis has to be stated before it is defended',
      summary: 'Three sections that each assume what none of them argues.',
      body: [
        'Many papers have a thesis the way a room has a smell: everywhere and nowhere stated. Each section takes it for granted and builds on it, and the reader reaches the end without having been asked to agree to anything. A technical reader experiences that as being led, and resists.',
        'The response is to state the thesis in a sentence early and make each section a reason to accept it. The review locates the thesis, writes it down, and checks each section for whether it argues the claim or assumes it.',
      ],
    },
    {
      title: 'The turn to the product has to be earned',
      summary: 'Page nine, where the analysis becomes a feature list.',
      body: [
        'Every vendor paper turns to the product eventually, and readers accept it. What they do not accept is the jump: an argument about the problem that ends, and a section about the product that begins, with nothing connecting the mechanism the paper established to the thing the product does.',
        'The response is to make the product the conclusion of the argument — this is the cause, this is what addresses it, this is how. The review reads the pivot for whether the preceding pages lead there, so the reader carries the paper’s authority across instead of leaving it behind.',
      ],
    },
  ],

  legal: {
    entity: 'White Paper',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
