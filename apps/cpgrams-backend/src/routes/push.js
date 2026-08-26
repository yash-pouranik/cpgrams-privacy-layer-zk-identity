'use strict';

const { Router } = require('express');
const Case = require('../models/Case');
const AuditLog = require('../models/AuditLog');
const { generateCaseId } = require('../services/caseId');
const { autoAssign, getDepartment } = require('../services/autoAssign');
const { AI_ENABLED } = require('../config/aiConfig');
const { enqueueAiAnalysis } = require('../ai/queue/grievanceQueue');

const router = Router();

function verifyApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const validKeys = process.env.API_PUSH_KEYS ? process.env.API_PUSH_KEYS.split(',') : [];
  
  if (!apiKey || !validKeys.includes(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized API Key.' });
  }
  next();
}

/**
 * POST /api/push/grievance
 */
router.post('/api/push/grievance', verifyApiKey, async (req, res) => {
  try {
    const { sourcePortal, sourceRefId, category, description, citizenPairwiseId, evidenceUrls } = req.body;

    if (!sourcePortal || !category || !description || !citizenPairwiseId) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const caseId = await generateCaseId(citizenPairwiseId);
    const department = getDepartment(category);

    const officer = await autoAssign(category);

    const crypto = require('crypto');
    const bcrypt = require('bcryptjs');
    const rawPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const newCase = await Case.create({
      caseId,
      pairwiseId: citizenPairwiseId,
      category,
      description,
      evidenceUrls: evidenceUrls || [],
      status: officer ? 'assigned' : 'pending',
      assignedOfficerId: officer ? officer.officerId : null,
      department,
      sourcePortal,
      sourceRefId,
      registrationPassword: hashedPassword
    });

    await AuditLog.create({
      eventType: 'grievance_pushed',
      actorId: 'system',
      targetCaseId: caseId,
      targetPairwiseId: citizenPairwiseId,
      metadata: { sourcePortal, sourceRefId, category, department, assignedOfficerId: officer ? officer.officerId : null }
    });

    let aiAnalysis = 'DISABLED';
    if (AI_ENABLED) {
      const aiJob = await enqueueAiAnalysis(caseId, { category, department, sourcePortal });
      aiAnalysis = aiJob ? 'QUEUED' : 'UNAVAILABLE';
    }

    return res.status(201).json({
      registrationId: newCase.caseId,
      registrationPassword: rawPassword,
      status: newCase.status,
      assignedDepartment: newCase.department,
      assignedOfficerId: newCase.assignedOfficerId,
      aiAnalysis,
    });
  } catch (err) {
    console.error('Push grievance error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
