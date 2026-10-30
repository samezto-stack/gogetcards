const mongoose = require('mongoose');

/**
 * A message sent through the contact form.
 *
 * WHY THIS EXISTS: the Contact page advertised support but offered no way
 * to actually contact anyone — three read-only cards showing an email
 * address, a Discord invite and an Instagram handle, two of which pointed
 * at accounts config/company.js records as unset. Google Merchant Center
 * expects a shopper to be able to reach the seller before buying, and a
 * reviewer checks by trying. A contact form is the contact method that
 * cannot bounce, so it is the one worth having.
 *
 * Stored rather than emailed onward: an SMTP failure would silently drop a
 * customer's message, and there is no mail transport configured here. The
 * record is the durable copy; notification is a separate concern layered
 * on top.
 */
const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },

  /* Which support queue this belongs to. Kept as an enum so the admin can
     filter, and so the form cannot be used to inject arbitrary labels. */
  topic: {
    type: String,
    default: 'general',
    enum: ['general', 'order', 'shipping', 'returns', 'preorder', 'wholesale'],
  },

  // Optional: lets a customer reference an existing order without waiting
  // for a reply asking which one they mean.
  orderNumber: { type: String, default: '', trim: true, maxlength: 60 },

  message: { type: String, required: true, trim: true, maxlength: 5000 },

  /* Handling state, so a message cannot be quietly lost between reading it
     and answering it. */
  status: {
    type: String,
    default: 'new',
    enum: ['new', 'read', 'answered'],
    index: true,
  },

  /* What we actually sent back, kept with the message rather than only in
     the customer's mailbox.

     Two reasons it is an array and not a single field. A conversation can
     take more than one round, and the second answer usually depends on the
     first — an operator who cannot see what was already said will either
     repeat it or contradict it. And "answered" as a bare status says a
     reply happened without saying what was promised, which is exactly what
     matters when the customer writes back about it a week later.

     emailLogId joins to the EmailLog row, so delivery (sent, bounced,
     retried) is visible from the message rather than only from /admin/email. */
  replies: [{
    body: { type: String, required: true, maxlength: 5000 },
    sentAt: { type: Date, default: Date.now },
    emailLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailLog', default: null },
  }],

  // Kept for abuse investigation only, never displayed to customers.
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

contactMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
