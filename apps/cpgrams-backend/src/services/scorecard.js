'use strict';

const Case = require('../models/Case');
const Feedback = require('../models/Feedback');
const OfficerMetrics = require('../models/OfficerMetrics');

const SLA_DAYS = 14;
const RESOLVED_STATUSES = ['disposed', 'resolved'];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Compute the accountability scorecard for one officer from live
 * Case + Feedback collections, then persist it to OfficerMetrics.
 * Returns a plain JSON object with no PII.
 */
async function computeScorecard(officerId) {
  const cutoff = new Date(Date.now() - SLA_DAYS * DAY_MS);

  const cases = await Case.find({ assignedOfficerId: officerId })
    .select('status createdAt updatedAt appealStatus')
    .lean();

  const totalCasesHandled = cases.length;
  const resolvedCasesList = cases.filter((c) => RESOLVED_STATUSES.includes(c.status));
  const activeCases = totalCasesHandled - resolvedCasesList.length;
  const overdueCases = cases.filter(
    (c) => !RESOLVED_STATUSES.includes(c.status) && c.createdAt < cutoff
  ).length;

  let sumResolutionDays = 0;
  let withinSla = 0;
  for (const c of resolvedCasesList) {
    const days = (new Date(c.updatedAt) - new Date(c.createdAt)) / DAY_MS;
    sumResolutionDays += days;
    if (days <= SLA_DAYS) withinSla += 1;
  }
  const resolvedCases = resolvedCasesList.length;
  const averageResolutionDays = resolvedCases ? +(sumResolutionDays / resolvedCases).toFixed(1) : 0;
  const slaComplianceRate = resolvedCases ? Math.round((withinSla / resolvedCases) * 100) : 0;

  const appealedCount = resolvedCasesList.filter((c) => c.appealStatus && c.appealStatus !== 'none').length;
  const appealRate = resolvedCases ? Math.round((appealedCount / resolvedCases) * 100) : 0;

  const feedbacks = await Feedback.find({
    caseId: { $in: resolvedCasesList.map((c) => c.caseId) },
  })
    .select('rating')
    .lean();

  const totalFeedbackCount = feedbacks.length;
  const citizenSatisfaction = totalFeedbackCount
    ? +(feedbacks.reduce((s, f) => s + f.rating, 0) / totalFeedbackCount).toFixed(1)
    : 0;

  const performanceTier = deriveTier(slaComplianceRate, citizenSatisfaction);

  const metrics = {
    officerId,
    totalCasesHandled,
    activeCases,
    resolvedCases,
    overdueCases,
    averageResolutionDays,
    slaComplianceRate,
    citizenSatisfaction,
    totalFeedbackCount,
    appealRate,
    performanceTier,
    lastUpdated: new Date(),
  };

  // Persist (best-effort — metrics cache, never blocks the response)
  try {
    await OfficerMetrics.findOneAndUpdate(
      { officerId },
      { $set: metrics },
      { upsert: true }
    );
  } catch (err) {
    console.error('OfficerMetrics persistence error:', err.message);
  }

  return metrics;
}

/**
 * Performance tier per the Phase 8 spec:
 *  A+ Exemplary     : SLA ≥ 95% AND satisfaction ≥ 4.5
 *  A On-Track       : SLA ≥ 85% AND satisfaction ≥ 4.0
 *  B Satisfactory   : SLA ≥ 70% AND satisfaction ≥ 3.5
 *  C Needs Improvement : SLA ≥ 50%
 *  Needs Attention  : SLA < 50%
 */
function deriveTier(slaComplianceRate, citizenSatisfaction) {
  if (slaComplianceRate >= 95 && citizenSatisfaction >= 4.5) return 'A+';
  if (slaComplianceRate >= 85 && citizenSatisfaction >= 4.0) return 'A';
  if (slaComplianceRate >= 70 && citizenSatisfaction >= 3.5) return 'B';
  if (slaComplianceRate >= 50) return 'C';
  return 'NEEDS_ATTENTION';
}

module.exports = { computeScorecard, deriveTier, SLA_DAYS };
