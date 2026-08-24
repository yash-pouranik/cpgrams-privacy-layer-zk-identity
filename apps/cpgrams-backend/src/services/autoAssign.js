'use strict';

const Officer = require('../models/Officer');

// Category → Department mapping
const CATEGORY_DEPARTMENT_MAP = {
  infrastructure: 'PWD',
  roads: 'PWD',
  water: 'PWD',
  electricity: 'PWD',
  health: 'Health',
  hospital: 'Health',
  sanitation: 'Health',
  corruption: 'Police',
  crime: 'Police',
  safety: 'Police',
  education: 'Education',
  school: 'Education',
  scholarship: 'Education',
  revenue: 'Revenue',
  tax: 'Revenue',
  land: 'Revenue',
  transport: 'Transport',
  bus: 'Transport',
  license: 'Transport',
  environment: 'Environment',
  pollution: 'Environment',
  forest: 'Environment',
  social: 'Social',
  pension: 'Social',
  disability: 'Social',
  women: 'WCD',
  child: 'WCD',
  nutrition: 'WCD',
};

function resolveDepartment(category) {
  if (!category) return 'General';
  const norm = category.toLowerCase().trim();
  if (CATEGORY_DEPARTMENT_MAP[norm]) return CATEGORY_DEPARTMENT_MAP[norm];
  for (const [key, dept] of Object.entries(CATEGORY_DEPARTMENT_MAP)) {
    if (norm.includes(key) || key.includes(norm)) return dept;
  }
  return 'General';
}

/**
 * Auto-assign a case to the least-loaded available officer
 * in the relevant department.
 *
 * Returns the assigned officer or null if none available.
 */
async function autoAssign(category) {
  const department = resolveDepartment(category);

  if (!department || department === 'General') {
    console.warn(`[AutoAssign] No specific department mapping for category: "${category}", falling back to General`);
    const generalOfficer = await Officer.findOne({ isAvailable: true }).sort({ currentCaseCount: 1 });
    if (generalOfficer) {
      generalOfficer.currentCaseCount += 1;
      await generalOfficer.save();
      return generalOfficer;
    }
    return null;
  }

  // Find the available officer with the lowest case count in this department
  const officer = await Officer.findOne({
    department: { $regex: new RegExp(`^${department}$`, 'i') },
    isAvailable: true,
  }).sort({ currentCaseCount: 1 });

  if (!officer) {
    console.warn(`[AutoAssign] No available officer in department: ${department}, assigning least loaded available officer`);
    const fallbackOfficer = await Officer.findOne({ isAvailable: true }).sort({ currentCaseCount: 1 });
    if (fallbackOfficer) {
      fallbackOfficer.currentCaseCount += 1;
      await fallbackOfficer.save();
      return fallbackOfficer;
    }
    return null;
  }

  // Increment case count
  officer.currentCaseCount += 1;
  await officer.save();

  return officer;
}

function getDepartment(category) {
  return resolveDepartment(category);
}

module.exports = { autoAssign, getDepartment, CATEGORY_DEPARTMENT_MAP };
