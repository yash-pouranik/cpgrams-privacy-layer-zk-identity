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
