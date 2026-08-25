const crypto = require('crypto');
const { Resend } = require('resend');

// Lazy-init Resend client — avoids crash at import time if RESEND_API_KEY is unset
let _resend;
function getResendClient() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || 'placeholder_key');
  }
  return _resend;
}

// In-memory OTP store: email -> { otp, expiresAt }
const otpStore = new Map();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendOtp(email) {
  const otp = generateOtp();
  const expiresAt = Date.now() + OTP_EXPIRY_MS;
  otpStore.set(email, { otp, expiresAt });

  if (process.env.NODE_ENV !== 'test') {
    try {
      await getResendClient().emails.send({
        from: 'CivID SSO <noreply@civid.in>',
        to: email,
        subject: 'Your CivID Verification Code',
        html: `<p>Your OTP is: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p>`,
      });
    } catch (err) {
      console.error('Resend OTP delivery failed:', err.message);
      // OTP is still stored — works for local dev even if Resend fails
    }
  }

  // Log OTP in dev for testing (NEVER in production or test)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] OTP for ${email}: ${otp}`);
  }

  return otp;
}

function verifyOtp(email, inputOtp) {
  const record = otpStore.get(email);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return false;
  }
  if (record.otp !== inputOtp) return false;
  otpStore.delete(email); // one-time use
  return true;
}

module.exports = { sendOtp, verifyOtp, otpStore };
