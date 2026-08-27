'use strict';

const { callOpenAI } = require('../integrations/openai.client');

const briefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['caseBrief'],
  properties: {
    caseBrief: { type: 'string' },
  },
};

function percent(value) {
  const numeric = Number(value || 0);
  return `${Math.round(Math.max(0, Math.min(1, numeric)) * 100)}%`;
}

function buildDeterministicBrief({ caseId, caseData = {}, results = {} }) {
  const triage = results.triage || {};
  const quality = results.quality || {};
  const evidence = results.evidenceSummary || {};
  const assignment = results.assignment || {};
  const docs = Array.isArray(results.documentAnalysis) ? results.documentAnalysis : [];
  const priority = triage.priority || {};
  const classification = triage.classification || {};
  const assignmentStatus = assignment.assignmentApplied
    ? `applied to ${assignment.appliedOfficerId || assignment.recommendedOfficerId}`
    : assignment.appliedOfficerId
      ? `recommendation recorded; existing assignment ${assignment.appliedOfficerId} protected`
      : 'recommendation recorded for manual follow-up';

  return [
    `Case Intelligence Brief: ${caseId}`,
    '',
    `Summary: ${triage.normalizedComplaint || caseData.description || 'No normalized complaint available.'}`,
    `Department/category: ${classification.department || caseData.department || 'General Administration'} / ${classification.category || caseData.category || 'General grievance'}.`,
    `Priority: ${priority.level || 'REVIEW'}${typeof priority.score === 'number' ? ` (${priority.score}/100)` : ''}.`,
    `Quality: ${typeof quality.qualityScore === 'number' ? Math.round(quality.qualityScore <= 1 ? quality.qualityScore * 100 : quality.qualityScore) : 'not scored'}/100; ${quality.isActionable === false ? 'needs more detail' : 'actionable'}.`,
    `Evidence: ${evidence.status || 'NOT_RUN'} with ${Number(evidence.resultCount || 0)} source(s), corroboration ${evidence.corroborationSignal || 'NONE'}.`,
    `Documents: ${docs.length} analyzed attachment(s).`,
    `Assignment: Drishti-Route recommended ${assignment.recommendedOfficerId || 'manual allocation'} in ${assignment.recommendedDepartment || 'General Administration'}, ${assignmentStatus}. Confidence ${percent(assignment.confidence)}; SLA risk ${percent(assignment.slaRisk)}.`,
    'Officer next actions: verify public sources, inspect uploaded documents, request clarification if required, and record the official action taken report before disposal.',
  ].join('\n');
}

async function generateBrief({ caseId, caseData, results }) {
  const draft = buildDeterministicBrief({ caseId, caseData, results });
  const modelResult = await callOpenAI({
    tier: 'fast',
    system: 'You write concise CPGRAMS officer case intelligence briefs. Preserve factual uncertainty, do not infer citizen identity, and do not claim legal truth from public web sources.',
    user: JSON.stringify({ caseId, caseData, results, draft }),
    schema: briefSchema,
    mockResponse: { caseBrief: draft },
  });

  return modelResult.output?.caseBrief || draft;
}

module.exports = { generateBrief, buildDeterministicBrief };
