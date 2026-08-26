'use strict';

const Case = require('../models/Case');

// Common English stop-words stripped before matching. Kept intentionally
// small — matching quality matters more than exhaustive lists.
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by',
  'from', 'up', 'about', 'into', 'over', 'after', 'this', 'that', 'these',
  'those', 'it', 'its', 'there', 'here', 'very', 'not', 'no', 'has',
  'have', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could',
  'should', 'i', 'we', 'you', 'he', 'she', 'they', 'my', 'our', 'their',
  'please', 'kindly', 'also', 'near', 'since', 'many', 'much', 'lot',
]);

/** Minimum characters of description before suggestions are queried. */
const MIN_QUERY_LENGTH = 20;
/** Significant-word overlap required to call something a duplicate. */
const MIN_WORD_OVERLAP = 2;
/** Only suggest cases reported within the last N days. */
const RECENCY_DAYS = 90;
/** Maximum number of suggestions returned. */
const MAX_SUGGESTIONS = 4;

/**
 * Tokenize free text into significant lowercase words (>2 chars, not stop-word).
 */
function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Count how many DISTINCT significant words in tokensA also appear in tokensB.
 */
function countOverlap(tokensA, tokensB) {
  const setB = new Set(tokensB);
  let count = 0;
  for (const t of new Set(tokensA)) {
    if (setB.has(t)) count += 1;
  }
  return count;
}

function toSuggestion(c) {
  return {
    caseId: c.caseId,
    category: c.category,
    excerpt: c.description.slice(0, 120),
    votes: c.votes || 0,
    status: c.status,
    createdAt: c.createdAt,
  };
}

/**
 * Find recently-reported open cases similar to the given draft description.
 * Matching strategy (same starting point StackOverflow used):
 *   1. same category
 *   2. >= MIN_WORD_OVERLAP significant words shared with the description
 *   3. created within RECENCY_DAYS and still open (pending/assigned/in_progress)
 *
 * Returns:
 *   - suggestions[]  → OTHER citizens' matching cases (votable)
 *   - ownDuplicate   → the citizen's OWN recent matching case (a reminder, not votable)
 */
async function findSimilarCases({ category, description, pairwiseId }) {
  const tokens = tokenize(description);
  if (!category || tokens.length === 0) {
    return { suggestions: [], ownDuplicate: null };
  }

  const since = new Date(Date.now() - RECENCY_DAYS * 24 * 60 * 60 * 1000);
  const openStatus = ['pending', 'assigned', 'in_progress'];

  // 1) The citizen's OWN most-recent matching open case → surfaced as a
  //    reminder ("you already reported this"), so they don't re-file the
  //    exact same complaint. Never votable (can't upvote your own).
  let ownDuplicate = null;
  const ownCandidate = await Case.findOne({
    category,
    status: { $in: openStatus },
    createdAt: { $gte: since },
    pairwiseId,
  })
    .sort({ createdAt: -1 })
    .select('caseId category description votes status createdAt')
    .lean();
  if (ownCandidate && countOverlap(tokens, tokenize(ownCandidate.description)) >= MIN_WORD_OVERLAP) {
    ownDuplicate = toSuggestion(ownCandidate);
  }

  // 2) Other citizens' matching cases → votable suggestions.
  const candidates = await Case.find({
    category,
    status: { $in: openStatus },
    createdAt: { $gte: since },
    pairwiseId: { $ne: pairwiseId },
  })
    .select('caseId category description votes status createdAt')
    .sort({ votes: -1, createdAt: -1 })
    .limit(100)
    .lean();

  const suggestions = [];
  for (const c of candidates) {
    if (countOverlap(tokenize(c.description), tokens) >= MIN_WORD_OVERLAP) {
      suggestions.push(toSuggestion(c));
      if (suggestions.length >= MAX_SUGGESTIONS) break;
    }
  }
  suggestions.sort(
    (a, b) => b.votes - a.votes || new Date(b.createdAt) - new Date(a.createdAt)
  );

  return { suggestions, ownDuplicate };
}

module.exports = {
  findSimilarCases,
  tokenize,
  STOP_WORDS,
  MIN_QUERY_LENGTH,
  MIN_WORD_OVERLAP,
};
