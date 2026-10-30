/**
 * Every email this application can send, by name.
 *
 * The keys here are the contract: services/mail refuses a type that is
 * not in this object, EmailLog stores the key verbatim, and the admin
 * preview iterates it — so a template that exists but is not registered
 * is impossible to send AND impossible to preview, rather than being a
 * half-wired thing that works from one caller and not another.
 */

const order = require('./order');
const shipping = require('./shipping');
const refunds = require('./refunds');
const account = require('./account');
const recovery = require('./recovery');
const support = require('./support');
const release = require('./release');

const templates = {
  orderConfirmation: order.orderConfirmation,
  preorderConfirmation: order.preorderConfirmation,
  shipped: shipping.shipped,
  trackingAvailable: shipping.trackingAvailable,
  cancellation: refunds.cancellation,
  refundInitiated: refunds.refundInitiated,
  refundCompleted: refunds.refundCompleted,
  releaseUpdate: account.releaseUpdate,
  accountAccess: account.accountAccess,

  /* Release day. The first two are broadcasts (services/mail/broadcast),
     one per customer; the third is a single-order event fired when a
     customer presses the button in the second. */
  releaseReady: release.releaseReady,
  reinstateOffer: release.reinstateOffer,
  reinstated: release.reinstated,

  /* The contact form's two sides. contactReceived is the only template
     here addressed to us rather than to a customer; it is registered
     like everything else so it is logged and previewable the same way. */
  contactReceived: support.contactReceived,
  supportReply: support.supportReply,

  /* Abandoned-checkout recovery. Registered here like everything else, so
     the admin preview lists them and services/mail refuses any step that
     is not in this object. */
  recoveryReminder1: recovery.recoveryReminder1,
  recoveryReminder2: recovery.recoveryReminder2,
  recoveryReminder3: recovery.recoveryReminder3,
  recoveryReminder4: recovery.recoveryReminder4,
  recoveryReminder5: recovery.recoveryReminder5,
  recoveryReminder6: recovery.recoveryReminder6,
};

/** Human labels for the admin log and preview, so neither invents its own. */
const LABELS = {
  recoveryReminder1: 'Checkout reminder 1 (30 min)',
  recoveryReminder2: 'Checkout reminder 2 (4 h)',
  recoveryReminder3: 'Checkout reminder 3 (12 h)',
  recoveryReminder4: 'Checkout reminder 4 (24 h)',
  recoveryReminder5: 'Checkout reminder 5 (48 h)',
  recoveryReminder6: 'Checkout reminder 6 (72 h, final)',
  orderConfirmation: 'Order confirmation',
  preorderConfirmation: 'Preorder confirmation',
  shipped: 'Shipped',
  trackingAvailable: 'Tracking available',
  cancellation: 'Order cancelled',
  refundInitiated: 'Refund started',
  refundCompleted: 'Refund issued',
  releaseUpdate: 'Release date update',
  releaseReady: 'Release day: your preorder is here',
  reinstateOffer: 'Release day: keep or refund a cancelled order',
  reinstated: 'Order reinstated',
  accountAccess: 'Sign-in link',
  contactReceived: 'Contact form received (to us)',
  supportReply: 'Reply to a contact message',
};

/**
 * Picks the right confirmation for an order.
 *
 * Kept here rather than at each call site: the pipeline, the admin and
 * any future webhook all need the same answer, and three copies of
 * `isPreorder ? a : b` is three chances to send a customer a delivery
 * estimate for a set that has not been printed.
 */
function confirmationFor(viewModel) {
  return viewModel && viewModel.isPreorder ? 'preorderConfirmation' : 'orderConfirmation';
}

module.exports = Object.assign({}, templates, { LABELS, confirmationFor, keys: Object.keys(templates) });
