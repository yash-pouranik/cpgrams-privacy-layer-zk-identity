'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Case = require('../src/models/Case');

test('External State/Ministry Push Grievance Web Service', async (t) => {
  const validApiKey = 'dev-push-key-12345';

  await t.test('POST /api/push/grievance rejects unauthenticated push requests', async () => {
    const res = await request(app)
      .post('/api/push/grievance')
      .send({
        sourcePortal: 'MP-CM-Helpline',
        category: 'Roads & Highways',
        description: 'Road damage reported via state CM helpline',
        citizenPairwiseId: 'pw_mp_state_user_123'
      })
      .expect(401);

    assert.ok(res.body.error);
  });

  await t.test('POST /api/push/grievance ingests grievance with valid API key', async () => {
    const res = await request(app)
      .post('/api/push/grievance')
      .set('X-API-Key', validApiKey)
      .send({
        sourcePortal: 'MP-CM-Helpline',
        sourceRefId: 'MP-2026-9988',
        category: 'Roads & Highways',
        description: 'Road damage reported via state CM helpline',
        citizenPairwiseId: 'pw_mp_state_user_123'
      })
      .expect(201);

    assert.ok(res.body.registrationId);
    assert.equal(res.body.status, 'assigned');
    assert.equal(res.body.assignedDepartment, 'PWD');

    // Clean up
    await Case.deleteMany({ caseId: res.body.registrationId });
  });

  t.after(async () => {
    await mongoose.disconnect();
  });
});
