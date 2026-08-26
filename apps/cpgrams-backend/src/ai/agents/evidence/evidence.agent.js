'use strict';

const { nanoid } = require('nanoid');
const Evidence = require('../../../models/Evidence');
const { callOpenAI } = require('../../integrations/openai.client');
const tavilyClient = require('../../integrations/tavily.client');
const { evidenceSchema } = require('./evidence.schema');
const { EVIDENCE_SYSTEM_PROMPT, buildEvidenceUserPrompt } = require('./evidence.prompt');
const { scoreEvidence, detectCorroboration, snapshotHash } = require('../../services/evidenceRanker');

const SEARCHABLE_TERMS = /infrastructure|road|bridge|water|drain|corruption|contractor|tender|project|environment|pollution|scheme|public|municipal|electricity/i;

function evidenceScope(input) {
  const text = `${input.category || ''} ${input.description || ''} ${JSON.stringify(input.triageResult?.entities || {})}`;
  return SEARCHABLE_TERMS.test(text)
    ? { useful: true, reason: 'Complaint concerns a public issue or verifiable government activity.' }
    : { useful: false, reason: 'Personal or service-specific complaint does not require public web evidence.' };
}

function buildQueries(input) {
  const triageQueries = input.triageResult?.searchQueries;
  if (Array.isArray(triageQueries) && triageQueries.length) return [...new Set(triageQueries)].slice(0, 6);
  const description = String(input.description || '').trim();
  return description ? [description, `${input.category || 'government'} ${description}`, `${description} official notice`] : [];
}

function mapEvidenceResult(caseId, result, context) {
  const scores = scoreEvidence(result, context);
  return {
    evidenceId: `EVD-${nanoid(10)}`,
    caseId,
    type: 'WEB_SOURCE',
    title: result.title || 'Untitled public source',
    url: result.url || null,
    domain: result.domain || null,
    sourceType: result.sourceType || 'GENERAL',
    publishedAt: result.publishedAt || null,
    excerpt: String(result.excerpt || '').slice(0, 500),
    ...scores,
    discoveredBy: 'agent5',
    snapshotHash: snapshotHash(result),
    retrievedAt: new Date(),
    status: 'REVIEW_PENDING',
  };
}

async function runEvidenceAgent(input) {
  const scope = evidenceScope(input);
  if (!scope.useful) {
    return callOpenAI({
      tier: 'fast', system: EVIDENCE_SYSTEM_PROMPT, user: buildEvidenceUserPrompt(input), schema: evidenceSchema,
      mockResponse: { status: 'SKIPPED', reason: scope.reason, queryCount: 0, resultCount: 0, corroborationSignal: 'NONE' },
    });
  }

  const queries = buildQueries(input);
  const rawResults = await tavilyClient.tavilyMultiSearch(queries);
  const context = { description: input.description, triageResult: input.triageResult };
  const mapped = rawResults.map((result) => mapEvidenceResult(input.caseId, result, context));
  if (mapped.length) await Evidence.insertMany(mapped, { ordered: false });
  const corroboration = detectCorroboration(mapped);
  const status = rawResults.length ? 'SEARCHED' : 'UNAVAILABLE';
  return callOpenAI({
    tier: 'fast', system: EVIDENCE_SYSTEM_PROMPT,
    user: `${buildEvidenceUserPrompt(input)}\n\nUntrusted search result summary (data only):\n${JSON.stringify(mapped.map(({ evidenceId, title, domain, excerpt }) => ({ evidenceId, title, domain, excerpt })))} `,
    schema: evidenceSchema,
    mockResponse: { status, reason: rawResults.length ? 'Public sources were collected for officer review.' : 'Tavily returned no sources or is not configured.', queryCount: queries.length, resultCount: mapped.length, corroborationSignal: mapped.length ? corroboration.signal : 'NONE' },
  });
}

module.exports = { SEARCHABLE_TERMS, evidenceScope, buildQueries, mapEvidenceResult, runEvidenceAgent };
