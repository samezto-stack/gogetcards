/**
 * Shared experience-engine instance (one per process).
 *
 * All signing, verification, cookie and resolution logic lives in the
 * vendored experience-engine package — nothing is reimplemented here.
 *
 * EVERY GATED ID SERVES THE SAME PARTNER CHECKOUT PAGE (see
 * PARTNER_CHECKOUT_PAGE in server.js), so the id only ever selects "gated
 * versus the normal marketing page". WHICH product is shown comes from the
 * signed claims on the token, not from which id or which route was used —
 * which is why one page serves every service on this site and why adding a
 * service needs no new file.
 *
 * "partner" is included so this host accepts the same id the other sites in
 * this group use; the service slugs are listed so a zypheratcg route
 * configured against any of them works without a code change here. Extra
 * ids can be added through EXPERIENCE_IDS.
 */
import { createExperienceEngine, createConfigFromEnv } from '../lib/experience-engine/src/index.js';
import { EXPERIENCE_API_KEY, EXPERIENCE_SIGNING_SECRET } from './secrets.js';

const envConfig = createConfigFromEnv(process.env);

const experiences = [
  ...new Set([...(envConfig.experiences || []), 'partner', 'business-plan-review']),
];

/* Whitelisted passthrough claims: the issuer accepts these from a trusted
   caller (zypheratcg) and binds them into the signed token, which carries
   them through to the checkout page. Identical to the set the sibling hosts
   accept, so one broker configuration works against all of them. */
const passthroughClaims = [
  ...new Set([
    ...(envConfig.passthroughClaims || []),
    'email',
    'productName',
    'productImage',
    'productSlug',
    'whopPlanId',
    'productPrice',
    /* THE CURRENCY THAT PRICE IS IN. Whitelisted beside productPrice, and
       for the same reason: without it the checkout page has an amount and
       no way to label it, so it fell back to a dollar sign and showed
       "$119.98" to a buyer who had agreed to £119.98 everywhere else.
       zypheratcg has always sent this claim; the engine dropped it here
       because it was not on this list, which is why fixing the page alone
       changed nothing. */
    'productCurrency',
    /* Only ever sent for a quantity above one — a real bundle plan, never a
       multiplied price — and drives the checkout page's quantity badge. */
    'productQuantity',
    /* The order this checkout belongs to. Whitelisted so it survives in the
       signed claims cookie: the page strips it from the URL on first load,
       and without a persisted copy a refresh looked exactly like a visitor
       who had no order at all. */
    'zcid',
    /* The buyer's own details, used to prefill the payment provider's
       billing form so it is not a second address form. Whitelisted here like
       any other claim, and handled quite differently in server.js, where
       they are kept out of every URL exactly as 'email' is. */
    'buyerName',
    'buyerAddress1',
    'buyerAddress2',
    'buyerCity',
    'buyerState',
    'buyerPostalCode',
    'buyerCountry',
  ]),
];

/* secret and apiKey are passed explicitly rather than left to the
   environment: they resolve in server/secrets.js, which falls back to a
   committed value when the variable is unset. createConfig still throws on
   an empty apiKey, so a misconfigured deploy fails at boot rather than at
   the first customer. */
const engine = createExperienceEngine({
  ...envConfig,
  secret: EXPERIENCE_SIGNING_SECRET,
  apiKey: EXPERIENCE_API_KEY,
  experiences,
  passthroughClaims,
});

export default engine;
