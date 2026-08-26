'use strict';

/**
 * OpenAI client wrapper
 * - Routes to correct model tier (fast vs reasoning)
 * - Enforces JSON output via response_format
 * - Measures latency & estimates token cost
 * - Returns { output, model, latencyMs, tokensUsed, cost, raw }
 */

const OpenAI = require('openai');
const { OPENAI_MODEL_FAST, OPENAI_MODEL_REASONING, MOCK_AI } = require('../../config/aiConfig');

// Lazy singleton — only instantiated if OPENAI_API_KEY is set
let _client = null;

function getClient() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set. Add it to .env or set MOCK_AI=true.');
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

/**
 * Call OpenAI with structured JSON output.
 *
 * @param {object} opts
 * @param {'fast'|'reasoning'} opts.tier   - which model tier to use
 * @param {string}             opts.system - system prompt
 * @param {string}             opts.user   - user message
 * @param {object}             opts.schema - JSON Schema for response_format (optional)
 * @param {string}             opts.mockResponse - fallback when MOCK_AI=true
 * @returns {Promise<{output:object, model:string, latencyMs:number, tokensUsed:object, cost:number}>}
 */
async function callOpenAI({ tier = 'fast', system, user, schema, mockResponse }) {
  // ── MOCK mode ──────────────────────────────────────────────────────────────
  if (MOCK_AI || process.env.NODE_ENV === 'test') {
    return {
      output: mockResponse || {},
      model: 'mock',
      latencyMs: 0,
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
      cost: 0,
    };
  }

  const model = tier === 'reasoning' ? OPENAI_MODEL_REASONING : OPENAI_MODEL_FAST;
  const client = getClient();

  const messages = [
    { role: 'system', content: system },
    { role: 'user',   content: user   },
  ];

  // Build request — use JSON schema enforcement if schema provided
  const requestParams = {
    model,
    messages,
  };

  // GPT-5-family reasoning models only support their default temperature.
  // Older chat models still benefit from deterministic low-temperature output.
  if (!/^gpt-5(?:[.-]|$)/i.test(model)) {
    requestParams.temperature = tier === 'reasoning' ? 0.2 : 0.1;
  }

  if (schema) {
    requestParams.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'structured_output',
        strict: true,
        schema,
      },
    };
  } else {
    requestParams.response_format = { type: 'json_object' };
  }

  const startMs = Date.now();
  let response;
  try {
    response = await client.chat.completions.create(requestParams);
  } catch (err) {
    // Surface OpenAI API errors clearly
    const msg = err?.error?.message || err?.message || 'OpenAI API error';
    throw new Error(`OpenAI call failed (${model}): ${msg}`);
  }
  const latencyMs = Date.now() - startMs;

  const choice = response.choices[0];
  let output;
  try {
    output = JSON.parse(choice.message.content);
  } catch {
    throw new Error(`OpenAI response was not valid JSON. Raw: ${choice.message.content?.slice(0, 200)}`);
  }

  const tokensUsed = {
    prompt:     response.usage?.prompt_tokens     || 0,
    completion: response.usage?.completion_tokens || 0,
    total:      response.usage?.total_tokens      || 0,
  };

  // Rough cost estimate (gpt-4o-mini pricing as baseline; override if needed)
  const cost = (tokensUsed.prompt * 0.00000015) + (tokensUsed.completion * 0.0000006);

  return { output, model, latencyMs, tokensUsed, cost };
}

module.exports = { callOpenAI };
