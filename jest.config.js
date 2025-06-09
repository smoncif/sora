module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/app/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/app/hooks/$1',
    '^@/contexts/(.*)$': '<rootDir>/app/contexts/$1',
    '^@/utils/(.*)$': '<rootDir>/app/utils/$1',
    '^@/lib/(.*)$': '<rootDir>/app/lib/$1',
    '^@/types/(.*)$': '<rootDir>/app/types/$1',
    '^@/(.*)$': '<rootDir>/$1',
    '^next/navigation$': '<rootDir>/tests/auth/jest/mocks/__mocks__/next-navigation.js'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/tests/auth/jest/mocks/'
  ],
  verbose: true
}; 