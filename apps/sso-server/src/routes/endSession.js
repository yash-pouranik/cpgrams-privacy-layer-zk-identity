'use strict';

module.exports = function endSessionRoutes(provider) {
  const router = require('express').Router();

  // Correct cookie names for this oidc-provider build (defaults to _session / _session.sig)
  const sessionCookieName = provider.cookieName('session');
  const sessionSigCookieName = sessionCookieName + '.sig';

  // GET /oidc/logout — full SSO logout (shared-device safe)
  router.get('/logout', async (req, res) => {
    try {
      const cookieHeader = req.headers.cookie || '';
      const prefix = sessionCookieName + '=';
      const sessionEntry = cookieHeader
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith(prefix));

      if (sessionEntry) {
        const sessionId = sessionEntry.slice(prefix.length);
        try {
          const session = await provider.Session.find(sessionId);
          if (session) {
            await session.destroy();
            console.log('[SSO] destroyed session ' + sessionId);
          }
        } catch (e) {
          // ignore — cookie clear below is what matters for the browser
        }
      }
    } catch (e) {
      // ignore
    }

    // Clear the SSO session cookie(s) from the browser
    res.clearCookie(sessionCookieName, { path: '/' });
    res.clearCookie(sessionSigCookieName, { path: '/' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(frontendUrl + '/?logged_out=1');
  });

  return router;
};
