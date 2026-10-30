const mongoose = require('mongoose');

const siteConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
});

// Helper to get a config value with a default
siteConfigSchema.statics.getValue = async function(key, defaultValue) {
  const doc = await this.findOne({ key });
  return doc ? doc.value : defaultValue;
};

// Helper to set a config value
siteConfigSchema.statics.setValue = async function(key, value) {
  return this.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
};

module.exports = mongoose.model('SiteConfig', siteConfigSchema);
