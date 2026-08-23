'use strict';

const { Router } = require('express');
const crypto = require('crypto');
const Case = require('../models/Case');
const DisclosureRequest = require('../models/DisclosureRequest');
const AuditLog = require('../models/AuditLog');

const router = Router();

// Disclosure Authority auth middleware
function requireAuthority(req, res, next) {
  const token = req.headers['x-authority-token'];
  const expectedToken = process.env.DISCLOSURE_AUTHORITY_TOKEN || 'authority-secret-change-me';
  if (!token || token !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized. X-Authority-Token required.' });
  }
  next();
}

/**
 * POST /disclosure/request
 * Officer requests identity disclosure for a case.
 * Body: { caseId, justification }
 * Requires X-Officer-Id header.
 */
router.post('/request', async (req, res) => {
  try {
    const officerId = req.headers['x-officer-id'];
    if (!officerId) {
      return res.status(401).json({ error: 'X-Officer-Id header required.' });
    }

    const { caseId, justification } = req.body;
    if (!caseId || !justification) {
      return res.status(400).json({ error: 'caseId and justification are required.' });
    }

    // Find the case to get pairwiseId
    const grievance = await Case.findOne({ caseId });
    if (!grievance) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    const disclosure = await DisclosureRequest.create({
      caseId,
      pairwiseId: grievance.pairwiseId,
      requestingOfficerId: officerId,
      justification,
    });

    await AuditLog.create({
      eventType: 'disclosure_requested',
      actorId: officerId,
      targetCaseId: caseId,
      targetPairwiseId: grievance.pairwiseId,
      metadata: { justification, disclosureRequestId: disclosure._id.toString() },
    });

    return res.status(201).json({
      id: disclosure._id,
      caseId: disclosure.caseId,
      status: disclosure.status,
      message: 'Disclosure request submitted. Awaiting Disclosure Authority approval.',
    });
  } catch (err) {
    console.error('Disclosure request error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /disclosure/pending
 * Disclosure Authority: list all pending disclosure requests.
 */
router.get('/pending', requireAuthority, async (req, res) => {
  try {
    const pending = await DisclosureRequest.find({ status: 'pending' })
      .select('-pairwiseId')
      .sort({ createdAt: -1 });
    return res.json(pending);
  } catch (err) {
    console.error('List pending disclosures error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /disclosure/:id/approve
 * Disclosure Authority approves and calls CivID SSO reverse-lookup.
 * Body: { courtOrderRef }
 */
router.post('/:id/approve', requireAuthority, async (req, res) => {
  try {
    const { courtOrderRef } = req.body;
    if (!courtOrderRef) {
      return res.status(400).json({ error: 'courtOrderRef is required.' });
    }

    const disclosure = await DisclosureRequest.findById(req.params.id);
    if (!disclosure) {
      return res.status(404).json({ error: 'Disclosure request not found.' });
    }
    if (disclosure.status !== 'pending') {
      return res.status(400).json({ error: 'Request already decided.' });
    }

    // Build court order token for SSO: "Bearer courtOrderRef:hmac"
    const courtSecret = process.env.COURT_ORDER_SECRET || 'dev-court-secret';
    const signature = crypto
      .createHmac('sha256', courtSecret)
      .update(courtOrderRef)
      .digest('hex');
    const authToken = `Bearer ${courtOrderRef}:${signature}`;

    // Call CivID SSO reverse-lookup
    const ssoUrl = process.env.SSO_ISSUER_URL || 'http://localhost:4000';
    const response = await fetch(`${ssoUrl}/internal/reverse-lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
      },
      body: JSON.stringify({
        pairwiseId: disclosure.pairwiseId,
        courtOrderRef,
        requestingOfficerId: disclosure.requestingOfficerId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'SSO reverse-lookup failed');
    }

    const { email } = await response.json();

    // Update disclosure request
    disclosure.status = 'approved';
    disclosure.courtOrderRef = courtOrderRef;
    disclosure.approvedBy = 'disclosure-authority'; // In production, from session
    disclosure.revealedEmail = email;
    disclosure.decidedAt = new Date();
    await disclosure.save();

    // Audit log
    await AuditLog.create({
      eventType: 'disclosure_approved',
      actorId: 'disclosure-authority',
      targetCaseId: disclosure.caseId,
      targetPairwiseId: disclosure.pairwiseId,
      metadata: { courtOrderRef, disclosureRequestId: disclosure._id.toString() },
    });

    return res.json({
      message: 'Disclosure approved. Identity revealed.',
      email,
      courtOrderRef,
    });
  } catch (err) {
    console.error('Disclosure approve error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

/**
 * POST /disclosure/:id/reject
 * Disclosure Authority rejects the request.
 */
router.post('/:id/reject', requireAuthority, async (req, res) => {
  try {
    const disclosure = await DisclosureRequest.findById(req.params.id);
    if (!disclosure) {
      return res.status(404).json({ error: 'Disclosure request not found.' });
    }
    if (disclosure.status !== 'pending') {
      return res.status(400).json({ error: 'Request already decided.' });
    }

    disclosure.status = 'rejected';
    disclosure.decidedAt = new Date();
    await disclosure.save();

    await AuditLog.create({
      eventType: 'disclosure_rejected',
      actorId: 'disclosure-authority',
      targetCaseId: disclosure.caseId,
      targetPairwiseId: disclosure.pairwiseId,
      metadata: { disclosureRequestId: disclosure._id.toString() },
    });

    return res.json({
      message: 'Disclosure request rejected.',
      id: disclosure._id,
      status: 'rejected',
    });
  } catch (err) {
    console.error('Disclosure reject error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
