'use strict';

const { Router } = require('express');
const prisma = require('../models/prismaClient');
const { lookupAadhaar } = require('../services/mockEkyc');
const { sendOtp, verifyOtp } = require('../services/otp');
const { getOrCreatePairwiseId } = require('../services/pairwiseId');
const crypto = require('crypto');

/**
 * Factory — receives the oidc-provider instance to avoid circular imports.
 * Usage in app.js:  app.use('/interaction', require('./routes/interaction')(provider));
 */
module.exports = function interactionRoutes(provider) {
  const router = Router();

  // ---- GET /interaction/:uid — show login screen ----
  router.get('/:uid', async (req, res, next) => {
    try {
      const details = await provider.interactionDetails(req, res);
      if (details.prompt.name === 'login') {
        return res.render('login', {
          uid: req.params.uid,
          error: null,
        });
      }
      // If consent prompt, auto-approve (we only expose 'sub')
      if (details.prompt.name === 'consent') {
        const consent = {
          rejectedScopes: [],
          rejectedClaims: [],
          replace: false,
        };
        const result = { consent };
        await provider.interactionFinished(req, res, result, {
          mergeWithLastSubmission: true,
        });
        return;
      }
      return next(new Error('Unknown interaction prompt: ' + details.prompt.name));
    } catch (err) {
      if (err.name === 'SessionNotFound' || (err.message && err.message.includes('SessionNotFound'))) {
        return res.redirect('http://localhost:5000/auth/login');
      }
      next(err);
    }
  });

  // ---- POST /interaction/:uid/login — validate Aadhaar, send OTP ----
  router.post('/:uid/login', async (req, res, next) => {
    try {
      const { aadhaar } = req.body;

      if (!aadhaar || aadhaar.length !== 12 || !/^\d{12}$/.test(aadhaar)) {
        return res.render('login', {
          uid: req.params.uid,
          error: 'Please enter a valid 12-digit Aadhaar number.',
        });
      }

      const citizen = lookupAadhaar(aadhaar);
      if (!citizen) {
        return res.render('login', {
          uid: req.params.uid,
          error: 'Aadhaar not found in eKYC records.',
        });
      }

      // Send OTP to the citizen's email
      await sendOtp(citizen.email);

      // Store aadhaar in session-like temp (query param for simplicity in hackathon)
      // We hash the aadhaar for the redirect to avoid exposing it in URL
      const aadhaarHash = crypto.createHash('sha256').update(aadhaar).digest('hex');

      // Mask email for display: te***@example.com
      const [localPart, domain] = citizen.email.split('@');
      const maskedEmail = localPart.slice(0, 2) + '***@' + domain;

      return res.render('otp', {
        uid: req.params.uid,
        maskedEmail,
        aadhaar, // passed as hidden field for OTP verification
        error: null,
      });
    } catch (err) {
      next(err);
    }
  });

  // ---- GET /interaction/:uid/otp — render OTP screen (for resend flow) ----
  router.get('/:uid/otp', async (req, res, next) => {
    try {
      // This route is mainly for the "resend OTP" link.
      // Without aadhaar context we redirect back to login.
      return res.render('login', {
        uid: req.params.uid,
        error: 'Please enter your Aadhaar number again to resend OTP.',
      });
    } catch (err) {
      next(err);
    }
  });

  // ---- POST /interaction/:uid/verify — verify OTP, finish interaction ----
  router.post('/:uid/verify', async (req, res, next) => {
    try {
      const { aadhaar, otp } = req.body;

      // Re-lookup citizen
      const citizen = lookupAadhaar(aadhaar);
      if (!citizen) {
        return res.render('login', {
          uid: req.params.uid,
          error: 'Session expired. Please start again.',
        });
      }

      // Verify OTP
      if (!verifyOtp(citizen.email, otp)) {
        const [localPart, domain] = citizen.email.split('@');
        const maskedEmail = localPart.slice(0, 2) + '***@' + domain;
        return res.render('otp', {
          uid: req.params.uid,
          maskedEmail,
          aadhaar,
          error: 'Invalid or expired OTP. Please try again.',
        });
      }

      // ---- Get or create user in DB ----
      const aadhaarHash = crypto.createHash('sha256').update(aadhaar).digest('hex');

      let user = await prisma.user.findUnique({
        where: { aadhaarHashMock: aadhaarHash },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            aadhaarHashMock: aadhaarHash,
            mobile: citizen.mobile,
            email: citizen.email,
          },
        });
      }

      // ---- Get or create pairwiseId for (user, cpgrams) ----
      const serviceId = 'cpgrams'; // static for now
      const pairwiseId = await getOrCreatePairwiseId(user.id, serviceId);

      // ---- Log login event ----
      await prisma.auditLog.create({
        data: {
          eventType: 'login',
          actorId: user.id,
          targetPairwiseId: pairwiseId,
          metadata: { serviceId },
        },
      });

      // ---- Finish OIDC interaction ----
      const result = {
        login: {
          accountId: pairwiseId,
        },
      };

      await provider.interactionFinished(req, res, result, {
        mergeWithLastSubmission: false,
      });
    } catch (err) {
      if (err.name === 'SessionNotFound' || (err.message && err.message.includes('SessionNotFound'))) {
        console.warn('OIDC interaction session expired or server restarted. Redirecting user to restart login flow...');
        return res.redirect('http://localhost:5000/auth/login');
      }
      next(err);
    }
  });

  return router;
};
