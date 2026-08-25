'use strict';

process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sendOtp, verifyOtp, otpStore } = require('../src/services/otp');

test('SSO OTP Service Tests', async (t) => {
  t.afterEach(() => {
    otpStore.clear();
  });

  await t.test('generates and verifies 6-digit OTP in isolation', async () => {
    const email = 'rahul.sharma@example.com';
    const otp = await sendOtp(email);
    
    assert.match(otp, /^\d{6}$/);

    const isValid = verifyOtp(email, otp);
    assert.equal(isValid, true);

    // One-time use: second verify must fail
    const isSecondValid = verifyOtp(email, otp);
    assert.equal(isSecondValid, false);
  });

  await t.test('rejects incorrect OTP', async () => {
    const email = 'priya.patel@example.com';
    await sendOtp(email);

    const isValid = verifyOtp(email, '000000');
    assert.equal(isValid, false);
  });
});
