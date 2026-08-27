'use strict';

const { Router } = require('express');
const { Issuer, generators } = require('openid-client');

const router = Router();

let _client = null;

async function getClient() {
  if (_client) return _client;
  const ssoUrl = process.env.SSO_ISSUER_URL || 'http://localhost:4000/oidc';
  const callbackUrl = process.env.CPGRAMS_CALLBACK_URL || 'http://localhost:5000/auth/callback';
  const issuer = await Issuer.discover(ssoUrl);
  _client = new issuer.Client({
    client_id: 'cpgrams',
    client_secret: process.env.CPGRAMS_CLIENT_SECRET || 'dev-secret-change-me',
    redirect_uris: [callbackUrl],
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
    const state = generators.state();

    // Store code_verifier and state in session for callback
    req.session.codeVerifier = codeVerifier;
    req.session.state = state;

    const authUrl = client.authorizationUrl({
      scope: 'openid',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state,
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
    
    if (req.query.state !== req.session.state) {
      return res.status(403).json({ error: 'State mismatch' });
    }
    
    const codeVerifier = req.session.codeVerifier;

    const callbackUrl = process.env.CPGRAMS_CALLBACK_URL || 'http://localhost:5000/auth/callback';
    const tokenSet = await client.callback(
      callbackUrl,
      params,
      { code_verifier: codeVerifier, state: req.session.state }
    );

    // Store tokens in session
    req.session.accessToken = tokenSet.access_token;
    req.session.idToken = tokenSet.id_token;

    // Decode id_token to get pairwiseId
    const claims = tokenSet.claims();
    req.session.pairwiseId = claims.sub;

    // Clean up session vars
    delete req.session.codeVerifier;
    delete req.session.state;

    // Redirect to frontend callback route with exchange code
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const token = tokenSet.id_token || tokenSet.access_token;
    
    const code = require('crypto').randomBytes(16).toString('hex');
    req.session.exchangeCode = { code, token, pairwiseId: claims.sub, expiresAt: Date.now() + 60000 };
    
    res.redirect(`${frontendUrl}/auth/callback?code=${code}`);
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

/**
 * GET /auth/exchange
 * Exchange code for token
 */
router.get('/exchange', (req, res) => {
  const { code } = req.query;
  const exchangeCode = req.session.exchangeCode;

  if (!code || !exchangeCode || exchangeCode.code !== code) {
    return res.status(401).json({ error: 'Invalid exchange code' });
  }

  if (Date.now() > exchangeCode.expiresAt) {
    delete req.session.exchangeCode;
    return res.status(401).json({ error: 'Exchange code expired' });
  }

  const { token } = exchangeCode;
  delete req.session.exchangeCode;
  
  res.json({ token });
});

module.exports = router;
