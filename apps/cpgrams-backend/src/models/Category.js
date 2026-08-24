'use strict';

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  parentCode: { type: String, default: null },
  departmentCode: { type: String, required: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Category', categorySchema);
