'use strict';

const { Router } = require('express');
const Case = require('../models/Case');
const Message = require('../models/Message');
const AuditLog = require('../models/AuditLog');

const router = Router();

// Mock officer auth middleware
function requireOfficer(req, res, next) {
  const officerId = req.headers['x-officer-id'];
  if (!officerId) {
    return res.status(401).json({ error: 'X-Officer-Id header required.' });
  }
  req.officer = { officerId };
  next();
}

router.use(requireOfficer);

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
    const grievance = await Case.findOne({ caseId: req.params.caseId });
    if (!grievance) {
      return res.status(404).json({ error: 'Case not found.' });
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
