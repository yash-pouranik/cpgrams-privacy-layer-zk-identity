'use strict';

/**
 * AiCaseAnalysis — one document per grievance case.
 * Tracks the full AI pipeline status and all agent outputs.
 *
 * IMPORTANT: hooks are async functions (Mongoose 9 / Kareem 3 — no next() callback).
 */

const { Schema, model } = require('mongoose');

const AiCaseAnalysisSchema = new Schema(
  {
    caseId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Pipeline lifecycle status
    status: {
      type: String,
      enum: [
        'queued',
        'processing',
        'triaging',
        'analyzing_documents',
        'checking_similar_cases',
        'enriching_evidence',
        'assigning',
        'completed',
        'partial',   // some agents failed but result still useful
        'failed',
      ],
      default: 'queued',
    },

    // Agent outputs — stored as Mixed so each agent can write its own schema
    triage:           { type: Schema.Types.Mixed, default: null }, // Agent 1
    documentAnalysis: { type: [Schema.Types.Mixed], default: [] }, // Agent 2 (array, one per doc)
    quality:          { type: Schema.Types.Mixed, default: null }, // Agent 3
    evidenceSummary:  { type: Schema.Types.Mixed, default: null }, // Agent 5
    assignment:       { type: Schema.Types.Mixed, default: null }, // Agent 4

    // Final synthesised brief shown to officer
    caseBrief: { type: String, default: null },

    // Timing
    startedAt:   { type: Date, default: null },
    completedAt: { type: Date, default: null },

    // Error tracking
    error:      { type: String, default: null },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Convenience virtual: pipeline duration in seconds
AiCaseAnalysisSchema.virtual('durationSeconds').get(function () {
  if (this.startedAt && this.completedAt) {
    return Math.round((this.completedAt - this.startedAt) / 1000);
  }
  return null;
});

module.exports = model('AiCaseAnalysis', AiCaseAnalysisSchema);
