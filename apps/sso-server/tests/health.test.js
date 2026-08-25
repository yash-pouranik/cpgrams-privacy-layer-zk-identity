'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../src/app');

test('SSO Server Health Check API', async (t) => {
  await t.test('GET /health returns 200 and status ok', async () => {
    const res = await request(app)
      .get('/health')
      .expect(200);

    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'CivID SSO');
  });
});
