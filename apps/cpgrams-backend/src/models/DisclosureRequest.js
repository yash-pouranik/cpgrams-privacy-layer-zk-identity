'use strict';

const mongoose = require('mongoose');

const disclosureRequestSchema = new mongoose.Schema({
  caseId: { type: String, required: true },
  pairwiseId: { type: String, required: true },
  requestingOfficerId: { type: String, required: true },
  justification: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  courtOrderRef: { type: String, default: null },
  approvedBy: { type: String, default: null },
  revealedEmail: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  decidedAt: { type: Date, default: null },
});

module.exports = mongoose.model('DisclosureRequest', disclosureRequestSchema);
