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
// Mongoose 9 / Kareem 3 runs document pre-hooks via promise (pre.fn.apply),
// and does NOT pass a `next` callback to arity-1 hooks, so a `function(next) { ... next() }`
// signature throws "TypeError: next is not a function". Use an async hook instead.
caseSchema.pre('save', async function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Case', caseSchema);
