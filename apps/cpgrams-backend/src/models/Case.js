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
    enum: ['pending', 'assigned', 'in_progress', 'resolved'],
    default: 'pending',
  },
  assignedOfficerId: { type: String, default: null },
  department: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-update updatedAt on save
caseSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Case', caseSchema);
