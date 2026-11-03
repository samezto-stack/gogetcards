import type { SiteContent } from './types';

/**
 * Training Deck — everything a reader sees.
 *
 * ONE SERVICE, SOLD BY THE DECK. One training deck is one document with its
 * materials, so the ladder is the whole catalogue and rung N is N decks.
 *
 * NO VIEW ON WHETHER IT WORKS, AND THAT IS THE BOUNDARY. Whether people
 * learn, whether the course meets a requirement, how it should be designed,
 * belongs to trainers and learners. Whether each stated objective is taught,
 * practised and assessed in the deck, and whether the quiz tests only what
 * was taught, is a fact about a document. The second is the product.
 */
export const site: SiteContent = {
  name: 'Training Deck',
  strapline: 'Quiz question seven is about a step no slide ever teaches.',
  whopUrl: 'https://whop.com/training-deck/',
  returnUrl: 'https://training-deck-review.onrender.com/thank-you',

  owner: { name: '', title: '', bio: [] },

  copy: {
    navTagline: 'Training decks, per deck',
    ctaLabel: 'Start a brief',
    ctaTo: '/services/training-deck-review',

    about: {
      title: 'A training deck is not a set of slides about a topic. It is a promise that a learner will be able to do something afterwards.',
      intro:
        'Training Deck reads one deck the way the learner who has to pass the check at the end reads it — objective against assessment: following every stated objective to the slides that teach it, the exercise that practises it and the question that checks it, checking every quiz question for having been taught, every term for being defined before it is used, and every procedure for steps in the order the job is done.',
      sections: [
        {
          title: 'What the review does',
          paras: [
            'Training decks are usually written by the person who knows the subject best, who builds the slides from what they know and the quiz from what matters. The two are built at different times, and the objectives slide at the front is written first and never revisited. So objective three is never taught, quiz question seven tests a step the deck mentions only in the trainer notes, “reconcile against the ledger” appears on slide four and “the ledger” is explained on slide eleven, and the procedure is presented in the order the system menus are laid out rather than the order the job is done.',
            'So the review reads the deck as the learner does. Every objective is followed through the deck to its teaching, its practice and its assessment. Every quiz question is traced back to the slide that teaches its answer. Every term is checked for a definition before first use. And every procedure is read for whether its steps are in the order a person doing the job would take them.',
          ],
        },
        {
          title: 'Why the quiz that tests the untaught is the classic',
          paras: [
            'The expert writes the quiz from what matters, and what matters to an expert includes things so obvious to them that they never made it onto a slide. The learner meets a question they have no basis for answering, guesses, and either fails a check they should have passed or passes by luck. Either way the check no longer measures what the deck taught.',
            'The damage spreads to the whole course. Learners who meet one untaught question stop trusting the quiz, and trainers who see a question failed by everyone assume the learners were inattentive. The review traces every question back to the slide that teaches its answer and lists the ones nothing teaches.',
          ],
        },
        {
          title: 'What it does not do',
          paras: [
            'This is not instructional design, and Training Deck is not a designer, a training provider or an accreditation body. No opinion is offered on whether the training is effective, how it should be designed or delivered, whether it meets any regulatory, compliance or accreditation requirement, or whether the subject matter is correct.',
            'It is also not a writing service. No slide is redrawn, no question written and no objective rephrased. The report says where an objective is not taught, practised or assessed, where a question tests something untaught, where a term is used before it is defined, and where steps are out of order; fixing the deck is yours.',
          ],
        },
      ],
      closing: {
        title: 'Who does the reading',
        body:
          'Every deck is read in full with its quiz, exercises and notes, as a learner meeting the subject for the first time, because the failures that matter are between the objectives, the slides and the check. An expert’s deck can be excellent on every slide and still fail its learners on a question nobody taught.',
      },
    },

    standards: {
      intro:
        'This report is about material people will be trained and assessed on, so what it is and is not is stated before anything else.',
      extra: [
        { title: 'Not instructional design', body: 'No opinion on how the course should be designed, structured or delivered. Training Deck designs nothing.' },
        { title: 'Not accreditation or compliance', body: 'No view on whether the training meets any regulatory, compliance or accreditation requirement, and nothing is certified.' },
        { title: 'Not a subject-matter review', body: 'No view on whether the content is technically correct. The subject is whether the deck teaches, practises and checks what it says it will.' },
        { title: 'Nothing is rewritten', body: 'No slide is redrawn and no question written. Your materials are returned exactly as they arrived.' },
        { title: 'Read as the learner reads it', body: 'Findings rest on the deck and materials supplied. Anything taught only in the room, and not in the materials, cannot be read.' },
      ],
    },

    resourcesIntro:
      'Written out in full, for anyone who has built a course from what they know. If one note gets a missing slide in front of a quiz question, it has done its job.',

    contact: {
      intro:
        'There is no mailing list and no discovery call. Everything runs through the storefront, including questions asked before buying.',
      materialTitle: 'What to send',
      materialBody:
        'The brief on the service page takes it directly: the deck, the quiz or assessment, any exercises or handouts, and the trainer notes. Internal system names can be redacted, as long as they are redacted consistently.',
    },

    thankYou: {
      title: 'Payment received',
      intro:
        'Your review is booked and your brief is with it. Nothing further is needed unless the brief said a document was following.',
      sendList: [
        'Training Deck Review — the deck as learners will see it.',
        'The quiz or assessment, the exercises and the trainer notes, so every objective can be followed through.',
        'Who the learners are and what they must be able to do afterwards, in your own words.',
      ],
      next:
        'The report comes back objective against assessment: objectives not taught, practised or checked, questions that test the untaught, terms used before they are defined, and procedures out of order.',
    },
  },

  hero: {
    eyebrow: 'Training decks',
    title: 'The slides are clear and the trainer knows the subject cold.',
    titleAccent: 'Quiz question seven tests a step no slide teaches.',
    body:
      'One training deck read the way the learner who has to pass the check at the end reads it: every objective followed to the slide that teaches it, the exercise that practises it and the question that checks it, every term checked for a definition before use, and every procedure checked for steps in the order the job is done.',
    primaryCta: { label: 'Start a brief', to: '/services/training-deck-review' },
    secondaryCta: { label: 'See what a report contains', to: '/how-it-works' },
  },

  pillars: [
    { title: 'Objectives taught, practised and checked', body: 'Every stated objective followed through the deck to the slides that teach it, the exercise that practises it and the question that assesses it — and the ones missing any of the three, listed.' },
    { title: 'A quiz that tests what was taught', body: 'Every assessment question traced back to the slide that teaches its answer, so the check measures the deck and not what the expert assumed everyone knew.' },
    { title: 'Terms defined before they are used', body: 'Every term, acronym and system name checked for a definition at or before its first use, because a learner who meets a word on slide four and its meaning on slide eleven has been lost for seven slides.' },
    { title: 'Steps in the order of the job', body: 'Every procedure read for whether its steps follow the order a person doing the job takes them, rather than the order of the menus, the manual or the expert’s memory.' },
  ],

  services: [
    {
      slug: 'training-deck-review',
      name: 'Training Deck Review',
      tagline: 'One deck, read the way the learner who has to pass the check reads it.',
      summary:
        'The full read: every objective followed through teaching, practice and assessment, every quiz question traced to its slide, every term checked for a definition before use, and every procedure checked for order.',
      unitLabel: 'Decks',
      unitNoun: 'deck',
      unitNounPlural: 'decks',
      unitRate: 49.99,
      checkoutHeading: 'How many decks?',
      brief: {
        intro:
          'Everything below is used to read the deck the way your learners will. Nothing is stored until payment succeeds, so leaving this page discards it.',
        fields: [
          { name: 'kind', label: 'What kind of training', type: 'select', required: true, half: true,
            options: ['Systems or software training', 'Process or procedure training', 'Onboarding', 'Customer or partner training', 'Soft skills', 'Something else — say so below'],
            help: 'Procedure training is read hardest for step order; onboarding for terms.' },
          { name: 'learners', label: 'Who the learners are', type: 'text', required: true, half: true,
            placeholder: 'New finance assistants, no prior experience with our ERP',
            help: 'The deck is read as that learner meeting the subject for the first time.' },
          { name: 'delivery', label: 'How it is delivered', type: 'select', required: true, half: true,
            options: ['Instructor-led in person', 'Instructor-led online', 'Self-paced', 'Blended', 'Not sure'],
            help: 'A self-paced deck has to carry everything; an instructor-led one can lean on notes.' },
          { name: 'purpose', label: 'What learners must be able to do afterwards', type: 'area', required: true,
            placeholder: 'Process a supplier invoice end to end without asking for help.',
            help: 'In your own words. The deck’s objectives are read against this, and it ranks the findings.' },
          { name: 'assessment', label: 'How learning is checked', type: 'text', required: false, half: true,
            placeholder: '10-question quiz and one practical exercise',
            help: 'So every check can be traced back to the teaching.' },
          { name: 'concern', label: 'Anything you already suspect', type: 'area', required: false,
            placeholder: 'Everyone fails question 7 and we do not know why.',
            help: 'A known weakness is the best possible starting point, and the report answers it explicitly.' },
          { name: 'context', label: 'Anything deliberate that will look like a gap', type: 'area', required: false,
            placeholder: 'Month-end close is covered in a separate module learners take first.',
            help: 'So a deliberate choice is reported as one rather than as a gap.' },
        ],
        attachments: {
          label: 'The deck and its materials',
          required: true,
          requiredNote: 'The review follows objectives through teaching and assessment, so send the deck with its quiz, exercises and notes',
          accept: ['.pdf', '.pptx', '.key', '.docx', '.xlsx', '.txt', '.zip'],
          maxMb: 120,
          maxFiles: 20,
          help:
            'The deck, the quiz or assessment, exercises or handouts, and trainer notes. Speaker notes inside the deck are read too.',
        },
      },
      process: [
        { step: '01', title: 'List the objectives', desc: 'Every stated objective written down, alongside what you said learners must be able to do.' },
        { step: '02', title: 'Follow each objective', desc: 'Each one traced to its teaching slides, its practice and its assessment.' },
        { step: '03', title: 'Trace every question back', desc: 'Each quiz question traced to the slide that teaches its answer.' },
        { step: '04', title: 'Check every term', desc: 'Each term, acronym and system name checked for a definition at or before first use.' },
        { step: '05', title: 'Read every procedure', desc: 'Each procedure checked for steps in the order the job is done.' },
        { step: '06', title: 'Report', desc: 'Findings section by section inside the stated turnaround, ranked by what would trip a learner first.' },
      ],
      included: [
        'Every objective followed to its teaching, practice and assessment',
        'An objective with no slide, no exercise or no question, flagged',
        'Every quiz question traced to the slide that teaches its answer',
        'A question that tests something only in the notes, or nowhere, surfaced',
        'Every term and acronym checked for a definition before first use',
        'Procedures checked for steps in the order the job is done',
        'Slides that contradict each other or the exercises, listed',
        'Objectives that differ from what learners must be able to do, compared',
        'Content taught only in trainer notes that a self-paced learner would miss',
        'What would trip a learner first, first',
      ],
      turnaround: 'Three business days from the brief arriving.',
      note: {
        title: 'How many do I need?',
        body:
          'One per deck, with its quiz, exercises and notes included. A course of several modules is one per module, and modules are often worth sending together, because a term defined in module two and used in module one is clearest across both.',
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
    { step: '01', title: 'Write the brief', desc: 'What kind of training, who the learners are, how it is delivered and what they must be able to do. Attach the deck and its materials. Nothing is stored until you pay.' },
    { step: '02', title: 'Pay', desc: 'The payment panel opens on the same page. Card details never touch this site, and you are charged once — there is no subscription and nothing recurring.' },
    { step: '03', title: 'The read', desc: 'As a learner meeting the subject for the first time: objectives, teaching, practice, the quiz, terms and step order.' },
    { step: '04', title: 'The report', desc: 'Findings section by section inside the stated turnaround, ranked by what would trip a learner first.' },
  ],

  limits: [
    { title: 'Not instructional design', body: 'No opinion on how the course should be designed or whether it works. Training Deck is not a designer or a training provider.' },
    { title: 'Not accreditation or compliance', body: 'No view on any regulatory or accreditation requirement, and nothing is certified.' },
    { title: 'Nothing is rewritten', body: 'No slide is redrawn and no question written. Your materials come back exactly as they arrived.' },
    { title: 'No numbers we cannot stand behind', body: 'There are no client counts on this site, no logos, no testimonials and no pass-rate figures. Not because there is nothing to say, but because nothing here can be verified by you.' },
  ],

  faqs: [
    { q: 'Will you tell us whether the training works?', a: 'No, and it is the one thing consistently declined. Whether people learn depends on the trainer, the learners and the job. What the report answers is whether the deck teaches, practises and checks what it says it will — which is a fact about the materials.' },
    { q: 'Our subject expert wrote the deck. Is a review still worth it?', a: 'Experts write the best content and the most invisible gaps, because the things they find obvious never reach a slide. The review reads the deck as someone who does not know the subject yet.' },
    { q: 'Can you fix the deck?', a: 'No. Nothing is redrawn or written. The report lists each finding with the slide or question it concerns, so whoever owns the deck can fix it.' },
    { q: 'What do learners trip on first?', a: 'Terms used before they are defined, and quiz questions about things only the trainer said. The report checks those first.' },
    { q: 'Does it check the content is technically correct?', a: 'No. Whether the subject matter is right is for your experts. The review checks whether the deck teaches and assesses what it promises.' },
    { q: 'Is internal material confidential?', a: 'Material is read and returned. It is not circulated, not used as an example, not retained after the engagement closes and never discussed.' },
  ],

  resources: [
    {
      title: 'Every objective needs a slide, an exercise and a question',
      summary: 'Objective three, promised on slide two and never seen again.',
      body: [
        'The objectives slide is written first and rarely revisited. By the time the deck is finished, some objectives are taught thoroughly, some briefly, and one not at all.',
        'The response is to follow each objective through the deck before release. The review does exactly that and lists objectives missing teaching, practice or assessment.',
      ],
    },
    {
      title: 'The quiz cannot test what the deck never taught',
      summary: 'Question seven, which everyone fails.',
      body: [
        'Experts write questions about what matters, and some of what matters lives only in their head or the trainer notes. Learners meet a question with no basis for answering it.',
        'The response is to trace every question back to a slide. The review does that and lists the questions nothing in the deck teaches.',
      ],
    },
    {
      title: 'A term has to be defined before it is used',
      summary: '“Reconcile against the ledger” on slide four; the ledger on slide eleven.',
      body: [
        'Experts use their vocabulary fluently and define it when they remember to. Learners lose the thread at the first undefined word and recover it only when the definition finally arrives.',
        'The response is a definition at or before first use. The review checks every term for one.',
      ],
    },
    {
      title: 'Steps have to be in the order the job is done',
      summary: 'A procedure presented in menu order.',
      body: [
        'Procedures are often documented in the order the system presents them, or the order the manual uses. Learners then do the job in that order, and it is not the order that works.',
        'The response is to walk the job and write the steps as taken. The review reads every procedure for order and flags steps that would have to be done before the slide that teaches them.',
      ],
    },
  ],

  legal: {
    entity: 'Training Deck',
    jurisdiction: 'England and Wales',
    refundWindowDays: 14,
    updated: '2026-11-03',
  },
};

export default site;
