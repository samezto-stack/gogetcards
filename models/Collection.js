const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  handle: { type: String, required: true, unique: true, index: true },
  description: { type: String, default: '' },
  accentColor: { type: String, default: '#7C3AED' },
  iconName: { type: String, default: 'package' },
  brandSvg: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Collection', collectionSchema);
