/**
 * Test events for Instagram Reels API fixes
 * This file contains test events to verify that our fixes work correctly
 */

import { inngest } from '../src/core/inngest/clients'

// Test 1: Test analyzeCompetitorReels function with alexyanovsky (should work)
export const testAnalyzeReelsSuccess = async () => {
  console.log('🎬 Testing analyzeCompetitorReels with alexyanovsky...')

  const result = await inngest.send({
    name: 'instagram/analyze-reels',
    data: {
      username: 'alexyanovsky',
      max_reels: 5,
      days_back: 14,
      project_id: 1,
      requester_telegram_id: '144022504',
      metadata: {
        test: 'reels-api-fix',
        timestamp: new Date().toISOString(),
      },
    },
  })

  console.log('✅ Test event sent:', result.ids[0])
  return result
}

// Test 2: Test analyzeCompetitorReels function with non-existent user (should handle error)
export const testAnalyzeReelsError = async () => {
  console.log('🎬 Testing analyzeCompetitorReels with non-existent user...')

  const result = await inngest.send({
    name: 'instagram/analyze-reels',
    data: {
      username: 'nonexistentuser999999',
      max_reels: 5,
      days_back: 14,
      project_id: 1,
      requester_telegram_id: '144022504',
      metadata: {
        test: 'reels-api-error-handling',
        timestamp: new Date().toISOString(),
      },
    },
  })

  console.log('✅ Test event sent:', result.ids[0])
  return result
}

// Test 3: Test instagramScraperV2 with reels enabled
export const testInstagramScraperWithReels = async () => {
  console.log('🎬 Testing instagramScraperV2 with reels enabled...')

  const result = await inngest.send({
    name: 'instagram/scrape-similar-users',
    data: {
      username_or_id: 'alexyanovsky',
      project_id: 1,
      max_users: 3,
      max_reels_per_user: 2,
      scrape_reels: true,
      requester_telegram_id: '144022504',
      metadata: {
        test: 'scraper-with-reels',
        timestamp: new Date().toISOString(),
      },
    },
  })

  console.log('✅ Test event sent:', result.ids[0])
  return result
}

// Test 4: Test extractTopContent function
export const testExtractTopContent = async () => {
  console.log('🎬 Testing extractTopContent...')

  const result = await inngest.send({
    name: 'instagram/extract-top-content',
    data: {
      username: 'alexyanovsky',
      days_back: 14,
      limit: 10,
      project_id: 1,
      requester_telegram_id: '144022504',
      metadata: {
        test: 'extract-top-content',
        timestamp: new Date().toISOString(),
      },
    },
  })

  console.log('✅ Test event sent:', result.ids[0])
  return result
}

// Test 5: Test generateContentScripts function
export const testGenerateContentScripts = async () => {
  console.log('🎬 Testing generateContentScripts...')

  const result = await inngest.send({
    name: 'instagram/generate-content-scripts',
    data: {
      reel_id: 'test_reel_id',
      ig_reel_url: 'https://instagram.com/p/DHp5jLHt8v6/',
      project_id: 1,
      requester_telegram_id: '144022504',
      metadata: {
        test: 'generate-content-scripts',
        timestamp: new Date().toISOString(),
      },
    },
  })

  console.log('✅ Test event sent:', result.ids[0])
  return result
}

// Run all tests
export const runAllTests = async () => {
  console.log('🚀 Running all Instagram Reels API tests...\n')

  try {
    await testAnalyzeReelsSuccess()
    await new Promise(resolve => setTimeout(resolve, 1000))

    await testAnalyzeReelsError()
    await new Promise(resolve => setTimeout(resolve, 1000))

    await testInstagramScraperWithReels()
    await new Promise(resolve => setTimeout(resolve, 1000))

    await testExtractTopContent()
    await new Promise(resolve => setTimeout(resolve, 1000))

    await testGenerateContentScripts()

    console.log('\n🎉 All test events sent successfully!')
    console.log('📊 Check the Inngest Dashboard at: http://localhost:8288')
    console.log('🔍 Monitor the logs for results')
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
}
