#!/usr/bin/env bun

/**
 * 🔍 Specific User Test - yacheslav_nekludov
 * Testing why this user returns empty array
 */

import { Inngest } from 'inngest'

const inngest = new Inngest({
  id: 'ai-training-server',
  eventKey: process.env.INNGEST_EVENT_KEY || 'test-key',
  isDev: true,
  baseUrl: 'http://localhost:4000/api/inngest',
})

console.log('🔍 TESTING SPECIFIC USER: yacheslav_nekludov')
console.log('='.repeat(60))
console.log('🎯 Testing why this user returns empty array for competitors')
console.log('📋 User data from your example:')
console.log('   - username_or_id: "yacheslav_nekludov"')
console.log('   - max_users: 30')
console.log('   - project_id: 38')
console.log('   - scrape_reels: false')
console.log('='.repeat(60))

// Test the specific user
const testSpecificUser = async () => {
  console.log('🚀 Testing yacheslav_nekludov...\n')

  const testData = {
    project_id: 38,
    requester_telegram_id: '144022504',
    username_or_id: 'yacheslav_nekludov',
    max_users: 30,
    min_followers: 1000,
    scrape_reels: false,
    metadata: {
      test: 'specific-user-yacheslav_nekludov',
      test_env: 'investigation',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      debug: 'empty_array_investigation',
    },
  }

  console.log('📤 Sending test event for yacheslav_nekludov:')
  console.log('   Event: instagram/find-competitors')
  console.log('   Username:', testData.username_or_id)
  console.log('   Max users:', testData.max_users)
  console.log('   Min followers:', testData.min_followers)
  console.log('   Project ID:', testData.project_id)
  console.log('   Scrape reels:', testData.scrape_reels)

  try {
    const eventId = `yacheslav-nekludov-test-${Date.now()}`

    const result = await inngest.send({
      id: eventId,
      name: 'instagram/find-competitors',
      data: testData,
    })

    console.log('✅ SUCCESS: Event sent for yacheslav_nekludov')
    console.log('🆔 Event ID:', eventId)
    console.log('📋 Inngest ID:', result.ids[0] || 'No ID returned')

    // Also test Instagram Scraper V2 directly
    console.log('\n🔄 Also testing Instagram Scraper V2 directly...')

    const scraperTestData = {
      project_id: 38,
      requester_telegram_id: '144022504',
      username_or_id: 'yacheslav_nekludov',
      max_users: 30,
      max_reels_per_user: 0,
      scrape_reels: false,
      metadata: {
        test: 'yacheslav_nekludov-scraper-direct',
        test_env: 'investigation',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        debug: 'direct_scraper_test',
      },
    }

    const scraperResult = await inngest.send({
      id: `yacheslav-nekludov-scraper-${Date.now()}`,
      name: 'instagram/scrape-similar-users',
      data: scraperTestData,
    })

    console.log('✅ SUCCESS: Instagram Scraper V2 event sent')
    console.log(
      '🆔 Scraper Event ID:',
      `yacheslav-nekludov-scraper-${Date.now()}`
    )
    console.log(
      '📋 Scraper Inngest ID:',
      scraperResult.ids[0] || 'No ID returned'
    )
  } catch (error) {
    console.log('❌ ERROR:', error.message)
    console.log('🔍 Error details:', error)
  }

  console.log('\n='.repeat(60))
  console.log('🔍 INVESTIGATION STEPS:')
  console.log('='.repeat(60))
  console.log('1. Check Inngest Dashboard: http://localhost:8288')
  console.log('2. Look for the test events in Runs')
  console.log('3. Check if Instagram API returns data for yacheslav_nekludov')
  console.log('4. Verify project_id 38 exists in database')
  console.log('5. Check if user has sufficient followers')
  console.log('6. Look for any API rate limiting or errors')
  console.log('')
  console.log('📊 Possible causes of empty array:')
  console.log('• Instagram API returns no similar users')
  console.log('• User has private account or no followers')
  console.log('• All similar users filtered out by min_followers')
  console.log('• API rate limiting or temporary failure')
  console.log('• Project validation issues')
  console.log('')
  console.log('✨ Investigation test completed!')
  console.log('🔍 Check Dashboard logs for detailed results')
}

// Execute the test
if (import.meta.main) {
  testSpecificUser().catch(console.error)
}
