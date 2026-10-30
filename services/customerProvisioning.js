/**
 * Turns a confirmed order into an account, and signs the buyer in.
 *
 * WHERE THIS IS CALLED FROM MATTERS MORE THAN WHAT IT DOES. It runs at the
 * end of the /thank-you handler, AFTER services/orderPipeline has verified
 * an HMAC-signed confirmation from the payment host and written a real
 * Order. By that point the payment has been confirmed server-side and the
 * order exists in the database.
 *
 * So there is no path from "a browser claimed a purchase happened" to "an
 * account exists". A hand-typed /thank-you?order_id=… fails signature
 * verification, never reaches the pipeline, and never reaches this. That
 * property is the whole design; it is why this lives in its own module
 * with this comment on it rather than inline where the next edit could
 * quietly move it above the verification.
 *
 * NOTHING HERE IS ALLOWED TO FAIL THE PAGE. A customer who has just paid
 * must see their confirmation. If the account cannot be created, they get
 * their receipt and no account, and can sign in by email later — which is
 * a strictly better outcome than an error page after a successful payment.
 */

const Customer = require('../models/Customer');
const customerAuth = require('./customerAuth');
const EmailLog = require('../models/EmailLog');

/**
 * @param {object} order  a persisted Order document
 * @param {object} req
 * @param {object} res
 * @param {{signIn?: boolean}} [opts]  signIn:false provisions the account
 *   WITHOUT starting a session. Required when somebody other than the buyer
 *   is driving — an admin recovering a payment from /admin/orders would
 *   otherwise have their own browser signed in as the customer, which is
 *   both wrong and a way to read another person's order history by accident.
 * @returns {Promise<{customer: object|null, created: boolean, signedIn: boolean}>}
 */
async function provisionFromOrder(order, req, res, opts = {}) {
  const signIn = opts.signIn !== false;
  const nothing = { customer: null, created: false, signedIn: false };
  if (!order || !order.customerEmail) return nothing;

  try {
    const email = Customer.normaliseEmail(order.customerEmail);
    /* Guest checkouts and pooled-email flows can leave something that is
       not a real address. An account keyed on one would be unreachable by
       its own sign-in link. */
    if (!email || !email.includes('@')) return nothing;

    const before = await Customer.findOne({ email }).select('_id').lean();

    const customer = await Customer.findOrCreateByEmail(order.customerEmail, {
      firstName: order.firstName || '',
      lastName: order.lastName || '',
      phone: order.customerPhone || '',
      address: addressFrom(order),
      createdVia: 'purchase',
    });
    if (!customer) return nothing;

    /* Fill gaps only. A returning customer who has edited their profile
       must not have it overwritten by whatever the payment host captured
       this time — their edit is the more recent statement of intent.
       Their ORDERS keep their own address copies regardless. */
    const fill = {};
    if (!customer.firstName && order.firstName) fill.firstName = order.firstName;
    if (!customer.lastName && order.lastName) fill.lastName = order.lastName;
    if (!customer.phone && order.customerPhone) fill.phone = order.customerPhone;
    if (!customer.address || !customer.address.line1) {
      const addr = addressFrom(order);
      if (addr.line1) fill.address = addr;
    }
    if (Object.keys(fill).length) {
      Object.assign(customer, fill);
      await customer.save();
    }

    if (signIn) {
      await customerAuth.startSession(res, customer, { req, origin: 'purchase' });
    }

    /* Join the emails already sent for this order back to the account.
       The confirmation goes out from the pipeline a moment BEFORE this
       runs — the account does not exist yet at that point — so its log
       row is written with no customer on it. Left alone, EmailLog's
       customer field would be permanently null for the one email type
       anybody ever needs to look up, which is worse than not having the
       field. Fire-and-forget: a bookkeeping join must never cost
       somebody their receipt. */
    EmailLog.updateMany(
      { orderId: order.orderId, customer: null },
      { $set: { customer: customer._id } }
    ).catch((err) => console.error('[customerProvisioning] could not link email log:', err.message));

    return { customer, created: !before, signedIn: signIn };
  } catch (err) {
    /* Logged loudly, swallowed completely. See the note at the top. */
    console.error('[customerProvisioning] could not provision account:', err.message);
    return nothing;
  }
}

/** The structured address the order captured, if it captured one. */
function addressFrom(order) {
  return {
    line1: order.address1 || '',
    line2: order.address2 || '',
    city: order.city || '',
    region: order.state || '',
    postalCode: order.zip || '',
    country: order.country || '',
  };
}

module.exports = { provisionFromOrder };
