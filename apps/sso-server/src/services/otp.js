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
    // Attempt email delivery if API key provided
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0) {
      try {
        await getResendClient().emails.send({
          from: 'CivID SSO <noreply@civid.in>',
          to: email,
          subject: 'Your CivID Verification Code',
          html: `<p>Your OTP is: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p>`,
        });
      } catch (err) {
        console.error('Resend OTP delivery failed:', err.message);
      }
    }
  }

  // Always log OTP prominently to console in development/local environments
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n======================================================');
    console.log(`🔑 [CivID SSO OTP] Target Email: ${email}`);
    console.log(`👉 YOUR VERIFICATION OTP IS:  >> ${otp} <<`);
    console.log('======================================================\n');
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
