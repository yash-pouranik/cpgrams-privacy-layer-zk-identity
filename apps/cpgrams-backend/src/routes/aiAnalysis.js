'use strict';

const { Router } = require('express');
const Case = require('../models/Case');
const AiCaseAnalysis = require('../models/AiCaseAnalysis');
const verifyToken = require('../middleware/verifyToken');
const { verifyOfficerToken } = require('../services/officerAuth');

const router = Router();

router.get('/ai-analysis/:caseId', async (req, res) => {
  try {
    const caseRecord = await Case.findOne({ caseId: req.params.caseId }).lean();
    if (!caseRecord) return res.status(404).json({ error: 'Case not found.' });

    const authHeader = req.headers.authorization || '';
    const officerToken = authHeader.startsWith('Bearer ') ? verifyOfficerToken(authHeader.slice(7)) : null;
    if (officerToken?.officerId) {
      if (caseRecord.assignedOfficerId !== officerToken.officerId) return res.status(403).json({ error: 'Access denied.' });
    } else {
      await new Promise((resolve) => verifyToken(req, res, () => resolve()));
      if (res.headersSent) return;
      if (!req.citizen || caseRecord.pairwiseId !== req.citizen.pairwiseId) return res.status(403).json({ error: 'Access denied.' });
    }

    const analysis = await AiCaseAnalysis.findOne({ caseId: req.params.caseId }).select('-_id -__v').lean();
    return res.json(analysis || { caseId: req.params.caseId, status: 'queued', triage: null, assignment: null });
  } catch (err) {
    console.error('AI analysis detail error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
