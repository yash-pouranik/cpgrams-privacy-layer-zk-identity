'use strict';

const { Router } = require('express');
const bcrypt = require('bcryptjs');
const Case = require('../models/Case');
const AuditLog = require('../models/AuditLog');

const router = Router();

/**
 * POST /status/check
 * Public status check
 */
router.post('/status/check', async (req, res) => {
  try {
    const { caseId, registrationPassword } = req.body;
    if (!caseId || !registrationPassword) {
      return res.status(400).json({ error: 'caseId and registrationPassword are required.' });
    }

    const grievance = await Case.findOne({ caseId });
    if (!grievance || !grievance.registrationPassword) {
      return res.status(401).json({ error: 'Invalid credentials or case not found.' });
    }

    const isMatch = await bcrypt.compare(registrationPassword, grievance.registrationPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials or case not found.' });
    }

    return res.json({
      caseId: grievance.caseId,
      status: grievance.status,
      department: grievance.department,
      category: grievance.category,
      createdAt: grievance.createdAt,
      updatedAt: grievance.updatedAt
    });
  } catch (err) {
    console.error('Status check error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /status/:caseId/history
 */
router.get('/status/:caseId/history', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { password } = req.query;

    if (!password) {
      return res.status(400).json({ error: 'password query parameter is required.' });
    }

    const grievance = await Case.findOne({ caseId });
    if (!grievance || !grievance.registrationPassword) {
      return res.status(401).json({ error: 'Invalid credentials or case not found.' });
    }

    const isMatch = await bcrypt.compare(password, grievance.registrationPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials or case not found.' });
    }

    const logs = await AuditLog.find({
      targetCaseId: caseId,
      eventType: { $in: ['status_updated', 'grievance_filed'] }
    }).sort({ createdAt: 1 });

    return res.json(logs);
  } catch (err) {
    console.error('Status history error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
