'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const { createProvider } = require('./oidc/provider');

const app = express();
const PORT = process.env.PORT || 4000;

// ---- View engine (CivID login/OTP pages) ----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---- Body parsing ----
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ---- Static assets (CSS for login page) ----
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// ---- OIDC Provider ----
const provider = createProvider();

// ---- Interaction routes (login, OTP) ----
// Mounted before oidc-provider so our custom handlers take priority
app.use('/interaction', require('./routes/interaction')(provider));

// ---- Disclosure API (internal — CPGRAMS calls this) ----
app.use('/internal', require('./routes/disclosure'));

// ---- End session (logout) - must come before oidc-provider callback ----
app.use('/oidc', require('./routes/endSession')(provider));

// ---- Mount oidc-provider (handles /oidc/... routes) ----
app.use('/oidc', provider.callback());

// ---- Health check ----
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CivID SSO', port: PORT });
});

// ---- Start ----
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`CivID SSO running at http://localhost:${PORT}`);
  });
  // Keep the HTTP listener referenced so the standalone process cannot exit
  // cleanly immediately after startup under npm/nodemon/concurrently.
  server.ref();
  server.on('error', (err) => {
    console.error('CivID SSO server error:', err.message);
    process.exitCode = 1;
  });
}

module.exports = { app, provider };
