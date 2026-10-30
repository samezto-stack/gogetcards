/* ── Order Validator ──────────────────────────────────────
   Step 2. Decides whether a parsed param set is enough to build a real
   order out of, and returns friendly, field-level errors when not —
   the page can then render a graceful error state instead of crashing.
*/

// Only order_id and product/price truly need to exist for the page (and the
// import pipeline) to have something meaningful to show. Everything else is
// allowed to be missing and gets a sensible default downstream.
const REQUIRED_FIELDS = ['order_id'];

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateOrderParams(raw) {
  const errors = {};

  for (const field of REQUIRED_FIELDS) {
    if (!raw[field]) errors[field] = `Missing required field: ${field}`;
  }

  if (raw.email && !isValidEmail(raw.email)) {
    errors.email = 'Email address looks invalid';
  }

  if (raw.price != null && raw.price !== '' && isNaN(Number(raw.price))) {
    errors.price = 'Price must be numeric';
  }

  if (raw.quantity != null && raw.quantity !== '' && isNaN(Number(raw.quantity))) {
    errors.quantity = 'Quantity must be numeric';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

module.exports = { validateOrderParams, isValidEmail };
