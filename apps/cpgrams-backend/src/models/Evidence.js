'use strict';

/**
 * Evidence — discovered evidence artifacts for a case.
 * Populated by Agent 5 (Evidence Enrichment Engine via Tavily).
 */

const { Schema, model } = require('mongoose');

const EvidenceSchema = new Schema(
  {
    evidenceId: {
      type: String,
      required: true,
      unique: true,
    },
    caseId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['WEB_SOURCE', 'RELATED_CASE', 'DOCUMENT_FINDING', 'CORROBORATION'],
      default: 'WEB_SOURCE',
    },

    // Source details
    title:       { type: String, default: null },
    url:         { type: String, default: null },
    domain:      { type: String, default: null },
    sourceType:  {
      type: String,
      enum: ['GOVERNMENT', 'NEWS', 'ACADEMIC', 'NGO', 'GENERAL'],
      default: 'GENERAL',
    },
    publishedAt: { type: Date, default: null },
    excerpt:     { type: String, default: null },

    // Scores (all 0–1)
    relevanceScore:    { type: Number, default: 0 },
    sourceCredibility: { type: Number, default: 0 },
    evidenceConfidence:{ type: Number, default: 0 },

    // Human-readable reasons this evidence is relevant
    supports: { type: [String], default: [] },

    // Which agent/query discovered this
    discoveredBy: { type: String, default: 'agent5' },

    // SHA-256 of retrieved content snapshot for audit integrity
    snapshotHash: { type: String, default: null },
    retrievedAt:  { type: Date, default: null },

    // Officer review status
    status: {
      type: String,
      enum: ['REVIEW_PENDING', 'ACCEPTED', 'REJECTED'],
      default: 'REVIEW_PENDING',
    },
  },
  { timestamps: true }
);

module.exports = model('Evidence', EvidenceSchema);
