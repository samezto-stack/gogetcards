/* ── Source Detector ──────────────────────────────────────
   Step 3. Classifies which external checkout produced a parsed param set.
   Detectors are tried in order; the first match wins. Adding a new
   provider (Stripe, Shopify, ...) later means adding one more entry to
   this list — nothing else in the pipeline needs to know about it.
*/

const DETECTORS = [
  {
    source: 'whop',
    label: 'Whop',
    matches: (raw) => raw.payment_provider === 'whop' || !!raw.checkout_id,
  },
  {
    source: 'stripe',
    label: 'Stripe',
    matches: (raw) => raw.payment_provider === 'stripe',
  },
  /* KEPT AFTER THE SHOPIFY AND STRIPE CHECKOUTS WERE DELETED, because
     these two classify orders that ALREADY EXIST. Nothing new can arrive
     through either provider now, but dropping the detectors would relabel
     every historical order as "Direct" in the admin — rewriting the past
     to tidy the present. */
  {
    source: 'shopify',
    label: 'Shopify',
    matches: (raw) => raw.payment_provider === 'shopify' || raw.store === 'shopify_rotator',
  },
];

function detectSource(raw) {
  const hit = DETECTORS.find((d) => d.matches(raw));
  return hit ? { source: hit.source, label: hit.label } : { source: 'direct', label: 'Direct' };
}

module.exports = { detectSource, DETECTORS };
