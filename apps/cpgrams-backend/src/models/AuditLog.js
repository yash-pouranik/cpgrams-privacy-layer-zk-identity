'use strict';

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  eventType: { type: String, required: true, index: true },
  actorId: { type: String },
  targetCaseId: { type: String },
  targetPairwiseId: { type: String, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
});

// Append-only: no updates/deletes at application layer
// (enforced by convention — do not add update/delete routes)

module.exports = mongoose.model('AuditLog', auditLogSchema);
