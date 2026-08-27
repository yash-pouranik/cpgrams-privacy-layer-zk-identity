'use strict';

const Officer = require('../models/Officer');

// Comprehensive Keyword & Semantic Category → Department Mapping
const CATEGORY_DEPARTMENT_MAP = {
  // Public Works Department (PWD / Urban Infrastructure)
  infrastructure: 'PWD',
  roads: 'PWD',
  road: 'PWD',
  highway: 'PWD',
  pothole: 'PWD',
  bridge: 'PWD',
  flyover: 'PWD',
  water: 'PWD',
  pipeline: 'PWD',
  electricity: 'PWD',
  power: 'PWD',
  transformer: 'PWD',
  building: 'PWD',
  drainage: 'PWD',
  waterlogging: 'PWD',

  // Health & Family Welfare
  health: 'Health',
  hospital: 'Health',
  clinic: 'Health',
  doctor: 'Health',
  sanitation: 'Health',
  medicine: 'Health',
  drug: 'Health',
  ambulance: 'Health',
  medical: 'Health',
  hygiene: 'Health',

  // Police & Law Enforcement
  police: 'Police',
  crime: 'Police',
  theft: 'Police',
  corruption: 'Police',
  bribery: 'Police',
  safety: 'Police',
  traffic: 'Police',
  harassment: 'Police',
  investigation: 'Police',
  fir: 'Police',

  // School Education & Literacy
  education: 'Education',
  school: 'Education',
  college: 'Education',
  teacher: 'Education',
  scholarship: 'Education',
  student: 'Education',
  exam: 'Education',
  syllabus: 'Education',

  // Revenue & Taxation
  revenue: 'Revenue',
  tax: 'Revenue',
  gst: 'Revenue',
  income: 'Revenue',
  land: 'Revenue',
  property: 'Revenue',
  registry: 'Revenue',
  encroachment: 'Revenue',

  // Transport & Highways
  transport: 'Transport',
  bus: 'Transport',
  metro: 'Transport',
  railway: 'Transport',
  license: 'Transport',
  licence: 'Transport',
  rc: 'Transport',
  vehicle: 'Transport',

  // Environment, Forest & Climate
  environment: 'Environment',
  pollution: 'Environment',
  forest: 'Environment',
  tree: 'Environment',
  air: 'Environment',
  smog: 'Environment',
  wildlife: 'Environment',

  // Social Justice & Empowerment
  social: 'Social',
  pension: 'Social',
  disability: 'Social',
  welfare: 'Social',
  oldage: 'Social',

  // Women & Child Development
  women: 'WCD',
  woman: 'WCD',
  child: 'WCD',
  anganwadi: 'WCD',
  nutrition: 'WCD',
  icds: 'WCD',
};

/**
 * Resolves the appropriate department using Category and Description semantic keywords
 */
function resolveDepartment(category, description = '') {
  const normCategory = (category || '').toLowerCase().trim();
  const normDesc = (description || '').toLowerCase();
  const combinedText = `${normCategory} ${normDesc}`;

  // 1. Direct Category Match
  if (CATEGORY_DEPARTMENT_MAP[normCategory]) {
    return CATEGORY_DEPARTMENT_MAP[normCategory];
  }

  // 2. Exact word search in combined category + description
  for (const [keyword, dept] of Object.entries(CATEGORY_DEPARTMENT_MAP)) {
    if (normCategory.includes(keyword)) {
      return dept;
    }
  }

  // 3. Scan description for high-confidence keywords
  for (const [keyword, dept] of Object.entries(CATEGORY_DEPARTMENT_MAP)) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(normDesc)) {
      return dept;
    }
  }

  return 'General Administration';
}

async function selectOfficerByDepartment(department, { reserve = true } = {}) {
  // Find the available officer with the lowest currentCaseCount in this department
  let officer = await Officer.findOne({
    department: { $regex: new RegExp(`^${department}$`, 'i') },
    isAvailable: true,
  }).sort({ currentCaseCount: 1 });

  // Fallback: If no officer in this specific department, pick the least-loaded officer across any department
  if (!officer) {
    officer = await Officer.findOne({ isAvailable: true }).sort({ currentCaseCount: 1 });
  }

  if (officer && reserve) {
    officer.currentCaseCount += 1;
    await officer.save();
  }

  return officer;
}

function scoreOfficer(officer, { department, category = '', location = '', priorityScore = 0 } = {}) {
  const wanted = String(category).toLowerCase();
  const place = String(location).toLowerCase();
  const expertise = (officer.expertise || []).map((value) => String(value).toLowerCase());
  const jurisdictions = (officer.jurisdictions || []).map((value) => String(value).toLowerCase());
  const departmentMatch = String(officer.department).toLowerCase() === String(department).toLowerCase();
  const expertiseMatch = Boolean(wanted) && expertise.some((value) => wanted.includes(value) || value.includes(wanted));
  const jurisdictionMatch = Boolean(place) && jurisdictions.some((value) => place.includes(value) || value.includes(place));
  const workloadScore = Math.max(0, 30 - Math.min(30, Number(officer.currentCaseCount || 0) * 3));
  const slaRisk = Math.max(0, Math.min(1, (Number(officer.averageResolutionDays || 14) - 14) / 14));
  const slaScore = Math.max(0, 10 - (slaRisk * 10));
  const urgencyBonus = Number(priorityScore) >= 80 && Number(officer.level) >= 2 ? 5 : 0;
  return (departmentMatch ? 50 : 0) + (expertiseMatch ? 20 : 0) + (jurisdictionMatch ? 15 : 0) + workloadScore + slaScore + urgencyBonus;
}

function describeOfficerMatch(officer, context = {}) {
  const wanted = String(context.category || '').toLowerCase();
  const place = String(context.location || '').toLowerCase();
  const expertise = (officer.expertise || []).map((value) => String(value).toLowerCase());
  const jurisdictions = (officer.jurisdictions || []).map((value) => String(value).toLowerCase());
  const departmentMatch = String(officer.department || '').toLowerCase() === String(context.department || '').toLowerCase();
  const expertiseMatch = Boolean(wanted) && expertise.some((value) => wanted.includes(value) || value.includes(wanted));
  const jurisdictionMatch = Boolean(place) && jurisdictions.some((value) => place.includes(value) || value.includes(place));
  const workloadScore = Math.max(0, 30 - Math.min(30, Number(officer.currentCaseCount || 0) * 3));

  return {
    departmentMatch,
    expertiseMatch,
    jurisdictionMatch,
    workloadScore: Math.round(workloadScore),
    prioritySupport: Number(context.priorityScore || 0) >= 80 && Number(officer.level || 0) >= 2,
  };
}

function officerSlaRisk(officer) {
  return Math.max(0, Math.min(1, (Number(officer?.averageResolutionDays || 14) - 14) / 14));
}

function normalizeOfficerCandidate(officer, score, context = {}) {
  if (!officer) return null;
  return {
    officerId: officer.officerId,
    name: officer.name,
    department: officer.department,
    level: officer.level,
    currentCaseCount: Number(officer.currentCaseCount || 0),
    expertise: Array.isArray(officer.expertise) ? officer.expertise : [],
    jurisdictions: Array.isArray(officer.jurisdictions) ? officer.jurisdictions : [],
    averageResolutionDays: Number(officer.averageResolutionDays || 14),
    assignmentScore: Math.round(Number(score || 0)),
    slaRisk: officerSlaRisk(officer),
    resolvedDepartment: context.department || officer.department || 'General Administration',
    matchingFactors: describeOfficerMatch(officer, context),
  };
}

function rankOfficerCandidates(officers = [], context = {}) {
  return officers
    .map((officer) => ({ officer, score: scoreOfficer(officer, context) }))
    .sort((a, b) => b.score - a.score || Number(a.officer.currentCaseCount || 0) - Number(b.officer.currentCaseCount || 0))
    .map(({ officer, score }) => normalizeOfficerCandidate(officer, score, context));
}

async function buildAssignmentCandidates(context = {}, { limit = 5 } = {}) {
  const targetDepartment = context.department || 'General Administration';
  const queryAvailable = (filter) => Officer.find(filter).select('-passwordHash').lean();
  let officers = await queryAvailable({
    isAvailable: true,
    department: { $regex: new RegExp(`^${targetDepartment}$`, 'i') },
  });

  if (!officers.length) {
    officers = await queryAvailable({ isAvailable: true });
  }

  return rankOfficerCandidates(officers, context).slice(0, limit);
}

async function selectOfficerIntelligently(context = {}, { reserve = false } = {}) {
  const ranked = await buildAssignmentCandidates(context, { limit: 1 });
  if (!ranked.length) return null;
  const selected = ranked[0];
  if (reserve) await Officer.updateOne({ officerId: selected.officerId }, { $inc: { currentCaseCount: 1 } });
  return { ...selected, usedAiRecommendation: false };
}

function validateAssignmentRecommendation(recommendation, candidatesOrCandidate, context = {}) {
  const candidates = Array.isArray(candidatesOrCandidate)
    ? candidatesOrCandidate
    : (candidatesOrCandidate ? [candidatesOrCandidate] : []);
  const expectedDepartment = String(context.department || candidates[0]?.resolvedDepartment || 'General Administration');
  const requestedOfficerId = recommendation?.recommendedOfficerId || null;
  const requestedDepartment = String(recommendation?.recommendedDepartment || expectedDepartment);
  const requestedCandidate = candidates.find((candidate) => candidate.officerId === requestedOfficerId);
  const departmentValid = requestedDepartment.toLowerCase() === expectedDepartment.toLowerCase();
  const hasExistingAssignment = Boolean(context.currentOfficerAssignment);
  const currentOfficerKnown = hasExistingAssignment
    ? candidates.find((candidate) => candidate.officerId === context.currentOfficerAssignment)
    : null;
  const aiAccepted = Boolean(requestedCandidate && departmentValid);
  const selected = currentOfficerKnown || (aiAccepted ? requestedCandidate : candidates[0]) || null;
  const source = hasExistingAssignment
    ? 'PROTECTED_EXISTING_ASSIGNMENT'
    : aiAccepted
      ? 'AI_RECOMMENDATION'
      : 'DETERMINISTIC_FALLBACK';
  const modelReasons = Array.isArray(recommendation?.reason) && recommendation.reason.length
    ? recommendation.reason.slice(0, 4)
    : ['Ranked officer from eligible shortlist.'];
  const protectionReason = hasExistingAssignment && !currentOfficerKnown
    ? [`Existing case assignment ${context.currentOfficerAssignment} is protected; AI recommendation is not applied automatically.`]
    : [];

  return {
    ...selected,
    recommendedDepartment: expectedDepartment,
    recommendedOfficerId: aiAccepted ? requestedCandidate.officerId : selected?.officerId || null,
    appliedOfficerId: hasExistingAssignment ? context.currentOfficerAssignment : selected?.officerId || null,
    reason: [...modelReasons, ...protectionReason],
    confidence: aiAccepted ? Math.max(0, Math.min(1, Number(recommendation?.confidence || 0))) : 0,
    currentOfficerValid: Boolean(currentOfficerKnown || (hasExistingAssignment && requestedOfficerId === context.currentOfficerAssignment)),
    aiRecommendationAccepted: aiAccepted,
    usedAiRecommendation: aiAccepted,
    assignmentApplied: Boolean(!hasExistingAssignment && selected?.officerId),
    recommendationSource: source,
    candidateCount: candidates.length,
    candidateShortlist: candidates,
    modelRecommendedOfficerId: requestedOfficerId,
    modelRecommendedDepartment: requestedDepartment,
    validator: 'deterministic-officer-policy-v1',
  };
}

/**
 * Auto-assign a case to the least-loaded available officer
 * in the relevant department.
 */
async function autoAssign(category, description = '') {
  const department = resolveDepartment(category, description);
  return selectOfficerByDepartment(department);
}

/**
 * Auto-assign using AI triage when confidence is high, otherwise fall back
 * to deterministic keyword routing.
 */
async function autoAssignWithAI(triageResult, fallbackContext = {}, options = {}) {
  const confidence = Number(triageResult?.classification?.confidence || 0);
  const aiDepartment = String(triageResult?.classification?.department || '').trim();
  const fallbackDepartment = resolveDepartment(
    fallbackContext.category || triageResult?.category || '',
    fallbackContext.description || triageResult?.description || triageResult?.normalizedComplaint || ''
  );

  const useAiDepartment = confidence >= 0.8 && Boolean(aiDepartment);
  const resolvedDepartment = useAiDepartment ? aiDepartment : fallbackDepartment;
  const officer = await selectOfficerByDepartment(resolvedDepartment, options);

  if (!officer) {
    return null;
  }

  return {
    ...officer.toObject(),
    resolvedDepartment,
    usedAiRecommendation: useAiDepartment,
    aiConfidence: confidence,
  };
}

function getDepartment(category, description = '') {
  return resolveDepartment(category, description);
}

module.exports = {
  autoAssign,
  autoAssignWithAI,
  getDepartment,
  resolveDepartment,
  CATEGORY_DEPARTMENT_MAP,
  scoreOfficer,
  rankOfficerCandidates,
  buildAssignmentCandidates,
  selectOfficerIntelligently,
  validateAssignmentRecommendation,
};
