'use strict';

const documentAnalysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'documentId', 'documentType', 'language', 'isRelevant', 'relevanceScore',
    'supportsComplaint', 'supportingClaims', 'extractedText',
    'detectedEntities', 'flags', 'confidence',
  ],
  properties: {
    documentId: { type: 'string', minLength: 1 },
    documentType: { type: 'string', minLength: 1 },
    language: { type: 'string', enum: ['en', 'hi', 'hi-en', 'unknown'] },
    isRelevant: { type: 'boolean' },
    relevanceScore: { type: 'number', minimum: 0, maximum: 1 },
    supportsComplaint: { type: 'boolean' },
    supportingClaims: { type: 'array', items: { type: 'string' } },
    extractedText: { type: 'string' },
    detectedEntities: {
      type: 'object',
      additionalProperties: false,
      required: ['contractor', 'project', 'amount', 'date'],
      properties: {
        contractor: { type: ['string', 'null'] },
        project: { type: ['string', 'null'] },
        amount: { type: ['string', 'null'] },
        date: { type: ['string', 'null'] },
      },
    },
    flags: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
};

module.exports = { documentAnalysisSchema };
