const { Provider } = require('oidc-provider');

// ---- Static client registration ----
// For the hackathon build, relying parties (like CPGRAMS) are registered here directly.
// This avoids building a full dynamic-client-registration adapter, which isn't needed
// at this scale. New services can still be recorded in the `services` Prisma table for
// our own audit/reference — but the OIDC provider itself reads from this static list.

const clients = [
  {
    client_id: 'cpgrams',
    client_secret: process.env.CPGRAMS_CLIENT_SECRET || 'dev-secret-change-me',
    redirect_uris: [
      'http://localhost:5000/auth/callback', // cpgrams-backend callback route
    ],
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_basic',
  },
];

const configuration = {
  clients,

  // ---- Claims: THIS is where the privacy guarantee lives ----
  // We only ever expose `sub` (which we set to the pairwiseId, not the real user id).
  claims: {
    openid: ['sub'],
  },

  // Custom logic to find the account and issue claims.
  // findAccount is called with the internal accountId we set during login —
  // we deliberately set accountId = pairwiseId at login time (see interactions.js),
  // so nothing here ever touches the real user table.
  async findAccount(ctx, sub) {
    return {
      accountId: sub, // this IS the pairwiseId
      async claims() {
        return { sub }; // never add name/email/mobile here
      },
    };
  },

  features: {
    devInteractions: { enabled: false }, // we use our own login views
  },

  pkce: {
    required: () => true, // enforce PKCE even for confidential clients — good practice
  },

  renderError: async (ctx, out, error) => {
    console.warn('OIDC provider error:', out.error, out.error_description);
    return ctx.redirect('http://localhost:5000/auth/login');
  },

  ttl: {
    AccessToken: 3600,
    AuthorizationCode: 600,
    IdToken: 3600,
    Interaction: 3600,
    Session: 86400,
  },
};

function createProvider() {
  const provider = new Provider(process.env.SSO_ISSUER_URL || 'http://localhost:4000', configuration);
  return provider;
}

module.exports = { createProvider };