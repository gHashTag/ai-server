#!/usr/bin/env bun
/**
 * 🧪 Production Test Script for Instagram Functions
 * Tests all functions with emoji names and real data
 */

import { Inngest } from 'inngest'

// Production server configuration
const PRODUCTION_URL = 'http://localhost:4000'
const API_URL = `${PRODUCTION_URL}/api/inngest`

console.log('🚀 PRODUCTION TESTING SCRIPT FOR INSTAGRAM FUNCTIONS')
console.log('='.repeat(60))
console.log(`📡 API URL: ${API_URL}`)
console.log(`🕒 Test Time: ${new Date().toISOString()}`)
console.log('='.repeat(60))

// Initialize Inngest client for production
const inngest = new Inngest({
  id: 'ai-training-server',
  eventKey: process.env.INNGEST_EVENT_KEY || 'test-key',
  isDev: true, // Dev mode for local testing
  baseUrl: API_URL,
})

// Test data templates for production
const productionTestData = {
  project_id: 1,
  requester_telegram_id: '144022504', // CRITICAL: string type
  metadata: {
    test_env: 'production',
    test_runner: 'automated-production-test',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  },
}

// Test cases for each function
const testCases = [
  {
    name: '🔍 Find Instagram Competitors',
    eventName: 'instagram/find-competitors',
    data: {
      ...productionTestData,
      username_or_id: 'alexyanovsky',
      max_users: 3,
      min_followers: 1000,
      metadata: {
        ...productionTestData.metadata,
        test: 'production-competitors-test',
      },
    },
  },
  {
    name: '📈 Analyze Competitor Reels',
    eventName: 'instagram/analyze-reels',
    data: {
      ...productionTestData,
      username: 'alexyanovsky',
      days_back: 7,
      max_reels: 5,
      metadata: {
        ...productionTestData.metadata,
        test: 'production-reels-analysis-test',
      },
    },
  },
  {
    name: '📊 Extract Top Content',
    eventName: 'instagram/extract-top-content',
    data: {
      ...productionTestData,
      username: 'alexyanovsky',
      days_back: 14,
      limit: 5,
      metadata: {
        ...productionTestData.metadata,
        test: 'production-top-content-test',
      },
    },
  },
  {
    name: '🎬 Generate Content Scripts',
    eventName: 'instagram/generate-content-scripts',
    data: {
      ...productionTestData,
      reel_id: 'production_test_reel_001',
      ig_reel_url: 'https://instagram.com/p/DHp5jLHt8v6/',
      metadata: {
        ...productionTestData.metadata,
        test: 'production-content-scripts-test',
      },
    },
  },
  {
    name: '🤖 Instagram Scraper V2',
    eventName: 'instagram/scrape-similar-users',
    data: {
      ...productionTestData,
      username_or_id: 'alexyanovsky',
      max_users: 2,
      max_reels_per_user: 2,
      scrape_reels: true,
      metadata: {
        ...productionTestData.metadata,
        test: 'production-scraper-test',
      },
    },
  },
  {
    name: '👋 Hello World Test',
    eventName: 'test/hello',
    data: {
      name: 'Production Test',
      metadata: {
        ...productionTestData.metadata,
        test: 'production-hello-test',
      },
    },
  },
]

// Test execution function
async function runProductionTest() {
  console.log('🎯 Starting Production Function Tests...\n')

  const results = []

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]
    console.log(`${i + 1}️⃣ Testing: ${testCase.name}`)

    try {
      // Generate unique event ID for idempotency
      const eventId = `prod-test-${Date.now()}-${i}`

      // Send event to production
      const result = await inngest.send({
        id: eventId,
        name: testCase.eventName,
        data: testCase.data,
      })

      console.log(`   ✅ Event sent successfully: ${eventId}`)
      console.log(`   📋 Event Name: ${testCase.eventName}`)
      console.log(`   🆔 Event ID: ${result.ids[0] || 'No ID returned'}`)

      results.push({
        name: testCase.name,
        eventName: testCase.eventName,
        status: 'SUCCESS',
        eventId,
        inngestId: result.ids[0] || 'No ID',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.log(`   ❌ Error sending event: ${error.message}`)

      results.push({
        name: testCase.name,
        eventName: testCase.eventName,
        status: 'FAILED',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
    }

    console.log('') // Empty line for readability

    // Wait 1 second between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Summary Report
  console.log('='.repeat(60))
  console.log('📊 PRODUCTION TEST SUMMARY')
  console.log('='.repeat(60))

  const successful = results.filter(r => r.status === 'SUCCESS')
  const failed = results.filter(r => r.status === 'FAILED')

  console.log(`✅ Successful: ${successful.length}/${results.length}`)
  console.log(`❌ Failed: ${failed.length}/${results.length}`)
  console.log(
    `📈 Success Rate: ${((successful.length / results.length) * 100).toFixed(
      1
    )}%`
  )

  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:')
    failed.forEach(test => {
      console.log(`   • ${test.name}: ${test.error}`)
    })
  }

  console.log('\n🎯 Detailed Results:')
  results.forEach(result => {
    const status = result.status === 'SUCCESS' ? '✅' : '❌'
    console.log(`   ${status} ${result.name}`)
    if (result.status === 'SUCCESS') {
      console.log(`      Event ID: ${result.eventId}`)
      console.log(`      Inngest ID: ${result.inngestId}`)
    }
  })

  console.log('\n🔍 Next Steps:')
  console.log('1. Check Inngest Dashboard for execution results')
  console.log('2. Monitor logs for any errors')
  console.log('3. Verify database records were created')
  console.log(`4. Dashboard URL: http://localhost:8288`)

  console.log('\n✨ Production test completed!')
  return results
}

// Execute the test
if (import.meta.main) {
  runProductionTest().catch(console.error)
}
