/* ── Order Service ────────────────────────────────────────
   Step 6. The single place that writes an imported order into the
   existing Order collection. Every external import (Whop today, any
   future provider) goes through this same function — nothing about
   Whop is hardcoded here, that's all in sourceDetector.js.

   Idempotent by orderId: a second call with the same orderId (e.g. the
   customer refreshing the Thank You page) never creates a duplicate and
   never resets fields — $setOnInsert only applies on the very first
   write, so we can safely detect "was this just created" and use that
   as the trigger for the one-time email + admin notification.
*/

const Order = require('../../models/Order');

async function createOrRetrieveOrder(orderData) {
  const existing = await Order.findOne({ orderId: orderData.orderId }).lean();
  if (existing) {
    return { order: existing, isNew: false };
  }

  try {
    const created = await Order.create(orderData);
    return { order: created.toObject(), isNew: true };
  } catch (err) {
    // Race: another request created it between our findOne and create
    // (duplicate key on the unique orderId index). Treat as "not new".
    if (err.code === 11000) {
      const order = await Order.findOne({ orderId: orderData.orderId }).lean();
      return { order, isNew: false };
    }
    throw err;
  }
}

async function markConfirmationEmailSent(orderId) {
  // Atomic claim: only the caller that actually flips the flag from
  // false -> true should send the email, even under concurrent requests.
  const result = await Order.findOneAndUpdate(
    { orderId, confirmationEmailSent: { $ne: true } },
    { $set: { confirmationEmailSent: true } },
    { new: true }
  );
  return !!result;
}

module.exports = { createOrRetrieveOrder, markConfirmationEmailSent };
