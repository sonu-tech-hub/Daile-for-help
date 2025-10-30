const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock database connection for tests
jest.mock('../src/config/database', () => ({
  promisePool: {
    getConnection: jest.fn(() => ({
      query: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn()
    })),
    query: jest.fn()
  },
  testConnection: jest.fn(() => Promise.resolve(true))
}));

// Mock Cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(),
      destroy: jest.fn()
    }
  }
}));

// Mock Cloudinary config
jest.mock('../src/config/cloudinary', () => ({
  uploadToCloudinary: jest.fn(),
  deleteFromCloudinary: jest.fn()
}));

// Mock helpers that require external services
jest.mock('../src/utils/helpers', () => ({
  ...jest.requireActual('../src/utils/helpers'),
  sendOTP: jest.fn(() => Promise.resolve({ success: true })),
  sendEmail: jest.fn(() => Promise.resolve({ success: true }))
}));

// Global test setup
beforeAll(async () => {
  // Any global setup
});

afterAll(async () => {
  // Any global cleanup
});
