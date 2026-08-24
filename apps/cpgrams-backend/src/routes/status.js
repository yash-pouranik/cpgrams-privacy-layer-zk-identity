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
      eventType: { $in: ['status_updated', 'grievance_filed', 'reminder_sent', 'clarification_requested', 'feedback_submitted'] }
    }).sort({ createdAt: 1 });

    const timeline = logs.map(log => {
      let title = log.eventType.replace(/_/g, ' ');
      if (log.eventType === 'grievance_filed') title = 'Grievance Registered';
      else if (log.eventType === 'status_updated') title = `Status Updated: ${(log.metadata?.newStatus || log.metadata?.status || 'In Progress').toUpperCase().replace(/_/g, ' ')}`;
      else if (log.eventType === 'reminder_sent') title = 'Citizen Reminder Logged';
      else if (log.eventType === 'clarification_requested') title = 'Officer Clarification Requested';
      else if (log.eventType === 'feedback_submitted') title = 'Citizen Redressal Feedback Submitted';

      return {
        _id: log._id,
        eventType: log.eventType,
        title,
        status: log.metadata?.newStatus || log.metadata?.status || log.eventType || 'logged',
        createdAt: log.createdAt,
        notes: log.metadata?.notes || log.metadata?.justification || ''
      };
    });

    return res.json(timeline);
  } catch (err) {
    console.error('Status history error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
