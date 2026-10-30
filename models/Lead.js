const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true 
  },
  source: { 
    type: String, 
    required: true,
    default: 'newsletter',
    enum: ['newsletter', 'cart_abandonment'] 
  }
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
