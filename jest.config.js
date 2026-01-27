/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ]
};

module.exports = config;
