'use strict';

const Redis = require('ioredis');
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

function createRedisConnection({ health = false } = {}) {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 2000,
    retryStrategy: health ? () => null : (attempt) => Math.min(attempt * 200, 5000),
  });
}

let healthConnection = null;
async function redisHealth() {
  if (!healthConnection) {
    healthConnection = createRedisConnection({ health: true });
    healthConnection.on('error', (err) => console.warn('[Redis] Health connection:', err.message));
  }
  try {
    if (healthConnection.status === 'wait') await healthConnection.connect();
    return { connected: (await healthConnection.ping()) === 'PONG', url: REDIS_URL };
  } catch (err) {
    return { connected: false, url: REDIS_URL, error: err.message };
  }
}

async function closeRedisHealth() {
  if (healthConnection) {
    await healthConnection.quit().catch(() => healthConnection.disconnect());
    healthConnection = null;
  }
}

module.exports = { REDIS_URL, createRedisConnection, redisHealth, closeRedisHealth };
