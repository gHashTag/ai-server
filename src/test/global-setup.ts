import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Global setup for comprehensive testing
 * Runs before all tests across all test suites
 */
export default async function globalSetup() {
  console.log('🚀 Starting global test setup...')

  try {
    // Set test environment variables
    process.env.NODE_ENV = 'test'
    process.env.LOG_LEVEL = 'error' // Reduce log noise during tests
    process.env.USE_INNGEST = 'true'
    process.env.INNGEST_EVENT_KEY = 'test-event-key'
    process.env.AB_TEST_PERCENTAGE = '50'
    process.env.FALLBACK_MODE = 'false'

    // Mock external API keys for testing
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.REPLICATE_API_TOKEN = 'test-replicate-token'  
    process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key'
    process.env.BFL_API_KEY = 'test-bfl-key'

    // Database setup for integration tests
    if (process.env.CI) {
      console.log('🗄️ Setting up test database in CI environment...')
      process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test_ai_server'
      process.env.REDIS_URL = 'redis://localhost:6379'
    } else {
      console.log('🗄️ Setting up local test database...')
      // For local development, use SQLite or in-memory database
      process.env.DATABASE_URL = 'sqlite::memory:'
    }

    // Create test directories
    await execAsync('mkdir -p tmp/test-uploads tmp/test-outputs logs/test')

    // Clean up any existing test artifacts
    await execAsync('rm -rf tmp/test-* coverage/tmp').catch(() => {
      // Ignore errors if directories don't exist
    })

    // Initialize test mocks
    console.log('🎭 Initializing global test mocks...')
    
    // Mock file system operations
    const fs = require('fs')
    const originalWriteFile = fs.writeFile
    const originalUnlink = fs.unlink
    
    // Mock file operations to use test directory
    fs.writeFile = jest.fn().mockImplementation((path: string, data: any, callback: Function) => {
      const testPath = path.replace(/^\//, 'tmp/test-')
      originalWriteFile(testPath, data, callback)
    })
    
    fs.unlink = jest.fn().mockImplementation((path: string, callback: Function) => {
      const testPath = path.replace(/^\//, 'tmp/test-')
      originalUnlink(testPath, callback)
    })

    // Mock network requests
    console.log('🌐 Setting up network mocks...')
    
    // Global fetch mock for external API calls
    global.fetch = jest.fn().mockImplementation((url: string, options?: any) => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          data: 'mocked-response',
          id: 'mock-id-123'
        }),
        text: () => Promise.resolve('mocked text response'),
        blob: () => Promise.resolve(new Blob(['mock blob data']))
      })
    }) as jest.MockedFunction<typeof fetch>

    // Setup test performance monitoring
    console.log('📊 Setting up performance monitoring...')
    global.testMetrics = {
      startTime: Date.now(),
      testTimes: new Map(),
      slowTests: []
    }

    // Log setup completion
    console.log('✅ Global test setup completed successfully')
    console.log('🔧 Test environment configuration:')
    console.log(`   - Node environment: ${process.env.NODE_ENV}`)
    console.log(`   - Database: ${process.env.DATABASE_URL}`)
    console.log(`   - Inngest enabled: ${process.env.USE_INNGEST}`)
    console.log(`   - A-B test percentage: ${process.env.AB_TEST_PERCENTAGE}%`)

  } catch (error) {
    console.error('❌ Global test setup failed:', error)
    process.exit(1)
  }
}

// Export types for test utilities
declare global {
  var testMetrics: {
    startTime: number
    testTimes: Map<string, number>
    slowTests: Array<{ name: string; duration: number }>
  }
  
  namespace NodeJS {
    interface Global {
      testMetrics: typeof testMetrics
    }
  }
}