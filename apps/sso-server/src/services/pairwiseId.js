const crypto = require('crypto');
const prisma = require('../models/prismaClient');

const SECRET = process.env.SSO_PAIRWISE_SECRET || 'dev-pairwise-secret';

function generatePairwiseId(userId, serviceId) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(userId + ':' + serviceId)
    .digest('hex');
}

async function getOrCreatePairwiseId(userId, serviceId) {
  // Check if mapping already exists
  const existing = await prisma.serviceIdentityMap.findUnique({
    where: {
      userId_serviceId: { userId, serviceId },
    },
  });

  if (existing) return existing.pairwiseId;

  // Generate and store new pairwiseId
  const pairwiseId = generatePairwiseId(userId, serviceId);

  // Ensure service record exists in services table for foreign key constraint
  await prisma.service.upsert({
    where: { serviceId },
    update: {},
    create: {
      serviceId,
      name: 'CPGRAMS Grievance Portal',
      redirectUris: 'http://localhost:5000/auth/callback',
      clientSecret: process.env.CPGRAMS_CLIENT_SECRET || 'dev-secret-change-me',
    },
  });

  await prisma.serviceIdentityMap.create({
    data: {
      userId,
      serviceId,
      pairwiseId,
    },
  });

  return pairwiseId;
}

module.exports = { generatePairwiseId, getOrCreatePairwiseId };
