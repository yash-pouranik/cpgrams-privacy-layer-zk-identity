'use strict';

const { Router } = require('express');
const Message = require('../models/Message');
const Case = require('../models/Case');
const verifyToken = require('../middleware/verifyToken');
const { verifyOfficerToken } = require('../services/officerAuth');

const router = Router();

function flexAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7).trim();
    
    // First, test if it's an Officer JWT token
    const officerPayload = verifyOfficerToken(rawToken);
    if (officerPayload && officerPayload.officerId) {
      req.authType = 'officer';
      req.officer = {
        officerId: officerPayload.officerId,
        name: officerPayload.name,
        department: officerPayload.department,
      };
      return next();
    }
    
    // If not officer token, treat as citizen OIDC token
    req.authType = 'citizen';
    return verifyToken(req, res, next);
  }

  // Fallback to direct X-Officer-Id header
  const officerId = req.headers['x-officer-id'];
  if (officerId) {
    req.authType = 'officer';
    req.officer = { officerId: officerId.trim().toUpperCase() };
    return next();
  }

  // Check citizen session token
  if (req.session && req.session.accessToken) {
    req.authType = 'citizen';
    return verifyToken(req, res, next);
  }

  return res.status(401).json({ error: 'Authentication required. No token or officer ID provided.' });
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

    if (req.authType === 'citizen' && grievance.pairwiseId !== req.citizen?.pairwiseId) {
      return res.status(403).json({ error: 'Forbidden. Case belongs to a different citizen.' });
    }
    if (req.authType === 'officer' && grievance.assignedOfficerId !== req.officer?.officerId) {
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
 * Body: { content }
 * Role is derived server-side.
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

    if (req.authType === 'citizen' && grievance.pairwiseId !== req.citizen?.pairwiseId) {
      return res.status(403).json({ error: 'Forbidden. Case belongs to a different citizen.' });
    }
    if (req.authType === 'officer' && grievance.assignedOfficerId !== req.officer?.officerId) {
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
