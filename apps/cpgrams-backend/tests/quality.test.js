'use strict';

process.env.NODE_ENV = 'test';
process.env.MOCK_AI = 'true';

const test = require('node:test');
const assert = require('node:assert/strict');
const { embedText, DIMENSIONS } = require('../src/ai/services/embedding.service');
const { runQualityAgent, buildMockQualityResponse } = require('../src/ai/agents/quality/quality.agent');

test('Phase 3 semantic quality services', async (t) => {
  await t.test('mock embedding is deterministic and 1536-dimensional', async () => {
    const first = await embedText('Water shortage near Rajwada Indore');
    const second = await embedText('Water shortage near Rajwada Indore');
    assert.equal(first.length, DIMENSIONS);
    assert.deepEqual(first, second);
  });

  await t.test('quality agent returns actionable quality output without Pinecone credentials', async () => {
    const result = await runQualityAgent({
      caseId: 'CPG-QUALITY-01',
      category: 'Water Supply',
      description: 'Water shortage near Ward 12 in Indore since two weeks.',
      triageResult: { classification: { department: 'PWD', category: 'Water Supply & Sanitation' } },
    });
    assert.equal(result.model, 'mock');
    assert.equal(result.output.isActionable, true);
    assert.ok(result.output.qualityScore >= 0 && result.output.qualityScore <= 100);
    assert.deepEqual(result.output.relatedCases, []);
  });

  await t.test('quality fallback identifies missing location and timeframe', () => {
    const result = buildMockQualityResponse({ description: 'Water problem in my area.' }, []);
    assert.equal(result.isActionable, false);
    assert.ok(result.missingInformation.includes('Exact location or landmark'));
    assert.ok(result.missingInformation.includes('When the issue started'));
  });
});
