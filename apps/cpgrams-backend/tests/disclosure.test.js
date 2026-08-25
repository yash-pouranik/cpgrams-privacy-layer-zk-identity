'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Case = require('../src/models/Case');
const DisclosureRequest = require('../src/models/DisclosureRequest');
const { signOfficerToken } = require('../src/services/officerAuth');

test('Disclosure Authority & Legal Workflow API', async (t) => {
  const caseId = 'CPG-DISC-TEST';
  const officerId = 'PWD-001';
  const token = signOfficerToken({ officerId, name: 'Rajesh Kumar', department: 'PWD' });
  const authorityToken = process.env.DISCLOSURE_AUTHORITY_SECRET || 'authority-secret-change-me';

  await Case.deleteMany({ caseId });
  await DisclosureRequest.deleteMany({ caseId });

  await Case.create({
    caseId,
    pairwiseId: 'pw_disclosure_citizen',
    category: 'Roads & Highways',
    description: 'Case requiring legal verification',
    status: 'assigned',
    assignedOfficerId: officerId,
    department: 'PWD'
  });

  let requestId;

  await t.test('POST /disclosure/request submits identity reveal request with justification', async () => {
    const res = await request(app)
      .post('/disclosure/request')
      .set('Authorization', `Bearer ${token}`)
      .send({
        caseId,
        justification: 'High Court Order HC-2026-881 for evidence submission'
      })
      .expect(201);

    assert.equal(res.body.caseId, caseId);
    assert.equal(res.body.status, 'pending');
    assert.equal(res.body.requestedByOfficerId, officerId);
    requestId = res.body._id;
  });

  await t.test('GET /disclosure/pending rejects access without X-Authority-Token', async () => {
    const res = await request(app)
      .get('/disclosure/pending')
      .expect(401);

    assert.ok(res.body.error);
  });

  await t.test('GET /disclosure/pending lists pending requests for authorized authority', async () => {
    const res = await request(app)
      .get('/disclosure/pending')
      .set('X-Authority-Token', authorityToken)
      .expect(200);

    assert.ok(Array.isArray(res.body));
    const reqItem = res.body.find(r => r.caseId === caseId);
    assert.ok(reqItem);
  });

  await t.test('POST /disclosure/:id/reject allows authority to reject invalid request', async () => {
    const res = await request(app)
      .post(`/disclosure/${requestId}/reject`)
      .set('X-Authority-Token', authorityToken)
      .send({ rejectionReason: 'Insufficient judicial grounds provided.' })
      .expect(200);

    assert.equal(res.body.status, 'rejected');
  });

  t.after(async () => {
    await mongoose.disconnect();
  });
});
