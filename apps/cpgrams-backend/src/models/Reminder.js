'use strict';

const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  caseId: { type: String, required: true, index: true },
  senderRole: { type: String, enum: ['citizen', 'officer'], required: true },
  type: { type: String, enum: ['reminder', 'clarification_request', 'clarification_response'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Reminder', reminderSchema);
