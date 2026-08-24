'use strict';

const { Router } = require('express');
const Case = require('../models/Case');
const AuditLog = require('../models/AuditLog');
const verifyToken = require('../middleware/verifyToken');
const { generateCaseId } = require('../services/caseId');
const { autoAssign, getDepartment } = require('../services/autoAssign');

const router = Router();

// All grievance routes require citizen authentication
router.use(verifyToken);

/**
 * POST /grievance
 * File a new grievance.
 * Body: { category, description, evidenceUrls? }
 */
router.post('/', async (req, res) => {
  try {
    const { pairwiseId } = req.citizen;
    const { category, description, evidenceUrls } = req.body;

    if (!category || !description) {
      return res.status(400).json({ error: 'category and description are required.' });
    }

    const caseId = generateCaseId(pairwiseId);
    const department = getDepartment(category);

    // Try to auto-assign an officer
    const officer = await autoAssign(category);

    const newCase = await Case.create({
      caseId,
      pairwiseId,
      category,
      description,
      evidenceUrls: evidenceUrls || [],
      status: officer ? 'assigned' : 'pending',
      assignedOfficerId: officer ? officer.officerId : null,
      department,
    });

    // Audit log
    await AuditLog.create({
      eventType: 'grievance_filed',
      actorId: pairwiseId,
      targetCaseId: caseId,
      targetPairwiseId: pairwiseId,
      metadata: { category, department, assignedOfficerId: officer ? officer.officerId : null },
    });

    // Response — NEVER include pairwiseId
    return res.status(201).json({
      caseId: newCase.caseId,
      category: newCase.category,
      status: newCase.status,
      assignedDepartment: newCase.department,
      assignedOfficerId: newCase.assignedOfficerId,
      createdAt: newCase.createdAt,
    });
  } catch (err) {
    console.error('File grievance error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /grievance/my
 * Get all cases for the authenticated citizen.
 * MUST be defined BEFORE /:caseId to avoid route collision.
 */
router.get('/my', async (req, res) => {
  try {
    const { pairwiseId } = req.citizen;
    const cases = await Case.find({ pairwiseId })
      .select('-pairwiseId -__v')
      .sort({ createdAt: -1 });
    return res.json(cases);
  } catch (err) {
    console.error('My grievances error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /grievance/:caseId
 * Get a specific case (citizen must own it).
 */
router.get('/:caseId', async (req, res) => {
  try {
    const { pairwiseId } = req.citizen;
    const grievance = await Case.findOne({ caseId: req.params.caseId });

    if (!grievance) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    // Citizen can only view their own cases
    if (grievance.pairwiseId !== pairwiseId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Strip pairwiseId from response
    const response = grievance.toObject();
    delete response.pairwiseId;
    delete response.__v;

    return res.json(response);
  } catch (err) {
    console.error('Get grievance error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
