'use strict';

const { Router } = require('express');
const Message = require('../models/Message');
const Case = require('../models/Case');

const router = Router();

/**
 * GET /chat/:caseId
 * Get all messages for a case.
 */
router.get('/:caseId', async (req, res) => {
  try {
    const grievance = await Case.findOne({ caseId: req.params.caseId });
    if (!grievance) {
      return res.status(404).json({ error: 'Case not found.' });
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
router.post('/:caseId', async (req, res) => {
  try {
    const { senderRole, content } = req.body;

    if (!senderRole || !['citizen', 'officer'].includes(senderRole)) {
      return res.status(400).json({ error: 'senderRole must be "citizen" or "officer".' });
    }
    if (!content) {
      return res.status(400).json({ error: 'content is required.' });
    }

    const grievance = await Case.findOne({ caseId: req.params.caseId });
    if (!grievance) {
      return res.status(404).json({ error: 'Case not found.' });
    }

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
