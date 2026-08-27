'use strict';

const { EventEmitter } = require('node:events');
const AuditLog = require('../models/AuditLog');

const aiEvents = new EventEmitter();

async function publishAiEvent(eventType, { caseId, actorId = 'drishti-ai', metadata = {} } = {}) {
  if (!caseId || !eventType) return null;
  const event = { eventType, caseId, actorId, metadata, timestamp: new Date() };
  await AuditLog.create({ eventType, actorId, targetCaseId: caseId, metadata });
  aiEvents.emit(eventType, event);
  return event;
}

module.exports = { aiEvents, publishAiEvent };
