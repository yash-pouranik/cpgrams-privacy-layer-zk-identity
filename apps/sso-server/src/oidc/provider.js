const { Provider, interactionPolicy: { base: policy } } = require('oidc-provider');

// ---- Static client registration ----
// For the hackathon build, relying parties (like CPGRAMS) are registered here directly.
// This avoids building a full dynamic-client-registration adapter, which isn't needed
// at this scale. New services can still be recorded in the `services` Prisma table for
// our own audit/reference — but the OIDC provider itself reads from this static list.

const redirectUri = process.env.CPGRAMS_CALLBACK_URL || 'http://localhost:5000/auth/callback';

const clients = [
  {
    client_id: 'cpgrams',
    client_secret: process.env.CPGRAMS_CLIENT_SECRET || 'dev-secret-change-me',
    redirect_uris: [
      redirectUri,
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

  cookies: {
    keys: [process.env.SSO_PAIRWISE_SECRET || 'dev-cookie-key-secret-12345'],
    short: {
      path: '/',
      sameSite: 'lax',
      secure: process.env.SSO_ISSUER_URL ? process.env.SSO_ISSUER_URL.startsWith('https') : false,
    },
    long: {
      path: '/',
      sameSite: 'lax',
      secure: process.env.SSO_ISSUER_URL ? process.env.SSO_ISSUER_URL.startsWith('https') : false,
    },
  },

  interactions: {
    url(ctx, interaction) {
      return `/interaction/${interaction.uid}`;
    },
  },

  renderError: async (ctx, out, error) => {
    console.warn('OIDC provider error:', out.error, out.error_description);
    const callbackUrl = process.env.CPGRAMS_CALLBACK_URL || 'http://localhost:5000/auth/callback';
    const backendOrigin = new URL(callbackUrl).origin;
    ctx.status = out.status || 400;
    ctx.type = 'html';
    ctx.body = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CivID — Session Expired</title>
  <link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="bg-base-200 min-h-screen flex items-center justify-center p-4">
  <div class="card bg-base-100 max-w-md w-full shadow-xl text-center p-6">
    <h2 class="text-2xl font-bold text-error">Authentication Session Expired</h2>
    <p class="text-base-content/70 my-4">Your login session has expired or was interrupted. Please start the login process again.</p>
    <a href="${backendOrigin}/auth/login" class="btn btn-primary w-full">Start Login Again</a>
  </div>
</body>
</html>`;
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
  provider.proxy = true;
  return provider;
}

module.exports = { createProvider };