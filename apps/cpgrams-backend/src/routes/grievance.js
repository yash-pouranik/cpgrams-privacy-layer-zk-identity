'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Router } = require('express');
const fs = require('fs');
const Case = require('../models/Case');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const verifyToken = require('../middleware/verifyToken');
const { upload } = require('../middleware/upload');
const { generateCaseId } = require('../services/caseId');
const { autoAssign, getDepartment } = require('../services/autoAssign');

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
    let department = explicitDept && explicitDept !== 'NOT_LISTED' ? explicitDept : getDepartment(category, description);

    // Try to auto-assign an officer via semantic IGMS auto-routing
    const officer = await autoAssign(category, description);

    // Generate Registration Password for public tracking
    const password = crypto.randomBytes(4).toString('hex');
    const hash = await bcrypt.hash(password, 10);

    // Build evidence URL list: uploaded files first, then external URLs
    const baseUrl = `http://localhost:${process.env.PORT || 5000}`;
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

    // Response — NEVER include pairwiseId
    return res.status(201).json({
      caseId: newCase.caseId,
      category: newCase.category,
      status: newCase.status,
      assignedDepartment: newCase.department,
      assignedOfficerId: newCase.assignedOfficerId,
      createdAt: newCase.createdAt,
      registrationPassword: password,
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
