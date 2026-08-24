'use strict';

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  caseId: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  sizeBytes: { type: Number, required: true },
  storagePath: { type: String, required: true },
  uploadedBy: { type: String, required: true },
  uploadedByRole: { type: String, enum: ['citizen', 'officer'], required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Document', documentSchema);
