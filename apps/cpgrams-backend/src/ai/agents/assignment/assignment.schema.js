'use strict';

const assignmentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['recommendedDepartment', 'recommendedOfficerId', 'reason', 'confidence'],
  properties: {
    recommendedDepartment: { type: 'string' },
    recommendedOfficerId: { type: ['string', 'null'] },
    reason: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
};

module.exports = { assignmentSchema };
