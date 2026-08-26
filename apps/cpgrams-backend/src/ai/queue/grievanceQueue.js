'use strict';

const { Queue } = require('bullmq');
const { createRedisConnection } = require('../../config/redis');

const QUEUE_NAME = 'grievance-intelligence';
const connection = createRedisConnection();
const grievanceQueue = new Queue(QUEUE_NAME, { connection });
grievanceQueue.on('error', (err) => console.error('[Queue] BullMQ queue error:', err.message));

async function enqueueAiAnalysis(caseId, meta = {}) {
  try {
    const job = await grievanceQueue.add('analyze-grievance', {
      caseId,
      meta,
      enqueuedAt: new Date().toISOString(),
    }, {
      jobId: caseId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 86400, count: 1000 },
      removeOnFail: { age: 604800, count: 5000 },
    });
    console.log(`[Queue] Enqueued AI analysis for ${caseId} (job ${job.id})`);
    return job;
  } catch (err) {
    if (err.message?.includes('Job already exists')) {
      console.log(`[Queue] Case ${caseId} already queued — skipping duplicate.`);
      return null;
    }
    console.error(`[Queue] Failed to enqueue ${caseId}:`, err.message);
    return null;
  }
}

async function queueStats() {
  try {
    await grievanceQueue.waitUntilReady();
    return await grievanceQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
  } catch (err) {
    console.warn('[Queue] Unable to read queue stats:', err.message);
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, unavailable: true, error: err.message };
  }
}

async function closeQueue() {
  await grievanceQueue.close();
}

function pendingCount() {
  return 0;
}

module.exports = { QUEUE_NAME, grievanceQueue, enqueueAiAnalysis, queueStats, closeQueue, pendingCount };
