'use strict';

const crypto = require('crypto');

const COURT_ORDER_SECRET = process.env.COURT_ORDER_SECRET || 'dev-court-secret';

/**
 * Middleware: verifyCourtOrder
 * Expects Authorization header in format: "Bearer <courtOrderRef>:<hmacSignature>"
 * The HMAC is computed as HMAC-SHA256(courtOrderRef, COURT_ORDER_SECRET).
 * For hackathon demo: a valid token can be generated as:
 *   courtOrderRef = "COURT-2024-001"
 *   signature = HMAC-SHA256("COURT-2024-001", COURT_ORDER_SECRET)
 *   header = "Bearer COURT-2024-001:<signature>"
 */
function verifyCourtOrder(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.slice(7); // remove "Bearer "
  const colonIndex = token.indexOf(':');

  if (colonIndex === -1) {
    return res.status(401).json({ error: 'Invalid token format. Expected courtOrderRef:signature.' });
  }

  const courtOrderRef = token.slice(0, colonIndex);
  const providedSignature = token.slice(colonIndex + 1);

  // Compute expected HMAC
  const expectedSignature = crypto
    .createHmac('sha256', COURT_ORDER_SECRET)
    .update(courtOrderRef)
    .digest('hex');

  // Timing-safe comparison
  const sigBuffer = Buffer.from(providedSignature, 'hex');
  const expBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return res.status(403).json({ error: 'Invalid court order signature.' });
  }

  // Attach court order reference to request for downstream use
  req.courtOrderRef = courtOrderRef;
  next();
}

module.exports = verifyCourtOrder;
