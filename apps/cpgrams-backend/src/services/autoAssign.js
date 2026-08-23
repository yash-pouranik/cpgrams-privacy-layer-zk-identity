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
};

/**
 * Auto-assign a case to the least-loaded available officer
 * in the relevant department.
 *
 * Returns the assigned officer or null if none available.
 */
async function autoAssign(category) {
  const normalizedCategory = category.toLowerCase().trim();
  const department = CATEGORY_DEPARTMENT_MAP[normalizedCategory] || null;

  if (!department) {
    console.warn(`[AutoAssign] No department mapping for category: "${category}"`);
    return null;
  }

  // Find the available officer with the lowest case count in this department
  const officer = await Officer.findOne({
    department,
    isAvailable: true,
  }).sort({ currentCaseCount: 1 });

  if (!officer) {
    console.warn(`[AutoAssign] No available officer in department: ${department}`);
    return null;
  }

  // Increment case count
  officer.currentCaseCount += 1;
  await officer.save();

  return officer;
}

function getDepartment(category) {
  const normalizedCategory = category.toLowerCase().trim();
  return CATEGORY_DEPARTMENT_MAP[normalizedCategory] || 'General';
}

module.exports = { autoAssign, getDepartment, CATEGORY_DEPARTMENT_MAP };
