#!/usr/bin/env bun

/**
 * 🔍 Real Parse for yacheslav_nekludov - 30 Competitors (Working Method)
 * Using the working template method for reliable results
 */

import { Inngest } from 'inngest'

// Get API_URL from environment or use default
const API_URL = process.env.API_URL || 'http://localhost:4000'

console.log(
  '🔍 REAL PARSING FOR YACHESLAV_NEKLUDOV - 30 COMPETITORS (WORKING METHOD)'
)
console.log('='.repeat(80))
console.log('🎯 Target: yacheslav_nekludov')
console.log('📊 Goal: 30 competitors with real Instagram data')
console.log('🗄️ Database: Save to instagram_users and competitors tables')
console.log(
  '🔧 Method: Using working Inngest client (like test-with-templates.ts)'
)
console.log('='.repeat(80))

// Initialize Inngest client (same as working test)
const inngest = new Inngest({
  id: 'ai-training-server',
  eventKey: process.env.INNGEST_EVENT_KEY || 'test-key',
  isDev: true,
  baseUrl: `${API_URL}/api/inngest`,
})

// Generate unique event ID
const generateEventId = (functionName: string, testCase: string) => {
  const timestamp = Date.now()
  return `${functionName}-${testCase}-${timestamp}`
}

// Base template for all events
const baseTemplate = {
  project_id: 38,
  requester_telegram_id: '144022504',
  metadata: {
    test_env: 'production',
    version: '1.0.0',
  },
}

// Parse 30 competitors for yacheslav_nekludov
const parseYacheslavCompetitors = async () => {
  console.log('🔄 Initializing Inngest client...')
  console.log('✅ Inngest client created successfully\n')

  console.log('🚀 Starting real parsing for yacheslav_nekludov...\n')

  // Test 1: findCompetitors with 30 users
  console.log('1️⃣ Testing findCompetitors with 30 competitors...')
  try {
    const eventId = generateEventId('findCompetitors', 'yacheslav-30-real')

    const competitorsData = {
      ...baseTemplate,
      username_or_id: 'yacheslav_nekludov',
      max_users: 30,
      min_followers: 500, // Reduced to get more results
      metadata: {
        ...baseTemplate.metadata,
        test: 'yacheslav-30-competitors-real',
        timestamp: new Date().toISOString(),
        requested_by: 'guru',
        goal: '30_real_competitors',
      },
    }

    const result = await inngest.send({
      id: eventId,
      name: 'instagram/find-competitors',
      data: competitorsData,
    })

    console.log('✅ SUCCESS: findCompetitors event sent for yacheslav_nekludov')
    console.log(`🆔 Event ID: ${eventId}`)
    console.log(`📋 Inngest ID: ${result.ids[0] || 'No ID returned'}`)
    console.log(`📊 Parameters:`)
    console.log(`   • Username: ${competitorsData.username_or_id}`)
    console.log(`   • Max users: ${competitorsData.max_users}`)
    console.log(`   • Min followers: ${competitorsData.min_followers}`)
    console.log(`   • Project ID: ${competitorsData.project_id}`)
  } catch (error) {
    console.log('❌ ERROR in findCompetitors:', error.message)
  }

  console.log('') // Empty line
  await new Promise(resolve => setTimeout(resolve, 3000))

  // Test 2: instagramScraperV2 with 30 users (backup method)
  console.log('2️⃣ Testing instagramScraperV2 with 30 users (backup method)...')
  try {
    const eventId = generateEventId(
      'instagramScraperV2',
      'yacheslav-30-scraper'
    )

    const scraperData = {
      ...baseTemplate,
      username_or_id: 'yacheslav_nekludov',
      max_users: 30,
      max_reels_per_user: 0,
      scrape_reels: false,
      metadata: {
        ...baseTemplate.metadata,
        test: 'yacheslav-scraper-30-users',
        timestamp: new Date().toISOString(),
        requested_by: 'guru',
        goal: '30_instagram_users_only',
      },
    }

    const result = await inngest.send({
      id: eventId,
      name: 'instagram/scrape-similar-users',
      data: scraperData,
    })

    console.log(
      '✅ SUCCESS: instagramScraperV2 event sent for yacheslav_nekludov'
    )
    console.log(`🆔 Event ID: ${eventId}`)
    console.log(`📋 Inngest ID: ${result.ids[0] || 'No ID returned'}`)
    console.log(`📊 Parameters:`)
    console.log(`   • Username: ${scraperData.username_or_id}`)
    console.log(`   • Max users: ${scraperData.max_users}`)
    console.log(`   • Max reels per user: ${scraperData.max_reels_per_user}`)
    console.log(`   • Scrape reels: ${scraperData.scrape_reels}`)
    console.log(`   • Project ID: ${scraperData.project_id}`)
  } catch (error) {
    console.log('❌ ERROR in instagramScraperV2:', error.message)
  }

  console.log('')
  console.log('='.repeat(80))
  console.log('🎯 PARSING INITIATED FOR YACHESLAV_NEKLUDOV')
  console.log('='.repeat(80))
  console.log('📊 Check Inngest Dashboard: http://localhost:8288')
  console.log('🔍 Look for the following events in Runs:')
  console.log('   • findCompetitors-yacheslav-30-real-* (findCompetitors)')
  console.log(
    '   • instagramScraperV2-yacheslav-30-scraper-* (instagramScraperV2)'
  )
  console.log('')
  console.log('⏳ Wait 2-3 minutes for Instagram API to process...')
  console.log('🗄️ Data will be saved to these tables:')
  console.log('   • instagram_users (user profiles)')
  console.log('   • competitors (if using findCompetitors)')
  console.log('')
  console.log('📋 Expected result:')
  console.log('   • Up to 30 Instagram users found for yacheslav_nekludov')
  console.log('   • Real usernames, follower counts, profiles')
  console.log('   • Saved to project_id 38')
  console.log('')
  console.log('🔧 To verify results after 3 minutes, run:')
  console.log('   bun run test-events/verify-yacheslav-results.ts')
  console.log('')
  console.log('✨ Real parsing for yacheslav_nekludov completed!')
  console.log('🔍 Check Dashboard for real-time progress!')
  console.log('='.repeat(80))
}

// Execute the parsing
if (import.meta.main) {
  parseYacheslavCompetitors().catch(console.error)
}
