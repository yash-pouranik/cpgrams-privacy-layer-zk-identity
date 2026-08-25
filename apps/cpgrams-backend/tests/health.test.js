'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

test('Backend Health Check API', async (t) => {
  await t.test('GET /health returns 200 and service metadata', async () => {
    const res = await request(app)
      .get('/health')
      .expect(200);

    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'CPGRAMS Backend');
  });

  t.after(async () => {
    await mongoose.disconnect();
  });
});
