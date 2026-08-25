'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generatePairwiseId } = require('../src/services/pairwiseId');

test('Pairwise ID Generation Service', async (t) => {
  await t.test('generates deterministic 64-char hex pairwise ID for same user and service', () => {
    const id1 = generatePairwiseId('user_123', 'cpgrams');
    const id2 = generatePairwiseId('user_123', 'cpgrams');
    assert.equal(id1, id2);
    assert.match(id1, /^[a-f0-9]{64}$/);
  });

  await t.test('generates distinct pairwise IDs for different services', () => {
    const id1 = generatePairwiseId('user_123', 'cpgrams');
    const id2 = generatePairwiseId('user_123', 'other_service');
    assert.notEqual(id1, id2);
  });

  await t.test('generates distinct pairwise IDs for different users', () => {
    const id1 = generatePairwiseId('user_123', 'cpgrams');
    const id2 = generatePairwiseId('user_456', 'cpgrams');
    assert.notEqual(id1, id2);
  });
});
