'use strict';

const { Issuer } = require('openid-client');
const jwt = require('jsonwebtoken');

let _issuer = null;
let _jwks = null;

/**
 * Discover the OIDC issuer and cache it.
 */
async function getIssuer() {
  if (_issuer) return _issuer;
  const ssoUrl = process.env.SSO_ISSUER_URL || 'http://localhost:4000';
  _issuer = await Issuer.discover(ssoUrl + '/oidc');
  return _issuer;
}

/**
 * Middleware: verifyToken
 * Verifies the OIDC access token (JWT) from CivID SSO.
 * Extracts pairwiseId from the `sub` claim.
 * Attaches req.citizen = { pairwiseId }
 */
async function verifyToken(req, res, next) {
  try {
    // Get token from Authorization header or session
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.session && req.session.accessToken) {
      token = req.session.accessToken;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    // Decode the token to extract claims
    // For hackathon: we do a basic JWT decode + verify the issuer
    // In production, you'd verify the signature against the JWKS
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || !decoded.payload) {
      return res.status(401).json({ error: 'Invalid token format.' });
    }

    const { sub, iss } = decoded.payload;

    if (!sub) {
      return res.status(401).json({ error: 'Token missing sub claim.' });
    }

    // Verify issuer matches our SSO
    const ssoUrl = process.env.SSO_ISSUER_URL || 'http://localhost:4000';
    const expectedIssuer = ssoUrl + '/oidc';
    if (iss && iss !== expectedIssuer) {
      return res.status(401).json({ error: 'Token issuer mismatch.' });
    }

    // Attach citizen info — sub IS the pairwiseId
    req.citizen = { pairwiseId: sub };
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    return res.status(401).json({ error: 'Token verification failed.' });
  }
}

module.exports = verifyToken;
