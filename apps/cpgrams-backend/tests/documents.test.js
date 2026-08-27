'use strict';

process.env.AI_ENABLED = 'false';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Case = require('../src/models/Case');
const Document = require('../src/models/Document');
const AiCaseAnalysis = require('../src/models/AiCaseAnalysis');
const Evidence = require('../src/models/Evidence');
const AuditLog = require('../src/models/AuditLog');
const { signOfficerToken } = require('../src/services/officerAuth');

test('Document Upload & Management API', async (t) => {
  const caseId = 'CPG-DOC-TEST';
  const officerId = 'PWD-001';
  const token = signOfficerToken({ officerId, name: 'Rajesh Kumar', department: 'PWD' });

  t.after(async () => {
    try {
      await Case.deleteMany({ caseId });
      await Document.deleteMany({ caseId });
      await AiCaseAnalysis.deleteMany({ caseId });
      await Evidence.deleteMany({ caseId });
      await AuditLog.deleteMany({ targetCaseId: caseId });
    } finally {
      await mongoose.disconnect();
    }
  });

  // Ensure test case assigned to officer exists
  await Case.deleteMany({ caseId });
    await Document.deleteMany({ caseId });
    await AiCaseAnalysis.deleteMany({ caseId });
    await Evidence.deleteMany({ caseId });
    await AuditLog.deleteMany({ targetCaseId: caseId });

  await Case.create({
    caseId,
    pairwiseId: 'pw_doc_test_citizen',
    category: 'Roads & Highways',
    description: 'Road inspection required',
    status: 'assigned',
    assignedOfficerId: officerId,
    department: 'PWD'
  });

  await t.test('POST /officer/case/:caseId/documents uploads file attachment', async () => {
    const res = await request(app)
      .post(`/officer/case/${caseId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', Buffer.from('PDF file content mock'), 'site_report.pdf')
      .expect(201);

    assert.ok(Array.isArray(res.body));
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].originalName, 'site_report.pdf');
  });

  await t.test('GET /officer/case/:caseId/documents lists uploaded documents', async () => {
    const res = await request(app)
      .get(`/officer/case/${caseId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1);
  });

  await t.test('POST /officer/case/:caseId/documents rejects unauthorized officer', async () => {
    const otherToken = signOfficerToken({ officerId: 'HEALTH-001', name: 'Dr. Roy', department: 'Health' });

    const res = await request(app)
      .post(`/officer/case/${caseId}/documents`)
      .set('Authorization', `Bearer ${otherToken}`)
      .attach('files', Buffer.from('PDF content'), 'test.pdf')
      .expect(403);

    assert.ok(res.body.error);
  });

  await t.test('GET /grievance/:caseId/documents/:docId/analysis returns Agent 2 output', async () => {
    const document = await Document.findOne({ caseId });
    await AiCaseAnalysis.findOneAndUpdate({ caseId }, { $set: {
      status: 'completed',
      documentAnalysis: [{
        documentId: String(document._id),
        documentType: 'Work Order',
        language: 'en',
        isRelevant: true,
        relevanceScore: 0.93,
        supportsComplaint: true,
        supportingClaims: ['Road repair contract is listed.'],
        extractedText: 'Contractor: ABC Infra',
        detectedEntities: { contractor: 'ABC Infra', project: null, amount: null, date: null },
        flags: [],
        confidence: 0.91,
      }],
    } }, { upsert: true, new: true });

    const res = await request(app)
      .get(`/grievance/${caseId}/documents/${document._id}/analysis`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    assert.equal(res.body.status, 'completed');
    assert.equal(res.body.analysis.documentType, 'Work Order');
    assert.equal(res.body.analysis.detectedEntities.contractor, 'ABC Infra');
    assert.match(res.body.authenticityNotice, /does not establish document authenticity/);
  });

  await t.test('GET document analysis rejects an unassigned officer', async () => {
    const document = await Document.findOne({ caseId });
    const otherToken = signOfficerToken({ officerId: 'HEALTH-001', name: 'Dr. Roy', department: 'Health' });
    await request(app)
      .get(`/grievance/${caseId}/documents/${document._id}/analysis`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  await t.test('GET /grievance/:caseId/evidence returns researched sources', async () => {
    await Evidence.create({
      evidenceId: 'EVD-DOC-TEST', caseId, title: 'Official inspection record', url: 'https://roads.gov.in/ward-12',
      domain: 'roads.gov.in', sourceType: 'GOVERNMENT', excerpt: 'Ward 12 inspection record.',
      evidenceConfidence: 0.91, status: 'REVIEW_PENDING',
    });
    const res = await request(app)
      .get(`/grievance/${caseId}/evidence`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    assert.equal(res.body[0].evidenceId, 'EVD-DOC-TEST');
    assert.equal(res.body[0].sourceType, 'GOVERNMENT');
    assert.equal(res.body[0].evidenceConfidence, 0.91);
  });

  await t.test('PATCH evidence accepts a review-pending source and audit logs it', async () => {
    const res = await request(app)
      .patch(`/officer/case/${caseId}/evidence/EVD-DOC-TEST`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'ACCEPTED' })
      .expect(200);

    assert.equal(res.body.status, 'ACCEPTED');
    const audit = await AuditLog.findOne({ targetCaseId: caseId, eventType: 'evidence_reviewed' }).lean();
    assert.equal(audit.actorId, officerId);
    assert.equal(audit.metadata.evidenceId, 'EVD-DOC-TEST');
    assert.equal(audit.metadata.previousStatus, 'REVIEW_PENDING');
    assert.equal(audit.metadata.newStatus, 'ACCEPTED');
  });

  await t.test('PATCH evidence rejects an already reviewed source', async () => {
    const res = await request(app)
      .patch(`/officer/case/${caseId}/evidence/EVD-DOC-TEST`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'REJECTED' })
      .expect(409);

    assert.match(res.body.error, /already been accepted/);
  });

  await t.test('PATCH evidence rejects an unassigned officer', async () => {
    const otherToken = signOfficerToken({ officerId: 'HEALTH-001', name: 'Dr. Roy', department: 'Health' });
    await request(app)
      .patch(`/officer/case/${caseId}/evidence/EVD-DOC-TEST`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ status: 'REJECTED' })
      .expect(403);
  });
});
