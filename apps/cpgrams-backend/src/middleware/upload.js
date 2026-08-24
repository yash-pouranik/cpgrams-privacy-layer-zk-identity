'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure the uploads directory exists at startup.
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Allow only images and PDFs.
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

const ALLOWED_EXT = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp'],
  ['application/pdf', '.pdf'],
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    // Random cryptographically-strong name + original extension.
    // The original name is intentionally NOT used to avoid path/display issues.
    const ext = ALLOWED_EXT.get(file.mimetype) || path.extname(file.originalname) || '';
    const random = crypto.randomBytes(12).toString('hex');
    cb(null, `${random}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), false);
  }
}

/**
 * Upload middleware for grievance evidence files.
 * Accepts up to 5 files, each up to 5MB.
 * Usage: router.post('/', upload.array('files', 5), handler)
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5, // max 5 files per request
  },
});

module.exports = { upload, UPLOADS_DIR, ALLOWED_MIME };
