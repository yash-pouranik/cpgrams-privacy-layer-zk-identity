'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const connectDB = require('./config/db');

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
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`CPGRAMS Backend running at http://localhost:${PORT}`);
});

module.exports = app;
