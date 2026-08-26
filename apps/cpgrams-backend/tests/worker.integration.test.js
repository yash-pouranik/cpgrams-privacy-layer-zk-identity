'use strict';

process.env.NODE_ENV = 'test';
process.env.AI_ENABLED = 'true';
process.env.AI_TRIAGE_ENABLED = 'true';
process.env.AI_ASSIGNMENT_ENABLED = 'true';
process.env.AI_DOCUMENT_ENABLED = 'false';
process.env.AI_RAG_ENABLED = 'true';
process.env.AI_EVIDENCE_ENABLED = 'false';

const test = require('node:test');
const assert = require('node:assert/strict');

const Case = require('../src/models/Case');
const Officer = require('../src/models/Officer');
const AiCaseAnalysis = require('../src/models/AiCaseAnalysis');
const AiAgentRun = require('../src/models/AiAgentRun');

// This test exercises orchestration and persistence, not Redis connectivity.
// Stub the queue module before loading the worker to avoid opening a Redis handle.
const queueModulePath = require.resolve('../src/ai/queue/grievanceQueue');
require.cache[queueModulePath] = { id: queueModulePath, filename: queueModulePath, loaded: true, exports: { QUEUE_NAME: 'test-grievance-intelligence' } };
const { processGrievanceIntelligence } = require('../src/ai/workers/grievanceIntelligence.worker');

test('AI worker persists triage and assignment output for a queued grievance', async () => {
  const originals = {
    caseFindOne: Case.findOne,
    caseUpdateOne: Case.updateOne,
    officerFindOne: Officer.findOne,
    analysisUpdate: AiCaseAnalysis.findOneAndUpdate,
    agentRunCreate: AiAgentRun.create,
  };
  const analysisUpdates = [];
  const agentRuns = [];
  const caseUpdates = [];

  Case.findOne = () => ({
    lean: async () => ({
      caseId: 'CPG-WORKER-01',
      category: 'Roads',
      description: 'Ward 12 pothole near MG Road is dangerous and unresolved.',
      department: 'General Administration',
      orgType: 'central',
      evidenceUrls: [],
      assignedOfficerId: 'PWD-001',
    }),
  });
  Case.updateOne = async (filter, update) => {
    caseUpdates.push({ filter, update });
    return { acknowledged: true, modifiedCount: 0 };
  };
  Officer.findOne = () => ({
    sort: async () => ({
      officerId: 'PWD-001',
      name: 'Rajesh Kumar',
      department: 'PWD',
      currentCaseCount: 2,
      save: async () => {},
      toObject: () => ({ officerId: 'PWD-001', name: 'Rajesh Kumar', department: 'PWD', currentCaseCount: 2 }),
    }),
  });
  AiCaseAnalysis.findOneAndUpdate = async (filter, update) => {
    analysisUpdates.push({ filter, update });
    return {};
  };
  AiAgentRun.create = async (run) => {
    agentRuns.push(run);
    return run;
  };

  try {
    await processGrievanceIntelligence({ caseId: 'CPG-WORKER-01' });

    const triageUpdate = analysisUpdates.find((entry) => entry.update.$set?.triage);
    const assignmentUpdate = analysisUpdates.find((entry) => entry.update.$set?.assignment);
    assert.ok(triageUpdate, 'triage result should be persisted');
    assert.equal(triageUpdate.update.$set.triage.classification.department, 'PWD');
    assert.ok(assignmentUpdate, 'assignment result should be persisted');
    assert.equal(assignmentUpdate.update.$set.assignment.resolvedDepartment, 'PWD');
    assert.equal(assignmentUpdate.update.$set.assignment.usedAiRecommendation, true);
    const qualityUpdate = analysisUpdates.find((entry) => entry.update.$set?.quality);
    assert.ok(qualityUpdate, 'semantic quality result should be persisted');
    assert.ok(qualityUpdate.update.$set.quality.qualityScore >= 0);
    assert.equal(caseUpdates.length, 0, 'existing HTTP assignment must not be overwritten');
    assert.ok(agentRuns.some((run) => run.agent === 'triage' && run.status === 'completed'));
    assert.ok(agentRuns.some((run) => run.agent === 'assignment' && run.status === 'completed'));
    assert.equal(analysisUpdates.at(-1).update.$set.status, 'completed');
  } finally {
    Case.findOne = originals.caseFindOne;
    Case.updateOne = originals.caseUpdateOne;
    Officer.findOne = originals.officerFindOne;
    AiCaseAnalysis.findOneAndUpdate = originals.analysisUpdate;
    AiAgentRun.create = originals.agentRunCreate;
  }
});
