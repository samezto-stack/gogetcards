const mongoose = require('mongoose');

const partnerEmailSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  // 'used' means only "handed out to a checkout attempt" — most never
  // convert (the customer abandons before paying), and 'used' emails ARE
  // still recycled back to 'available' by the admin "release" action (see
  // routes/admin.js). 'converted' is the terminal, PERMANENT state: a real
  // order was confirmed with this email assigned to it. Once converted, an
  // email is never again matched by the pool-claim query (status:
  // 'available') or by the "release used emails" bulk action (status:
  // 'used') — see services/orderPipeline/index.js for where the transition
  // to 'converted' happens. This is what guarantees one pooled email is
  // ever linked to exactly one buyer.
  status: {
    type: String,
    enum: ['available', 'used', 'converted'],
    default: 'available',
    index: true
  },
  assignedAt: {
    type: Date,
    default: null
  },
  usedFor: {
    routeLabel: { type: String, default: null },
    productSlug: { type: String, default: null },
    at: { type: Date, default: null }
  },
  // Set only when status transitions to 'converted' — the confirmed Order
  // this email is permanently linked to.
  convertedOrderId: {
    type: String,
    default: null,
  },
  convertedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('PartnerEmail', partnerEmailSchema);
