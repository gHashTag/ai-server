const baseConfig = require('./jest.config.js')

module.exports = {
  ...baseConfig,
  // Enhanced coverage configuration for comprehensive testing
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/**/*.test.ts',
    '!src/server.ts',
    '!src/app.ts',
    // Include all inngest functions for coverage
    'src/core/inngest-client/helpers/*.ts',
    // Include MCP server components
    'src/core/mcp-server/*.ts',
    // Include all services
    'src/services/*.ts',
    // Include all controllers  
    'src/controllers/*.ts',
    // Exclude mocks and test utilities
    '!src/test/__mocks__/**/*',
    '!src/test/setup.ts',
  ],
  
  // Coverage thresholds for quality gates
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,  
      lines: 95,
      statements: 95
    },
    // Specific thresholds for critical components
    'src/core/inngest-client/helpers/': {
      branches: 100,
      functions: 100,
      lines: 100, 
      statements: 100
    },
    'src/core/mcp-server/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    'src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Enhanced coverage reporters
  coverageReporters: [
    'text',
    'text-summary', 
    'lcov',
    'html',
    'json-summary',
    'cobertura'
  ],

  // Coverage directory structure
  coverageDirectory: 'coverage',

  // Test timeout for comprehensive testing
  testTimeout: 30000,

  // Maximum worker processes for parallel testing
  maxWorkers: '50%',

  // Verbose output for detailed test results
  verbose: true,

  // Fail fast on first test failure in CI
  bail: process.env.CI ? 1 : false,

  // Additional Jest options for comprehensive testing
  errorOnDeprecated: true,
  detectOpenHandles: true,
  forceExit: true,

  // Test result processors
  testResultsProcessor: 'jest-sonar-reporter',

  // Global test setup for comprehensive testing
  globalSetup: '<rootDir>/src/test/global-setup.ts',
  globalTeardown: '<rootDir>/src/test/global-teardown.ts',
}