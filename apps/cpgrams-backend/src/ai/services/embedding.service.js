'use strict';

const crypto = require('crypto');
const OpenAI = require('openai');

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const DIMENSIONS = 1536;
let client = null;
const cache = new Map();

function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

function mockEmbedding(text) {
  const values = new Array(DIMENSIONS).fill(0);
  const normalized = String(text || '').toLowerCase().trim();
  for (let offset = 0; offset < normalized.length; offset += 1) {
    const digest = crypto.createHash('sha256').update(`${normalized}:${offset}`).digest();
    for (let i = 0; i < digest.length; i += 1) values[(offset + i) % DIMENSIONS] += (digest[i] - 128) / 128;
  }
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map((value) => value / magnitude);
}

async function embedText(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return new Array(DIMENSIONS).fill(0);
  if (cache.has(normalized)) return cache.get(normalized);

  let vector;
  if (process.env.NODE_ENV === 'test' || process.env.MOCK_AI === 'true') {
    vector = mockEmbedding(normalized);
  } else {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required for embeddings.');
    const response = await getClient().embeddings.create({ model: EMBEDDING_MODEL, input: normalized, dimensions: DIMENSIONS });
    vector = response.data[0].embedding;
  }
  cache.set(normalized, vector);
  return vector;
}

async function embedBatch(texts) {
  return Promise.all((texts || []).map(embedText));
}

function clearEmbeddingCache() { cache.clear(); }

module.exports = { EMBEDDING_MODEL, DIMENSIONS, embedText, embedBatch, clearEmbeddingCache, mockEmbedding };
