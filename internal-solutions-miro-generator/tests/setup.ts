/**
 * Jest test setup file
 */

import { config } from 'dotenv';

// Load environment variables for testing
config({ path: '.env.test' });

// Global test configuration
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
});

// Global cleanup
afterAll(() => {
  // Cleanup any global resources
});

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  // Uncomment these to silence console output in tests
  // log: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};