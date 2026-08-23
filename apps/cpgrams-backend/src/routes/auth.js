'use strict';

const { Router } = require('express');
const { Issuer, generators } = require('openid-client');

const router = Router();

let _client = null;

async function getClient() {
  if (_client) return _client;
  const ssoUrl = process.env.SSO_ISSUER_URL || 'http://localhost:4000';
  const issuer = await Issuer.discover(ssoUrl + '/oidc');
  _client = new issuer.Client({
    client_id: 'cpgrams',
    client_secret: process.env.CPGRAMS_CLIENT_SECRET || 'dev-secret-change-me',
    redirect_uris: ['http://localhost:5000/auth/callback'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_basic',
  });
  return _client;
}

/**
 * GET /auth/login
 * Initiate OIDC login — redirect citizen to CivID SSO.
 */
router.get('/login', async (req, res, next) => {
  try {
    const client = await getClient();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    // Store code_verifier in session for callback
    req.session.codeVerifier = codeVerifier;

    const authUrl = client.authorizationUrl({
      scope: 'openid',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    res.redirect(authUrl);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/callback
 * Receive auth code from CivID SSO, exchange for tokens.
 */
router.get('/callback', async (req, res, next) => {
  try {
    const client = await getClient();
    const params = client.callbackParams(req);
    const codeVerifier = req.session.codeVerifier;

    const tokenSet = await client.callback(
      'http://localhost:5000/auth/callback',
      params,
      { code_verifier: codeVerifier }
    );

    // Store tokens in session
    req.session.accessToken = tokenSet.access_token;
    req.session.idToken = tokenSet.id_token;

    // Decode id_token to get pairwiseId
    const claims = tokenSet.claims();
    req.session.pairwiseId = claims.sub;

    // Clean up code verifier
    delete req.session.codeVerifier;

    // Redirect to frontend or a success page
    res.json({
      message: 'Authentication successful',
      pairwiseId: claims.sub,
    });
  } catch (err) {
    console.error('Auth callback error:', err.message);
    next(err);
  }
});

/**
 * GET /auth/logout
 * Clear session.
 */
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

module.exports = router;
