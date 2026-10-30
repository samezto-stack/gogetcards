/**
 * Single source of truth for how shipping works.
 *
 * THE POLICY: free tracked shipping on every order, to every country we
 * ship to, with no minimum spend. There is no threshold, no standard rate,
 * and no cheaper untracked tier. If that ever changes, it changes here and
 * nowhere else.
 *
 * WHY THIS FILE IS SHAPED THIS WAY: shipping cost has been the single most
 * inconsistent fact on this site. It has been wrong three separate ways.
 *
 *   1. The threshold lived in two unrelated places that had drifted, so
 *      the announcement bar promised free shipping over $150 while the
 *      Offer schema hardcoded a rate of 0 for every product — a $20 item
 *      advertised free shipping to Google.
 *   2. Then a full per-country rate table appeared on the policy page (UK
 *      free over $100, Rest of World over $300, six different flat rates)
 *      while this module knew one flat $9.99/$150 pair and the schema
 *      still quoted that single US rate to the whole world. Three
 *      published answers to one question.
 *   3. The checkout page separately hardcoded "Free Shipping" as a trust
 *      chip regardless of order value.
 *
 * "Shipping mismatch" is a named Merchant Center rejection reason and it
 * is trivially caught: a reviewer compares the feed's shipping value
 * against the policy page. Free-on-everything removes the arithmetic, but
 * NOT the need for one source — the delivery estimates, the carriers and
 * the customs wording still have to agree across the site, and they only
 * do that if there is one copy of each.
 *
 * Nothing reads a threshold any more. The old FREE_SHIPPING_THRESHOLD_USD
 * and STANDARD_SHIPPING_USD exports are deliberately gone rather than left
 * at 0: a name that says "threshold" invites a future template to render
 * "free over $0", and a stale export is how the old inconsistency crept
 * back the first time.
 */

/** The whole policy, in one boolean and one sentence. */
const FREE_SHIPPING_ALL_ORDERS = true;

/* Regions. Rates are gone; what remains is what still varies by
   destination and still has to be stated accurately: who carries it and
   how long it takes. `countries` are ISO codes for schema.org
   DefinedRegion. A region with no codes (Rest of World) is shown to
   shoppers but not emitted as structured data, because "everywhere else"
   is not something DefinedRegion can express and inventing a country list
   would be worse than omitting it. */
/* ORIGIN: El Segundo, California. Every window below is transit FROM
   there, which is what determines the ordering: domestic first, Canada
   next, then the transatlantic and transpacific runs.

   These numbers were previously the shape of a UK origin — the UK was the
   fastest region at 1-2 days via Royal Mail Tracked 24, which is a
   DOMESTIC UK service that cannot carry a parcel from California at all,
   and the US sat at 5-7 days, slower than Canada. Read together they
   described a business shipping from Britain. Google computes every
   delivery estimate from the ship-from address in Merchant Center, so a
   table describing the wrong continent produces a wrong date on every
   listing, and "estimated delivery date missed" is tracked against the
   account.

   US transit matches USPS Ground Advantage's published 2-5 business day
   standard, which is the same standard Google uses to build its estimate
   from the account's carrier setting. Site, schema, feed and Merchant
   Center therefore state one number rather than four. */
const REGIONS = [
  { id: 'us',  name: 'United States',            carrier: 'USPS Ground Advantage', transitDays: [2, 5],  countries: ['US'] },
  { id: 'ca',  name: 'Canada',                   carrier: 'UPS / FedEx',           transitDays: [3, 7],  countries: ['CA'] },
  { id: 'uk',  name: 'United Kingdom',           carrier: 'DHL Express',           transitDays: [5, 9],  countries: ['GB'] },
  {
    id: 'eu',
    name: 'Europe (EU)',
    carrier: 'DHL Express',
    transitDays: [5, 10],
    countries: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL',
      'PT', 'RO', 'SK', 'SI', 'ES', 'SE'],
  },
  { id: 'anz', name: 'Australia / New Zealand',  carrier: 'DHL / FedEx',           transitDays: [7, 12], countries: ['AU', 'NZ'] },
  { id: 'row', name: 'Rest of World',            carrier: 'DHL Express',           transitDays: [8, 16], countries: [] },
];

const PRIMARY_REGION = REGIONS.find((r) => r.id === 'us');

/** Order dispatch commitment, stated once. */
const DISPATCH = {
  /* Pacific, because that is where the parcels are. The cutoff was stated
     in GMT alongside a California warehouse: a US buyer ordering at 9am
     Pacific had already missed a 2PM GMT cutoff six hours earlier, so the
     one-business-day dispatch promise was unkeepable for most of the
     domestic day. */
  cutoffLocal: '2:00 PM',
  cutoffTimezone: 'PT',
  inStockBusinessDays: 1,
  preorderBusinessDaysAfterRelease: 2,
};

/** Value above which the carrier must collect a signature. */
const SIGNATURE_REQUIRED_OVER_USD = 500;

/**
 * OfferShippingDetails for a product: one entry per region with a defined
 * country list, every one of them free.
 *
 * Emitted as an array rather than a single object so Google can match the
 * viewer's country to a real delivery estimate. The rate is the same
 * everywhere; the transit time is not, and a US shopper being shown a
 * 7-to-14-day estimate is a worse experience than no estimate.
 *
 * Takes no price argument. It used to, because the rate depended on order
 * value — keeping an ignored parameter would leave the impression that it
 * still might.
 */
function shippingDetailsFor() {
  return REGIONS.filter((r) => r.countries.length).map((r) => ({
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'USD' },
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: r.countries.length === 1 ? r.countries[0] : r.countries,
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: 0,
        maxValue: DISPATCH.inStockBusinessDays,
        unitCode: 'DAY',
      },
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: r.transitDays[0],
        maxValue: r.transitDays[1],
        unitCode: 'DAY',
      },
    },
  }));
}

module.exports = {
  FREE_SHIPPING_ALL_ORDERS,
  REGIONS,
  PRIMARY_REGION,
  DISPATCH,
  SIGNATURE_REQUIRED_OVER_USD,
  shippingDetailsFor,

  /* Every phrasing of the shipping promise the site uses, in one place.
     Templates pick the length that fits rather than writing their own,
     which is how "free over $150" and "free over $100" ended up on the
     same page in the first place. */
  copy: {
    // Announcement bar, trust chips: as short as it goes.
    short: 'Free shipping on all orders',
    // Product page, cart: adds what kind of shipping.
    medium: 'Free tracked shipping on every order',
    // Policy page, FAQ: the full promise including the no-minimum part.
    long: 'Free tracked shipping on every order, worldwide, with no minimum spend',
    // The caveat that must travel with it on international orders.
    dutiesCaveat: 'Import duty and local taxes are set by the destination country and are charged to you separately by the carrier.',
  },
};
