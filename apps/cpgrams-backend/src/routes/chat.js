'use strict';

const { Router } = require('express');
const Message = require('../models/Message');
const Case = require('../models/Case');

const router = Router();
const verifyToken = require('../middleware/verifyToken');

function requireOfficer(req, res, next) {
  const officerId = req.headers['x-officer-id'];
  if (!officerId) {
    return res.status(401).json({ error: 'X-Officer-Id header required.' });
  }
  req.officer = { officerId };
  next();
}

function flexAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if ((authHeader && authHeader.startsWith('Bearer ')) || (req.session && req.session.accessToken)) {
    req.authType = 'citizen';
    return verifyToken(req, res, next);
  } else if (req.headers['x-officer-id']) {
    req.authType = 'officer';
    return requireOfficer(req, res, next);
  } else {
    return res.status(401).json({ error: 'Authentication required. No token or officer ID provided.' });
  }
}

/**
 * GET /chat/:caseId
 * Get all messages for a case.
 */
router.get('/:caseId', flexAuth, async (req, res) => {
  try {
    const grievance = await Case.findOne({ caseId: req.params.caseId });
    if (!grievance) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    if (req.authType === 'citizen' && grievance.pairwiseId !== req.citizen.pairwiseId) {
      return res.status(403).json({ error: 'Forbidden. Case belongs to a different citizen.' });
    }
    if (req.authType === 'officer' && grievance.assignedOfficerId !== req.officer.officerId) {
      return res.status(403).json({ error: 'Forbidden. Case assigned to a different officer.' });
    }

    const messages = await Message.find({ caseId: req.params.caseId })
      .select('-__v')
      .sort({ createdAt: 1 });

    return res.json(messages);
  } catch (err) {
    console.error('Get chat error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /chat/:caseId
 * Send a message.
 * Body: { senderRole, content }
 * No sender identity in response — only role.
 */
router.post('/:caseId', flexAuth, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required.' });
    }

    const grievance = await Case.findOne({ caseId: req.params.caseId });
    if (!grievance) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    if (req.authType === 'citizen' && grievance.pairwiseId !== req.citizen.pairwiseId) {
      return res.status(403).json({ error: 'Forbidden. Case belongs to a different citizen.' });
    }
    if (req.authType === 'officer' && grievance.assignedOfficerId !== req.officer.officerId) {
      return res.status(403).json({ error: 'Forbidden. Case assigned to a different officer.' });
    }

    const senderRole = req.authType;

    const message = await Message.create({
      caseId: req.params.caseId,
      senderRole,
      content,
    });

    return res.status(201).json({
      caseId: message.caseId,
      senderRole: message.senderRole,
      content: message.content,
      createdAt: message.createdAt,
    });
  } catch (err) {
    console.error('Send chat error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
