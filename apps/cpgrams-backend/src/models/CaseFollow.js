'use strict';

const mongoose = require('mongoose');

// Tracks a case that a VOTER (not the original filer) chooses to follow.
// When a citizen votes on another citizen's issue, we mint them their OWN
// tracking password so they can use the public status tracker. The original
// filer's registrationPassword is NEVER shared.
//
// Design note: we store the tracking password (per-voter, recoverable) so a
// voter can be shown it again via /grievance/followed. It only grants read
// access to a pseudonymous case's status — the same exposure as the public
// one-time registration passwords CPGRAMS already issues.
const caseFollowSchema = new mongoose.Schema({
  caseId: { type: String, required: true, index: true },
  voterPairwiseId: { type: String, required: true, index: true },
  trackingPassword: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// One follow per (voter, case) — idempotent re-votes reuse the same entry.
caseFollowSchema.index({ caseId: 1, voterPairwiseId: 1 }, { unique: true });

module.exports = mongoose.model('CaseFollow', caseFollowSchema);