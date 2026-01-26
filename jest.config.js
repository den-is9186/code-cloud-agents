/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',

  // Use custom resolver for dist -> src mapping and .js -> .ts resolution
  resolver: '<rootDir>/jest-resolver.js',

  // Transform TypeScript files with ts-jest
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
      tsconfig: 'tsconfig.json',
    }],
  },

  // Handle both JS and TS files
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Test patterns
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.test.ts'],

  // Coverage configuration
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
  ],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,
};
