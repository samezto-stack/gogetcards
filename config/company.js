/**
 * Verifiable company facts, and ONLY verifiable ones.
 *
 * WHY THIS EXISTS: the About page hardcoded "10,000+ Orders Delivered",
 * "4.9★ Average Rating", "6+ Years Operating" and "£10M+ Product Shipped"
 * (in GBP, on a store that prices in USD), plus three named staff with
 * biographies and a 2020-2025 company timeline. None of it was backed by
 * anything. The 4.9★ is the sharpest problem: a stated average rating with
 * no review system behind it falls under the FTC's consumer review rule
 * (16 CFR Part 465), and the same figure is what Google would read if it
 * were ever marked up as aggregateRating.
 *
 * Everything below is null by default, and every consuming template omits
 * its block when the value is unset. Fill in ONLY what you can evidence.
 * A shorter, true About page outperforms an impressive invented one — for
 * EEAT, for the FTC, and for anyone who checks.
 */
module.exports = {
  /* ── Business identity ───────────────────────────────────
     Google Merchant Center's most common first-submission rejection is
     "Missing or insufficient business information": the reviewer cannot
     tell who they would be buying from. Its bar is that a shopper can
     identify the seller and reach them, which in practice means a
     business name, a country, and at least two working contact methods
     (this store has an email address and a contact form, so that test is
     met).

     Everything here renders only when set. Nothing is invented: a made-up
     registration number or a street address that does not exist is a far
     worse outcome than an absent one, because Google verifies these
     against public records and a mismatch is a Misrepresentation
     suspension rather than a request for more detail. */
  business: {
    // The name customers are billed under and the name on this site.
    tradingName: 'GoGetCards',

    /* Registered legal entity, if one exists. Operating as a sole trader
       is completely acceptable to Google — claiming a limited company
       that is not registered is not. Leave null until incorporated. */
    legalName: null,
    registrationNumber: null,
    vatNumber: null,

    /* Country of operation. This is the one location fact a store should
       never omit: it tells the buyer where goods ship from, which customs
       and duties apply, and which consumer law governs the sale. */
    country: 'United States',
    countryCode: 'US',      // used in schema.org address and the feed

    /* Full postal address, as supplied by the operator.
     *
     * IT MUST MATCH WHAT GOOGLE CAN VERIFY. Merchant Center checks the
     * published address against the business details on the Google
     * Payments profile and, for a claimed domain, against registrar and
     * processor records. A mismatch between this and the address on that
     * profile is a far more common suspension cause than an address a
     * reviewer merely finds unimpressive. Change it here and every surface
     * follows; change it in Merchant Center too. */
    address: {
      street: '2321 Rosecrans Ave, Ste 5200',
      city: 'El Segundo',
      region: 'CA',
      postalCode: '90245',
    },

    /* Where returns are physically sent. Left null so the refund policy
       tells customers to request an RMA first rather than publishing an
       address parcels can arrive at unannounced — an unexpected return at
       a suite address is a parcel nobody can match to an order. Set it to
       a real receiving address once one exists. */
    returnsAddress: null,

    /* Contact routes. Every address here must be one somebody actually
       reads — a published address that bounces is worse than none, and is
       precisely what a reviewer tests. */
    supportEmail: 'support@gogetcards.com',
    ordersEmail: 'support@gogetcards.com',
    returnsEmail: 'returns@gogetcards.com',
    privacyEmail: 'privacy@gogetcards.com',
    pressEmail: null,
    phone: null,            // published only if genuinely answered

    /* Support availability, stated as a promise the store can keep.
       "Within 24 hours" was already claimed on the contact page; it lives
       here so the same figure drives the page copy, the FAQ answer and the
       ContactPoint schema. */
    /* Hours without a timezone are not a commitment — "9:00 to 17:00" is
       eight different promises depending on where the reader is. */
    supportHours: 'Monday to Friday, 9:00 to 17:00',
    supportTimezone: 'America/Los_Angeles',
    supportTimezoneLabel: 'Pacific Time',
    responseTimeHours: 24,

    /* Currency every price on the site is stated in. Referenced by the
       checkout copy so the buyer is never guessing which dollar. */
    currency: 'USD',
  },

  // Numbers. Set to a number/string once you can evidence it; leave null
  // and the stat is not rendered at all.
  stats: {
    ordersDelivered: null,    // e.g. 1240 — from your own Order collection
    averageRating: null,      // ONLY with a real review system behind it
    yearsOperating: null,     // e.g. 2
    productShippedValue: null,// e.g. '$250K+' — match your pricing currency
  },

  // Facts that are true regardless of scale, so they render by default.
  constants: {
    factorySealedPct: '100%',
    linesStocked: 7,        // four TCGs and three sports, see config/catalog.js
  },

  // Real people only. Each entry: { name, role, bio }.
  team: [],

  // Real events only. Each entry: { year, title, description }.
  timeline: [],

  // Social profiles. Only configured ones render; the footer previously
  // shipped six href="#" placeholders, i.e. six dead links on every page.
  // Also used as sameAs in Organization schema, where a dead link is worse
  // than an absent one.
  social: {
    instagram: null,
    tiktok: null,
    youtube: null,
    discord: null,
    x: null,
    /* Feeds the footer icon row AND Organization.sameAs, which is the part
       that matters: sameAs is how Google ties this domain to a profile it
       can already see has history, posts and followers. That is a real
       trust signal for a young store, and it is also why a WRONG URL here
       is worse than none — sameAs pointing at a 404 ties the brand entity
       to a dead page. Verify it loads in a logged-out browser after every
       change to the page's username. */
    facebook: null,
  },
};

/* ── Address formatting ──────────────────────────────────
   Here rather than in each template, so the footer, the contact page, the
   legal pages and any future surface print one identical address. Merchant
   Center's misrepresentation review is largely a consistency check, and an
   address that reads two ways on two pages is exactly the kind of thing it
   is looking for. Every helper returns nothing when the address is unset,
   so a store that has not filled one in renders no empty block. */

const biz = module.exports.business;

/** Address as display lines, most specific first. */
module.exports.addressLines = function addressLines() {
  if (!biz.address) return biz.country ? [biz.country] : [];
  const a = biz.address;
  /* "El Segundo, CA 90245", not "El Segundo, CA, 90245". US convention
     separates the locality from the state with a comma and the state from
     the ZIP with a space, and an address punctuated the wrong way reads as
     machine-generated to exactly the reviewer deciding whether this is a
     real business. */
  const regionPostal = [a.region, a.postalCode].filter(Boolean).join(' ');
  return [
    a.street,
    [a.city, regionPostal].filter(Boolean).join(', '),
    biz.country,
  ].filter(Boolean);
};

/** The same address on one line, for inline sentences. */
module.exports.addressOneLine = function addressOneLine() {
  return module.exports.addressLines().join(', ');
};

/** Support hours with a timezone a reader can act on. */
module.exports.supportHoursLine = function supportHoursLine() {
  if (!biz.supportHours) return '';
  const zone = biz.supportTimezoneLabel || biz.supportTimezone;
  return zone ? `${biz.supportHours} ${zone}` : biz.supportHours;
};
