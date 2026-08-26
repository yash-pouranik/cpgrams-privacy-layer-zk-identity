'use strict';

const triageSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'normalizedComplaint',
    'language',
    'classification',
    'priority',
    'entities',
    'searchQueries',
  ],
  properties: {
    normalizedComplaint: {
      type: 'string',
      minLength: 1,
    },
    language: {
      type: 'string',
      enum: ['en', 'hi', 'hi-en', 'unknown'],
    },
    classification: {
      type: 'object',
      additionalProperties: false,
      required: ['department', 'category', 'subcategory', 'confidence'],
      properties: {
        department: { type: 'string', minLength: 1 },
        category: { type: 'string', minLength: 1 },
        subcategory: { type: 'string', minLength: 1 },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
        },
      },
    },
    priority: {
      type: 'object',
      additionalProperties: false,
      required: ['level', 'score', 'reasons'],
      properties: {
        level: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        },
        score: {
          type: 'number',
          minimum: 0,
          maximum: 100,
        },
        reasons: {
          type: 'array',
          minItems: 1,
          items: { type: 'string' },
        },
      },
    },
    entities: {
      type: 'object',
      additionalProperties: false,
      required: ['location', 'organizations', 'contractors', 'projects', 'dates'],
      properties: {
        location: {
          type: 'object',
          additionalProperties: false,
          required: ['city', 'state', 'ward', 'landmark'],
          properties: {
            city: { type: ['string', 'null'] },
            state: { type: ['string', 'null'] },
            ward: { type: ['string', 'null'] },
            landmark: { type: ['string', 'null'] },
          },
        },
        organizations: {
          type: 'array',
          items: { type: 'string' },
        },
        contractors: {
          type: 'array',
          items: { type: 'string' },
        },
        projects: {
          type: 'array',
          items: { type: 'string' },
        },
        dates: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    searchQueries: {
      type: 'array',
      minItems: 4,
      maxItems: 6,
      items: {
        type: 'string',
        minLength: 3,
      },
    },
  },
};

module.exports = { triageSchema };
