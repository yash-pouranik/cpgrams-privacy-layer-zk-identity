'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Case = require('../src/models/Case');
const Feedback = require('../src/models/Feedback');
const { signOfficerToken } = require('../src/services/officerAuth');

test('Redressal Feedback API', async (t) => {
  const caseId = 'CPG-FEE-TEST';
  const officerId = 'PWD-001';
  const pairwiseId = 'pw_feedback_test_citizen';
  const token = signOfficerToken({ officerId, name: 'Rajesh Kumar', department: 'PWD' });

  t.after(async () => {
    try {
      await Case.deleteMany({ caseId });
      await Feedback.deleteMany({ caseId });
    } finally {
      await mongoose.disconnect();
    }
  });

  await Case.deleteMany({ caseId });
  await Feedback.deleteMany({ caseId });

  await Case.create({
    caseId,
    pairwiseId,
    category: 'Roads & Highways',
    description: 'Road resolved completely',
    status: 'resolved',
    assignedOfficerId: officerId,
    department: 'PWD',
    feedbackSubmitted: true
  });

  await Feedback.create({
    caseId,
    pairwiseId,
    rating: 5,
    comment: 'Pothole was repaired within 24 hours. Excellent work!'
  });

  await t.test('GET /grievance/:caseId/feedback allows assigned officer to view feedback', async () => {
    const res = await request(app)
      .get(`/grievance/${caseId}/feedback`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    assert.equal(res.body.caseId, caseId);
    assert.equal(res.body.rating, 5);
    assert.equal(res.body.comment, 'Pothole was repaired within 24 hours. Excellent work!');
  });

  await Promise.all([Case.deleteMany({ caseId }), Feedback.deleteMany({ caseId })]);

  await Case.create({
    caseId,
    pairwiseId,
    category: 'Water Supply',
    description: 'Pipeline leak resolved',
    status: 'disposed', // official CPGRAMS closed status (not legacy 'resolved')
    assignedOfficerId: officerId,
    department: 'PWD',
    feedbackSubmitted: false
  });

  await t.test('POST /grievance/:caseId/feedback accepts citizen rating on a disposed case', async () => {
    const citizenToken = require('jsonwebtoken').sign(
      { sub: pairwiseId, test: true },
      process.env.TEST_AUTH_SECRET
    );
    const res = await request(app)
      .post(`/grievance/${caseId}/feedback`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ rating: 4 })
      .expect(201);

    assert.equal(res.body.caseId, caseId);
    assert.equal(res.body.rating, 4);
  });
});
