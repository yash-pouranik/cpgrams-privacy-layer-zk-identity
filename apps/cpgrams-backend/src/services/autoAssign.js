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

/**
 * Auto-assign a case to the least-loaded available officer
 * in the relevant department.
 */
async function autoAssign(category, description = '') {
  const department = resolveDepartment(category, description);

  // Find the available officer with the lowest currentCaseCount in this department
  let officer = await Officer.findOne({
    department: { $regex: new RegExp(`^${department}$`, 'i') },
    isAvailable: true,
  }).sort({ currentCaseCount: 1 });

  // Fallback: If no officer in this specific department, pick the least-loaded officer across any department
  if (!officer) {
    officer = await Officer.findOne({ isAvailable: true }).sort({ currentCaseCount: 1 });
  }

  if (officer) {
    officer.currentCaseCount += 1;
    await officer.save();
    return officer;
  }

  return null;
}

function getDepartment(category, description = '') {
  return resolveDepartment(category, description);
}

module.exports = { autoAssign, getDepartment, resolveDepartment, CATEGORY_DEPARTMENT_MAP };
