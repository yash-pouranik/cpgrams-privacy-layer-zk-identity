'use strict';

/**
 * AiAgentRun — execution trace for every agent invocation.
 * One document per agent per case run.
 * Used to render the "AI Pipeline Timeline" on the officer case page.
 */

const { Schema, model } = require('mongoose');

const AiAgentRunSchema = new Schema(
  {
    runId: {
      type: String,
      required: true,
      unique: true,
    },
    caseId: {
      type: String,
      required: true,
      index: true,
    },
    agent: {
      type: String,
      enum: ['triage', 'document', 'quality', 'evidence', 'assignment', 'brief'],
      required: true,
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'skipped'],
      default: 'running',
    },

    // What was sent in / returned
    input:  { type: Schema.Types.Mixed, default: null },
    output: { type: Schema.Types.Mixed, default: null },

    // OpenAI metadata
    model:      { type: String, default: null },
    latencyMs:  { type: Number, default: null },
    tokensUsed: {
      prompt:     { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total:      { type: Number, default: 0 },
    },
    cost: { type: Number, default: 0 }, // estimated USD

    // Error detail on failure
    error: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = model('AiAgentRun', AiAgentRunSchema);
