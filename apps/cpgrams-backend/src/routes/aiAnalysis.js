'use strict';

const { Router } = require('express');
const Case = require('../models/Case');
const Document = require('../models/Document');
const AiCaseAnalysis = require('../models/AiCaseAnalysis');
const Evidence = require('../models/Evidence');
const verifyToken = require('../middleware/verifyToken');
const { verifyOfficerToken } = require('../services/officerAuth');

const router = Router();

async function authorizeCaseAccess(req, res, caseRecord) {
  const authHeader = req.headers.authorization || '';
  const officerToken = authHeader.startsWith('Bearer ') ? verifyOfficerToken(authHeader.slice(7)) : null;
  if (officerToken?.officerId) {
    if (caseRecord.assignedOfficerId !== officerToken.officerId) {
      res.status(403).json({ error: 'Access denied.' });
      return false;
    }
    return true;
  }

  await new Promise((resolve) => verifyToken(req, res, () => resolve()));
  if (res.headersSent) return false;
  if (!req.citizen || caseRecord.pairwiseId !== req.citizen.pairwiseId) {
    res.status(403).json({ error: 'Access denied.' });
    return false;
  }
  return true;
}

router.get('/ai-analysis/:caseId', async (req, res) => {
  try {
    const caseRecord = await Case.findOne({ caseId: req.params.caseId }).lean();
    if (!caseRecord) return res.status(404).json({ error: 'Case not found.' });

    if (!await authorizeCaseAccess(req, res, caseRecord)) return;

    const analysis = await AiCaseAnalysis.findOne({ caseId: req.params.caseId }).select('-_id -__v').lean();
    return res.json(analysis || { caseId: req.params.caseId, status: 'queued', triage: null, assignment: null });
  } catch (err) {
    console.error('AI analysis detail error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /grievance/:caseId/documents/:docId/analysis
 * Returns the per-document Agent 2 result after the background pipeline has run.
 */
router.get('/grievance/:caseId/documents/:docId/analysis', async (req, res) => {
  try {
    const { caseId, docId } = req.params;
    const caseRecord = await Case.findOne({ caseId }).lean();
    if (!caseRecord) return res.status(404).json({ error: 'Case not found.' });
    if (!await authorizeCaseAccess(req, res, caseRecord)) return;

    const document = await Document.findOne({ _id: docId, caseId }).select('_id originalName mimeType createdAt').lean();
    if (!document) return res.status(404).json({ error: 'Document not found.' });

    const analysis = await AiCaseAnalysis.findOne({ caseId }).select('status documentAnalysis').lean();
    const documentAnalysis = (analysis?.documentAnalysis || []).find(
      (item) => String(item.documentId) === String(docId)
    );

    return res.json({
      caseId,
      document: {
        _id: document._id,
        originalName: document.originalName,
        mimeType: document.mimeType,
        createdAt: document.createdAt,
      },
      status: analysis?.status || 'queued',
      analysis: documentAnalysis || null,
      authenticityNotice: 'AI assesses apparent relevance and extracts information. It does not establish document authenticity or legal truth; officer verification is required.',
    });
  } catch (err) {
    console.error('Document AI analysis detail error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/** GET /grievance/:caseId/evidence — public-source research for the case */
router.get('/grievance/:caseId/evidence', async (req, res) => {
  try {
    const caseRecord = await Case.findOne({ caseId: req.params.caseId }).lean();
    if (!caseRecord) return res.status(404).json({ error: 'Case not found.' });
    if (!await authorizeCaseAccess(req, res, caseRecord)) return;
    const evidence = await Evidence.find({ caseId: req.params.caseId })
      .select('-_id -__v')
      .sort({ evidenceConfidence: -1, createdAt: -1 })
      .lean();
    return res.json(evidence);
  } catch (err) {
    console.error('Case evidence detail error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
