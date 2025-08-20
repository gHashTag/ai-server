#!/usr/bin/env bun

/**
 * 🔍 Real Parse for yacheslav_nekludov - 30 Competitors
 * Parse actual Instagram data for 30 competitors
 */

import {
  findCompetitorsTestData,
  instagramScraperV2TestData,
} from './test-data-templates.ts'

const API_URL = process.env.API_URL || 'http://localhost:4000'

console.log('🔍 REAL PARSING FOR YACHESLAV_NEKLUDOV - 30 COMPETITORS')
console.log('='.repeat(70))
console.log('🎯 Target: yacheslav_nekludov')
console.log('📊 Goal: 30 competitors with real Instagram data')
console.log('🗄️ Database: Save to instagram_users and competitors tables')
console.log('='.repeat(70))

// Parse 30 competitors for yacheslav_nekludov
const parseYacheslavCompetitors = async () => {
  console.log('🚀 Starting real parsing for yacheslav_nekludov...\n')

  // Test 1: findCompetitors with 30 users
  console.log('1️⃣ Testing findCompetitors with 30 competitors...')
  try {
    const testData = findCompetitorsTestData.default
    const eventId = `yacheslav-30-competitors-${Date.now()}`

    const competitorsData = {
      ...testData.data,
      username_or_id: 'yacheslav_nekludov',
      max_users: 30,
      min_followers: 500, // Reduced to get more results
      project_id: 38,
      metadata: {
        ...testData.data.metadata,
        test: 'yacheslav-30-competitors-real',
        debug: 'production_parse_30_users',
        timestamp: new Date().toISOString(),
        requested_by: 'guru',
        goal: '30_real_competitors',
      },
    }

    const response = await fetch(`${API_URL}/api/inngest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: eventId,
        name: testData.name,
        data: competitorsData,
      }),
    })

    if (response.ok) {
      console.log(
        '✅ SUCCESS: findCompetitors event sent for yacheslav_nekludov'
      )
      console.log(`🆔 Event ID: ${eventId}`)
      console.log(`📊 Parameters:`)
      console.log(`   • Username: ${competitorsData.username_or_id}`)
      console.log(`   • Max users: ${competitorsData.max_users}`)
      console.log(`   • Min followers: ${competitorsData.min_followers}`)
      console.log(`   • Project ID: ${competitorsData.project_id}`)
    } else {
      console.log('❌ FAILED: findCompetitors event failed')
      console.log(`🔍 Status: ${response.status}`)
      console.log(`🔍 Response: ${await response.text()}`)
    }
  } catch (error) {
    console.log('❌ ERROR in findCompetitors:', error.message)
  }

  console.log('') // Empty line
  await new Promise(resolve => setTimeout(resolve, 3000))

  // Test 2: instagramScraperV2 with 30 users (no reels)
  console.log('2️⃣ Testing instagramScraperV2 with 30 users (backup method)...')
  try {
    const testData = instagramScraperV2TestData.users_only
    const eventId = `yacheslav-scraper-30-${Date.now()}`

    const scraperData = {
      ...testData.data,
      username_or_id: 'yacheslav_nekludov',
      max_users: 30,
      max_reels_per_user: 0,
      scrape_reels: false,
      project_id: 38,
      metadata: {
        ...testData.data.metadata,
        test: 'yacheslav-scraper-30-users',
        debug: 'production_scraper_30_users',
        timestamp: new Date().toISOString(),
        requested_by: 'guru',
        goal: '30_instagram_users_only',
      },
    }

    const response = await fetch(`${API_URL}/api/inngest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: eventId,
        name: testData.name,
        data: scraperData,
      }),
    })

    if (response.ok) {
      console.log(
        '✅ SUCCESS: instagramScraperV2 event sent for yacheslav_nekludov'
      )
      console.log(`🆔 Event ID: ${eventId}`)
      console.log(`📊 Parameters:`)
      console.log(`   • Username: ${scraperData.username_or_id}`)
      console.log(`   • Max users: ${scraperData.max_users}`)
      console.log(`   • Max reels per user: ${scraperData.max_reels_per_user}`)
      console.log(`   • Scrape reels: ${scraperData.scrape_reels}`)
      console.log(`   • Project ID: ${scraperData.project_id}`)
    } else {
      console.log('❌ FAILED: instagramScraperV2 event failed')
      console.log(`🔍 Status: ${response.status}`)
      console.log(`🔍 Response: ${await response.text()}`)
    }
  } catch (error) {
    console.log('❌ ERROR in instagramScraperV2:', error.message)
  }

  console.log('')
  console.log('='.repeat(70))
  console.log('🎯 PARSING INITIATED FOR YACHESLAV_NEKLUDOV')
  console.log('='.repeat(70))
  console.log('📊 Check Inngest Dashboard: http://localhost:8288')
  console.log('🔍 Look for the following events in Runs:')
  console.log('   • yacheslav-30-competitors-* (findCompetitors)')
  console.log('   • yacheslav-scraper-30-* (instagramScraperV2)')
  console.log('')
  console.log('⏳ Wait 2-3 minutes for Instagram API to process...')
  console.log('🗄️ Data will be saved to these tables:')
  console.log('   • instagram_users (user profiles)')
  console.log('   • competitors (if using findCompetitors)')
  console.log('')
  console.log('📋 Expected result:')
  console.log('   • Up to 30 Instagram users found')
  console.log('   • Real usernames, follower counts, profiles')
  console.log('   • Saved to project_id 38')
  console.log('')
  console.log('🔧 To verify results after 3 minutes, run:')
  console.log('   bun run test-events/verify-yacheslav-results.ts')
  console.log('='.repeat(70))
}

// Execute the parsing
if (import.meta.main) {
  parseYacheslavCompetitors().catch(console.error)
}
