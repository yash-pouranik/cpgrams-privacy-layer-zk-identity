'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const session = require('express-session');
const connectDB = require('./config/db');
const { UPLOADS_DIR } = require('./middleware/upload');

const app = express();
const PORT = process.env.PORT || 5000;

// ---- Connect to MongoDB ----
connectDB();

// ---- Middleware ----
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:4000'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ---- Serve uploaded evidence files ----
// Evidence files (images/PDFs) are stored on disk and served statically.
// URL: http://localhost:5000/uploads/<filename>
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '1d',
}));

// ---- Session (for OIDC auth callback) ----
app.use(session({
  secret: process.env.SESSION_SECRET || 'cpgrams-dev-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// ---- Routes ----
app.use('/auth', require('./routes/auth'));
app.use('/grievance', require('./routes/grievance'));
app.use('/officer', require('./routes/officer'));
app.use('/chat', require('./routes/chat'));
app.use('/disclosure', require('./routes/disclosure'));

const documentRoutes = require('./routes/documents');
const statusRoutes = require('./routes/status');
const reminderRoutes = require('./routes/reminder');
const feedbackRoutes = require('./routes/feedback');
const masterRoutes = require('./routes/master');
const pushRoutes = require('./routes/push');

// Mount new routes
app.use('/', documentRoutes);      // handles /grievance/:caseId/documents and /officer/case/:caseId/documents
app.use('/', statusRoutes);        // handles /status/check and /status/:caseId/history
app.use('/', reminderRoutes);      // handles /grievance/:caseId/reminder and /officer/case/:caseId/clarification
app.use('/', feedbackRoutes);      // handles /grievance/:caseId/feedback
app.use('/', masterRoutes);        // handles /master/departments, /master/categories, /master/officers
app.use('/', pushRoutes);          // handles /api/push/grievance

// ---- Health check ----
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CPGRAMS Backend', port: PORT });
});

// ---- Error handler ----
app.use((err, req, res, next) => {
  // Multer file-upload errors (size / count / bad type) should return 4xx.
  if (err instanceof multer.MulterError) {
    let message = 'File upload error.';
    if (err.code === 'LIMIT_FILE_SIZE') message = 'File too large. Maximum 5MB per file.';
    else if (err.code === 'LIMIT_FILE_COUNT') message = 'Too many files. Maximum 5 files.';
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Only image or PDF files are allowed.';
    return res.status(400).json({ error: message });
  }
  // Any manually thrown Error (e.g. our file filter) — treat as bad request.
  if (err && err.message) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`CPGRAMS Backend running at http://localhost:${PORT}`);
});

module.exports = app;
