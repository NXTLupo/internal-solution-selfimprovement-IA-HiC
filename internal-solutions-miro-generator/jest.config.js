const fs = require('fs');
const path = require('path');

// The ONE Jest configuration for this package (package.json no longer carries a "jest" key; its
// testMatch "**/tests/**/*.test.ts" is covered by the testMatch below).
// Roots and setup files are filtered to those that exist: Jest refuses to start when a configured root or
// setup file is missing (the suite was absent between 5a31c0217 and its restoration).
const exists = (rel) => fs.existsSync(path.join(__dirname, rel));

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['src', 'tests'].filter(exists).map((dir) => `<rootDir>/${dir}`),
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    // chalk 5, p-limit 5 and p-retry 6 (and their ESM-only dependencies) ship ES modules only, and Jest 29
    // loads CommonJS. Those packages are compiled to CommonJS by the same TypeScript compiler.
    '^.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true } }],
  },
  transformIgnorePatterns: ['/node_modules/(?!(chalk|p-limit|yocto-queue|p-retry|is-network-error)/)'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/cli/index.ts', // Exclude CLI entry point
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Mirrors tsconfig.json "paths". The key was misspelled "moduleNameMapping", which Jest ignores,
  // so every aliased import (@parsers, @miro, @utils, @domain) failed to resolve under test.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@cli/(.*)$': '<rootDir>/src/cli/$1',
    '^@parsers/(.*)$': '<rootDir>/src/parsers/$1',
    '^@miro/(.*)$': '<rootDir>/src/miro/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@domain/(.*)$': '<rootDir>/src/types/$1',
    // p-limit's package.json maps '#async_hooks' to the Node built-in under the "node" condition; Jest 29
    // resolves that target as a file path, so it goes to a one-line shim that re-exports the built-in.
    '^#async_hooks$': '<rootDir>/tests/shims/async-hooks.cjs',
  },
  // network-guard.ts makes any HTTP(S) request from a test throw; setup.ts is the suite's environment setup.
  setupFilesAfterEnv: ['tests/network-guard.ts', 'tests/setup.ts'].filter(exists).map((f) => `<rootDir>/${f}`),
  testTimeout: 30000,
  verbose: true
};
