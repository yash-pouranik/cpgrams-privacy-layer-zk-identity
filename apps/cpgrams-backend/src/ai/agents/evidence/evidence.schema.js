'use strict';

const evidenceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'reason', 'queryCount', 'resultCount', 'corroborationSignal'],
  properties: {
    status: { type: 'string', enum: ['SEARCHED', 'SKIPPED', 'UNAVAILABLE'] },
    reason: { type: 'string' },
    queryCount: { type: 'number', minimum: 0 },
    resultCount: { type: 'number', minimum: 0 },
    corroborationSignal: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW', 'NONE'] },
  },
};

module.exports = { evidenceSchema };
