module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Handle CSS imports (if you import CSS in your components, though not typical for react-email)
    '\\.(css|less|scss|sass)$_': 'identity-obj-proxy',
    // Handle module aliases (if you have them in tsconfig.json)
    // Example: '@/components/(.*)$_': '<rootDir>/src/components/$1'
  },
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,
  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'app/components/emails/**/*.tsx', // Only collect coverage from email components
    '!**/__tests__/**', // Exclude test files themselves
    '!**/node_modules/**',
  ],
  // Setup files after env
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // If you need global setup
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/'
  ],
  transform: {
    // Use ts-jest for ts and tsx files
    '^.+\\.(ts|tsx)$_': ['ts-jest', { 
      tsconfig: 'tsconfig.json', 
      // Other ts-jest options if needed:
      // isolatedModules: true, // Faster transpilation, but skips type-checking during tests
    }],
  },
  // Indicates whether each individual test should be reported during the run
  verbose: true,
}; 