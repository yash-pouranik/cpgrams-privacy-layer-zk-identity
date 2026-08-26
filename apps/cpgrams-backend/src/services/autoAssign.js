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
};
