'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Router } = require('express');
const fs = require('fs');
const Case = require('../models/Case');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const CaseFollow = require('../models/CaseFollow');
const verifyToken = require('../middleware/verifyToken');
const { upload } = require('../middleware/upload');
const { generateCaseId } = require('../services/caseId');
const { autoAssign, getDepartment } = require('../services/autoAssign');
const { findSimilarCases, MIN_QUERY_LENGTH } = require('../services/duplicateDetect');
const { AI_ENABLED } = require('../config/aiConfig');
const { enqueueAiAnalysis } = require('../ai/queue/grievanceQueue');

const router = Router();

// NOTE: Do NOT use router.use(verifyToken) here. This router is mounted before
// other feature routers (documents/reminders/feedback), so a blanket middleware
// would 401 any /grievance/<id>/<sub> request carrying a non-OIDC token
// (e.g. an officer JWT) before those routers get a chance to handle it.
// Auth is attached per-route below instead.

/**
 * POST /grievance
 * File a new grievance.
 * Supports both JSON and multipart/form-data with file attachments.
 */
router.post('/', verifyToken, upload.array('files', 5), async (req, res) => {
  try {
    const { pairwiseId } = req.citizen;
    const {
      category,
      description,
      urls,
      evidenceUrls: rawEvidenceUrls,
      sourcePortal = 'cpgrams-web',
      orgType = 'central',
      department: explicitDept,
      priorRefNumber,
      priorRefDate,
    } = req.body;

    if (!category || !description) {
      return res.status(400).json({ error: 'category and description are required.' });
    }

    const caseId = await generateCaseId(pairwiseId);
    const isAiTriage = category === 'Unclassified (AI Triage Pending)';
    let department = isAiTriage 
      ? 'Triage Pending' 
      : (explicitDept && explicitDept !== 'NOT_LISTED' ? explicitDept : getDepartment(category, description));

    // Try to auto-assign an officer via semantic IGMS auto-routing (skip if AI Triage is pending)
    const officer = isAiTriage ? null : await autoAssign(category, description);

    // Generate Registration Password for public tracking
    const password = crypto.randomBytes(4).toString('hex');
    const hash = await bcrypt.hash(password, 10);

    // Build evidence URL list: uploaded files first, then external URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const uploadedUrls = (req.files || []).map(
      (f) => `${baseUrl}/uploads/${f.filename}`
    );

    let externalUrls = [];
    if (urls) {
      try {
        const parsed = JSON.parse(urls);
        if (Array.isArray(parsed)) {
          externalUrls = parsed.map((u) => String(u).trim()).filter(Boolean);
        } else if (typeof parsed === 'string') {
          externalUrls = parsed.split(',').map((u) => u.trim()).filter(Boolean);
        }
      } catch {
        externalUrls = String(urls).split(',').map((u) => u.trim()).filter(Boolean);
      }
    } else if (rawEvidenceUrls) {
      if (Array.isArray(rawEvidenceUrls)) {
        externalUrls = rawEvidenceUrls;
      } else if (typeof rawEvidenceUrls === 'string') {
        try {
          const parsed = JSON.parse(rawEvidenceUrls);
          externalUrls = Array.isArray(parsed) ? parsed : [rawEvidenceUrls];
        } catch {
          externalUrls = [rawEvidenceUrls];
        }
      }
    }

    const finalEvidenceUrls = [...uploadedUrls, ...externalUrls];

    // Persist attached documents in Document collection
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await Document.create({
          caseId,
          fileName: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storagePath: file.path,
          uploadedBy: pairwiseId,
          uploadedByRole: 'citizen',
        });
      }
    }

    const newCase = await Case.create({
      caseId,
      pairwiseId,
      category,
      description,
      evidenceUrls: finalEvidenceUrls,
      status: 'received',
      assignedOfficerId: officer ? officer.officerId : null,
      department: department || (officer ? officer.department : 'General Administration'),
      orgType: ['central', 'state', 'ut'].includes(orgType) ? orgType : 'central',
      priorRefNumber: priorRefNumber ? String(priorRefNumber).trim() : null,
      priorRefDate: priorRefDate ? String(priorRefDate).trim() : null,
      registrationPassword: hash,
      sourcePortal,
      documentCount: uploadedUrls.length,
    });

    // Audit log
    await AuditLog.create({
      eventType: 'grievance_filed',
      actorId: pairwiseId,
      targetCaseId: caseId,
      targetPairwiseId: pairwiseId,
      metadata: { category, department, assignedOfficerId: officer ? officer.officerId : null, sourcePortal, evidenceCount: finalEvidenceUrls.length },
    });

    // ── Enqueue async AI analysis (non-blocking) ──────────────────────────
    // The HTTP response is sent immediately; AI runs in the background.
    // AI_ENABLED=false → skips entirely, zero impact on existing tests.
    let aiAnalysis = 'DISABLED';
    if (AI_ENABLED) {
      const aiJob = await enqueueAiAnalysis(caseId, { category, department });
      aiAnalysis = aiJob ? 'QUEUED' : 'UNAVAILABLE';
    }

    // Response — NEVER include pairwiseId
    return res.status(201).json({
      caseId: newCase.caseId,
      category: newCase.category,
      status: newCase.status,
      assignedDepartment: newCase.department,
      assignedOfficerId: newCase.assignedOfficerId,
      createdAt: newCase.createdAt,
      registrationPassword: password,
      aiAnalysis,
    });
  } catch (err) {
    console.error('File grievance error:', err);
    if (req.files && req.files.length) {
      req.files.forEach((f) => {
        try {
          fs.unlinkSync(f.path);
        } catch {}
      });
    }
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /grievance/my
 * Get all cases for the authenticated citizen.
 * MUST be defined BEFORE /:caseId to avoid route collision.
 */
router.get('/my', verifyToken, async (req, res) => {
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
 * GET /grievance/suggestions
 * StackOverflow-style duplicate detection: given a draft description (and
 * category), return similar recently-reported OPEN cases so the citizen can
 * vote on an existing issue instead of filing a duplicate.
 * Must be defined BEFORE /:caseId.
 */
router.get('/suggestions', verifyToken, async (req, res) => {
  try {
    const { pairwiseId } = req.citizen;
    const { category, q } = req.query;

    if (!q || String(q).length < MIN_QUERY_LENGTH) {
      return res.json({ suggestions: [], ownDuplicate: null });
    }

    const result = await findSimilarCases({
      category,
      description: String(q),
      pairwiseId,
    });
    return res.json(result);
  } catch (err) {
    console.error('Suggestions error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /grievance/:caseId/vote
 * Citizen upvotes an existing reported issue. One vote per citizen.
 * Vote count acts as an urgency/priority signal for officers.
 */
router.post('/:caseId/vote', verifyToken, async (req, res) => {
  try {
    const { pairwiseId } = req.citizen;
    const grievance = await Case.findOne({ caseId: req.params.caseId });

    if (!grievance) {
      return res.status(404).json({ error: 'Case not found.' });
    }
    if (grievance.pairwiseId === pairwiseId) {
      return res.status(400).json({ error: 'You cannot vote on your own grievance.' });
    }
    if (grievance.voterPairwiseIds && grievance.voterPairwiseIds.includes(pairwiseId)) {
      return res.status(409).json({
        error: 'You have already voted on this issue.',
        votes: grievance.votes,
      });
    }

    grievance.votes = (grievance.votes || 0) + 1;
    if (!grievance.voterPairwiseIds) grievance.voterPairwiseIds = [];
    grievance.voterPairwiseIds.push(pairwiseId);
    await grievance.save();

    // Mint a per-voter tracking password so this user can follow the issue
    // via the public status tracker. The original filer's registrationPassword
    // is never revealed — each voter gets their own secret.
    const trackingPassword = crypto.randomBytes(4).toString('hex');
    await CaseFollow.findOneAndUpdate(
      { caseId: grievance.caseId, voterPairwiseId: pairwiseId },
      {
        caseId: grievance.caseId,
        voterPairwiseId: pairwiseId,
        trackingPassword,
      },
      { upsert: true, new: true }
    );

    // Audit log (no identity leak — pairwiseId only)
    await AuditLog.create({
      eventType: 'grievance_upvoted',
      actorId: pairwiseId,
      targetCaseId: grievance.caseId,
      targetPairwiseId: grievance.pairwiseId,
      metadata: { votes: grievance.votes },
    });

    return res.json({
      caseId: grievance.caseId,
      votes: grievance.votes,
      trackingCaseId: grievance.caseId,
      trackingPassword,
      message: 'Vote recorded. Use the tracking password to follow this issue on the public portal.',
    });
  } catch (err) {
    console.error('Vote error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /grievance/followed
 * List the cases this citizen has voted on (followed), along with their own
 * tracking passwords so they can check status on the public tracker.
 * Must be defined BEFORE /:caseId.
 */
router.get('/followed', verifyToken, async (req, res) => {
  try {
    const { pairwiseId } = req.citizen;
    const follows = await CaseFollow.find({ voterPairwiseId: pairwiseId })
      .sort({ createdAt: -1 })
      .lean();

    const caseIds = follows.map((f) => f.caseId);
    const cases = await Case.find({ caseId: { $in: caseIds } })
      .select('caseId category description votes status createdAt')
      .lean();

    const byId = new Map(cases.map((c) => [c.caseId, c]));

    const followed = [];
    for (const f of follows) {
      const c = byId.get(f.caseId);
      if (!c) continue;
      followed.push({
        caseId: c.caseId,
        category: c.category,
        status: c.status,
        votes: c.votes || 0,
        createdAt: c.createdAt,
        trackingPassword: f.trackingPassword,
      });
    }

    return res.json({ followed });
  } catch (err) {
    console.error('Followed cases error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /grievance/:caseId
 * Get a specific case (citizen must own it).
 */
router.get('/:caseId', verifyToken, async (req, res) => {
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

/**
 * POST /grievance/:caseId/appeal
 * Initiate First Appeal to Appellate Authority (Stage 9 & 10).
 */
router.post('/:caseId/appeal', verifyToken, async (req, res) => {
  try {
    const { pairwiseId } = req.citizen;
    const { appealReason } = req.body;
    const { caseId } = req.params;

    if (!appealReason || !appealReason.trim()) {
      return res.status(400).json({ error: 'Appeal grounds/reason is required.' });
    }

    const grievance = await Case.findOne({ caseId });
    if (!grievance) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    if (grievance.pairwiseId !== pairwiseId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const isDisposed = grievance.status === 'disposed' || grievance.status === 'resolved';
    if (!isDisposed && grievance.status !== 'appealed') {
      return res.status(400).json({ error: 'First Appeal can only be initiated on disposed grievances.' });
    }

    grievance.status = 'appealed';
    grievance.appealReason = appealReason.trim();
    grievance.appealStatus = 'pending';
    grievance.appealFiledAt = new Date();
    await grievance.save();

    await AuditLog.create({
      eventType: 'appeal_initiated',
      actorId: pairwiseId,
      targetCaseId: caseId,
      targetPairwiseId: pairwiseId,
      metadata: { appealReason: appealReason.trim(), department: grievance.department },
    });

    const response = grievance.toObject();
    delete response.pairwiseId;
    delete response.__v;
    return res.json(response);
  } catch (err) {
    console.error('Initiate appeal error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
