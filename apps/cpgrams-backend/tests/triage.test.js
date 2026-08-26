'use strict';

process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');

const { runTriageAgent, buildMockTriageResponse } = require('../src/ai/agents/triage/triage.agent');
const autoAssignService = require('../src/services/autoAssign');
const Officer = require('../src/models/Officer');

test('Phase 2 triage agent and AI-aware assignment', async (t) => {
  await t.test('runTriageAgent returns a valid structured triage payload in test mode', async () => {
    const input = {
      caseId: 'CPG-TEST01',
      category: 'Roads',
      description: 'Ward 12 road pothole near MG Road in Indore for 6 months. Contractor not repairing it.',
      department: 'General Administration',
      orgType: 'central',
      evidenceUrls: ['http://example.com/photo.jpg'],
    };

    const result = await runTriageAgent(input);

    assert.equal(result.model, 'mock');
    assert.ok(result.output);
    assert.equal(result.output.classification.department, 'PWD');
    assert.equal(result.output.priority.level, 'HIGH');
    assert.equal(result.output.entities.location.ward, '12');
    assert.ok(Array.isArray(result.output.searchQueries));
    assert.ok(result.output.searchQueries.length >= 4);
  });

  await t.test('buildMockTriageResponse produces a usable fallback payload', () => {
    const output = buildMockTriageResponse({
      caseId: 'CPG-TEST02',
      category: 'Electricity',
      description: 'Power outage and transformer fault in Ward 7 since yesterday.',
    });

    assert.equal(output.classification.department, 'PWD');
    assert.equal(output.classification.category, 'Electricity Supply');
    assert.equal(output.classification.confidence >= 0.8, true);
    assert.ok(output.searchQueries.includes('Ward 7 grievance'));
  });

  await t.test('autoAssignWithAI prefers AI routing only above the confidence threshold', async () => {
    const originalFindOne = Officer.findOne;
    const originalSave = Officer.prototype.save;
    const saved = [];
    const officerDoc = {
      officerId: 'PWD-001',
      name: 'Test Officer',
      department: 'PWD',
      level: 2,
      isAvailable: true,
      currentCaseCount: 3,
      save: async function () {
        saved.push(this.currentCaseCount);
        return this;
      },
      toObject: function () {
        return { ...this };
      },
    };

    Officer.findOne = () => ({
      sort: async () => officerDoc,
    });
    Officer.prototype.save = officerDoc.save;

    try {
      const aiResult = await autoAssignService.autoAssignWithAI(
        {
          classification: { department: 'Health', confidence: 0.92 },
          normalizedComplaint: 'Road damage near ward 12',
        },
        { category: 'Roads', description: 'Road damage near ward 12' }
      );

      assert.equal(aiResult.resolvedDepartment, 'Health');
      assert.equal(aiResult.usedAiRecommendation, true);
      assert.equal(saved.at(-1), 4);

      const fallbackResult = await autoAssignService.autoAssignWithAI(
        {
          classification: { department: 'Health', confidence: 0.42 },
          normalizedComplaint: 'Road damage near ward 12',
        },
        { category: 'Roads', description: 'Road damage near ward 12' }
      );

      assert.equal(fallbackResult.resolvedDepartment, 'PWD');
      assert.equal(fallbackResult.usedAiRecommendation, false);
      assert.equal(saved.at(-1), 5);

      const nonReservingResult = await autoAssignService.autoAssignWithAI(
        {
          classification: { department: 'PWD', confidence: 0.95 },
          normalizedComplaint: 'Pothole on main road',
        },
        { category: 'Roads', description: 'Pothole on main road' },
        { reserve: false }
      );
      assert.equal(nonReservingResult.resolvedDepartment, 'PWD');
      assert.equal(saved.at(-1), 5);
    } finally {
      Officer.findOne = originalFindOne;
      Officer.prototype.save = originalSave;
    }
  });
});
