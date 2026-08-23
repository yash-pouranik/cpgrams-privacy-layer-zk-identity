'use strict';

const crypto = require('crypto');
const { nanoid } = require('nanoid');

/**
 * Generate a non-deterministic Case ID.
 * Same citizen filing multiple complaints gets DIFFERENT case IDs
 * (officer cannot link them).
 *
 * Format: CPG-XXXXXX  (6 uppercase hex chars)
 */
function generateCaseId(pairwiseId) {
  const nonce = nanoid();
  const hash = crypto
    .createHash('sha256')
    .update(pairwiseId + nonce)
    .digest('hex');
  return 'CPG-' + hash.slice(0, 6).toUpperCase();
}

module.exports = { generateCaseId };
