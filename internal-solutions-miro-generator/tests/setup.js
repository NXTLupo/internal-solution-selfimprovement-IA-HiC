"use strict";
/**
 * Jest test setup file
 */
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
// Load environment variables for testing
(0, dotenv_1.config)({ path: '.env.test' });
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
//# sourceMappingURL=setup.js.map