'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

test('Master Data Services APIs', async (t) => {
  await t.test('GET /master/departments returns active department directory', async () => {
    const res = await request(app)
      .get('/master/departments')
      .expect(200);

    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 15);
    const pwd = res.body.find(d => d.deptCode === 'PWD');
    assert.ok(pwd);
    assert.equal(pwd.name, 'Public Works Department');
  });

  await t.test('GET /master/departments/:deptCode returns single department', async () => {
    const res = await request(app)
      .get('/master/departments/PWD')
      .expect(200);

    assert.equal(res.body.deptCode, 'PWD');
    assert.equal(res.body.type, 'central');
  });

  await t.test('GET /master/categories returns hierarchical categories list', async () => {
    const res = await request(app)
      .get('/master/categories')
      .expect(200);

    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 30);
    const roads = res.body.find(c => c.code === 'INFRA-ROADS');
    assert.ok(roads);
    assert.equal(roads.parentCode, 'INFRA');
  });

  await t.test('GET /master/officers returns public officer directory', async () => {
    const res = await request(app)
      .get('/master/officers')
      .expect(200);

    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 10);
    const officer = res.body[0];
    assert.ok(officer.officerId);
    assert.ok(officer.name);
    assert.equal(officer.passwordHash, undefined);
  });

  t.after(async () => {
    await mongoose.disconnect();
  });
});
