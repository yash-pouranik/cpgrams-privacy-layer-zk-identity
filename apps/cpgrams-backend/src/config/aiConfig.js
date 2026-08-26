'use strict';

/**
 * AI Feature Configuration
 * Central place for all AI feature flags and model settings.
 * Every AI feature reads from here — never hard-codes env vars.
 *
 * Set AI_ENABLED=false to run the full system without any AI (zero regression).
 */

const AI_ENABLED       = process.env.AI_ENABLED        !== 'false';
const MOCK_AI          = process.env.MOCK_AI            === 'true';

const AI_TRIAGE_ENABLED    = AI_ENABLED && process.env.AI_TRIAGE_ENABLED    !== 'false';
const AI_DOCUMENT_ENABLED  = AI_ENABLED && process.env.AI_DOCUMENT_ENABLED  === 'true';
const AI_RAG_ENABLED       = AI_ENABLED && process.env.AI_RAG_ENABLED       === 'true';
const AI_EVIDENCE_ENABLED  = AI_ENABLED && process.env.AI_EVIDENCE_ENABLED  === 'true';
const AI_ASSIGNMENT_ENABLED= AI_ENABLED && process.env.AI_ASSIGNMENT_ENABLED !== 'false';

// Model tiers — default to gpt-5.6-luna, fully overridable via env
const OPENAI_MODEL_FAST      = process.env.OPENAI_MODEL_FAST      || 'gpt-5.6-luna';
const OPENAI_MODEL_REASONING = process.env.OPENAI_MODEL_REASONING || 'gpt-5.6-luna';

// Worker tuning
const AI_WORKER_CONCURRENCY = parseInt(process.env.AI_WORKER_CONCURRENCY || '3', 10);
const AI_MAX_RETRIES        = parseInt(process.env.AI_MAX_RETRIES        || '3', 10);
const TAVILY_MAX_RESULTS    = parseInt(process.env.TAVILY_MAX_RESULTS    || '5', 10);

module.exports = {
  AI_ENABLED,
  MOCK_AI,
  AI_TRIAGE_ENABLED,
  AI_DOCUMENT_ENABLED,
  AI_RAG_ENABLED,
  AI_EVIDENCE_ENABLED,
  AI_ASSIGNMENT_ENABLED,
  OPENAI_MODEL_FAST,
  OPENAI_MODEL_REASONING,
  AI_WORKER_CONCURRENCY,
  AI_MAX_RETRIES,
  TAVILY_MAX_RESULTS,
};
