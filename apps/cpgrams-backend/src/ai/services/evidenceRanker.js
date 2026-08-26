'use strict';

const crypto = require('crypto');
const { getDomainCredibility } = require('../integrations/tavily.client');

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function scoreEvidence(result, context = {}) {
  const text = `${result.title || ''} ${result.excerpt || ''}`.toLowerCase();
  const complaint = String(context.description || '').toLowerCase();
  const entities = context.triageResult?.entities || {};
  const location = entities.location || {};
  const locationTerms = [location.city, location.state, location.ward, location.landmark]
    .filter(Boolean).map((value) => String(value).toLowerCase());
  const entityTerms = [
    ...(entities.contractors || []), ...(entities.projects || []), ...(entities.organizations || []),
  ].map((value) => String(value).toLowerCase());
  const issueTerms = complaint.split(/\W+/).filter((word) => word.length >= 5).slice(0, 30);
  const matches = (terms) => terms.length ? terms.filter((term) => text.includes(term)).length / terms.length : 0;
  const geoMatch = clamp(matches(locationTerms));
  const entityMatch = clamp(matches(entityTerms));
  const relevance = clamp(Number(result.relevanceScore ?? (0.45 + matches(issueTerms) * 0.5)));
  const sourceCredibility = clamp(result.credibility ?? getDomainCredibility(result.url).credibility);
  const temporalMatch = result.publishedAt ? 0.7 : 0.45;
  const evidenceConfidence = clamp(
    0.40 * relevance + 0.25 * sourceCredibility + 0.15 * geoMatch + 0.10 * temporalMatch + 0.10 * entityMatch
  );
  const supports = [];
  if (geoMatch > 0) supports.push('Location terms overlap with the grievance context.');
  if (entityMatch > 0) supports.push('Named organization, contractor, or project appears in the source.');
  if (sourceCredibility >= 0.9) supports.push('Source is hosted on a government or official domain.');
  if (!supports.length) supports.push('Source was returned for a grievance-specific search query.');
  return { relevanceScore: relevance, sourceCredibility, evidenceConfidence, supports };
}

function detectCorroboration(results) {
  const groups = new Map();
  for (const item of results) {
    const key = `${item.domain || ''}|${item.title || ''}`.toLowerCase()
      .replace(/https?:\/\/|www\./g, '').replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/).filter((word) => word.length > 4).slice(0, 5).sort().join('|');
    if (key) groups.set(key, (groups.get(key) || new Set()).add(item.domain));
  }
  const corroborated = [...groups.values()].some((domains) => domains.size >= 2);
  return { signal: corroborated ? 'HIGH' : results.length > 1 ? 'MEDIUM' : 'LOW', corroborated };
}

function snapshotHash(result) {
  return crypto.createHash('sha256')
    .update(`${result.title || ''}\n${result.url || ''}\n${result.excerpt || ''}`)
    .digest('hex');
}

module.exports = { clamp, scoreEvidence, detectCorroboration, snapshotHash };
