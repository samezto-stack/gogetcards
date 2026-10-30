const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  content: { type: String, default: '' }, // HTML content
  /* Search-result snippet for this page. Left empty, the route derives
     one from the content instead of emitting a templated stub — every
     policy page previously shared the same generated sentence, which is
     duplicate-description territory and tells a searcher nothing about
     which page they are looking at. */
  metaDescription: { type: String, default: '', maxlength: 300 },
  category: { type: String, default: 'information', enum: ['legal', 'information'] },
}, { timestamps: true });

module.exports = mongoose.model('Page', pageSchema);
