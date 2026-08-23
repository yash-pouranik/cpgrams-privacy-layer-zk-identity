'use strict';

const mongoose = require('mongoose');

const officerSchema = new mongoose.Schema({
  officerId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  department: { type: String, required: true },
  level: { type: Number, required: true, min: 1, max: 3 },
  isAvailable: { type: Boolean, default: true },
  currentCaseCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Officer', officerSchema);
