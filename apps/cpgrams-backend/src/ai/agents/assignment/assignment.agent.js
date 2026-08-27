'use strict';

const { callOpenAI } = require('../../integrations/openai.client');
const { buildAssignmentCandidates, resolveDepartment, validateAssignmentRecommendation } = require('../../../services/autoAssign');
const { assignmentSchema } = require('./assignment.schema');
const { ASSIGNMENT_SYSTEM_PROMPT, buildAssignmentUserPrompt } = require('./assignment.prompt');

function extractLocationLabel(triageResult) {
  const location = triageResult?.entities?.location || {};
  return [
    location.city,
    location.district,
    location.state,
    location.ward ? `ward ${location.ward}` : null,
    location.landmark,
  ].filter(Boolean).join(' ');
}

function buildAssignmentContext(input = {}) {
  const triageDepartment = String(input.triageResult?.classification?.department || '').trim();
  const department = triageDepartment || resolveDepartment(
    input.category || input.triageResult?.classification?.category || '',
    input.description || input.triageResult?.normalizedComplaint || ''
  );

  return {
    department,
    category: input.triageResult?.classification?.category || input.category || '',
    location: extractLocationLabel(input.triageResult),
    priorityScore: input.triageResult?.priority?.score || 0,
  };
}

function buildMockRecommendation(shortlist, department) {
  const selected = shortlist[0] || null;
  if (!selected) {
    return {
      recommendedDepartment: department,
      recommendedOfficerId: null,
      reason: ['No available officer candidate was found for this department.'],
      confidence: 0,
    };
  }

  const factors = selected.matchingFactors || {};
  const reason = [
    factors.departmentMatch ? 'Department matches the triage recommendation.' : null,
    factors.expertiseMatch ? 'Officer expertise matches the grievance category.' : null,
    factors.jurisdictionMatch ? 'Officer jurisdiction matches the extracted location.' : null,
    `Workload is ${selected.currentCaseCount} active case(s) with ${Math.round((selected.slaRisk || 0) * 100)}% SLA risk.`,
  ].filter(Boolean);

  return {
    recommendedDepartment: selected.resolvedDepartment || department,
    recommendedOfficerId: selected.officerId,
    reason,
    confidence: 0.91,
  };
}

async function runAssignmentAgent(input) {
  const assignmentContext = buildAssignmentContext(input);
  const shortlist = await buildAssignmentCandidates(assignmentContext, { limit: 5 });

  const modelResult = await callOpenAI({
    tier: 'fast',
    system: ASSIGNMENT_SYSTEM_PROMPT,
    user: buildAssignmentUserPrompt({ ...input, eligibleOfficerShortlist: shortlist }),
    schema: assignmentSchema,
    mockResponse: buildMockRecommendation(shortlist, assignmentContext.department),
  });
  const validated = validateAssignmentRecommendation(modelResult.output, shortlist, {
    department: assignmentContext.department,
    currentOfficerAssignment: input.currentOfficerAssignment,
  });

  return {
    ...modelResult,
    output: {
      ...validated,
      assignmentContext,
      selectionMethod: 'bounded-ai-shortlist',
    },
  };
}

module.exports = { runAssignmentAgent, buildAssignmentContext };
