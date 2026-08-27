'use strict';

const mongoose = require('mongoose');

/**
 * OfficerMetrics — aggregated accountability metrics per officer (Phase 8).
 * Recomputed from Case + Feedback collections whenever a scorecard is requested.
 * Contains ZERO citizen PII — aggregates only.
 */
const officerMetricsSchema = new mongoose.Schema({
  officerId: { type: String, required: true, unique: true, index: true },
  totalCasesHandled: { type: Number, default: 0 },
  activeCases: { type: Number, default: 0 },
  resolvedCases: { type: Number, default: 0 },
  overdueCases: { type: Number, default: 0 }, // > 14 days without resolution
  averageResolutionDays: { type: Number, default: 0 },
  slaComplianceRate: { type: Number, default: 0 }, // % resolved within 14 days
  citizenSatisfaction: { type: Number, default: 0 }, // avg feedback rating (1-5)
  totalFeedbackCount: { type: Number, default: 0 },
  appealRate: { type: Number, default: 0 }, // % of resolved cases that received an appeal
  performanceTier: {
    type: String,
    enum: ['A+', 'A', 'B', 'C', 'NEEDS_ATTENTION'],
    default: 'C',
  },
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model('OfficerMetrics', officerMetricsSchema);
