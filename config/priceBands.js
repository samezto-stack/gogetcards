/**
 * Price bands, in cents, shared by the collection filter and the homepage's
 * "Shop by price" row so the two can never disagree about where a band
 * starts or ends. `max` is exclusive.
 *
 * Every price on this store is a multiple of $49.99, so these cut the
 * ladder cleanly: $49.99 and $99.98 are under $100, $149.97 to $249.95 sit
 * in the second band, and so on.
 */
const PRICE_BANDS = [
  { id: 'under-100', label: 'Under $100', min: 0, max: 10000 },
  { id: '100-250', label: '$100 to $250', min: 10000, max: 25000 },
  { id: '250-500', label: '$250 to $500', min: 25000, max: 50000 },
  { id: 'over-500', label: '$500 and up', min: 50000, max: Infinity },
];

module.exports = { PRICE_BANDS };
