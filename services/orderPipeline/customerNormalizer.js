/* ── Customer Normalizer ──────────────────────────────────
   Step 4. Turns raw parsed fields into a consistent customer shape,
   filling in what it can derive (full name, a single-line shipping
   address string) and never throwing on missing pieces.
*/

function normalizeCustomer(raw) {
  const firstName = raw.first_name || '';
  const lastName = raw.last_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Guest';

  const addressLines = [raw.address1, raw.address2].filter(Boolean).join(', ');
  const cityStateZip = [raw.city, raw.state, raw.zip].filter(Boolean).join(', ');
  const shippingAddress = [addressLines, cityStateZip, raw.country]
    .filter(Boolean)
    .join(' — ');

  return {
    firstName,
    lastName,
    fullName,
    email: raw.email || '',
    phone: raw.phone || '',
    address1: raw.address1 || '',
    address2: raw.address2 || '',
    city: raw.city || '',
    state: raw.state || '',
    zip: raw.zip || '',
    country: raw.country || '',
    shippingAddress,
  };
}

module.exports = { normalizeCustomer };
