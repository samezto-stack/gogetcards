const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  page: { type: String, default: '/' },
  ip: { type: String, default: '' },
  country: { type: String, default: '' },
  countryCode: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  /* No `index: true`. The TTL index below is on { lastSeen: 1 }, the same
     key, and declaring both made Mongoose warn on every boot while asking
     MongoDB for two indexes over one field. Whichever definition is applied
     second is ignored, which put the 5-minute expiry one ordering decision
     away from never running — on a collection written to by every visitor.
     Same defect as models/Event.js. */
  lastSeen: { type: Date, default: Date.now },
});

// Auto-remove stale visitors older than 5 minutes. Also the only index on
// lastSeen, and it serves ordinary range queries on it too.
visitorSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 300 });

module.exports = mongoose.model('Visitor', visitorSchema);
