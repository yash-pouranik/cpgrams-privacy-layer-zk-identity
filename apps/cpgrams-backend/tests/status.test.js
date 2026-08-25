'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const app = require('../src/app');
const Case = require('../src/models/Case');

test('Public Status Tracking & Audit History API', async (t) => {
  const caseId = 'CPG-TEST-STATUS';
  const rawPassword = 'test-pass-123';
  const pairwiseId = 'pw_test_citizen_status';

  // Seed a test case
  await Case.deleteMany({ caseId });
  const hash = await bcrypt.hash(rawPassword, 10);
  await Case.create({
    caseId,
    pairwiseId,
    category: 'Roads & Highways',
    description: 'Pothole issue on highway near sector 4',
    status: 'assigned',
    department: 'PWD',
    registrationPassword: hash
  });

  await t.test('POST /status/check returns case status for valid password', async () => {
    const res = await request(app)
      .post('/status/check')
      .send({ caseId, registrationPassword: rawPassword })
      .expect(200);

    assert.equal(res.body.caseId, caseId);
    assert.equal(res.body.status, 'assigned');
    assert.equal(res.body.department, 'PWD');
    assert.equal(res.body.pairwiseId, undefined);
  });

  await t.test('POST /status/check rejects wrong registration password', async () => {
    const res = await request(app)
      .post('/status/check')
      .send({ caseId, registrationPassword: 'wrong-password' })
      .expect(401);

    assert.ok(res.body.error);
  });

  await t.test('GET /status/:caseId/history returns formatted timeline for valid password', async () => {
    const res = await request(app)
      .get(`/status/${caseId}/history?password=${rawPassword}`)
      .expect(200);

    assert.ok(Array.isArray(res.body));
  });

  t.after(async () => {
    await mongoose.disconnect();
  });
});
