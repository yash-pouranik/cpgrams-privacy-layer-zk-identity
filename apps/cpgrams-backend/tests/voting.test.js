'use strict';

process.env.TEST_AUTH_SECRET = process.env.TEST_AUTH_SECRET || 'voting-test-secret';
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../src/app');
const Case = require('../src/models/Case');
const AuditLog = require('../src/models/AuditLog');
const CaseFollow = require('../src/models/CaseFollow');
const { tokenize, findSimilarCases } = require('../src/services/duplicateDetect');

const SECRET = process.env.TEST_AUTH_SECRET;
const signCitizen = (pw) => jwt.sign({ sub: pw, test: true }, SECRET, { expiresIn: '1h' });

const OWNER_PW = 'pw_vote_owner_citizen';
const VOTER_PW = 'pw_vote_other_citizen';
const VOTER2_PW = 'pw_vote_third_citizen';
const VOTER3_PW = 'pw_vote_follow_citizen';
const CASE_ID = 'CPG-VOTE-TEST';
const CATEGORY = 'Roads & Highways';

const ownerToken = signCitizen(OWNER_PW);
const voterToken = signCitizen(VOTER_PW);
const voter2Token = signCitizen(VOTER2_PW);
const voter3Token = signCitizen(VOTER3_PW);

const MATCHING_DESC = 'Large pothole near the market every day';
test('Duplicate Detection & Voting API', async (t) => {
  t.after(async () => {
    try {
      await Case.deleteMany({ caseId: CASE_ID });
      await AuditLog.deleteMany({ eventType: 'grievance_upvoted', targetCaseId: CASE_ID });
      await CaseFollow.deleteMany({ caseId: CASE_ID });
    } finally {
      await mongoose.disconnect();
    }
  });

  await Case.deleteMany({ caseId: CASE_ID });
  await AuditLog.deleteMany({ eventType: 'grievance_upvoted', targetCaseId: CASE_ID });
  await CaseFollow.deleteMany({ caseId: CASE_ID });

  await Case.create({
    caseId: CASE_ID,
    pairwiseId: OWNER_PW,
    category: CATEGORY,
    description: 'Large pothole on MG Road near the market causing accidents daily',
    status: 'assigned',
    assignedOfficerId: 'PWD-001',
    department: 'PWD',
    votes: 0,
    voterPairwiseIds: [],
  });

  await t.test('tokenize strips stop words and short tokens', () => {
    const tokens = tokenize('The large pothole is on the road near my house!!!');
    assert.ok(tokens.includes('pothole'));
    assert.ok(tokens.includes('large'));
    assert.ok(!tokens.includes('the'));
    assert.ok(!tokens.includes('is'));
    assert.ok(!tokens.includes('near'));
  });
  await t.test('findSimilarCases matches overlapping keywords in same category', async () => {
    const result = await findSimilarCases({
      category: CATEGORY,
      description: 'Huge pothole near the market every day',
      pairwiseId: VOTER_PW,
    });
    assert.equal(result.suggestions.length, 1);
    assert.equal(result.suggestions[0].caseId, CASE_ID);
    assert.ok(result.suggestions[0].excerpt.includes('pothole'));
    assert.equal(result.ownDuplicate, null);
  });

  await t.test('findSimilarCases ignores different category', async () => {
    const result = await findSimilarCases({
      category: 'Water Supply',
      description: 'Large pothole near the market',
      pairwiseId: VOTER_PW,
    });
    assert.equal(result.suggestions.length, 0);
    assert.equal(result.ownDuplicate, null);
  });

  await t.test('findSimilarCases never suggests the requester own case as votable', async () => {
    const result = await findSimilarCases({
      category: CATEGORY,
      description: 'Large pothole near the market',
      pairwiseId: OWNER_PW,
    });
    assert.equal(result.suggestions.length, 0);
  });

  await t.test('findSimilarCases surfaces the citizen own duplicate as ownDuplicate reminder', async () => {
    const result = await findSimilarCases({
      category: CATEGORY,
      description: 'Large pothole near the market every day',
      pairwiseId: OWNER_PW,
    });
    assert.equal(result.suggestions.length, 0);       // own case is NOT votable
    assert.ok(result.ownDuplicate);                   // ...but IS surfaced as a reminder
    assert.equal(result.ownDuplicate.caseId, CASE_ID);
  });

  await t.test('GET /grievance/suggestions requires authentication', async () => {
    const res = await request(app)
      .get(`/grievance/suggestions?category=${encodeURIComponent(CATEGORY)}&q=${encodeURIComponent(MATCHING_DESC)}`)
      .expect(401);
    assert.ok(res.body.error);
  });

  await t.test('POST /grievance/:caseId/vote requires authentication', async () => {
    const res = await request(app).post(`/grievance/${CASE_ID}/vote`).expect(401);
    assert.ok(res.body.error);
  });

  await t.test('GET /grievance/suggestions returns matching case for auth citizen', async () => {
    const res = await request(app)
      .get(`/grievance/suggestions?category=${encodeURIComponent(CATEGORY)}&q=${encodeURIComponent(MATCHING_DESC)}`)
      .set('Authorization', `Bearer ${voterToken}`)
      .expect(200);
    assert.ok(Array.isArray(res.body.suggestions));
    assert.equal(res.body.suggestions.length, 1);
    assert.equal(res.body.suggestions[0].caseId, CASE_ID);
  });

await t.test('GET /grievance/suggestions surfaces ownDuplicate for the reporter', async () => {
    const res = await request(app)
      .get(`/grievance/suggestions?category=${encodeURIComponent(CATEGORY)}&q=${encodeURIComponent(MATCHING_DESC)}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    assert.ok(Array.isArray(res.body.suggestions));
    assert.equal(res.body.suggestions.length, 0);   // own case never in votable list
    assert.ok(res.body.ownDuplicate);               // but surfaced as a reminder
    assert.equal(res.body.ownDuplicate.caseId, CASE_ID);
  });

  await t.test('GET /grievance/suggestions returns empty for short query', async () => {
    const res = await request(app)
      .get(`/grievance/suggestions?category=${encodeURIComponent(CATEGORY)}&q=short`)
      .set('Authorization', `Bearer ${voterToken}`)
      .expect(200);
    assert.deepEqual(res.body.suggestions, []);
  });

  await t.test('POST /grievance/:caseId/vote increments count and records audit log', async () => {
    const res = await request(app)
      .post(`/grievance/${CASE_ID}/vote`)
      .set('Authorization', `Bearer ${voterToken}`)
      .expect(200);
    assert.equal(res.body.caseId, CASE_ID);
    assert.equal(res.body.votes, 1);

    const updated = await Case.findOne({ caseId: CASE_ID });
    assert.equal(updated.votes, 1);
    assert.ok(updated.voterPairwiseIds.includes(VOTER_PW));

    const audit = await AuditLog.findOne({ eventType: 'grievance_upvoted', targetCaseId: CASE_ID });
    assert.ok(audit);
    assert.equal(audit.actorId, VOTER_PW);
  });

  await t.test('POST /grievance/:caseId/vote rejects second vote from same citizen', async () => {
    const res = await request(app)
      .post(`/grievance/${CASE_ID}/vote`)
      .set('Authorization', `Bearer ${voterToken}`)
      .expect(409);
    assert.equal(res.body.error, 'You have already voted on this issue.');
    assert.equal(res.body.votes, 1);
  });

  await t.test('POST /grievance/:caseId/vote rejects voting on own grievance', async () => {
    const res = await request(app)
      .post(`/grievance/${CASE_ID}/vote`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
    assert.equal(res.body.error, 'You cannot vote on your own grievance.');
  });

  await t.test('POST /grievance/:caseId/vote allows a different citizen to vote', async () => {
    const res = await request(app)
      .post(`/grievance/${CASE_ID}/vote`)
      .set('Authorization', `Bearer ${voter2Token}`)
      .expect(200);
    assert.equal(res.body.votes, 2);
  });

  await t.test('POST /grievance/:caseId/vote rejects non-existent case', async () => {
    const res = await request(app)
      .post('/grievance/CPG-DOES-NOT-EXIST/vote')
      .set('Authorization', `Bearer ${voterToken}`)
      .expect(404);
    assert.equal(res.body.error, 'Case not found.');
  });

  await t.test('vote response includes tracking credentials for the voter', async () => {
    const res = await request(app)
      .post(`/grievance/${CASE_ID}/vote`)
      .set('Authorization', `Bearer ${voter3Token}`)
      .expect(200);
    assert.equal(res.body.trackingCaseId, CASE_ID);
    assert.ok(res.body.trackingPassword, 'trackingPassword must be returned');
    assert.ok(/^[0-9a-f]{8}$/.test(res.body.trackingPassword));

    const follow = await CaseFollow.findOne({ caseId: CASE_ID, voterPairwiseId: VOTER3_PW });
    assert.ok(follow);
    assert.equal(follow.trackingPassword, res.body.trackingPassword);
  });

  await t.test('GET /grievance/followed lists voted cases with their tracking password', async () => {
    const res = await request(app)
      .get('/grievance/followed')
      .set('Authorization', `Bearer ${voter3Token}`)
      .expect(200);
    const entry = res.body.followed.find((f) => f.caseId === CASE_ID);
    assert.ok(entry, 'voted case must appear in followed list');
    assert.equal(entry.status, 'assigned');
    assert.equal(entry.votes, 3);
    assert.ok(entry.trackingPassword);
  });

  await t.test("voter's tracking password works on the public status tracker", async () => {
    const follow = await CaseFollow.findOne({ caseId: CASE_ID, voterPairwiseId: VOTER3_PW });
    const res = await request(app)
      .post('/status/check')
      .send({ caseId: CASE_ID, registrationPassword: follow.trackingPassword })
      .expect(200);
    assert.equal(res.body.caseId, CASE_ID);

    const hist = await request(app)
      .get(`/status/${CASE_ID}/history?password=${follow.trackingPassword}`)
      .expect(200);
    assert.ok(Array.isArray(hist.body));

    // Original filer's registration password is NOT the voter's password.
    const bad = await request(app)
      .post('/status/check')
      .send({ caseId: CASE_ID, registrationPassword: 'wrong-password' })
      .expect(401);
    assert.ok(bad.body.error);
  });

  await t.test('GET /grievance/followed returns empty list for citizen with no votes', async () => {
    const fresh = signCitizen('pw_never_voted_citizen');
    const res = await request(app)
      .get('/grievance/followed')
      .set('Authorization', `Bearer ${fresh}`)
      .expect(200);
    assert.deepEqual(res.body.followed, []);
  });
});
