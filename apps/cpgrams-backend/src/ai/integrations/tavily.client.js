'use strict';

/**
 * Tavily Search client
 * - Pure REST (no SDK needed)
 * - Domain credibility scoring
 * - Result deduplication by URL
 * - Skips gracefully if TAVILY_API_KEY not set
 */

const { TAVILY_MAX_RESULTS, MOCK_AI } = require('../../config/aiConfig');

// Domain credibility heuristics
const DOMAIN_TIERS = {
  GOVERNMENT: { score: 0.93, patterns: ['.gov.in', '.nic.in', '.gov', '.ias.nic.in', 'indiacode.nic.in'] },
  NEWS:       { score: 0.80, patterns: ['thehindu.com', 'ndtv.com', 'hindustantimes.com', 'theprint.in', 'scroll.in', 'thewire.in', 'indianexpress.com', 'livemint.com'] },
  NGO:        { score: 0.72, patterns: ['.org', 'prsindia.org', 'cprindia.org'] },
  ACADEMIC:   { score: 0.75, patterns: ['.edu', '.ac.in'] },
  GENERAL:    { score: 0.40, patterns: [] },
};

function getDomainCredibility(url) {
  if (!url) return { sourceType: 'GENERAL', credibility: 0.40 };
  const lower = url.toLowerCase();
  for (const [type, { score, patterns }] of Object.entries(DOMAIN_TIERS)) {
    if (patterns.some((p) => lower.includes(p))) {
      return { sourceType: type, credibility: score };
    }
  }
  return { sourceType: 'GENERAL', credibility: 0.40 };
}

/**
 * Execute a single Tavily search query.
 * Returns array of result objects with credibility metadata added.
 */
async function tavilySearch(query, opts = {}) {
  if (MOCK_AI || process.env.NODE_ENV === 'test') {
    return []; // no external calls in test/mock mode
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn('[Tavily] TAVILY_API_KEY not set — skipping evidence search.');
    return [];
  }

  const payload = {
    api_key: apiKey,
    query,
    search_depth: opts.searchDepth || 'advanced',
    max_results: opts.maxResults || TAVILY_MAX_RESULTS,
    include_answer: false,
    include_raw_content: false,
  };

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000), // 15s hard timeout
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(`[Tavily] Search failed (${response.status}): ${text.slice(0, 200)}`);
      return [];
    }

    const data = await response.json();
    return (data.results || []).map((r) => {
      const { sourceType, credibility } = getDomainCredibility(r.url);
      return {
        title:       r.title,
        url:         r.url,
        excerpt:     r.content?.slice(0, 500) || '',
        publishedAt: r.published_date || null,
        domain:      new URL(r.url).hostname,
        sourceType,
        credibility,
      };
    });
  } catch (err) {
    console.warn(`[Tavily] Search error for query "${query}":`, err.message);
    return [];
  }
}

/**
 * Execute multiple queries, deduplicate by URL, return all results.
 */
async function tavilyMultiSearch(queries = []) {
  const results = await Promise.all(queries.map((q) => tavilySearch(q)));
  const flat = results.flat();

  // Deduplicate by URL
  const seen = new Set();
  return flat.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

module.exports = { tavilySearch, tavilyMultiSearch, getDomainCredibility };
