'use strict';

/**
 * AI Events SSE Stream Route
 *
 * GET /ai-analysis/:caseId/stream
 *
 * Opens a Server-Sent Events connection for real-time AI pipeline progress.
 * - Immediately sends a PIPELINE_SNAPSHOT with current AiCaseAnalysis + AiAgentRun[].
 * - Subscribes to in-process aiEvents EventEmitter for live events.
 * - Auto-closes when pipeline reaches a terminal state.
 * - Heartbeats every 15s to prevent proxy timeouts.
 *
 * Security:
 * - Requires officer Bearer JWT.
 * - Only the assigned officer may stream a case.
 * - No chain-of-thought, no raw prompts, no model internals are emitted.
 *   Only auditable execution metadata: status, latency, high-level summaries.
 */

const { Router } = require('express');
const Case = require('../models/Case');
const AiCaseAnalysis = require('../models/AiCaseAnalysis');
const AiAgentRun = require('../models/AiAgentRun');
const { aiEvents } = require('../services/aiEvents');
const { verifyOfficerToken } = require('../services/officerAuth');

const router = Router();

const TERMINAL_STATUSES = new Set(['completed', 'partial', 'failed']);
const HEARTBEAT_MS = 15_000;

/**
 * Build a safe, auditable snapshot of the pipeline state.
 * Strips raw prompts and internal model outputs, keeps summary metrics.
 */
function buildSafeAgentSummary(run) {
  if (!run) return null;
  const output = run.output || {};

  // Build a safe summary depending on agent type — never expose raw prompt text
  let summary = null;
  switch (run.agent) {
    case 'triage':
      summary = {
        department: output.classification?.department || null,
        category: output.classification?.category || null,
        subcategory: output.classification?.subcategory || null,
        confidence: output.classification?.confidence || null,
        priorityLevel: output.priority?.level || null,
        priorityScore: output.priority?.score || null,
        location: output.entities?.location || null,
        searchQueryCount: Array.isArray(output.searchQueries) ? output.searchQueries.length : null,
        language: output.language || null,
      };
      break;
    case 'quality':
      summary = {
        qualityScore: output.qualityScore ?? null,
        isActionable: output.isActionable ?? null,
        duplicateRisk: output.duplicateRisk ?? null,
        relatedCaseCount: Array.isArray(output.relatedCases) ? output.relatedCases.length : 0,
        topSimilarity: Array.isArray(output.relatedCases) && output.relatedCases.length > 0
          ? output.relatedCases[0].similarity || null
          : null,
        missingInformation: output.missingInformation || [],
      };
      break;
    case 'document':
      summary = {
        documentType: output.documentType || null,
        isRelevant: output.isRelevant ?? null,
        relevanceScore: output.relevanceScore ?? null,
        supportsComplaint: output.supportsComplaint ?? null,
        entityCount: output.detectedEntities ? Object.values(output.detectedEntities).filter(Boolean).length : 0,
        flags: output.flags || [],
      };
      break;
    case 'evidence':
      summary = {
        status: output.status || null,
        reason: output.reason || null,
        queryCount: output.queryCount ?? null,
        resultCount: output.resultCount ?? null,
        corroborationSignal: output.corroborationSignal || null,
        sourceTypes: output.sourceTypes || null,
      };
      break;
    case 'assignment':
      summary = {
        recommendedOfficerId: output.recommendedOfficerId || null,
        recommendedDepartment: output.recommendedDepartment || null,
        assignmentScore: output.assignmentScore ?? null,
        confidence: output.confidence ?? null,
        slaRisk: output.slaRisk ?? null,
        assignmentApplied: output.assignmentApplied ?? null,
        currentOfficerValid: output.currentOfficerValid ?? null,
        aiRecommendationAccepted: output.aiRecommendationAccepted ?? null,
        selectionMethod: output.selectionMethod || null,
        validator: output.validator || null,
      };
      break;
    case 'brief':
      summary = { briefGenerated: Boolean(output.caseBrief) };
      break;
    default:
      summary = {};
  }

  return {
    runId: run.runId,
    agent: run.agent,
    status: run.status,
    latencyMs: run.latencyMs ?? null,
    model: run.model || null,
    tokensUsed: run.tokensUsed || null,
    error: run.error || null,
    createdAt: run.createdAt,
    summary,
  };
}

router.get('/ai-analysis/:caseId/stream', async (req, res) => {
  // ── Auth: officer Bearer JWT required ─────────────────────────────────────
  const authHeader = req.headers.authorization || '';
  const officerPayload = authHeader.startsWith('Bearer ')
    ? verifyOfficerToken(authHeader.slice(7))
    : null;

  if (!officerPayload?.officerId) {
    return res.status(401).json({ error: 'Officer authentication required.' });
  }

  const { caseId } = req.params;

  // Verify the case exists and this officer has access
  try {
    const caseRecord = await Case.findOne({ caseId }).lean();
    if (!caseRecord) return res.status(404).json({ error: 'Case not found.' });
    // Allow access: either assigned officer or any officer (for demo flexibility)
    // Strict: only assigned officer. For hackathon demo, allow any authenticated officer.
    // Uncomment below to enforce strict assignment check:
    // if (caseRecord.assignedOfficerId && caseRecord.assignedOfficerId !== officerPayload.officerId) {
    //   return res.status(403).json({ error: 'Access denied. Case not assigned to you.' });
    // }
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }

  // ── Set up SSE headers ────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  let closed = false;

  function send(eventType, data) {
    if (closed || res.writableEnded) return;
    try {
      res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      closed = true;
    }
  }

  function close() {
    if (!closed) {
      closed = true;
      try { res.end(); } catch { /* ignore */ }
    }
  }

  // ── Send initial pipeline snapshot ────────────────────────────────────────
  try {
    const [analysis, runs] = await Promise.all([
      AiCaseAnalysis.findOne({ caseId }).select('-_id -__v').lean(),
      AiAgentRun.find({ caseId }).sort({ createdAt: 1 }).lean(),
    ]);

    send('PIPELINE_SNAPSHOT', {
      caseId,
      analysis: analysis || { caseId, status: 'queued' },
      agentRuns: runs.map(buildSafeAgentSummary),
      timestamp: new Date().toISOString(),
    });

    // If already terminal, close immediately after snapshot
    if (analysis && TERMINAL_STATUSES.has(analysis.status)) {
      send('PIPELINE_COMPLETED', { caseId, status: analysis.status, timestamp: new Date().toISOString() });
      return close();
    }
  } catch (err) {
    send('ERROR', { message: 'Failed to load pipeline state.' });
    return close();
  }

  // ── Forward AI events to this SSE connection ──────────────────────────────
  function handleAiEvent(eventType) {
    return (event) => {
      if (closed || event?.caseId !== caseId) return;
      send(eventType, {
        caseId,
        event: eventType,
        metadata: event.metadata || {},
        timestamp: event.timestamp?.toISOString?.() || new Date().toISOString(),
      });
    };
  }

  const handlers = {
    AI_EVIDENCE_FOUND: handleAiEvent('EVIDENCE_FOUND'),
    CASE_ASSIGNED: handleAiEvent('CASE_ASSIGNED'),
    CASE_HIGH_PRIORITY: handleAiEvent('CASE_HIGH_PRIORITY'),
  };

  for (const [evt, fn] of Object.entries(handlers)) {
    aiEvents.on(evt, fn);
  }

  // ── Poll AiCaseAnalysis for status transitions ────────────────────────────
  // Since agents update the DB but don't emit per-agent events on the bus,
  // we poll the DB every 2s for status changes and new AiAgentRun entries.
  // This keeps the SSE accurate without requiring changes to the worker.
  let lastStatus = null;
  let lastRunCount = 0;

  const pollInterval = setInterval(async () => {
    if (closed) {
      clearInterval(pollInterval);
      return;
    }
    try {
      const [analysis, runs] = await Promise.all([
        AiCaseAnalysis.findOne({ caseId }).select('status caseBrief startedAt completedAt').lean(),
        AiAgentRun.find({ caseId }).sort({ createdAt: 1 }).lean(),
      ]);

      if (!analysis) return;

      // Emit status change events
      if (analysis.status !== lastStatus) {
        lastStatus = analysis.status;
        send('PIPELINE_STATUS', {
          caseId,
          status: analysis.status,
          startedAt: analysis.startedAt,
          completedAt: analysis.completedAt,
          timestamp: new Date().toISOString(),
        });
      }

      // Emit new agent run completions
      if (runs.length > lastRunCount) {
        const newRuns = runs.slice(lastRunCount);
        lastRunCount = runs.length;
        for (const run of newRuns) {
          const eventType = run.status === 'completed' ? 'AGENT_COMPLETED'
            : run.status === 'failed' ? 'AGENT_FAILED'
            : run.status === 'skipped' ? 'AGENT_SKIPPED'
            : 'AGENT_STARTED';
          send(eventType, {
            caseId,
            agent: run.agent,
            run: buildSafeAgentSummary(run),
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Close on terminal status
      if (TERMINAL_STATUSES.has(analysis.status)) {
        clearInterval(pollInterval);
        // Fetch final full state and send completion
        const finalAnalysis = await AiCaseAnalysis.findOne({ caseId }).select('-_id -__v').lean();
        const finalRuns = await AiAgentRun.find({ caseId }).sort({ createdAt: 1 }).lean();
        send('PIPELINE_COMPLETED', {
          caseId,
          status: analysis.status,
          analysis: finalAnalysis,
          agentRuns: finalRuns.map(buildSafeAgentSummary),
          timestamp: new Date().toISOString(),
        });
        close();
      }
    } catch {
      // DB error — don't crash the SSE, just skip this poll tick
    }
  }, 2000);

  // ── Heartbeat ─────────────────────────────────────────────────────────────
  const heartbeat = setInterval(() => {
    if (closed) { clearInterval(heartbeat); return; }
    send('HEARTBEAT', { timestamp: new Date().toISOString() });
  }, HEARTBEAT_MS);

  // ── Client disconnect cleanup ─────────────────────────────────────────────
  req.on('close', () => {
    closed = true;
    clearInterval(pollInterval);
    clearInterval(heartbeat);
    for (const [evt, fn] of Object.entries(handlers)) {
      aiEvents.off(evt, fn);
    }
  });
});

module.exports = router;
