const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  sender: {
    type: String, // 'user' or 'admin'
    required: true,
    enum: ['user', 'admin'],
  },
  message: {
    type: String,
    required: true,
  },
  readByAdmin: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
