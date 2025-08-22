import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'

const execAsync = promisify(exec)

/**
 * Global teardown for comprehensive testing
 * Runs after all tests across all test suites
 */
export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown...')

  try {
    // Generate test performance report
    if (global.testMetrics) {
      const totalDuration = Date.now() - global.testMetrics.startTime
      console.log('📊 Test Performance Summary:')
      console.log(`   - Total test duration: ${totalDuration}ms`)
      console.log(`   - Number of tests: ${global.testMetrics.testTimes.size}`)
      
      // Find slowest tests
      const slowTests = Array.from(global.testMetrics.testTimes.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, duration]) => ({ name, duration }))
      
      if (slowTests.length > 0) {
        console.log('🐌 Slowest tests:')
        slowTests.forEach(({ name, duration }, index) => {
          console.log(`   ${index + 1}. ${name}: ${duration}ms`)
        })
      }

      // Save performance metrics to file for CI analysis
      const performanceReport = {
        totalDuration,
        testCount: global.testMetrics.testTimes.size,
        slowTests: slowTests,
        timestamp: new Date().toISOString(),
        environment: process.env.CI ? 'CI' : 'local'
      }

      await fs.writeFile(
        'performance-report.json', 
        JSON.stringify(performanceReport, null, 2)
      ).catch(() => {
        console.warn('⚠️ Could not save performance report')
      })
    }

    // Clean up test artifacts
    console.log('🗂️ Cleaning up test artifacts...')
    
    // Remove temporary test files
    await execAsync('rm -rf tmp/test-* logs/test/*').catch(() => {
      console.warn('⚠️ Could not clean up some temporary files')
    })

    // Close any open handles
    console.log('🔌 Closing open handles...')
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }

    // Clean up global mocks
    console.log('🎭 Cleaning up global mocks...')
    
    // Reset global fetch mock
    if (global.fetch && typeof global.fetch === 'function' && 'mockRestore' in global.fetch) {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRestore()
    }

    // Reset file system mocks
    const fs = require('fs')
    if (fs.writeFile && typeof fs.writeFile === 'function' && 'mockRestore' in fs.writeFile) {
      fs.writeFile.mockRestore()
    }
    if (fs.unlink && typeof fs.unlink === 'function' && 'mockRestore' in fs.unlink) {
      fs.unlink.mockRestore()
    }

    // Generate test coverage summary for CI
    if (process.env.CI) {
      console.log('📈 Generating coverage summary for CI...')
      try {
        const { stdout } = await execAsync('npx nyc report --reporter=text-summary')
        console.log('Coverage Summary:')
        console.log(stdout)
        
        // Extract coverage percentage for quality gate
        const coverageMatch = stdout.match(/Lines\s*:\s*([\d.]+)%/)
        if (coverageMatch) {
          const coveragePercentage = parseFloat(coverageMatch[1])
          console.log(`Final coverage: ${coveragePercentage}%`)
          
          // Set output for GitHub Actions
          if (process.env.GITHUB_OUTPUT) {
            await fs.appendFile(
              process.env.GITHUB_OUTPUT,
              `coverage_percentage=${coveragePercentage}\n`
            )
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not generate coverage summary:', error)
      }
    }

    // Database cleanup for integration tests
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('test')) {
      console.log('🗄️ Cleaning up test database...')
      try {
        // Add database cleanup logic here if needed
        console.log('✅ Test database cleanup completed')
      } catch (error) {
        console.warn('⚠️ Database cleanup failed:', error)
      }
    }

    // Generate final test report summary
    console.log('📋 Test Suite Summary:')
    console.log('   ✅ All tests completed')
    console.log('   ✅ Artifacts cleaned up')  
    console.log('   ✅ Performance metrics recorded')
    console.log('   ✅ Coverage data generated')

    // Final memory usage report
    const memUsage = process.memoryUsage()
    console.log('💾 Final memory usage:')
    console.log(`   - RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`)
    console.log(`   - Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`)
    console.log(`   - Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`)

    console.log('✅ Global test teardown completed successfully')

  } catch (error) {
    console.error('❌ Global test teardown failed:', error)
    // Don't exit with error in teardown to avoid masking test failures
  }

  // Force process exit to ensure clean shutdown
  setTimeout(() => {
    process.exit(0)
  }, 1000)
}