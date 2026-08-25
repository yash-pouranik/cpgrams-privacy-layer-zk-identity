'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../src/app');

test('SSO Reverse Lookup / Disclosure API Security', async (t) => {
  await t.test('POST /internal/reverse-lookup rejects requests without court token', async () => {
    const res = await request(app)
      .post('/internal/reverse-lookup')
      .send({ pairwiseId: 'ecce5c121a4bf0ca883cb776c52281e11d11fa73f4039f3c538b3472153754be' })
      .expect(401);

    assert.ok(res.body.error);
  });

  await t.test('POST /internal/reverse-lookup rejects invalid court token', async () => {
    const res = await request(app)
      .post('/internal/reverse-lookup')
      .set('X-Court-Order-Token', 'invalid-token-signature')
      .send({ pairwiseId: 'ecce5c121a4bf0ca883cb776c52281e11d11fa73f4039f3c538b3472153754be' })
      .expect(401);

    assert.ok(res.body.error);
  });
});
