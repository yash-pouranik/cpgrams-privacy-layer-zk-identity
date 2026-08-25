'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { lookupAadhaar, EKYC_SEED } = require('../src/services/mockEkyc');

test('Mock eKYC Verification Service', async (t) => {
  await t.test('verifies valid seed Aadhaar number', () => {
    const citizen = lookupAadhaar('123456789012');
    assert.ok(citizen);
    assert.equal(citizen.name, 'Rahul Sharma');
    assert.equal(citizen.email, 'rahul.sharma@example.com');
  });

  await t.test('returns null for unregistered Aadhaar', () => {
    const citizen = lookupAadhaar('000000000000');
    assert.equal(citizen, null);
  });

  await t.test('contains all 3 pre-seeded demo citizen profiles', () => {
    assert.ok(EKYC_SEED['123456789012']);
    assert.ok(EKYC_SEED['987654321098']);
    assert.ok(EKYC_SEED['111122223333']);
  });
});
