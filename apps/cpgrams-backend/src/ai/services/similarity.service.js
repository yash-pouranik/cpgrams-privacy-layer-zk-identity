'use strict';

const { embedText } = require('./embedding.service');
const { upsertVector, querySimilar } = require('../integrations/pinecone.client');

const NAMESPACE = 'complaints';

async function indexComplaint(caseId, text, metadata = {}) {
  const values = await embedText(text);
  const indexed = await upsertVector(NAMESPACE, caseId, values, { caseId, ...metadata });
  return { caseId, indexed: Boolean(indexed), dimensions: values.length };
}

async function findSimilar(text, filters = {}, topK = 10) {
  const values = await embedText(text);
  const matches = await querySimilar(NAMESPACE, values, topK, filters);
  return matches.filter((match) => match.id && match.score !== undefined);
}

module.exports = { NAMESPACE, indexComplaint, findSimilar };
