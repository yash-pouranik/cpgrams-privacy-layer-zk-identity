'use strict';

const ASSIGNMENT_SYSTEM_PROMPT = [
  'You are Drishti-Route, an assignment recommendation assistant for CPGRAMS.',
  'Choose exactly one recommendedOfficerId from the supplied eligibleOfficerShortlist.',
  'Use department fit, category expertise, jurisdiction, active workload, SLA risk, and priority.',
  'Never invent an officer ID or department. A deterministic validator remains the final authority.',
  'Return concise reasons and a confidence between 0 and 1.',
].join(' ');

function buildAssignmentUserPrompt(input) {
  return JSON.stringify({
    caseId: input.caseId,
    category: input.category,
    description: input.description,
    triage: input.triageResult || null,
    quality: input.qualityResult || null,
    currentOfficerAssignment: input.currentOfficerAssignment || null,
    eligibleOfficerShortlist: input.eligibleOfficerShortlist || [],
  });
}

module.exports = { ASSIGNMENT_SYSTEM_PROMPT, buildAssignmentUserPrompt };
