'use strict';

const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Case = require('../models/Case');
const Document = require('../models/Document');
const verifyToken = require('../middleware/verifyToken');

const { verifyOfficerToken } = require('../services/officerAuth');

const router = Router();

function requireOfficer(req, res, next) {
  let rawToken = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    rawToken = authHeader.slice(7).trim();
  } else if (req.query && req.query.token) {
    rawToken = req.query.token;
  }

  if (rawToken) {
    const payload = verifyOfficerToken(rawToken);
    if (payload && payload.officerId) {
      req.officer = {
        officerId: payload.officerId,
        name: payload.name,
        department: payload.department,
      };
      return next();
    }
  }

  const officerId = req.headers['x-officer-id'] || (req.query && req.query.officerId);
  if (officerId) {
    req.officer = { officerId: officerId.trim().toUpperCase() };
    return next();
  }

  return res.status(401).json({ error: 'Officer authentication required.' });
}

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    cb(null, allowed.includes(file.mimetype));
  }
});

/**
 * POST /grievance/:caseId/documents
 */
router.post('/grievance/:caseId/documents', verifyToken, upload.array('files', 5), async (req, res) => {
  try {
    const { pairwiseId } = req.citizen;
    const { caseId } = req.params;

    const grievance = await Case.findOne({ caseId });
    if (!grievance) return res.status(404).json({ error: 'Case not found.' });
    if (grievance.pairwiseId !== pairwiseId) return res.status(403).json({ error: 'Access denied.' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    const docs = [];
    for (const file of req.files) {
      const doc = await Document.create({
        caseId,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: file.path,
        uploadedBy: pairwiseId,
        uploadedByRole: 'citizen'
      });
      docs.push(doc);
    }

    await Case.updateOne({ caseId }, { $inc: { documentCount: docs.length } });

    const response = docs.map(d => ({
      _id: d._id,
      originalName: d.originalName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      uploadedByRole: d.uploadedByRole,
      createdAt: d.createdAt
    }));
    return res.status(201).json(response);
  } catch (err) {
    console.error('Citizen upload error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /grievance/:caseId/documents
 */
router.get('/grievance/:caseId/documents', verifyToken, async (req, res) => {
  try {
    const { pairwiseId } = req.citizen;
    const { caseId } = req.params;

    const grievance = await Case.findOne({ caseId });
    if (!grievance) return res.status(404).json({ error: 'Case not found.' });
    if (grievance.pairwiseId !== pairwiseId) return res.status(403).json({ error: 'Access denied.' });

    const docs = await Document.find({ caseId })
      .select('_id originalName mimeType sizeBytes uploadedByRole createdAt')
      .sort({ createdAt: -1 });
    return res.json(docs);
  } catch (err) {
    console.error('Citizen list docs error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /grievance/:caseId/documents/:docId/download
 */
router.get('/grievance/:caseId/documents/:docId/download', verifyToken, async (req, res) => {
  try {
    const { pairwiseId } = req.citizen;
    const { caseId, docId } = req.params;

    const grievance = await Case.findOne({ caseId });
    if (!grievance) return res.status(404).json({ error: 'Case not found.' });
    if (grievance.pairwiseId !== pairwiseId) return res.status(403).json({ error: 'Access denied.' });

    const doc = await Document.findOne({ _id: docId, caseId });
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    if (!doc.storagePath || !fs.existsSync(doc.storagePath)) {
      return res.status(404).json({ error: 'Document file not found on disk.' });
    }

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.originalName)}"`);
    const stream = fs.createReadStream(doc.storagePath);
    stream.pipe(res);
  } catch (err) {
    console.error('Citizen download doc error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /officer/case/:caseId/documents
 */
router.post('/officer/case/:caseId/documents', requireOfficer, upload.array('files', 5), async (req, res) => {
  try {
    const { officerId } = req.officer;
    const { caseId } = req.params;

    const grievance = await Case.findOne({ caseId });
    if (!grievance) return res.status(404).json({ error: 'Case not found.' });
    if (grievance.assignedOfficerId !== officerId) return res.status(403).json({ error: 'Access denied.' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    const docs = [];
    for (const file of req.files) {
      const doc = await Document.create({
        caseId,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: file.path,
        uploadedBy: officerId,
        uploadedByRole: 'officer'
      });
      docs.push(doc);
    }

    await Case.updateOne({ caseId }, { $inc: { documentCount: docs.length } });

    const response = docs.map(d => ({
      _id: d._id,
      originalName: d.originalName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      uploadedByRole: d.uploadedByRole,
      createdAt: d.createdAt
    }));
    return res.status(201).json(response);
  } catch (err) {
    console.error('Officer upload error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /officer/case/:caseId/documents
 */
router.get('/officer/case/:caseId/documents', requireOfficer, async (req, res) => {
  try {
    const { officerId } = req.officer;
    const { caseId } = req.params;

    const grievance = await Case.findOne({ caseId });
    if (!grievance) return res.status(404).json({ error: 'Case not found.' });
    if (grievance.assignedOfficerId !== officerId) return res.status(403).json({ error: 'Access denied.' });

    const docs = await Document.find({ caseId })
      .select('_id originalName mimeType sizeBytes uploadedByRole createdAt')
      .sort({ createdAt: -1 });
    return res.json(docs);
  } catch (err) {
    console.error('Officer list docs error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /officer/case/:caseId/documents/:docId/download
 */
router.get('/officer/case/:caseId/documents/:docId/download', requireOfficer, async (req, res) => {
  try {
    const { officerId } = req.officer;
    const { caseId, docId } = req.params;

    const grievance = await Case.findOne({ caseId });
    if (!grievance) return res.status(404).json({ error: 'Case not found.' });
    if (grievance.assignedOfficerId !== officerId) return res.status(403).json({ error: 'Access denied.' });

    const doc = await Document.findOne({ _id: docId, caseId });
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    if (!doc.storagePath || !fs.existsSync(doc.storagePath)) {
      return res.status(404).json({ error: 'Document file not found on disk.' });
    }

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.originalName)}"`);
    const stream = fs.createReadStream(doc.storagePath);
    stream.pipe(res);
  } catch (err) {
    console.error('Officer download doc error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
