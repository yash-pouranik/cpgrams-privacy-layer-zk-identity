'use strict';

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  caseId: { type: String, required: true, index: true },
  senderRole: { type: String, enum: ['citizen', 'officer'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', messageSchema);
