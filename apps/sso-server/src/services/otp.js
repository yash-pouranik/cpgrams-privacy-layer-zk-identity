const crypto = require('crypto');
const { Resend } = require('resend');

// Lazy-init Resend client — avoids crash at import time if RESEND_API_KEY is unset.
// If no key is configured, Resend delivery is skipped entirely (no noisy 401s)
// and the OTP is printed to the console for dev/demo use.
let _resend;
function getResendClient() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// In-memory OTP store: email -> { otp, expiresAt }
const otpStore = new Map();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

// Whether this is a non-production environment (dev/demo). In prod we never print OTPs.
function isDev() {
  return process.env.NODE_ENV !== 'production';
}

async function sendOtp(email) {
  const otp = generateOtp();
  const expiresAt = Date.now() + OTP_EXPIRY_MS;
  otpStore.set(email, { otp, expiresAt });

  if (process.env.NODE_ENV !== 'test' && process.env.RESEND_API_KEY) {
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
  } else if (process.env.NODE_ENV !== 'test') {
    // No API key configured: tell the user the demo relies on the console OTP.
    console.warn(
      '[CivID SSO] RESEND_API_KEY not configured — OTP delivery is DISABLED. ' +
      'Using the console-printed OTP for the demo.'
    );
  }

  // Print OTP in non-production environments for testing (NEVER in production).
  // Covers NODE_ENV set to 'development' or left unset; keeps 'test' logs clean.
  if (isDev() && process.env.NODE_ENV !== 'test') {
    console.log(`[CivID SSO] [DEV] OTP for ${email}: ${otp}`);
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
