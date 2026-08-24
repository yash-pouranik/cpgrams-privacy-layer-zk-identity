'use strict';

const { Router } = require('express');
const Case = require('../models/Case');
const Reminder = require('../models/Reminder');
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
 * POST /grievance/:caseId/reminder
 */
router.post('/grievance/:caseId/reminder', verifyToken, async (req, res) => {
  try {
    const { pairwiseId } = req.citizen;
    const { caseId } = req.params;
    const { type, content } = req.body;

    if (!['reminder', 'clarification_response'].includes(type) || !content) {
      return res.status(400).json({ error: 'Invalid type or missing content.' });
    }

    const grievance = await Case.findOne({ caseId });
    if (!grievance) return res.status(404).json({ error: 'Case not found.' });
    if (grievance.pairwiseId !== pairwiseId) return res.status(403).json({ error: 'Access denied.' });

    const reminder = await Reminder.create({
      caseId,
      type,
      content,
      senderRole: 'citizen'
    });

    const eventType = type === 'reminder' ? 'reminder_sent' : 'clarification_responded';
    await AuditLog.create({
      eventType,
      actorId: pairwiseId,
      targetCaseId: caseId,
      metadata: { reminderId: reminder._id }
    });

    return res.status(201).json(reminder);
  } catch (err) {
    console.error('Citizen reminder error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /grievance/:caseId/reminders
 */
router.get('/grievance/:caseId/reminders', verifyToken, async (req, res) => {
  try {
    const { pairwiseId } = req.citizen;
    const { caseId } = req.params;

    const grievance = await Case.findOne({ caseId });
    if (!grievance) return res.status(404).json({ error: 'Case not found.' });
    if (grievance.pairwiseId !== pairwiseId) return res.status(403).json({ error: 'Access denied.' });

    const reminders = await Reminder.find({ caseId }).sort({ createdAt: 1 });
    return res.json(reminders);
  } catch (err) {
    console.error('Citizen list reminders error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /officer/case/:caseId/clarification
 */
router.post('/officer/case/:caseId/clarification', requireOfficer, async (req, res) => {
  try {
    const { officerId } = req.officer;
    const { caseId } = req.params;
    const { content } = req.body;

    if (!content) return res.status(400).json({ error: 'Missing content.' });

    const grievance = await Case.findOne({ caseId });
    if (!grievance) return res.status(404).json({ error: 'Case not found.' });
    if (grievance.assignedOfficerId !== officerId) return res.status(403).json({ error: 'Access denied.' });

    const reminder = await Reminder.create({
      caseId,
      type: 'clarification_request',
      content,
      senderRole: 'officer'
    });

    await AuditLog.create({
      eventType: 'clarification_requested',
      actorId: officerId,
      targetCaseId: caseId,
      metadata: { reminderId: reminder._id }
    });

    return res.status(201).json(reminder);
  } catch (err) {
    console.error('Officer clarification error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /officer/case/:caseId/reminders
 */
router.get('/officer/case/:caseId/reminders', requireOfficer, async (req, res) => {
  try {
    const { officerId } = req.officer;
    const { caseId } = req.params;

    const grievance = await Case.findOne({ caseId });
    if (!grievance) return res.status(404).json({ error: 'Case not found.' });
    if (grievance.assignedOfficerId !== officerId) return res.status(403).json({ error: 'Access denied.' });

    const reminders = await Reminder.find({ caseId }).sort({ createdAt: 1 });
    return res.json(reminders);
  } catch (err) {
    console.error('Officer list reminders error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
