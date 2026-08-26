'use strict';

const qualitySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['qualityScore', 'isActionable', 'missingInformation', 'duplicateRisk', 'relatedCases'],
  properties: {
    qualityScore: { type: 'number', minimum: 0, maximum: 100 },
    isActionable: { type: 'boolean' },
    missingInformation: { type: 'array', items: { type: 'string' } },
    duplicateRisk: { type: 'number', minimum: 0, maximum: 1 },
    relatedCases: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['caseId', 'similarity', 'relationship', 'confidence'],
        properties: {
          caseId: { type: 'string' },
          similarity: { type: 'number', minimum: 0, maximum: 1 },
          relationship: { type: 'string', enum: ['DUPLICATE', 'RELATED', 'POSSIBLY_RELATED', 'UNRELATED'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
  },
};

module.exports = { qualitySchema };
