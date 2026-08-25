'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Officer = require('../src/models/Officer');
const { signOfficerToken, hashPassword } = require('../src/services/officerAuth');

test('Officer Portal Authentication & Case Management API', async (t) => {
  const officerId = 'PWD-001';
  const password = 'Officer@123';
  let officerToken;

  // Ensure test officer exists
  await Officer.updateOne(
    { officerId },
    {
      $set: {
        name: 'Rajesh Kumar',
        department: 'PWD',
        level: 1,
        passwordHash: hashPassword(password),
        isAvailable: true
      }
    },
    { upsert: true }
  );

  await t.test('POST /officer/login rejects incorrect password', async () => {
    const res = await request(app)
      .post('/officer/login')
      .send({ officerId, password: 'wrong-password' })
      .expect(401);

    assert.ok(res.body.error);
  });

  await t.test('POST /officer/login authenticates and returns signed JWT token', async () => {
    const res = await request(app)
      .post('/officer/login')
      .send({ officerId, password })
      .expect(200);

    assert.ok(res.body.token);
    assert.equal(res.body.officer.officerId, officerId);
    assert.equal(res.body.officer.name, 'Rajesh Kumar');
    officerToken = res.body.token;
  });

  await t.test('GET /officer/me returns authenticated officer profile', async () => {
    const res = await request(app)
      .get('/officer/me')
      .set('Authorization', `Bearer ${officerToken}`)
      .expect(200);

    assert.equal(res.body.officerId, officerId);
    assert.equal(res.body.department, 'PWD');
    assert.equal(res.body.passwordHash, undefined);
  });

  await t.test('GET /officer/cases returns cases assigned to officer', async () => {
    const res = await request(app)
      .get('/officer/cases')
      .set('Authorization', `Bearer ${officerToken}`)
      .expect(200);

    assert.ok(Array.isArray(res.body));
  });

  await t.test('GET /officer/cases rejects unauthenticated requests', async () => {
    const res = await request(app)
      .get('/officer/cases')
      .expect(401);

    assert.ok(res.body.error);
  });

  t.after(async () => {
    await mongoose.disconnect();
  });
});
