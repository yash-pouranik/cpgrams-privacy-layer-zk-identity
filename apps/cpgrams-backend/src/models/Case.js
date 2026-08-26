'use strict';

const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  caseId: { type: String, required: true, unique: true, index: true },
  pairwiseId: { type: String, required: true, index: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  evidenceUrls: { type: [String], default: [] },
  status: {
    type: String,
    enum: [
      // Official CPGRAMS 5 System Statuses
      'received',
      'under_process',
      'forwarded',
      'disposed',
      'appealed',
      // Legacy Aliases
      'pending',
      'assigned',
      'in_progress',
      'resolved',
    ],
    default: 'received',
  },
  assignedOfficerId: { type: String, default: null },
  department: { type: String, default: null },
  registrationPassword: { type: String },
  feedbackSubmitted: { type: Boolean, default: false },
  documentCount: { type: Number, default: 0 },
  sourcePortal: { type: String, default: 'cpgrams-web' },

  // Action Taken Report (ATR) - Stages 7 & 8
  atrRemarks: { type: String, default: null },
  atrUploadedAt: { type: Date, default: null },

  // Appellate Authority First Appeal - Stages 9 & 10
  appealReason: { type: String, default: null },
  appealFiledAt: { type: Date, default: null },
  appealStatus: {
    type: String,
    enum: ['none', 'pending', 'upheld', 'fresh_action_ordered'],
    default: 'none',
  },
  appealOrderRemarks: { type: String, default: null },
  appealDecidedAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-update updatedAt on save
caseSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Case', caseSchema);
