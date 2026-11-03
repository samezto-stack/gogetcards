import type { SiteContent } from './types';

/**
 * Brand Book — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE BOOK. One brand book is one document, so the
 * ladder is the whole catalogue and rung N is N books.
 *
 * NO VIEW ON THE BRAND, AND THAT IS THE BOUNDARY. Whether the logo is good,
 * whether the palette suits the company, whether the voice is right, belongs
 * to the people who own the brand. Whether the book’s rules are followed by
 * its own examples, whether a colour given three ways is one colour, and
 * whether a designer could apply a rule without asking, is a fact about a
 * document. The second is the product.
 */
export const site: SiteContent = {
  name: 'Brand Book',
  strapline: 'Page six sets the clear space. The cover breaks it.',
  whopUrl: 'https://whop.com/brand-book/',
  returnUrl: 'https://brand-book-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Brand books, per book',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/brand-book-review',

    about: {
      title: 'A brand book is not a showcase. It is a set of instructions a designer follows without the author in the room.',
      intro:
        'Brand Book reads one book the way the designer, printer or developer applying it reads it — rule against example: checking that the book’s own pages obey its rules, that every colour is the same colour in every format it is given, that every type specification says enough to be set, and that every rule can actually be followed by someone who cannot ask what it meant.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'A brand book is made at the end of a branding project by the people who know the brand best, and it is used for years by people who were not there. The authors read it as a portfolio; its users read it as a manual, with a deadline, looking for the answer to one question. So the clear-space rule on page six is broken by the logo on the cover, the brand blue is given as a HEX value and a Pantone reference that print as visibly different blues, the type page names a typeface and no weights, and the rule about photography says “authentic and warm”.',
            'So the review reads the book as its users do. Every rule is read against the examples in the book that should show it. Every colour is compared across HEX, RGB, CMYK and spot references. Every type specification is checked for family, weights, sizes, spacing and a fallback. And every rule is read for whether a designer could apply it and a reviewer could check it — or whether it is a preference that only its author can judge.',
          ],
        },
        {
          title: 'Why the book that breaks its own rules is the classic',
          paras: [
            'The examples in a brand book are made first and the rules are written to describe them, by which point some examples were made before the rule settled. Nobody re-checks them, because to the authors they are the brand. A designer reads the rule, then looks at the example to see how it is applied, and finds the example doing something else. They now have two instructions and will follow whichever is easier.',
            'The damage compounds. A book whose examples break its rules teaches every user that the rules are approximate, and the brand drifts in exactly the direction the book was meant to prevent. The review reads every example against every rule it should obey, so the book teaches one thing.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not design work or brand strategy, and Brand Book is not an agency, a designer, a consultant or a trade mark adviser. No opinion is offered on whether the logo is good, whether the palette suits the company, whether the voice is right, or whether a mark can be registered or used.',
            'It is also not a redesign. No page is redrawn, no value recalculated into a new standard and no rule rewritten. The report says where an example breaks a rule, where a colour disagrees with itself, where a specification is incomplete and where a rule cannot be applied; fixing the book belongs to the people who own the brand.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every book is read page by page as a user will read it — looking for an answer, then checking the example — because the failures that matter are between the rule and the page that shows it. A strong identity can still drift within a year because its own book showed it two ways.',
      },
    },

    standards: {
      intro:
        'This report is about a document other people will be held to, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'Not design or brand advice', body: 'No opinion on whether the logo, palette, type or voice is right. Brand Book designs nothing and advises on no brand.' },
        { title: 'Not trade mark or legal advice', body: 'No view on whether a mark is registrable, infringes anything or can be used. Nothing here may be relied on as legal advice.' },
        { title: 'The document, not the brand', body: 'The subject is whether the book’s rules, examples and specifications agree and can be applied. Whether the brand is good stays with you.' },
        { title: 'Nothing is redesigned', body: 'No page is redrawn and no value replaced with a new standard. Your book and assets are returned exactly as they arrived.' },
        { title: 'Read as the user reads it', body: 'Colour comparisons rest on the values the book states and the files you supply. Nothing is measured on a press or a screen.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for anyone finishing a brand book or inheriting one. If one note stops a single blue from becoming three, it has done its job.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the book, the asset files it refers to, and who applies it — an in-house team, agencies, printers, developers. Unreleased work can be watermarked; what is read is whether the book agrees with itself.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Brand Book Review — the book as it is distributed, in its final format.',
        'The asset files it refers to — logo files, colour swatches, type files or links — so the book can be read against what users actually receive.',
        'Who applies it — in-house, agencies, printers, developers — so the read is aimed at what they will look up first.',
      ],
      next:
        'The report comes back rule against example: where the book’s own pages break its rules, where a colour disagrees across formats, where a type specification is incomplete, and where a rule cannot be applied without asking.',
    },
  },

  hero: {
    eyebrow: 'Brand books',
    title: 'The book is beautiful and every page looks on brand.',
    titleAccent: 'The cover breaks the clear-space rule on page six.',
    body:
      'One brand book read as the designer applying it on a deadline reads it: every rule read against the book’s own examples, colour values compared across HEX, RGB, CMYK and spot references, type specifications checked for what it takes to set them, and every rule checked for whether it can actually be followed.',
    primaryCta: { label: 'Start a brief', to: '/services/brand-book-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'Examples that obey the rules', body: 'Every example in the book read against the rules that govern it — clear space, minimum size, colour, placement, misuse — so the pages that show the brand show it the way the rules describe.' },
    { title: 'One colour, one colour', body: 'Every brand colour compared across the HEX, RGB, CMYK and spot values the book gives, because a blue specified four ways that are four different blues becomes four blues within a year.' },
    { title: 'Type that can be set', body: 'Every type specification checked for family, weights, sizes, line spacing, tracking and a fallback, so a developer and a printer can both set it without guessing.' },
    { title: 'Rules a user can apply', body: 'Every rule read for whether a designer could follow it and a reviewer could check it — or whether, like “warm and authentic”, only its author could say whether it was met.' },
  ],

  services: [
    {
      slug: 'brand-book-review',
      name: 'Brand Book Review',
      tagline: 'One book, read the way the person applying it on a deadline reads it.',
      summary:
        'The full read: every rule against the book’s own examples, every colour compared across its formats, every type specification checked for completeness, and every rule checked for whether it can be applied and checked by someone else.',
      unitLabel: 'Books',
      unitNoun: 'book',
      unitNounPlural: 'books',
      unitRate: 49.99,
      checkoutHeading: 'How many books?',
      brief: {
        intro:
          'Everything below is used to read the book the way its users will. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'kind', label: 'What kind of book', type: 'select', required: true, half: true,
            options: ['Full brand guidelines', 'Logo and identity only', 'Digital or UI guidelines', 'Sub-brand or campaign guidelines', 'Something else — say so below'],
            help: 'This sets which rules are expected and what is read hardest.' },
          { name: 'users', label: 'Who applies it', type: 'text', required: true, half: true,
            placeholder: 'Three agencies, our print supplier and two in-house designers',
            help: 'A printer looks up colour; a developer looks up type and spacing. The read is aimed at them.' },
          { name: 'stage', label: 'Where the book is', type: 'select', required: true, half: true,
            options: ['Draft — before release', 'Released — first year', 'In use for years — being refreshed', 'Not sure'],
            help: 'A draft can change freely; a book in use is read for what users have been getting wrong.' },
          { name: 'purpose', label: 'What this book most has to prevent', type: 'area', required: true,
            placeholder: 'Agencies stretching the logo and inventing new colours for campaigns.',
            help: 'This ranks the findings. A broken example of the main lockup is not the same as a missing tracking value for captions.' },
          { name: 'assets', label: 'How the assets are supplied', type: 'text', required: false, half: true,
            placeholder: 'Logo pack and swatches attached; fonts licensed separately',
            help: 'So the book can be read against what its users actually receive.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'Our printed blue never matches the website, and nobody knows which value is the real one.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'The cover uses a tighter lockup on purpose — it is the one permitted exception.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The book and its assets',
          required: true,
          requiredNote: 'The review reads the book page by page, so send it in its final format, with the asset files if you can',
          accept: ['.pdf', '.png', '.jpg', '.svg', '.ase', '.zip', '.txt'],
          maxMb: 120,
          maxFiles: 20,
          help:
            'The book as distributed, plus the logo pack and colour swatches it refers to. Font files are not needed — the names and weights are what is read.',
        },
      },
      process: [
        { step: '01', title: 'Read the book and its users', desc: 'The book, its assets and who applies it, so each rule is read for the person who will look it up.' },
        { step: '02', title: 'List every rule', desc: 'Each instruction in the book written down, with what it governs and how it could be checked.' },
        { step: '03', title: 'Check every example', desc: 'Each page that shows the brand read against the rules that should govern it.' },
        { step: '04', title: 'Compare every colour', desc: 'Each brand colour compared across every format the book gives it in.' },
        { step: '05', title: 'Check the type', desc: 'Each type specification checked for family, weights, sizes, spacing and a fallback.' },
        { step: '06', title: 'Report', desc: 'Findings page by page inside the stated turnaround, ranked by what users would get wrong first.' },
      ],
      included: [
        'Every example in the book read against the rules that govern it',
        'An example that breaks clear space, minimum size or placement, flagged',
        'Every brand colour compared across HEX, RGB, CMYK and spot values',
        'A colour whose formats are visibly different colours, surfaced',
        'Every type specification checked for weights, sizes, spacing and fallback',
        'A rule that cannot be checked by anyone but its author, located',
        'Rules that contradict each other between sections, listed',
        'Asset files that disagree with the book, listed',
        'Questions a user would have to ask that the book does not answer',
        'What users would get wrong first, first',
      ],
      turnaround: 'Three business days from the brief arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per book. A master book and a sub-brand book are two, and are often worth sending together, because a colour that drifted between them is clearest side by side.',
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
    { step: '01', title: 'Write the brief', desc: 'What kind of book, who applies it, where it is and what it most has to prevent. Attach the book and its assets. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'Page by page as a user reads it: rules, examples, colour, type, and whether each rule can be applied.' },
    { step: '04', title: 'The report', desc: 'Findings page by page inside the stated turnaround, ranked by what users would get wrong first.' },
  ],

  limits: [
    { title: 'Not design or brand advice', body: 'No opinion on whether the brand is right. Brand Book is not an agency, a designer or a consultant.' },
    { title: 'Not trade mark advice', body: 'No view on registrability, infringement or use of any mark. Nothing here is legal advice.' },
    { title: 'Nothing is redesigned', body: 'No page is redrawn and no rule rewritten. Your book comes back exactly as it arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no figures about brands reviewed. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Will you tell us whether the brand is good?', a: 'No, and it is the one thing consistently declined. Whether a brand is right is a judgement for the people who own it. What the report answers is whether the book agrees with itself and can be applied by someone who was not in the room.' },
    { q: 'An agency made our book. Is a review still worth it?', a: 'Agency books are made by the people who know the brand best, which is exactly why the gaps are invisible to them. They read the book as a portfolio; your printer reads it as a manual. The review reads it as the manual.' },
    { q: 'Can you fix the pages that break the rules?', a: 'No. Nothing is redrawn. The report lists each page, the rule it breaks and how, so whoever maintains the book can correct it.' },
    { q: 'What do users look up first?', a: 'Colour values and logo files, then clear space and minimum size, then type. The report checks those first and ranks findings by what would be got wrong soonest.' },
    { q: 'Do you check colours on a screen or a press?', a: 'No. The review compares the values the book states with each other and with the swatches supplied, and flags combinations that are known to diverge. Nothing is measured physically.' },
    { q: 'Is unreleased work confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed. Watermark it if you like; the read does not depend on it.' },
  ],

  resources: [
    {
      title: 'The book’s own examples have to obey its rules',
      summary: 'The cover that breaks the clear space set on page six.',
      body: [
        'Examples are made before rules settle, and nobody goes back. A designer looks up a rule, then turns to the example to see it applied, and finds two instructions. They will follow the easier one.',
        'The response is to read every example against every rule it should obey before the book is released. The review does exactly that and lists each page that teaches something the rules do not.',
      ],
    },
    {
      title: 'One colour given three ways is three colours',
      summary: 'The brand blue whose HEX, CMYK and Pantone values print as different blues.',
      body: [
        'Colour values are often converted by software at different times by different people. Each conversion is defensible; together they describe several colours, and each user picks the format they work in.',
        'The response is to choose a master value and derive the others from it deliberately, noting where they cannot match. The review compares every format the book gives and flags the colours that disagree with themselves.',
      ],
    },
    {
      title: 'A type specification needs a fallback',
      summary: 'A typeface named, with no weights, sizes or substitute.',
      body: [
        'The type page names the family and shows it beautifully. The developer needs weights, sizes, line height and what to use where the font cannot load; the email designer needs a system font. Without them each invents one.',
        'The response is a specification complete enough to set. The review checks each type spec for what a user needs and lists what is missing.',
      ],
    },
    {
      title: 'A rule nobody can measure is a preference',
      summary: '“Photography should feel warm and authentic.”',
      body: [
        'Some rules can only be judged by their author. They are useful as direction and useless as rules, because nobody applying the book can tell whether they complied, and nobody reviewing work can tell whether to reject it.',
        'The response is to pair each such rule with something checkable — an example of yes and no, a measurable attribute. The review flags rules that cannot be checked so they can be made into instructions.',
      ],
    },
  ],

  legal: {
    entity: 'Brand Book',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
