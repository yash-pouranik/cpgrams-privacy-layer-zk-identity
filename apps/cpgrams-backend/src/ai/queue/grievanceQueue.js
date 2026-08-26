'use strict';

/**
 * In-Memory Grievance Intelligence Queue
 *
 * Hackathon-safe replacement for Redis + BullMQ.
 * Uses Node.js EventEmitter to run AI analysis asynchronously
 * AFTER the HTTP response is sent — so grievance creation never blocks.
 *
 * Same external interface as a BullMQ queue:
 *   enqueueAiAnalysis(caseId)    → fires worker in background
 *   getJobStatus(caseId)         → reads AiCaseAnalysis from DB
 *
 * To upgrade to BullMQ later: swap this file only. No other code changes needed.
 */

const { EventEmitter } = require('events');

const queueEmitter = new EventEmitter();
queueEmitter.setMaxListeners(50); // support burst of simultaneous submissions

// Pending job set — prevents double-enqueue for same case
const _pending = new Set();

/**
 * Enqueue AI analysis for a case.
 * Emits 'job' event which the worker picks up asynchronously.
 */
function enqueueAiAnalysis(caseId, meta = {}) {
  if (_pending.has(caseId)) {
    console.log(`[Queue] Case ${caseId} already queued — skipping duplicate.`);
    return;
  }
  _pending.add(caseId);
  // setImmediate so current callstack (HTTP response) finishes first
  setImmediate(() => {
    queueEmitter.emit('job', { caseId, enqueuedAt: new Date(), meta });
  });
  console.log(`[Queue] Enqueued AI analysis for ${caseId}`);
}

/**
 * Register the worker handler.
 * Called once at server startup by the worker module.
 */
function registerWorker(handler) {
  queueEmitter.on('job', async (job) => {
    try {
      await handler(job);
    } catch (err) {
      console.error(`[Queue] Worker unhandled error for ${job.caseId}:`, err);
    } finally {
      _pending.delete(job.caseId);
    }
  });
  console.log('[Queue] Grievance Intelligence worker registered.');
}

/**
 * For test/admin: how many jobs are currently in-flight
 */
function pendingCount() {
  return _pending.size;
}

module.exports = { enqueueAiAnalysis, registerWorker, pendingCount };
