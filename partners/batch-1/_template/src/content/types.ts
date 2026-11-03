/**
 * The shape of a site's content.
 *
 * WHY THE CONTENT IS DATA AND THE PAGES ARE GENERIC. Coverage Desk, Award
 * Cycle and Defense Date are the same business in three professions: a
 * per-unit reviewing service, a twenty-four-step price ladder, one Whop
 * storefront, no mailing list and no sales calls. Writing three sets of
 * page components would mean fixing every layout bug three times and
 * discovering the third site's copy had drifted from the first's structure
 * six months later.
 *
 * So the structure lives in the components and everything a reader actually
 * sees lives in one file per site. A new site is a content file, a palette
 * and a set of plan ids.
 *
 * NOTHING HERE IS OPTIONAL DECORATION. Every field is rendered somewhere; a
 * field left empty removes its block from the page rather than printing an
 * empty heading. That is deliberate and it is why `owner.name` can be blank
 * while the site is still honest — see Owner below.
 */

export interface Plan {
  /** How many units this tier buys. Contiguous, 1..24. */
  units: number;
  /** A real Whop plan id. Never a placeholder — see scripts/check-plans.js. */
  planId: string;
  /** DISPLAY ONLY. Whop charges what the plan is configured for, so if this
   *  disagrees with Whop the customer pays Whop's figure, not this one. */
  price: number;
}

export interface ProcessStep {
  step: string;
  title: string;
  desc: string;
}

export interface BriefField {
  name: string;
  label: string;
  /** 'text' is one line, 'area' is several, 'select' needs `options`. */
  type: 'text' | 'area' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  /** Shown under the field. Says why it is being asked, not what to type. */
  help?: string;
  /** Sit two-to-a-row instead of spanning the whole width.
   *
   *  SO THE WHOLE BRIEF FITS ON ONE SCREEN. A form the buyer has to scroll
   *  through hides how much is left to do, and the outstanding list in the
   *  rail beside it is only useful while both are visible at once. Fields
   *  default to full width; this is opt-in per field, because a long
   *  free-text answer in a half-width box is worse than a scroll. */
  half?: boolean;
}

/**
 * What the service page collects before payment.
 *
 * WHY BEFORE. The buyer is describing work they want done. Collecting it
 * afterwards means a second visit and a chase, and a paid order that cannot
 * be started — the customer has been charged for a review of material nobody
 * has. Nothing is stored until Whop reports a successful payment, so an
 * abandoned brief leaves no data behind.
 */
export interface Brief {
  /** Sits above the form. One sentence on what is being asked for and why. */
  intro: string;
  fields: BriefField[];
  attachments: {
    label: string;
    /** Extensions this service can actually read. */
    accept: string[];
    maxMb: number;
    maxFiles: number;
    /** What to send, in the reader's own vocabulary. */
    help: string;
    /** At least one file must land before payment will open.
     *
     *  TRUE WHERE THE WORK IS IMPOSSIBLE WITHOUT THE FILE. Taking payment
     *  for a review of material nobody has buys an order that cannot be
     *  started and a chase that should never have been needed. Where a
     *  brief can stand on its words alone, leave this off rather than
     *  demanding a file for the sake of it. */
    required?: boolean;
    /** The sentence shown when payment is blocked only for want of a file.
     *
     *  CONTENT, NOT LAYOUT, and it is here because the first version of this
     *  form hard-coded one site's wording — "the review is written from your
     *  rate card" — into a component every site shares. Every other site
     *  then told its buyer to attach a rate card. Say what THIS service
     *  cannot start without, in its own words. */
    requiredNote?: string;
  };
}

/**
 * One thing the business sells.
 *
 * `unitNoun` is what a single unit buys — "coverage pass", "chapter",
 * "narrative section". It is used in the checkout summary and in the plan
 * descriptions, so the customer reads what they are buying in the words of
 * their own profession rather than "1 unit".
 */
export interface Service {
  /** Collected before the payment dialog will open. */
  brief: Brief;
  slug: string;
  name: string;
  tagline: string;
  /** Shown on the services index and in the page hero. */
  summary: string;
  unitLabel: string;
  unitNoun: string;
  unitNounPlural: string;
  /** Price per unit, for the "$X per Y" line. */
  unitRate: number;
  checkoutHeading: string;
  process: ProcessStep[];
  included: string[];
  /** Turnaround stated as a fact the business commits to, not a boast. */
  turnaround: string;
  /** Answers the "how many do I need?" question at the point of choosing. */
  note: { title: string; body: string };
  /** A fixed-scope engagement priced at one point on the ladder rather than
   *  per unit. The ladder's top tier is reused, so there is no separate plan
   *  and no second price for the same money. */
  fixedTier?: number;
}

export interface Faq {
  q: string;
  a: string;
}

export interface Resource {
  title: string;
  summary: string;
  /** The body is written out in full on the page. A "resources" section that
   *  is a list of titles linking nowhere is a sitemap pretending to be
   *  content. */
  body: string[];
}

/**
 * The person behind the practice.
 *
 * `name` MAY BE EMPTY, and the About page is written to work when it is —
 * the practice, the method and the standards are described without ever
 * implying a person who has not been named. Nothing renders a placeholder,
 * an initial, or "our team" standing in for one individual.
 *
 * That is not a shortcut. Publishing an invented name on a page that takes
 * payment is a straightforward misrepresentation, and a made-up name is
 * harder to remove later than an absent one is to add.
 */
export interface Owner {
  name: string;
  /** Only what is true. Blank is fine and renders nothing. */
  title: string;
  /** Paragraphs. Rendered only when a name exists to attach them to. */
  bio: string[];
}

/**
 * Page copy that is neither a service nor a policy.
 *
 * THIS BLOCK EXISTS BECAUSE OF A MISTAKE WORTH RECORDING. The first version
 * of these sites put the About prose, the confirmation instructions and the
 * header's own strapline directly in the page components — they read as
 * layout at the time. Porting the build to the second site produced pages
 * that were structurally correct and told a grant writer where to send a
 * screenplay.
 *
 * The rule that prevents it: if a sentence names the profession, it is
 * content. Only wording that would be true of every site in this family may
 * live in a component.
 */
export interface PageCopy {
  /** Under the wordmark, and the header's call to action. */
  navTagline: string;
  ctaLabel: string;
  ctaTo: string;

  about: {
    title: string;
    intro: string;
    sections: { title: string; paras: string[] }[];
    /** The "who does the work" panel at the foot of the page. */
    closing: { title: string; body: string };
  };

  standards: {
    intro: string;
    /** Site-specific limits beyond the shared `limits` list — the ones about
     *  this profession's own material and its own integrity rules. */
    extra: { title: string; body: string }[];
  };

  resourcesIntro: string;

  contact: {
    intro: string;
    /** Why material is not sent before payment. */
    materialTitle: string;
    materialBody: string;
  };

  thankYou: {
    title: string;
    intro: string;
    /** One line per service: what to attach. */
    sendList: string[];
    next: string;
  };
}

export interface SiteContent {
  /** Trading name, as it appears in the header and in legal copy. */
  name: string;
  /** One line, used under the logo and in the footer. */
  strapline: string;
  /** The Whop storefront. This site has no email address: every contact
   *  route goes here, because a mailbox nobody reads is worse than none. */
  whopUrl: string;
  /** Absolute URL Whop returns to after payment. */
  returnUrl: string;
  owner: Owner;
  copy: PageCopy;

  hero: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    body: string;
    primaryCta: { label: string; to: string };
    secondaryCta: { label: string; to: string };
  };

  /** Three or four plain statements of what the business does. No numbers
   *  that cannot be substantiated — no client counts, no success rates. */
  pillars: { title: string; body: string }[];

  services: Service[];
  /** Shared by every per-unit service on the site. */
  plans: Plan[];

  howItWorks: ProcessStep[];
  /** What the business will not do. An honest limits section is worth more
   *  than a testimonials page nobody believes. */
  limits: { title: string; body: string }[];
  faqs: Faq[];
  resources: Resource[];

  legal: {
    /** The trading entity named in the terms. */
    entity: string;
    /** Governing jurisdiction, stated plainly. */
    jurisdiction: string;
    /** Days a refund may be requested within. */
    refundWindowDays: number;
    /** Last substantive revision, ISO date. */
    updated: string;
  };
}
