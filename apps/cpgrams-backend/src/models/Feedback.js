'use strict';

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  caseId: { type: String, required: true, unique: true, index: true },
  pairwiseId: { type: String, required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Feedback', feedbackSchema);
