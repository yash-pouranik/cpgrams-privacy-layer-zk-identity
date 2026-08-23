'use strict';

const { Router } = require('express');
const prisma = require('../models/prismaClient');
const verifyCourtOrder = require('../middleware/verifyCourtOrder');

const router = Router();

/**
 * POST /internal/reverse-lookup
 * Court-authorized identity disclosure.
 * Body: { pairwiseId, courtOrderRef, requestingOfficerId }
 * Returns: { email } — minimal disclosure only.
 */
router.post('/reverse-lookup', verifyCourtOrder, async (req, res) => {
  try {
    const { pairwiseId, courtOrderRef, requestingOfficerId } = req.body;

    if (!pairwiseId || !requestingOfficerId) {
      return res.status(400).json({ error: 'pairwiseId and requestingOfficerId are required.' });
    }

    // Use courtOrderRef from middleware (validated) or body
    const validatedCourtOrderRef = req.courtOrderRef || courtOrderRef;

    // Look up the service_identity_map → user
    const mapping = await prisma.serviceIdentityMap.findUnique({
      where: { pairwiseId },
      include: { user: true },
    });

    if (!mapping || !mapping.user) {
      // Log failed attempt
      await prisma.auditLog.create({
        data: {
          eventType: 'disclosure_failed',
          actorId: requestingOfficerId,
          targetPairwiseId: pairwiseId,
          metadata: {
            courtOrderRef: validatedCourtOrderRef,
            reason: 'pairwiseId not found',
          },
        },
      });
      return res.status(404).json({ error: 'No identity found for the given pairwiseId.' });
    }

    // Log successful disclosure
    await prisma.auditLog.create({
      data: {
        eventType: 'identity_revealed',
        actorId: requestingOfficerId,
        targetPairwiseId: pairwiseId,
        metadata: {
          courtOrderRef: validatedCourtOrderRef,
          disclosedFields: ['email'],
        },
      },
    });

    // Return minimal identity — email only
    return res.json({
      email: mapping.user.email,
    });
  } catch (err) {
    console.error('Disclosure error:', err);
    return res.status(500).json({ error: 'Internal server error during disclosure.' });
  }
});

module.exports = router;
