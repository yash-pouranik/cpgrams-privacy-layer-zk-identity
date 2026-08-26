'use strict';

const { callOpenAI } = require('../../integrations/openai.client');
const { triageSchema } = require('./triage.schema');
const { TRIAGE_SYSTEM_PROMPT, buildTriageUserPrompt } = require('./triage.prompt');
const { resolveDepartment } = require('../../../services/autoAssign');

const ISSUE_PATTERNS = [
  { keywords: ['road', 'pothole', 'bridge', 'flyover', 'highway', 'drainage', 'waterlogging'], category: 'Road Maintenance', subcategory: 'Road Damage / Pothole', department: 'PWD', priority: 'HIGH', score: 87, reasons: ['Public safety risk', 'Infrastructure service disruption'] },
  { keywords: ['water', 'pipeline', 'leak', 'overflow', 'sewage', 'sewer', 'drain'], category: 'Water Supply & Sanitation', subcategory: 'Water Leakage / Supply Disruption', department: 'PWD', priority: 'HIGH', score: 84, reasons: ['Essential service disruption', 'Health or hygiene impact'] },
  { keywords: ['electricity', 'power', 'transformer', 'outage', 'blackout', 'meter'], category: 'Electricity Supply', subcategory: 'Power Failure / Transformer Issue', department: 'PWD', priority: 'HIGH', score: 82, reasons: ['Essential utility interruption', 'Potential public inconvenience'] },
  { keywords: ['hospital', 'clinic', 'doctor', 'medicine', 'ambulance', 'sanitation', 'hygiene'], category: 'Public Health', subcategory: 'Health Service Complaint', department: 'Health', priority: 'MEDIUM', score: 73, reasons: ['Service access issue', 'Citizen welfare impact'] },
  { keywords: ['police', 'crime', 'theft', 'traffic', 'harassment', 'fir', 'bribery'], category: 'Law & Order', subcategory: 'Police / Safety Complaint', department: 'Police', priority: 'HIGH', score: 88, reasons: ['Safety concern', 'Time-sensitive public complaint'] },
  { keywords: ['school', 'college', 'teacher', 'scholarship', 'student'], category: 'Education', subcategory: 'Education Service Complaint', department: 'Education', priority: 'MEDIUM', score: 68, reasons: ['Public service delay', 'Student impact'] },
  { keywords: ['land', 'property', 'revenue', 'encroachment', 'registry', 'tax', 'gst'], category: 'Revenue / Land Records', subcategory: 'Land or Property Record Issue', department: 'Revenue', priority: 'MEDIUM', score: 70, reasons: ['Administrative record issue', 'Potential legal follow-up'] },
  { keywords: ['bus', 'metro', 'railway', 'vehicle', 'license', 'licence', 'transport'], category: 'Transport', subcategory: 'Transport / Licensing Issue', department: 'Transport', priority: 'MEDIUM', score: 66, reasons: ['Mobility or licensing impact'] },
  { keywords: ['pollution', 'garbage', 'tree', 'forest', 'smog', 'environment'], category: 'Environment', subcategory: 'Environmental Complaint', department: 'Environment', priority: 'MEDIUM', score: 69, reasons: ['Environmental nuisance or hazard'] },
  { keywords: ['women', 'child', 'anganwadi', 'nutrition', 'pension', 'disability', 'welfare'], category: 'Social Welfare', subcategory: 'Welfare Service Complaint', department: 'Social', priority: 'MEDIUM', score: 67, reasons: ['Citizen welfare service issue'] },
];

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function detectLanguage(text) {
  if (!text) {
    return 'unknown';
  }

  if (/[\u0900-\u097f]/.test(text)) {
    return 'hi';
  }

  const lower = text.toLowerCase();
  const hiMarkers = ['nahi', 'nahin', 'kripya', 'samasya', 'road', 'sadak', 'pani', 'bijli', 'pothole'];
  if (hiMarkers.some((word) => lower.includes(word))) {
    return 'hi-en';
  }

  return 'en';
}

function detectIssueProfile(category, description) {
  const text = `${category || ''} ${description || ''}`.toLowerCase();
  return ISSUE_PATTERNS.find((profile) => profile.keywords.some((keyword) => text.includes(keyword)));
}

function extractWard(text) {
  const match = String(text || '').match(/\bward\s*[-:]?\s*(\d+[a-z]?)/i);
  return match ? match[1] : null;
}

function extractDateHints(text) {
  const dates = [];
  const isoMatches = String(text || '').match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
  dates.push(...isoMatches);
  const slashMatches = String(text || '').match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g) || [];
  dates.push(...slashMatches);
  return [...new Set(dates)];
}

function extractSearchTerms(input, profile, ward) {
  const raw = normalizeText(input.description || input.category || '');
  const tokens = raw
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 3)
    .slice(0, 6);

  const locationPart = [ward ? `Ward ${ward}` : null, input.orgType ? String(input.orgType).toUpperCase() : null]
    .filter(Boolean)
    .join(' ');

  const base = normalizeText([
    input.category,
    profile?.category,
    tokens.slice(0, 3).join(' '),
    locationPart,
  ].filter(Boolean).join(' '));

  const queries = new Set();
  if (base) {
    queries.add(base);
  }
  if (tokens.length >= 2) {
    queries.add(tokens.slice(0, 2).join(' '));
  }
  if (tokens.length >= 3) {
    queries.add(tokens.slice(0, 3).join(' '));
  }
  if (profile?.keywords?.length) {
    queries.add(`${profile.keywords[0]} complaint`);
  }
  if (ward) {
    queries.add(`Ward ${ward} grievance`);
  }
  queries.add(`${normalizeText(input.category || 'public grievance')} official record`);

  while (queries.size < 4) {
    queries.add(`${normalizeText(input.category || 'citizen grievance')} complaint`);
    queries.add(`${normalizeText(input.category || 'public complaint')} update`);
    queries.add('government grievance complaint');
  }

  return [...queries].filter(Boolean).slice(0, 6);
}

function buildMockTriageResponse(input) {
  const description = normalizeText(input.description);
  const profile = detectIssueProfile(input.category, description);
  const normalizedComplaint = normalizeText(
    description.replace(/\s+/g, ' ')
  );
  const ward = extractWard(description);
  const dates = extractDateHints(description);
  const resolvedDepartment = profile?.department || resolveDepartment(input.category, description);
  const confidence = profile ? 0.9 : 0.68;
  const priorityLevel = profile?.priority || (description.length > 250 ? 'HIGH' : 'MEDIUM');
  const priorityScore = profile?.score || (priorityLevel === 'HIGH' ? 78 : 62);

  return {
    normalizedComplaint,
    language: detectLanguage(description),
    classification: {
      department: resolvedDepartment,
      category: profile?.category || normalizeText(input.category || 'General Grievance'),
      subcategory: profile?.subcategory || 'General Complaint',
      confidence,
    },
    priority: {
      level: priorityLevel,
      score: priorityScore,
      reasons: profile?.reasons || ['Complaint requires human review', 'Insufficient structured evidence'],
    },
    entities: {
      location: {
        city: null,
        state: null,
        ward,
        landmark: null,
      },
      organizations: [],
      contractors: [],
      projects: [],
      dates,
    },
    searchQueries: extractSearchTerms(input, profile, ward),
  };
}

/**
 * Agent 1 — Triage & Routing
 */
async function runTriageAgent(input) {
  const mockResponse = buildMockTriageResponse(input);
  const user = buildTriageUserPrompt(input);

  const result = await callOpenAI({
    tier: 'fast',
    system: TRIAGE_SYSTEM_PROMPT,
    user,
    schema: triageSchema,
    mockResponse,
  });
  return { ...result, output: normalizeTriageResult(result.output) };
}

function normalizeTriageResult(output) {
  if (!output || typeof output !== 'object') return output;
  const normalized = { ...output, priority: output.priority ? { ...output.priority } : output.priority };
  if (typeof normalized.priority?.score === 'number' && normalized.priority.score >= 0 && normalized.priority.score <= 1) {
    normalized.priority.score = Math.round(normalized.priority.score * 100);
  }
  return normalized;
}

module.exports = {
  runTriageAgent,
  buildMockTriageResponse,
  detectLanguage,
  extractWard,
  normalizeTriageResult,
};
