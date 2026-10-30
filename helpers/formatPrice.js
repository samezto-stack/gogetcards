/**
 * Format a price in cents to a display string with thousands separator
 * e.g. 139999 → "1,399.99"
 */
function formatPrice(cents) {
  const num = (cents / 100).toFixed(2);
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

module.exports = formatPrice;
