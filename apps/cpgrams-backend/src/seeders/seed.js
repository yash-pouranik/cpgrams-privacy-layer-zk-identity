'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Officer = require('../models/Officer');
const Department = require('../models/Department');
const Category = require('../models/Category');

const departments = [
  { deptCode: 'PWD', name: 'Public Works Department', type: 'central', parentMinistry: 'Ministry of Housing and Urban Affairs' },
  { deptCode: 'HEALTH', name: 'Department of Health & Family Welfare', type: 'central', parentMinistry: 'Ministry of Health and Family Welfare' },
  { deptCode: 'POLICE', name: 'Department of Police', type: 'state', parentMinistry: 'Ministry of Home Affairs' },
  { deptCode: 'EDUCATION', name: 'Department of School Education & Literacy', type: 'central', parentMinistry: 'Ministry of Education' },
  { deptCode: 'REVENUE', name: 'Department of Revenue', type: 'central', parentMinistry: 'Ministry of Finance' },
  { deptCode: 'AGRICULTURE', name: 'Department of Agriculture & Farmers Welfare', type: 'central', parentMinistry: 'Ministry of Agriculture' },
  { deptCode: 'TRANSPORT', name: 'Department of Transport', type: 'state', parentMinistry: 'Ministry of Road Transport and Highways' },
  { deptCode: 'WCD', name: 'Department of Women & Child Development', type: 'central', parentMinistry: 'Ministry of Women and Child Development' },
  { deptCode: 'LABOUR', name: 'Department of Labour & Employment', type: 'central', parentMinistry: 'Ministry of Labour and Employment' },
  { deptCode: 'ENVIRONMENT', name: 'Department of Environment, Forest & Climate Change', type: 'central', parentMinistry: 'Ministry of Environment' },
  { deptCode: 'IT', name: 'Department of Electronics & Information Technology', type: 'central', parentMinistry: 'Ministry of Electronics and IT' },
  { deptCode: 'URBAN', name: 'Department of Urban Development', type: 'central', parentMinistry: 'Ministry of Housing and Urban Affairs' },
  { deptCode: 'RURAL', name: 'Department of Rural Development', type: 'central', parentMinistry: 'Ministry of Rural Development' },
  { deptCode: 'SOCIAL', name: 'Department of Social Justice & Empowerment', type: 'central', parentMinistry: 'Ministry of Social Justice' },
  { deptCode: 'HOME', name: 'Department of Home Affairs', type: 'central', parentMinistry: 'Ministry of Home Affairs' },
];

const categories = [
  // Infrastructure (parent)
  { code: 'INFRA', name: 'Infrastructure', parentCode: null, departmentCode: 'PWD', description: 'Roads, bridges, buildings, public infrastructure' },
  { code: 'INFRA-ROADS', name: 'Roads & Highways', parentCode: 'INFRA', departmentCode: 'PWD', description: 'Potholes, road damage, highway maintenance' },
  { code: 'INFRA-BRIDGES', name: 'Bridges & Flyovers', parentCode: 'INFRA', departmentCode: 'PWD', description: 'Bridge repairs, flyover construction' },
  { code: 'INFRA-WATER', name: 'Water Supply', parentCode: 'INFRA', departmentCode: 'PWD', description: 'Water pipeline, supply disruption' },
  { code: 'INFRA-ELECT', name: 'Electricity & Power', parentCode: 'INFRA', departmentCode: 'PWD', description: 'Power cuts, transformer issues, billing' },
  { code: 'INFRA-BUILDING', name: 'Government Buildings', parentCode: 'INFRA', departmentCode: 'PWD', description: 'Maintenance of government premises' },
  // Health (parent)
  { code: 'HEALTH', name: 'Health & Medical', parentCode: null, departmentCode: 'HEALTH', description: 'Hospitals, clinics, public health issues' },
  { code: 'HEALTH-HOSP', name: 'Hospital Services', parentCode: 'HEALTH', departmentCode: 'HEALTH', description: 'Hospital staff, facilities, equipment' },
  { code: 'HEALTH-SANIT', name: 'Sanitation & Hygiene', parentCode: 'HEALTH', departmentCode: 'HEALTH', description: 'Public sanitation, waste management' },
  { code: 'HEALTH-MEDICINE', name: 'Medicine Availability', parentCode: 'HEALTH', departmentCode: 'HEALTH', description: 'Drug shortage, pharmacy issues' },
  { code: 'HEALTH-AMBULANCE', name: 'Ambulance & Emergency', parentCode: 'HEALTH', departmentCode: 'HEALTH', description: 'Emergency response, ambulance services' },
  // Law & Order (parent)
  { code: 'LAW', name: 'Law & Order', parentCode: null, departmentCode: 'POLICE', description: 'Crime, safety, police services' },
  { code: 'LAW-CRIME', name: 'Crime & Safety', parentCode: 'LAW', departmentCode: 'POLICE', description: 'Criminal activity, public safety' },
  { code: 'LAW-CORRUPTION', name: 'Corruption & Bribery', parentCode: 'LAW', departmentCode: 'POLICE', description: 'Government corruption reports' },
  { code: 'LAW-TRAFFIC', name: 'Traffic & Road Safety', parentCode: 'LAW', departmentCode: 'POLICE', description: 'Traffic violations, road safety' },
  // Education (parent)
  { code: 'EDU', name: 'Education', parentCode: null, departmentCode: 'EDUCATION', description: 'Schools, colleges, educational services' },
  { code: 'EDU-SCHOOL', name: 'School Infrastructure', parentCode: 'EDU', departmentCode: 'EDUCATION', description: 'School buildings, classrooms' },
  { code: 'EDU-TEACHER', name: 'Teacher & Staff Issues', parentCode: 'EDU', departmentCode: 'EDUCATION', description: 'Teacher shortage, staff complaints' },
  { code: 'EDU-SCHOLARSHIP', name: 'Scholarships & Grants', parentCode: 'EDU', departmentCode: 'EDUCATION', description: 'Scholarship delays, grant issues' },
  // Revenue & Tax (parent)
  { code: 'REVENUE', name: 'Revenue & Taxation', parentCode: null, departmentCode: 'REVENUE', description: 'Tax, land revenue, property disputes' },
  { code: 'REVENUE-TAX', name: 'Tax Disputes', parentCode: 'REVENUE', departmentCode: 'REVENUE', description: 'Income tax, GST, property tax issues' },
  { code: 'REVENUE-LAND', name: 'Land Records & Disputes', parentCode: 'REVENUE', departmentCode: 'REVENUE', description: 'Land registry, encroachment' },
  // Transport (parent)
  { code: 'TRANSPORT', name: 'Transport', parentCode: null, departmentCode: 'TRANSPORT', description: 'Public transport, licensing, vehicle issues' },
  { code: 'TRANSPORT-PUBLIC', name: 'Public Transport', parentCode: 'TRANSPORT', departmentCode: 'TRANSPORT', description: 'Bus services, metro, railways' },
  { code: 'TRANSPORT-LICENSE', name: 'Driving License & RC', parentCode: 'TRANSPORT', departmentCode: 'TRANSPORT', description: 'License delays, registration issues' },
  // Environment (parent)
  { code: 'ENV', name: 'Environment', parentCode: null, departmentCode: 'ENVIRONMENT', description: 'Pollution, forest, climate issues' },
  { code: 'ENV-POLLUTION', name: 'Pollution', parentCode: 'ENV', departmentCode: 'ENVIRONMENT', description: 'Air, water, noise pollution' },
  { code: 'ENV-FOREST', name: 'Forest & Wildlife', parentCode: 'ENV', departmentCode: 'ENVIRONMENT', description: 'Deforestation, wildlife protection' },
  // Social Welfare (parent)
  { code: 'SOCIAL', name: 'Social Welfare', parentCode: null, departmentCode: 'SOCIAL', description: 'Social justice, welfare schemes' },
  { code: 'SOCIAL-PENSION', name: 'Pension & Benefits', parentCode: 'SOCIAL', departmentCode: 'SOCIAL', description: 'Pension delays, benefit distribution' },
  { code: 'SOCIAL-DISABILITY', name: 'Disability Services', parentCode: 'SOCIAL', departmentCode: 'SOCIAL', description: 'Disability certificates, accessibility' },
  // Women & Child (parent)
  { code: 'WCD', name: 'Women & Child Welfare', parentCode: null, departmentCode: 'WCD', description: 'Women safety, child welfare, nutrition' },
  { code: 'WCD-SAFETY', name: 'Women Safety', parentCode: 'WCD', departmentCode: 'WCD', description: 'Domestic violence, harassment' },
  { code: 'WCD-NUTRITION', name: 'Child Nutrition (ICDS)', parentCode: 'WCD', departmentCode: 'WCD', description: 'Anganwadi, mid-day meal issues' },
];

const { hashPassword } = require('../services/officerAuth');

const defaultOfficerPassword = hashPassword('Officer@123');

const officers = [
  { officerId: 'PWD-001', name: 'Rajesh Kumar', department: 'PWD', level: 1, expertise: ['roads', 'water', 'infrastructure'], jurisdictions: ['indore', 'ward 12'], passwordHash: defaultOfficerPassword },
  { officerId: 'PWD-002', name: 'Sunita Devi', department: 'PWD', level: 2, expertise: ['roads', 'bridges', 'contracts'], jurisdictions: ['indore', 'bhopal'], passwordHash: defaultOfficerPassword },
  { officerId: 'HEALTH-001', name: 'Dr. Ananya Roy', department: 'Health', level: 1, passwordHash: defaultOfficerPassword },
  { officerId: 'HEALTH-002', name: 'Dr. Vikram Singh', department: 'Health', level: 3, passwordHash: defaultOfficerPassword },
  { officerId: 'POLICE-001', name: 'Inspector Meera Joshi', department: 'Police', level: 2, passwordHash: defaultOfficerPassword },
  { officerId: 'EDU-001', name: 'Prof. Arjun Mehta', department: 'Education', level: 1, passwordHash: defaultOfficerPassword },
  { officerId: 'REVENUE-001', name: 'Kavita Sharma', department: 'Revenue', level: 2, passwordHash: defaultOfficerPassword },
  { officerId: 'TRANSPORT-001', name: 'Ravi Patel', department: 'Transport', level: 1, passwordHash: defaultOfficerPassword },
  { officerId: 'ENV-001', name: 'Dr. Neha Gupta', department: 'Environment', level: 2, passwordHash: defaultOfficerPassword },
  { officerId: 'SOCIAL-001', name: 'Deepak Verma', department: 'Social', level: 1, passwordHash: defaultOfficerPassword },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cpgrams_db');
    console.log('MongoDB connected for seeding');

    // Clear existing collections
    await Department.deleteMany({});
    await Category.deleteMany({});
    await Officer.deleteMany({});
    console.log('Cleared existing collections');

    // Insert seed data
    await Department.insertMany(departments);
    console.log(`Seeded ${departments.length} departments`);

    await Category.insertMany(categories);
    console.log(`Seeded ${categories.length} categories`);

    await Officer.insertMany(officers);
    console.log(`Seeded ${officers.length} officers`);

    await mongoose.disconnect();
    console.log('Seeding complete. Disconnected.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
