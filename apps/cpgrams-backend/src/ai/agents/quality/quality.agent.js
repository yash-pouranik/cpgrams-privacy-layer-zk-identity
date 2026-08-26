'use strict';

const { callOpenAI } = require('../../integrations/openai.client');
const { indexComplaint, findSimilar } = require('../../services/similarity.service');
const { qualitySchema } = require('./quality.schema');
const { QUALITY_SYSTEM_PROMPT, buildQualityUserPrompt } = require('./quality.prompt');

function buildMockQualityResponse(input, matches) {
  const description = String(input.description || '').trim();
  const hasLocation = /\b(ward|road|street|near|indore|delhi|mumbai|lucknow)\b/i.test(description);
  const hasTime = /\b(month|months|week|weeks|day|days|since|yesterday|today)\b/i.test(description);
  const qualityScore = Math.min(100, 55 + (hasLocation ? 20 : 0) + (hasTime ? 15 : 0) + (description.length > 100 ? 10 : 0));
  const relatedCases = matches.map((match) => ({
    caseId: match.id,
    similarity: Number(Math.max(0, Math.min(1, match.score)).toFixed(3)),
    relationship: match.score >= 0.85 ? 'DUPLICATE' : match.score >= 0.65 ? 'RELATED' : 'POSSIBLY_RELATED',
    confidence: Number(Math.max(0.5, Math.min(0.99, match.score)).toFixed(3)),
  }));
  return {
    qualityScore,
    isActionable: description.length >= 40,
    missingInformation: [
      ...(hasLocation ? [] : ['Exact location or landmark']),
      ...(hasTime ? [] : ['When the issue started']),
    ],
    duplicateRisk: relatedCases.length ? Math.max(...relatedCases.map((item) => item.similarity)) : 0,
    relatedCases,
  };
}

async function runQualityAgent(input) {
  await indexComplaint(input.caseId, input.description, {
    department: input.triageResult?.classification?.department || null,
    category: input.triageResult?.classification?.category || input.category || null,
    status: 'received',
  });
  const retrievedMatches = await findSimilar(input.description, {
    caseId: { $ne: input.caseId },
    ...(input.triageResult?.classification?.department ? { department: input.triageResult.classification.department } : {}),
    status: { $in: ['received', 'under_process', 'forwarded', 'assigned', 'in_progress'] },
  }, 10);
  return callOpenAI({
    tier: 'fast',
    system: QUALITY_SYSTEM_PROMPT,
    user: buildQualityUserPrompt({ ...input, retrievedMatches }),
    schema: qualitySchema,
    mockResponse: buildMockQualityResponse(input, retrievedMatches),
  });
}

module.exports = { runQualityAgent, buildMockQualityResponse };
