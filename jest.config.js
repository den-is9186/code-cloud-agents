module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    'dist/**/*.js',
    '!src/**/*.test.{js,ts}',
    '!dist/**/*.test.js',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
