'use strict';

/**
 * Pinecone client wrapper
 * - Lazy initialisation (only when PINECONE_API_KEY is set)
 * - Namespace-scoped upsert / query / delete
 * - Gracefully no-ops if key not configured (Phase 3 enables it)
 */

let _pineconeClient = null;
let _index = null;

async function getPineconeIndex() {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX || 'cpgrams-index';

  if (!apiKey) {
    return null; // Phase 3 will enable this; Phase 1 skips silently
  }

  if (_index) return _index;

  try {
    // Lazy require so server boots without @pinecone-database/pinecone installed
    const { Pinecone } = require('@pinecone-database/pinecone');
    _pineconeClient = new Pinecone({ apiKey });
    _index = _pineconeClient.index(indexName);
    return _index;
  } catch (err) {
    console.warn('[Pinecone] SDK not installed or init failed:', err.message);
    return null;
  }
}

/**
 * Upsert a vector into a namespace.
 * @param {string} namespace  - 'complaints' | 'evidence' | 'documents'
 * @param {string} id         - unique vector ID (e.g. caseId)
 * @param {number[]} values   - embedding vector
 * @param {object} metadata   - filterable metadata
 */
async function upsertVector(namespace, id, values, metadata = {}) {
  const index = await getPineconeIndex();
  if (!index) return null;

  if (!id || !Array.isArray(values) || values.length === 0) {
    console.warn(`[Pinecone] Skipping invalid vector (ns=${namespace}, id=${id || 'unknown'})`);
    return null;
  }

  const cleanMetadata = Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== null && value !== undefined),
  );

  try {
    // Pinecone SDK v8 expects the named records payload.
    await index.namespace(namespace).upsert({
      records: [{ id, values, metadata: cleanMetadata }],
    });
    return true;
  } catch (err) {
    console.warn(`[Pinecone] Upsert failed (ns=${namespace}, id=${id}):`, err.message);
    return null;
  }
}

/**
 * Query similar vectors.
 * @param {string}   namespace
 * @param {number[]} queryVector
 * @param {number}   topK
 * @param {object}   filter     - Pinecone metadata filter
 * @returns {Array}  matches with id, score, metadata
 */
async function querySimilar(namespace, queryVector, topK = 10, filter = {}) {
  const index = await getPineconeIndex();
  if (!index) return [];

  try {
    const result = await index.namespace(namespace).query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });
    return result.matches || [];
  } catch (err) {
    console.warn(`[Pinecone] Query failed (ns=${namespace}):`, err.message);
    return [];
  }
}

/**
 * Delete vectors by IDs from a namespace.
 */
async function deleteVectors(namespace, ids = []) {
  const index = await getPineconeIndex();
  if (!index || ids.length === 0) return null;

  try {
    await index.namespace(namespace).deleteMany(ids);
    return true;
  } catch (err) {
    console.warn(`[Pinecone] Delete failed (ns=${namespace}):`, err.message);
    return null;
  }
}

module.exports = { upsertVector, querySimilar, deleteVectors, getPineconeIndex };
