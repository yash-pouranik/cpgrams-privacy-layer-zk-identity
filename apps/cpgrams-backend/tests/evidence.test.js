'use strict';

process.env.NODE_ENV = 'test';
process.env.MOCK_AI = 'true';

const test = require('node:test');
const assert = require('node:assert/strict');
const Evidence = require('../src/models/Evidence');
const tavilyClient = require('../src/ai/integrations/tavily.client');
const { getDomainCredibility } = tavilyClient;
const {
  evidenceScope,
  buildQueries,
  mapEvidenceResult,
  runEvidenceAgent,
} = require('../src/ai/agents/evidence/evidence.agent');

test('Phase 5 evidence enrichment', async (t) => {
  await t.test('public infrastructure complaints are eligible for web evidence', () => {
    const result = evidenceScope({ category: 'Roads', description: 'Ward 12 bridge repair contractor has not started work.' });
    assert.equal(result.useful, true);
  });

  await t.test('personal complaints skip public web search', async () => {
    const result = await runEvidenceAgent({ category: 'Password issue', description: 'I forgot my portal password.' });
    assert.equal(result.output.status, 'SKIPPED');
    assert.equal(result.output.corroborationSignal, 'NONE');
  });

  await t.test('government source receives higher credibility and immutable snapshot hash', () => {
    const government = mapEvidenceResult('CPG-EVD-01', {
      title: 'Ward 12 road repair tender',
      url: 'https://roads.gov.in/ward-12',
      domain: 'roads.gov.in',
      excerpt: 'Ward 12 road repair tender and contractor details.',
    }, { description: 'Ward 12 road repair', triageResult: { entities: { location: { ward: '12' } } } });
    const blog = mapEvidenceResult('CPG-EVD-01', {
      title: 'Road repair discussion', url: 'https://example.com/roads', domain: 'example.com', excerpt: 'Road repair discussion.',
    }, { description: 'Ward 12 road repair', triageResult: { entities: { location: { ward: '12' } } } });
    assert.equal(getDomainCredibility(government.url).sourceType, 'GOVERNMENT');
    assert.ok(government.sourceCredibility > blog.sourceCredibility);
    assert.match(government.snapshotHash, /^[a-f0-9]{64}$/);
    assert.equal(government.status, 'REVIEW_PENDING');
  });

  await t.test('Tavily results are persisted as review-pending evidence', async () => {
    const originalSearch = tavilyClient.tavilyMultiSearch;
    const originalInsertMany = Evidence.insertMany;
    const persisted = [];
    tavilyClient.tavilyMultiSearch = async () => [{
      title: 'Official ward inspection', url: 'https://inspection.gov.in/ward-12', domain: 'inspection.gov.in',
      excerpt: 'Ward 12 inspection record for road repair.', sourceType: 'GOVERNMENT', credibility: 0.93,
    }];
    Evidence.insertMany = async (items) => { persisted.push(...items); return items; };
    try {
      const result = await runEvidenceAgent({
        caseId: 'CPG-EVD-02', category: 'Road infrastructure', description: 'Ward 12 road repair needs inspection.',
        triageResult: { searchQueries: ['Ward 12 road repair'], entities: { location: { ward: '12' } } },
      });
      assert.equal(result.output.status, 'SEARCHED');
      assert.equal(result.output.resultCount, 1);
      assert.equal(persisted.length, 1);
      assert.equal(persisted[0].status, 'REVIEW_PENDING');
    } finally {
      tavilyClient.tavilyMultiSearch = originalSearch;
      Evidence.insertMany = originalInsertMany;
    }
  });
});
