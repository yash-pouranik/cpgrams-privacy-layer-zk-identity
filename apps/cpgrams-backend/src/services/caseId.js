'use strict';

const crypto = require('crypto');
const { nanoid } = require('nanoid');
const Case = require('../models/Case');

/**
 * Generate a non-deterministic Case ID.
 * Same citizen filing multiple complaints gets DIFFERENT case IDs
 * (officer cannot link them).
 *
 * Format: CPG-XXXXXX  (6 uppercase hex chars)
 */
async function generateCaseId(pairwiseId) {
  for (let i = 0; i < 5; i++) {
    const nonce = nanoid();
    const hash = crypto
      .createHash('sha256')
      .update(pairwiseId + nonce)
      .digest('hex');
    const caseId = 'CPG-' + hash.slice(0, 6).toUpperCase();
    const existing = await Case.findOne({ caseId });
    if (!existing) {
      return caseId;
    }
  }
  throw new Error('Failed to generate unique Case ID');
}

module.exports = { generateCaseId };
