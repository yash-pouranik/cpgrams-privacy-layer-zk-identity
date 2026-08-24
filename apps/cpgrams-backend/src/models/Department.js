'use strict';

const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  deptCode: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['central', 'state', 'ut'], required: true },
  parentMinistry: { type: String },
  isActive: { type: Boolean, default: true },
  nodalOfficers: [{
    officerId: { type: String },
    designation: { type: String }
  }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Department', departmentSchema);
