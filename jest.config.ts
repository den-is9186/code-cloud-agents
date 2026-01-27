/**
 * Jest Configuration
 * @see https://jestjs.github.io/docs/configuration
 */

import type { Config } from 'jest';

const config: Config = {
  // Use Node environment for testing
  testEnvironment: 'node',

  // Coverage configuration
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.test.js',
  ],

  // Test file patterns
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.test.ts'],

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,
};

export default config;
