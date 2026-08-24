'use strict';

const { Router } = require('express');
const Case = require('../models/Case');
const Officer = require('../models/Officer');
const Message = require('../models/Message');
const AuditLog = require('../models/AuditLog');
const {
  verifyPassword,
  signOfficerToken,
  verifyOfficerToken,
} = require('../services/officerAuth');

const router = Router();

/**
 * POST /officer/login
 * Authenticate an officer (officerId + password) → issue JWT.
 * Body: { officerId, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { officerId, password } = req.body;

    if (!officerId || !password) {
      return res.status(400).json({ error: 'officerId and password are required.' });
    }

    const officer = await Officer.findOne({ officerId: officerId.trim().toUpperCase() });
    if (!officer || !officer.passwordHash || !verifyPassword(password, officer.passwordHash)) {
      return res.status(401).json({ error: 'Invalid officer ID or password.' });
    }

    const token = signOfficerToken(officer);

    return res.json({
      token,
      officer: {
        officerId: officer.officerId,
        name: officer.name,
        department: officer.department,
        level: officer.level,
      },
    });
  } catch (err) {
    console.error('Officer login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- Officer auth middleware: verifies signed JWT or X-Officer-Id header ----
function requireOfficer(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const payload = verifyOfficerToken(authHeader.slice(7));
    if (payload && payload.officerId) {
      req.officer = {
        officerId: payload.officerId,
        name: payload.name,
        department: payload.department,
      };
      return next();
    }
  }

  const officerId = req.headers['x-officer-id'];
  if (officerId) {
    req.officer = { officerId: officerId.trim().toUpperCase() };
    return next();
  }

  return res.status(401).json({ error: 'Officer authentication required.' });
}

router.use(requireOfficer);

/**
 * GET /officer/me
 * Return profile of authenticated officer.
 */
router.get('/me', async (req, res) => {
  try {
    const officer = await Officer.findOne({ officerId: req.officer.officerId }).select('-passwordHash -__v');
    if (!officer) {
      return res.status(404).json({ error: 'Officer not found.' });
    }
    return res.json(officer);
  } catch (err) {
    console.error('Get officer profile error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /officer/cases
 * List all cases assigned to this officer.
 * NEVER include pairwiseId.
 */
router.get('/cases', async (req, res) => {
  try {
    const cases = await Case.find({ assignedOfficerId: req.officer.officerId })
      .select('-pairwiseId -__v')
      .sort({ createdAt: -1 });
    return res.json(cases);
  } catch (err) {
    console.error('Officer cases error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /officer/case/:caseId
 * Full case detail (strip pairwiseId).
 */
router.get('/case/:caseId', async (req, res) => {
  try {
    const grievance = await Case.findOne({
      caseId: req.params.caseId,
      assignedOfficerId: req.officer.officerId,
    });
    if (!grievance) {
      return res.status(404).json({ error: 'Case not found or not assigned to you.' });
    }

    if (grievance.assignedOfficerId !== req.officer.officerId) {
      return res.status(403).json({ error: 'Forbidden. Case assigned to a different officer.' });
    }

    // Strip pairwiseId
    const response = grievance.toObject();
    delete response.pairwiseId;
    delete response.__v;

    return res.json(response);
  } catch (err) {
    console.error('Officer case detail error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * PATCH /officer/case/:caseId/status
 * Update case status.
 * Body: { status }
 */
router.patch('/case/:caseId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['assigned', 'in_progress', 'resolved'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const grievance = await Case.findOne({ caseId: req.params.caseId });
    if (!grievance) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    if (grievance.assignedOfficerId !== req.officer.officerId) {
      return res.status(403).json({ error: 'Forbidden. Case assigned to a different officer.' });
    }

    grievance.status = status;
    grievance.updatedAt = new Date();
    await grievance.save();

    // Audit log
    await AuditLog.create({
      eventType: 'status_updated',
      actorId: req.officer.officerId,
      targetCaseId: grievance.caseId,
      metadata: { newStatus: status },
    });

    const response = grievance.toObject();
    delete response.pairwiseId;
    delete response.__v;

    return res.json(response);
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /officer/case/:caseId/message
 * Send a masked message as officer.
 * Body: { content }
 */
router.post('/case/:caseId/message', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required.' });
    }

    const grievance = await Case.findOne({ caseId: req.params.caseId });
    if (!grievance) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    if (grievance.assignedOfficerId !== req.officer.officerId) {
      return res.status(403).json({ error: 'Forbidden. Case assigned to a different officer.' });
    }

    const message = await Message.create({
      caseId: req.params.caseId,
      senderRole: 'officer',
      content,
    });

    return res.status(201).json({
      caseId: message.caseId,
      senderRole: message.senderRole,
      content: message.content,
      createdAt: message.createdAt,
    });
  } catch (err) {
    console.error('Officer message error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
