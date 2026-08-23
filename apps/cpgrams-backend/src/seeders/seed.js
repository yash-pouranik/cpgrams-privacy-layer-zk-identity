'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Officer = require('../models/Officer');

const officers = [
  {
    officerId: 'PWD-001',
    name: 'Rajesh Kumar',
    department: 'PWD',
    level: 1,
    isAvailable: true,
    currentCaseCount: 0,
  },
  {
    officerId: 'PWD-002',
    name: 'Sunita Devi',
    department: 'PWD',
    level: 2,
    isAvailable: true,
    currentCaseCount: 0,
  },
  {
    officerId: 'HEALTH-001',
    name: 'Dr. Ananya Roy',
    department: 'Health',
    level: 1,
    isAvailable: true,
    currentCaseCount: 0,
  },
  {
    officerId: 'HEALTH-002',
    name: 'Dr. Vikram Singh',
    department: 'Health',
    level: 3,
    isAvailable: true,
    currentCaseCount: 0,
  },
  {
    officerId: 'POLICE-001',
    name: 'Inspector Meera Joshi',
    department: 'Police',
    level: 2,
    isAvailable: true,
    currentCaseCount: 0,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cpgrams_db');
    console.log('MongoDB connected for seeding');

    // Clear existing officers
    await Officer.deleteMany({});
    console.log('Cleared existing officers');

    // Insert seed data
    await Officer.insertMany(officers);
    console.log(`Seeded ${officers.length} officers:`);
    officers.forEach((o) => {
      console.log(`  - ${o.officerId}: ${o.name} (${o.department}, Level ${o.level})`);
    });

    await mongoose.disconnect();
    console.log('Seeding complete. Disconnected.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
