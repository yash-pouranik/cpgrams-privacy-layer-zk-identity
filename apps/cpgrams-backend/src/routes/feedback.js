'use strict';

const { Router } = require('express');
const Case = require('../models/Case');
const Feedback = require('../models/Feedback');
const AuditLog = require('../models/AuditLog');
const verifyToken = require('../middleware/verifyToken');

const router = Router();

function requireOfficer(req, res, next) {
  const officerId = req.headers['x-officer-id'];
  if (!officerId) return res.status(401).json({ error: 'X-Officer-Id header required.' });
  req.officer = { officerId };
  next();
}

/**
 * POST /grievance/:caseId/feedback
 */
router.post('/grievance/:caseId/feedback', verifyToken, async (req, res) => {
  try {
    const { pairwiseId } = req.citizen;
    const { caseId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Valid rating (1-5) is required.' });
    }

    const grievance = await Case.findOne({ caseId });
    if (!grievance) return res.status(404).json({ error: 'Case not found.' });
    if (grievance.pairwiseId !== pairwiseId) return res.status(403).json({ error: 'Access denied.' });

    if (grievance.status !== 'resolved') {
      return res.status(400).json({ error: 'Case must be resolved to submit feedback.' });
    }
    if (grievance.feedbackSubmitted) {
      return res.status(400).json({ error: 'Feedback already submitted for this case.' });
    }

    const feedback = await Feedback.create({
      caseId,
      pairwiseId,
      rating,
      comment
    });

    // Update case
    await Case.updateOne({ caseId }, { $set: { feedbackSubmitted: true } });

    await AuditLog.create({
      eventType: 'feedback_submitted',
      actorId: pairwiseId,
      targetCaseId: caseId,
      metadata: { rating }
    });

    return res.status(201).json(feedback);
  } catch (err) {
    console.error('Citizen feedback error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /grievance/:caseId/feedback
 * flexAuth pattern
 */
router.get('/grievance/:caseId/feedback', async (req, res) => {
  try {
    const { caseId } = req.params;

    const authHeader = req.headers.authorization;
    const sessionToken = req.session && req.session.accessToken;
    const officerId = req.headers['x-officer-id'];

    let isCitizen = false;
    let isOfficer = false;
    let callerId = null;

    if (authHeader || sessionToken) {
      // Manual verification
      await new Promise((resolve) => {
        verifyToken(req, res, () => {
          if (req.citizen) {
            isCitizen = true;
            callerId = req.citizen.pairwiseId;
          }
          resolve();
        });
      });
      if (res.headersSent) return; 
    } else if (officerId) {
      isOfficer = true;
      callerId = officerId;
    } else {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const grievance = await Case.findOne({ caseId });
    if (!grievance) return res.status(404).json({ error: 'Case not found.' });

    if (isCitizen && grievance.pairwiseId !== callerId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (isOfficer && grievance.assignedOfficerId !== callerId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const feedback = await Feedback.findOne({ caseId });
    if (!feedback) return res.status(404).json({ error: 'Feedback not found.' });

    return res.json(feedback);
  } catch (err) {
    console.error('Get feedback error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
});

module.exports = router;
