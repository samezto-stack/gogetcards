/**
 * A way to walk the real post-purchase flow without paying for it.
 *
 * WHAT THIS IS: type a designated address into the email field on
 * /checkout/step-1 and the Whop embed is skipped. Everything after that
 * is the genuine production path — the same signed /thank-you URL, the
 * same order pipeline, the same Order document, the same confirmation
 * email, the same account creation, the same receipt. Nothing about the
 * confirmation is simulated, because the point is to see what a customer
 * sees, and a mock would only prove the mock works.
 *
 * WHAT IT IS NOT: a discount, a free order, or a way past payment for
 * anybody but us. It requires a live /admin session on the same browser.
 * Without one, a stranger typing the address gets the ordinary checkout
 * and learns nothing — the branch is simply not taken. That is why the
 * gate is a session rather than a secret in the URL: there is no string
 * to leak, screenshot, or find in a referrer header.
 *
 * TWO THINGS ARE DELIBERATELY WITHHELD FROM THE SIGNED FIELDS:
 *
 *   zcid — the checkout-click id. The pipeline resolves traffic source
 *   from it, and BOTH the server-side Meta CAPI push and the browser
 *   Purchase pixel fire only for a Facebook-attributed order. With no
 *   zcid there is no attribution, so a test order structurally cannot
 *   report a conversion to Meta. This is a property of the data, not an
 *   `if` somewhere that could be edited away.
 *
 *   checkout_id / a real payment_provider — so the source detector
 *   classifies it as 'direct' rather than inventing a Whop payment that
 *   does not exist.
 *
 * AND ONE IS DELIBERATELY ADDED: `store: 'test_order'`, which the
 * pipeline stores verbatim as Order.originalCheckoutMethod. That is the
 * marker the admin reporting excludes on, so a test never counts as
 * revenue. Chosen because it needs no schema change and no pipeline
 * change — the field already exists and already carries exactly this
 * kind of fact.
 *
 * No checkout, pipeline, partner-experience or signing code was modified
 * to make this work. This module only assembles a query string and signs
 * it with the same secret and the same canonicalisation the verifier
 * already uses.
 */

const crypto = require('crypto');
const { canonicalizeFields } = require('./orderPipeline/signatureVerifier');

/* The tag that turns any address into a test address. Put it before the
   @ and mail still reaches the same inbox on Gmail, Outlook, Fastmail and
   anything else that honours plus-addressing — so the confirmation email
   can actually be read, which is half of what there is to test.

   It also keeps the account separate: Customer.normaliseEmail lowercases
   and trims but does not strip plus tags, so a test never merges into a
   real customer's account. */
const TEST_TAG = '+ztest';

/** The address to use when you do not want the mail, only the flow. */
const CANONICAL_TEST_EMAIL = 'test@gogetcards.com';

/** Stored in Order.originalCheckoutMethod. Reporting excludes on it. */
const MARKER = 'test_order';

/** Every test order id starts with this, so one is obvious at a glance. */
const ID_PREFIX = 'ZY-TEST-';

/** Drop into any Order query to leave test orders out of the numbers. */
const EXCLUDE_FROM_REPORTING = { originalCheckoutMethod: { $ne: MARKER } };

function isTestEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!value.includes('@')) return false;
  if (value === CANONICAL_TEST_EMAIL) return true;
  const local = value.slice(0, value.lastIndexOf('@'));
  return local.endsWith(TEST_TAG);
}

/** True for an Order document that came from this flow. */
function isTestOrder(order) {
  return !!order && (order.originalCheckoutMethod === MARKER
    || String(order.orderId || '').startsWith(ID_PREFIX));
}

/**
 * Whether this request may take the bypass.
 *
 * The admin session, and nothing else. Note the ORDER of the checks at
 * the call site matters: a non-admin submitting a test address must fall
 * through to the ordinary checkout, not be refused — a refusal would
 * confirm the address means something.
 */
function isAllowed(req) {
  return !!(req && req.session && req.session.adminId);
}

function newOrderId() {
  return ID_PREFIX + crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * The signed /thank-you URL for a test purchase.
 *
 * @param {object} details  customer + line item, already resolved server-side
 * @returns {{ok: true, url: string} | {ok: false, error: string}}
 */
function buildConfirmationUrl(details) {
  const secret = process.env.THANK_YOU_SIGNING_SECRET;
  if (!secret) {
    /* Said plainly rather than swallowed. Without the secret the
       signature check on /thank-you fails and the customer would land on
       the "we couldn't load your order" branch, which looks like a bug in
       the confirmation page rather than a missing environment variable. */
    return { ok: false, error: 'THANK_YOU_SIGNING_SECRET is not set on this server, so a confirmation link cannot be signed.' };
  }

  const fields = {
    order_id: newOrderId(),
    email: details.email,
    first_name: details.firstName || '',
    last_name: details.lastName || '',
    address1: details.address1 || '',
    address2: details.address2 || '',
    city: details.city || '',
    state: details.state || '',
    zip: details.zip || '',
    country: details.country || '',
    phone: details.phone || '',
    product: details.productTitle || '',
    product_slug: details.productSlug || '',
    product_image: details.productImage || '',
    /* Dollars: the pipeline's toCents() multiplies by 100. Everything
       else in this codebase holds cents, which is exactly the kind of
       mismatch that silently produces a $4.29 order, so the conversion
       happens once, here, at the boundary. */
    total_price: (Number(details.totalCents || 0) / 100).toFixed(2),
    currency: details.currency || 'USD',
    quantity: String(details.quantity || 1),
    payment_provider: 'test',
    purchase_date: new Date().toISOString(),
    store: MARKER,
  };

  const iat = String(Date.now());
  const sig = crypto.createHmac('sha256', secret)
    .update(canonicalizeFields(fields, iat))
    .digest('hex');

  const params = new URLSearchParams(fields);
  params.set('iat', iat);
  params.set('sig', sig);
  return { ok: true, url: '/thank-you?' + params.toString(), orderId: fields.order_id };
}

module.exports = {
  TEST_TAG,
  CANONICAL_TEST_EMAIL,
  MARKER,
  ID_PREFIX,
  EXCLUDE_FROM_REPORTING,
  isTestEmail,
  isTestOrder,
  isAllowed,
  buildConfirmationUrl,
};
