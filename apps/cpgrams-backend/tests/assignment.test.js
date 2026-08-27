'use strict';

process.env.NODE_ENV = 'test';
process.env.MOCK_AI = 'true';

const test = require('node:test');
const assert = require('node:assert/strict');
const Officer = require('../src/models/Officer');
const { buildAssignmentCandidates, scoreOfficer, validateAssignmentRecommendation } = require('../src/services/autoAssign');
const { runAssignmentAgent } = require('../src/ai/agents/assignment/assignment.agent');

test('Phase 6 intelligent assignment policy', async (t) => {
  await t.test('scores department, expertise, jurisdiction, workload, and SLA risk', () => {
    const score = scoreOfficer({ department: 'PWD', expertise: ['roads'], jurisdictions: ['indore'], currentCaseCount: 1, averageResolutionDays: 10, level: 2 }, { department: 'PWD', category: 'Roads', location: 'Indore', priorityScore: 87 });
    const weaker = scoreOfficer({ department: 'PWD', expertise: [], jurisdictions: [], currentCaseCount: 8, averageResolutionDays: 30, level: 1 }, { department: 'PWD', category: 'Roads', location: 'Indore', priorityScore: 87 });
    assert.ok(score > weaker);
  });

  await t.test('validator rejects a hallucinated officer or department', () => {
    const result = validateAssignmentRecommendation({ recommendedOfficerId: 'FAKE-001', recommendedDepartment: 'Health', confidence: 0.99 }, { officerId: 'PWD-001', resolvedDepartment: 'PWD', currentCaseCount: 1 }, { currentOfficerAssignment: null });
    assert.equal(result.recommendedOfficerId, 'PWD-001');
    assert.equal(result.recommendedDepartment, 'PWD');
    assert.equal(result.aiRecommendationAccepted, false);
    assert.equal(result.confidence, 0);
  });

  await t.test('builds a ranked eligible shortlist without leaking password hashes', async () => {
    const originalFind = Officer.find;
    const officers = [
      { officerId: 'PWD-LOW', name: 'Low Fit', department: 'PWD', currentCaseCount: 9, expertise: [], jurisdictions: [], averageResolutionDays: 30, passwordHash: 'secret' },
      { officerId: 'PWD-BEST', name: 'Best Fit', department: 'PWD', level: 2, currentCaseCount: 1, expertise: ['roads'], jurisdictions: ['indore'], averageResolutionDays: 10, passwordHash: 'secret' },
    ];
    Officer.find = () => ({
      select: () => ({
        lean: async () => officers,
      }),
    });

    try {
      const shortlist = await buildAssignmentCandidates({ department: 'PWD', category: 'Roads', location: 'Indore', priorityScore: 87 });
      assert.equal(shortlist[0].officerId, 'PWD-BEST');
      assert.equal(shortlist[0].matchingFactors.departmentMatch, true);
      assert.equal(shortlist[0].matchingFactors.expertiseMatch, true);
      assert.equal(shortlist[0].matchingFactors.jurisdictionMatch, true);
      assert.equal(shortlist[0].passwordHash, undefined);
    } finally {
      Officer.find = originalFind;
    }
  });

  await t.test('assignment agent recommends from the bounded shortlist', async () => {
    const originalFind = Officer.find;
    Officer.find = () => ({
      select: () => ({
        lean: async () => [
          { officerId: 'PWD-001', name: 'Rajesh Kumar', department: 'PWD', level: 2, currentCaseCount: 3, expertise: ['roads'], jurisdictions: ['indore'], averageResolutionDays: 11 },
          { officerId: 'PWD-002', name: 'Meena Rao', department: 'PWD', level: 1, currentCaseCount: 7, expertise: ['bridges'], jurisdictions: ['bhopal'], averageResolutionDays: 21 },
        ],
      }),
    });

    try {
      const result = await runAssignmentAgent({
        caseId: 'CPG-P6-01',
        category: 'Roads',
        description: 'Ward 12 Indore pothole issue.',
        triageResult: {
          classification: { department: 'PWD', category: 'Roads' },
          priority: { level: 'HIGH', score: 87 },
          entities: { location: { city: 'Indore', ward: '12' } },
        },
      });
      assert.equal(result.output.recommendedOfficerId, 'PWD-001');
      assert.equal(result.output.usedAiRecommendation, true);
      assert.equal(result.output.selectionMethod, 'bounded-ai-shortlist');
      assert.equal(result.output.candidateShortlist.length, 2);
      assert.ok(result.output.confidence > 0);
    } finally {
      Officer.find = originalFind;
    }
  });
});
