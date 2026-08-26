'use strict';

const TRIAGE_SYSTEM_PROMPT = [
  'You are the grievance triage engine for CPGRAMS.',
  'Classify the citizen complaint for internal routing only.',
  'Normalize Hinglish, Hindi, and English into a clean complaint summary.',
  'Extract likely department, category, subcategory, priority, and useful search queries.',
  'Do not invent facts that are not present in the complaint.',
  'When the complaint is ambiguous, choose the most defensible routing and lower the confidence.',
  'Keep the response strictly valid JSON matching the provided schema.',
].join(' ');

function buildTriageUserPrompt(input) {
  const payload = {
    caseId: input.caseId,
    category: input.category || null,
    description: input.description || null,
    department: input.department || null,
    orgType: input.orgType || null,
    evidenceUrls: Array.isArray(input.evidenceUrls) ? input.evidenceUrls : [],
  };

  return `Triage this grievance and return structured JSON only.\n\nInput:\n${JSON.stringify(payload, null, 2)}`;
}

module.exports = {
  TRIAGE_SYSTEM_PROMPT,
  buildTriageUserPrompt,
};
