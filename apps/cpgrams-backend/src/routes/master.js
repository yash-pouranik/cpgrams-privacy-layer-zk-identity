'use strict';

const { Router } = require('express');
const Department = require('../models/Department');
const Category = require('../models/Category');
const Officer = require('../models/Officer');

const router = Router();

/**
 * GET /master/departments
 */
router.get('/master/departments', async (req, res) => {
  try {
    const { type, search } = req.query;
    const query = {};
    // Assuming departments have an active flag
    // query.active = true;
    
    if (type) {
      query.type = type;
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const depts = await Department.find(query).select('-__v');
    return res.json(depts);
  } catch (err) {
    console.error('List departments error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /master/departments/:deptCode
 */
router.get('/master/departments/:deptCode', async (req, res) => {
  try {
    const { deptCode } = req.params;
    const dept = await Department.findOne({ deptCode }).select('-__v');
    if (!dept) return res.status(404).json({ error: 'Department not found.' });
    
    return res.json(dept);
  } catch (err) {
    console.error('Get department error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /master/categories
 */
router.get('/master/categories', async (req, res) => {
  try {
    const { department, parent, search } = req.query;
    const query = {};

    if (department) query.departmentCode = department;
    if (parent) query.parentCode = parent;
    if (search) query.name = { $regex: search, $options: 'i' };

    const categories = await Category.find(query).select('-__v');
    return res.json(categories);
  } catch (err) {
    console.error('List categories error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /master/categories/:code
 */
router.get('/master/categories/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const category = await Category.findOne({ code }).select('-__v');
    if (!category) return res.status(404).json({ error: 'Category not found.' });
    
    return res.json(category);
  } catch (err) {
    console.error('Get category error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /master/officers
 */
router.get('/master/officers', async (req, res) => {
  try {
    const { department, level, available } = req.query;
    const query = {};

    if (department) query.department = department;
    if (level) query.level = Number(level);
    if (available === 'true') query.available = true;

    const officers = await Officer.find(query).select('-_id -__v');
    return res.json(officers);
  } catch (err) {
    console.error('List officers error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /master/officers/:officerId
 */
router.get('/master/officers/:officerId', async (req, res) => {
  try {
    const { officerId } = req.params;
    const officer = await Officer.findOne({ officerId }).select('-_id -__v');
    if (!officer) return res.status(404).json({ error: 'Officer not found.' });
    
    return res.json(officer);
  } catch (err) {
    console.error('Get officer error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
