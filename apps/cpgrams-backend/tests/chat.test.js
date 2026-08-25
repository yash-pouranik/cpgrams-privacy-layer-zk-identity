'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Case = require('../src/models/Case');
const Message = require('../src/models/Message');
const { signOfficerToken } = require('../src/services/officerAuth');

test('Masked Chat Communication API', async (t) => {
  const caseId = 'CPG-CHAT-TEST';
  const officerId = 'PWD-001';
  const token = signOfficerToken({ officerId, name: 'Rajesh Kumar', department: 'PWD' });

  await Case.deleteMany({ caseId });
  await Message.deleteMany({ caseId });

  await Case.create({
    caseId,
    pairwiseId: 'pw_chat_test_citizen',
    category: 'Roads & Highways',
    description: 'Road light broken',
    status: 'assigned',
    assignedOfficerId: officerId,
    department: 'PWD'
  });

  await t.test('POST /chat/:caseId rejects unauthenticated chat message', async () => {
    const res = await request(app)
      .post(`/chat/${caseId}`)
      .send({ content: 'Hello officer' })
      .expect(401);

    assert.ok(res.body.error);
  });

  await t.test('POST /chat/:caseId sends message and derives role server-side', async () => {
    const res = await request(app)
      .post(`/chat/${caseId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Inspection team dispatched to location.' })
      .expect(201);

    assert.equal(res.body.caseId, caseId);
    assert.equal(res.body.senderRole, 'officer');
    assert.equal(res.body.content, 'Inspection team dispatched to location.');
  });

  await t.test('GET /chat/:caseId returns chronological message history', async () => {
    const res = await request(app)
      .get(`/chat/${caseId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1);
  });

  t.after(async () => {
    await mongoose.disconnect();
  });
});
