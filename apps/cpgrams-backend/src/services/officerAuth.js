'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Node crypto scrypt is used for password hashing (no external bcrypt dep needed).
const PASSWORD_PEPPER = process.env.OFFICER_PASSWORD_PEPPER || 'officer-pepper-dev-secret';
const OFFICER_JWT_SECRET = process.env.OFFICER_JWT_SECRET || 'officer-jwt-dev-secret';
const OFFICER_JWT_EXPIRY = process.env.OFFICER_JWT_EXPIRY || '8h';

/**
 * Hash a plaintext password using scrypt + random salt.
 * Returns a "salt:hash" string for storage in the Officer record.
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password + PASSWORD_PEPPER, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plaintext password against a stored scrypt hash string.
 * Timing-safe comparison.
 */
function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  try {
    const testHash = crypto.scryptSync(password + PASSWORD_PEPPER, salt, 64).toString('hex');
    const storedBuf = Buffer.from(hash, 'hex');
    const testBuf = Buffer.from(testHash, 'hex');
    return storedBuf.length === testBuf.length && crypto.timingSafeEqual(storedBuf, testBuf);
  } catch (err) {
    return false;
  }
}

/**
 * Issue a signed JWT for an authenticated officer.
 */
function signOfficerToken(officer) {
  return jwt.sign(
    {
      officerId: officer.officerId,
      name: officer.name,
      department: officer.department,
    },
    OFFICER_JWT_SECRET,
    { expiresIn: OFFICER_JWT_EXPIRY }
  );
}

/**
 * Verify an officer JWT. Returns the decoded payload or null.
 */
function verifyOfficerToken(token) {
  try {
    return jwt.verify(token, OFFICER_JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  signOfficerToken,
  verifyOfficerToken,
  PASSWORD_PEPPER,
  OFFICER_JWT_SECRET,
};