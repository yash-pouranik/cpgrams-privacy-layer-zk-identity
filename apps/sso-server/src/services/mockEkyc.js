const EKYC_SEED = {
  '123456789012': {
    email: 'rahul.sharma@example.com',
    mobile: '9876543210',
    name: 'Rahul Sharma',
  },
  '987654321098': {
    email: 'priya.patel@example.com',
    mobile: '9123456780',
    name: 'Priya Patel',
  },
  '111122223333': {
    email: 'amit.verma@example.com',
    mobile: '9988776655',
    name: 'Amit Verma',
  },
};

function lookupAadhaar(aadhaarNumber) {
  return EKYC_SEED[aadhaarNumber] || null;
}

module.exports = { EKYC_SEED, lookupAadhaar };
