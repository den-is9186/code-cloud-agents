import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ]
};

export default config;