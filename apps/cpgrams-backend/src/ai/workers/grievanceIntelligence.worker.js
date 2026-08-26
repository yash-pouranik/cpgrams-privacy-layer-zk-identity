'use strict';

/**
 * Grievance Intelligence Orchestrator Worker
 *
 * Runs the full AI pipeline for a case asynchronously (after HTTP response).
 * Phase 1: scaffolding + status tracking. Agent stubs call real agents in later phases.
 *
 * Pipeline order:
 *   1. Agent 1 — Triage & Routing
 *   2. Agent 2 + Agent 3 — Document AI + Semantic Quality (parallel, Phase 4 & 3)
 *   3. Agent 5 — Evidence Enrichment (Phase 5)
 *   4. Agent 4 — Assignment Recommendation (Phase 6)
 *   5. Brief Generator (Phase 6)
 */

const { nanoid } = require('nanoid');
const AiCaseAnalysis = require('../../models/AiCaseAnalysis');
const AiAgentRun     = require('../../models/AiAgentRun');
const Case           = require('../../models/Case');
const { Worker } = require('bullmq');
const { QUEUE_NAME } = require('../queue/grievanceQueue');
const { createRedisConnection } = require('../../config/redis');
const { autoAssignWithAI } = require('../../services/autoAssign');
const {
  AI_TRIAGE_ENABLED,
  AI_DOCUMENT_ENABLED,
  AI_RAG_ENABLED,
  AI_EVIDENCE_ENABLED,
  AI_ASSIGNMENT_ENABLED,
  AI_WORKER_CONCURRENCY,
} = require('../../config/aiConfig');

// ── Agent imports (will be populated in later phases) ──────────────────────
let runTriageAgent    = null;
let runQualityAgent   = null;
let runDocumentAgent  = null;
let runEvidenceAgent  = null;
let runAssignmentAgent = null;
let generateBrief     = null;

// Lazy-load agents to avoid crashing if a phase isn't implemented yet
function tryRequire(path, label) {
  try {
    return require(path);
  } catch {
    // Agent not yet implemented — return null stub
    return null;
  }
}

/**
 * Log one agent run to DB.
 * @param {string} caseId
 * @param {string} agent
 * @param {'completed'|'failed'|'skipped'} status
 * @param {object} opts - { input, output, model, latencyMs, tokensUsed, cost, error }
 */
async function logAgentRun(caseId, agent, status, opts = {}) {
  try {
    await AiAgentRun.create({
      runId:      `${caseId}-${agent}-${nanoid(6)}`,
      caseId,
      agent,
      status,
      input:      opts.input      || null,
      output:     opts.output     || null,
      model:      opts.model      || null,
      latencyMs:  opts.latencyMs  || null,
      tokensUsed: opts.tokensUsed || { prompt: 0, completion: 0, total: 0 },
      cost:       opts.cost       || 0,
      error:      opts.error      || null,
    });
  } catch (err) {
    console.warn(`[Worker] Failed to log agent run (${caseId}/${agent}):`, err.message);
  }
}

/**
 * Main worker handler — called for each job from the queue.
 */
async function processGrievanceIntelligence(job) {
  const { caseId } = job;
  console.log(`\n[Worker] ▶ Starting AI pipeline for ${caseId}`);

  // ── Upsert initial AiCaseAnalysis record ──────────────────────────────────
  let analysis;
  try {
    analysis = await AiCaseAnalysis.findOneAndUpdate(
      { caseId },
      { $set: { status: 'processing', startedAt: new Date(), error: null } },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error(`[Worker] Cannot create AiCaseAnalysis for ${caseId}:`, err.message);
    return;
  }

  // Track which agents succeeded for partial-completion handling
  const results = {};
  let failed = false;

  // ── Load Case data for agent inputs ───────────────────────────────────────
  let caseData = null;
  try {
    caseData = await Case.findOne({ caseId }).lean();
    if (!caseData) {
      throw new Error(`Case ${caseId} not found in DB`);
    }
  } catch (err) {
    console.error(`[Worker] Cannot load case ${caseId}:`, err.message);
    await AiCaseAnalysis.findOneAndUpdate(
      { caseId },
      { $set: { status: 'failed', error: err.message, completedAt: new Date() } }
    );
    return;
  }

  // ── AGENT 1: Triage & Routing ─────────────────────────────────────────────
  if (AI_TRIAGE_ENABLED) {
    await AiCaseAnalysis.findOneAndUpdate({ caseId }, { $set: { status: 'triaging' } });

    // Lazy-load triage agent (Phase 2 implements it)
    if (!runTriageAgent) runTriageAgent = tryRequire('../agents/triage/triage.agent', 'triage')?.runTriageAgent;

    if (runTriageAgent) {
      try {
        const input = {
          caseId,
          category:    caseData.category,
          description: caseData.description,
          department:  caseData.department,
          orgType:     caseData.orgType,
          evidenceUrls:caseData.evidenceUrls,
        };
        const t0 = Date.now();
        const triageResult = await runTriageAgent(input);
        const latencyMs = Date.now() - t0;

        results.triage = triageResult.output;
        await AiCaseAnalysis.findOneAndUpdate({ caseId }, { $set: { triage: triageResult.output } });
        await logAgentRun(caseId, 'triage', 'completed', { input, ...triageResult, latencyMs });
        console.log(`[Worker] Agent 1 (Triage) ✓ ${latencyMs}ms`);
      } catch (err) {
        console.error(`[Worker] Agent 1 (Triage) ✗:`, err.message);
        await logAgentRun(caseId, 'triage', 'failed', { error: err.message });
        failed = true;
      }
    } else {
      // Phase 2 not yet built — log as skipped
      await logAgentRun(caseId, 'triage', 'skipped', {});
      console.log(`[Worker] Agent 1 (Triage) skipped — not yet implemented`);
    }
  } else {
    await logAgentRun(caseId, 'triage', 'skipped', {});
  }

  // ── AGENT 2 + AGENT 3: Parallel (Document AI + Semantic Quality) ──────────
  await AiCaseAnalysis.findOneAndUpdate(
    { caseId },
    { $set: { status: 'analyzing_documents' } }
  );

  const parallelTasks = [];

  if (AI_DOCUMENT_ENABLED) {
    if (!runDocumentAgent) runDocumentAgent = tryRequire('../agents/documents/document.agent', 'document')?.runDocumentAgent;
    if (runDocumentAgent) {
      parallelTasks.push(
        (async () => {
          try {
            const Document = require('../../models/Document');
            const docs = await Document.find({ caseId }).lean();
            const docResults = [];
            for (const doc of docs) {
              const t0 = Date.now();
              const res = await runDocumentAgent({ caseId, ...doc, triageContext: results.triage });
              const latencyMs = Date.now() - t0;
              docResults.push(res.output);
              await logAgentRun(caseId, 'document', 'completed', { input: { documentId: doc._id }, ...res, latencyMs });
            }
            results.documentAnalysis = docResults;
            await AiCaseAnalysis.findOneAndUpdate({ caseId }, { $set: { documentAnalysis: docResults } });
            console.log(`[Worker] Agent 2 (Document) ✓ ${docs.length} docs`);
          } catch (err) {
            console.error(`[Worker] Agent 2 (Document) ✗:`, err.message);
            await logAgentRun(caseId, 'document', 'failed', { error: err.message });
          }
        })()
      );
    } else {
      await logAgentRun(caseId, 'document', 'skipped', {});
    }
  } else {
    await logAgentRun(caseId, 'document', 'skipped', {});
  }

  if (AI_RAG_ENABLED) {
    await AiCaseAnalysis.findOneAndUpdate(
      { caseId },
      { $set: { status: 'checking_similar_cases' } }
    );
    if (!runQualityAgent) runQualityAgent = tryRequire('../agents/quality/quality.agent', 'quality')?.runQualityAgent;
    if (runQualityAgent) {
      parallelTasks.push(
        (async () => {
          try {
            const t0 = Date.now();
            const input = { caseId, description: caseData.description, category: caseData.category, triageResult: results.triage };
            const res = await runQualityAgent(input);
            const latencyMs = Date.now() - t0;
            results.quality = res.output;
            await AiCaseAnalysis.findOneAndUpdate({ caseId }, { $set: { quality: res.output } });
            await logAgentRun(caseId, 'quality', 'completed', { input, ...res, latencyMs });
            console.log(`[Worker] Agent 3 (Quality/RAG) ✓ ${latencyMs}ms`);
          } catch (err) {
            console.error(`[Worker] Agent 3 (Quality) ✗:`, err.message);
            await logAgentRun(caseId, 'quality', 'failed', { error: err.message });
          }
        })()
      );
    } else {
      await logAgentRun(caseId, 'quality', 'skipped', {});
    }
  } else {
    await logAgentRun(caseId, 'quality', 'skipped', {});
  }

  if (parallelTasks.length > 0) {
    await Promise.allSettled(parallelTasks);
  }

  // ── AGENT 5: Evidence Enrichment ──────────────────────────────────────────
  if (AI_EVIDENCE_ENABLED) {
    await AiCaseAnalysis.findOneAndUpdate({ caseId }, { $set: { status: 'enriching_evidence' } });
    if (!runEvidenceAgent) runEvidenceAgent = tryRequire('../agents/evidence/evidence.agent', 'evidence')?.runEvidenceAgent;
    if (runEvidenceAgent) {
      try {
        const t0 = Date.now();
        const input = { caseId, description: caseData.description, triageResult: results.triage };
        const res = await runEvidenceAgent(input);
        const latencyMs = Date.now() - t0;
        results.evidenceSummary = res.output;
        await AiCaseAnalysis.findOneAndUpdate({ caseId }, { $set: { evidenceSummary: res.output } });
        await logAgentRun(caseId, 'evidence', 'completed', { input, ...res, latencyMs });
        console.log(`[Worker] Agent 5 (Evidence) ✓ ${latencyMs}ms`);
      } catch (err) {
        console.error(`[Worker] Agent 5 (Evidence) ✗:`, err.message);
        await logAgentRun(caseId, 'evidence', 'failed', { error: err.message });
      }
    } else {
      await logAgentRun(caseId, 'evidence', 'skipped', {});
    }
  } else {
    await logAgentRun(caseId, 'evidence', 'skipped', {});
  }

  // ── AGENT 4: Assignment Recommendation ───────────────────────────────────
  if (AI_ASSIGNMENT_ENABLED) {
    await AiCaseAnalysis.findOneAndUpdate({ caseId }, { $set: { status: 'assigning' } });
    if (!runAssignmentAgent) runAssignmentAgent = tryRequire('../agents/assignment/assignment.agent', 'assignment')?.runAssignmentAgent;
    if (runAssignmentAgent) {
      try {
        const t0 = Date.now();
        const input = { caseId, triageResult: results.triage, qualityResult: results.quality, currentOfficerAssignment: caseData.assignedOfficerId };
        const res = await runAssignmentAgent(input);
        const latencyMs = Date.now() - t0;
        results.assignment = res.output;
        await AiCaseAnalysis.findOneAndUpdate({ caseId }, { $set: { assignment: res.output } });
        await logAgentRun(caseId, 'assignment', 'completed', { input, ...res, latencyMs });
        console.log(`[Worker] Agent 4 (Assignment) ✓ ${latencyMs}ms`);
      } catch (err) {
        console.error(`[Worker] Agent 4 (Assignment) ✗:`, err.message);
        await logAgentRun(caseId, 'assignment', 'failed', { error: err.message });
      }
    } else {
      try {
        const t0 = Date.now();
        const recommendation = await autoAssignWithAI(
          results.triage,
          { category: caseData.category, description: caseData.description },
          // The HTTP submission may already have reserved an officer slot.
          { reserve: !caseData.assignedOfficerId }
        );
        const latencyMs = Date.now() - t0;
        results.assignment = recommendation;

        if (recommendation && !caseData.assignedOfficerId) {
          await Case.updateOne(
            { caseId, assignedOfficerId: null },
            {
              $set: {
                assignedOfficerId: recommendation.officerId,
                department: recommendation.resolvedDepartment,
              },
            }
          );
        }

        await AiCaseAnalysis.findOneAndUpdate(
          { caseId },
          { $set: { assignment: recommendation } }
        );
        await logAgentRun(caseId, 'assignment', 'completed', {
          input: { caseId, triageResult: results.triage, currentOfficerAssignment: caseData.assignedOfficerId },
          output: recommendation,
          model: 'deterministic-ai-aware-routing',
          latencyMs,
        });
        console.log(`[Worker] Agent 4 (Assignment fallback) ✓ ${latencyMs}ms`);
      } catch (err) {
        console.error(`[Worker] Agent 4 (Assignment fallback) ✗:`, err.message);
        await logAgentRun(caseId, 'assignment', 'failed', { error: err.message });
      }
    }
  } else {
    await logAgentRun(caseId, 'assignment', 'skipped', {});
  }

  // ── Brief Generator ───────────────────────────────────────────────────────
  if (!generateBrief) generateBrief = tryRequire('../../ai/services/briefGenerator', 'brief')?.generateBrief;
  let caseBrief = null;
  if (generateBrief && (results.triage || results.evidenceSummary || results.quality)) {
    try {
      caseBrief = await generateBrief({ caseId, caseData, results });
      await logAgentRun(caseId, 'brief', 'completed', { output: { caseBrief } });
      console.log(`[Worker] Brief Generator ✓`);
    } catch (err) {
      console.error(`[Worker] Brief Generator ✗:`, err.message);
      await logAgentRun(caseId, 'brief', 'failed', { error: err.message });
    }
  } else {
    await logAgentRun(caseId, 'brief', 'skipped', {});
  }

  // ── Finalise ──────────────────────────────────────────────────────────────
  const finalStatus = failed ? 'partial' : 'completed';
  await AiCaseAnalysis.findOneAndUpdate(
    { caseId },
    {
      $set: {
        status:      finalStatus,
        caseBrief,
        completedAt: new Date(),
      },
    }
  );

  console.log(`[Worker] ■ Pipeline ${finalStatus.toUpperCase()} for ${caseId}\n`);
}

/**
 * Initialise the worker — register it with the queue.
 * Called once from app.js on server boot.
 */
function startWorker() {
  const worker = new Worker(QUEUE_NAME, async (job) => processGrievanceIntelligence(job.data), {
    connection: createRedisConnection(),
    concurrency: AI_WORKER_CONCURRENCY,
  });
  worker.on('ready', () => console.log(`[Worker] BullMQ worker ready (concurrency ${AI_WORKER_CONCURRENCY}).`));
  worker.on('completed', (job) => console.log(`[Worker] Job ${job.id} completed.`));
  worker.on('failed', (job, err) => console.error(`[Worker] Job ${job?.id || 'unknown'} failed:`, err.message));
  worker.on('error', (err) => console.error('[Worker] BullMQ error:', err.message));
  return worker;
}

async function stopWorker(worker) {
  if (worker) await worker.close();
}

module.exports = { startWorker, stopWorker, processGrievanceIntelligence };
