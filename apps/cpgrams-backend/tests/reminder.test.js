'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Case = require('../src/models/Case');
const Reminder = require('../src/models/Reminder');
const { signOfficerToken } = require('../src/services/officerAuth');

test('Reminders and Clarifications API', async (t) => {
  const caseId = 'CPG-REM-TEST';
  const officerId = 'PWD-001';
  const token = signOfficerToken({ officerId, name: 'Rajesh Kumar', department: 'PWD' });

  await Case.deleteMany({ caseId });
  await Reminder.deleteMany({ caseId });

  await Case.create({
    caseId,
    pairwiseId: 'pw_rem_test_citizen',
    category: 'Roads & Highways',
    description: 'Road repair pending since 2 weeks',
    status: 'assigned',
    assignedOfficerId: officerId,
    department: 'PWD'
  });

  await t.test('POST /officer/case/:caseId/clarification requests citizen clarification', async () => {
    const res = await request(app)
      .post(`/officer/case/${caseId}/clarification`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Please share exact street number or landmark.' })
      .expect(201);

    assert.equal(res.body.caseId, caseId);
    assert.equal(res.body.type, 'clarification_request');
    assert.equal(res.body.senderRole, 'officer');
  });

  await t.test('GET /officer/case/:caseId/reminders lists all communications', async () => {
    const res = await request(app)
      .get(`/officer/case/${caseId}/reminders`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1);
  });

  t.after(async () => {
    await mongoose.disconnect();
  });
});
