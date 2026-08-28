'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

let _jwks = null;
let _jwksTimestamp = null;

async function getJwks() {
  const now = Date.now();
  if (_jwks && _jwksTimestamp && (now - _jwksTimestamp < 3600000)) {
    return _jwks;
  }
  const ssoUrl = process.env.SSO_ISSUER_URL || 'http://localhost:4000/oidc';
  const response = await fetch(`${ssoUrl}/jwks`);
  if (!response.ok) {
    throw new Error('Failed to fetch JWKS');
  }
  _jwks = await response.json();
  _jwksTimestamp = now;
  return _jwks;
}

/**
 * Middleware: verifyToken
 * Verifies the OIDC access token (JWT) from CivID SSO.
 * Extracts pairwiseId from the `sub` claim.
 * Attaches req.citizen = { pairwiseId }
 */
async function verifyToken(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.query && req.query.token) {
      token = req.query.token;
    } else if (req.session && req.session.accessToken) {
      token = req.session.accessToken;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    // ---- TEST-ONLY BYPASS ----
    // In NODE_ENV=test with TEST_AUTH_SECRET set, accept a locally-signed HS256
    // token carrying { sub: pairwiseId, test: true }. This lets API tests run
    // self-contained without a live CivID SSO server. Never active in dev/prod.
    if (process.env.NODE_ENV === 'test' && process.env.TEST_AUTH_SECRET) {
      try {
        const testDecoded = jwt.verify(token, process.env.TEST_AUTH_SECRET);
        if (testDecoded && testDecoded.sub && testDecoded.test === true) {
          req.citizen = { pairwiseId: testDecoded.sub };
          return next();
        }
      } catch {
        /* not a test token — fall through to real OIDC verification */
      }
    }

    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || !decodedHeader.header || !decodedHeader.header.kid) {
      return res.status(401).json({ error: 'Invalid token format or missing kid.' });
    }

    const jwks = await getJwks();
    const jwk = jwks.keys.find(k => k.kid === decodedHeader.header.kid);
    if (!jwk) {
      return res.status(401).json({ error: 'Invalid token signature (kid not found).' });
    }

    const pem = crypto.createPublicKey({ key: jwk, format: 'jwk' }).export({ type: 'spki', format: 'pem' });
    const expectedIssuer = process.env.SSO_BASE_URL || (process.env.SSO_ISSUER_URL || 'http://localhost:4000/oidc').replace(/\/oidc$/, '');
    
    const decoded = jwt.verify(token, pem, { algorithms: ['RS256'], issuer: expectedIssuer });

    req.citizen = { pairwiseId: decoded.sub };
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    return res.status(401).json({ error: 'Token verification failed.' });
  }
}

module.exports = verifyToken;
