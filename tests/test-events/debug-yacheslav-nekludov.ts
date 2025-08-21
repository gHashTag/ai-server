#!/usr/bin/env bun

/**
 * 🔍 Debug yacheslav_nekludov User
 * Diagnose why this user returns empty array
 */

import { 
  findCompetitorsTestData,
  instagramScraperV2TestData
} from './test-data-templates.ts'

// Get API_URL from environment or use default
const API_URL = process.env.API_URL || 'http://localhost:4000'

console.log('🔍 DEBUGGING YACHESLAV_NEKLUDOV USER')
console.log('=' .repeat(60))
console.log('🎯 Testing why yacheslav_nekludov returns empty array')
console.log('📋 From your provided JSON data:')
console.log('   - username_or_id: "yacheslav_nekludov"')
console.log('   - max_users: 30')
console.log('   - project_id: 38')
console.log('   - scrape_reels: false')
console.log('=' .repeat(60))

// Test the specific user
const debugYacheslavUser = async () => {
  console.log('🚀 Testing yacheslav_nekludov with different approaches...\n')
  
  // Test 1: Direct findCompetitors call
  console.log('1️⃣ Testing findCompetitors with yacheslav_nekludov...')
  try {
    const testData = findCompetitorsTestData.default
    const eventId = `yacheslav-competitors-${Date.now()}`
    
    const competitorsData = {
      ...testData.data,
      username_or_id: 'yacheslav_nekludov',
      max_users: 30,
      min_followers: 1000,
      project_id: 38,
      metadata: {
        ...testData.data.metadata,
        test: 'yacheslav-nekludov-competitors',
        debug: 'empty_array_investigation',
        timestamp: new Date().toISOString()
      }
    }
    
    const response = await fetch(`${API_URL}/api/inngest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: eventId,
        name: testData.name,
        data: competitorsData
      })
    })
    
    if (response.ok) {
      console.log('✅ SUCCESS: findCompetitors event sent for yacheslav_nekludov')
      console.log(`🆔 Event ID: ${eventId}`)
    } else {
      console.log('❌ FAILED: findCompetitors event failed')
      console.log(`🔍 Status: ${response.status}`)
      console.log(`🔍 Response: ${await response.text()}`)
    }
    
  } catch (error) {
    console.log('❌ ERROR in findCompetitors:', error.message)
  }
  
  console.log('') // Empty line
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Test 2: Direct instagramScraperV2 call
  console.log('2️⃣ Testing instagramScraperV2 with yacheslav_nekludov...')
  try {
    const testData = instagramScraperV2TestData.default
    const eventId = `yacheslav-scraper-${Date.now()}`
    
    const scraperData = {
      ...testData.data,
      username_or_id: 'yacheslav_nekludov',
      max_users: 30,
      max_reels_per_user: 0,
      scrape_reels: false,
      project_id: 38,
      metadata: {
        ...testData.data.metadata,
        test: 'yacheslav-nekludov-scraper',
        debug: 'empty_array_investigation',
        timestamp: new Date().toISOString()
      }
    }
    
    const response = await fetch(`${API_URL}/api/inngest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: eventId,
        name: testData.name,
        data: scraperData
      })
    })
    
    if (response.ok) {
      console.log('✅ SUCCESS: instagramScraperV2 event sent for yacheslav_nekludov')
      console.log(`🆔 Event ID: ${eventId}`)
    } else {
      console.log('❌ FAILED: instagramScraperV2 event failed')
      console.log(`🔍 Status: ${response.status}`)
      console.log(`🔍 Response: ${await response.text()}`)
    }
    
  } catch (error) {
    console.log('❌ ERROR in instagramScraperV2:', error.message)
  }
  
  console.log('') // Empty line
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Test 3: Test with known working user for comparison
  console.log('3️⃣ Testing findCompetitors with known working user (alexyanovsky)...')
  try {
    const testData = findCompetitorsTestData.default
    const eventId = `alexyanovsky-comparison-${Date.now()}`
    
    const comparisonData = {
      ...testData.data,
      username_or_id: 'alexyanovsky',
      max_users: 30,
      min_followers: 1000,
      project_id: 38,
      metadata: {
        ...testData.data.metadata,
        test: 'alexyanovsky-comparison',
        debug: 'working_user_comparison',
        timestamp: new Date().toISOString()
      }
    }
    
    const response = await fetch(`${API_URL}/api/inngest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: eventId,
        name: testData.name,
        data: comparisonData
      })
    })
    
    if (response.ok) {
      console.log('✅ SUCCESS: findCompetitors event sent for alexyanovsky (comparison)')
      console.log(`🆔 Event ID: ${eventId}`)
    } else {
      console.log('❌ FAILED: findCompetitors event failed for alexyanovsky')
      console.log(`🔍 Status: ${response.status}`)
      console.log(`🔍 Response: ${await response.text()}`)
    }
    
  } catch (error) {
    console.log('❌ ERROR in comparison test:', error.message)
  }
  
  console.log('')
  console.log('=' .repeat(60))
  console.log('🔍 DEBUGGING RESULTS')
  console.log('=' .repeat(60))
  console.log('📊 Check Inngest Dashboard: http://localhost:8288')
  console.log('🔍 Look for the following events in Runs:')
  console.log('   • yacheslav-competitors-* (findCompetitors)')
  console.log('   • yacheslav-scraper-* (instagramScraperV2)')
  console.log('   • alexyanovsky-comparison-* (comparison)')
  console.log('')
  console.log('📋 Possible reasons for empty array:')
  console.log('   1. Instagram API returned no similar users')
  console.log('   2. User has very few followers (< min_followers)')
  console.log('   3. User has private account')
  console.log('   4. All similar users filtered out by criteria')
  console.log('   5. API rate limiting or temporary failure')
  console.log('   6. User does not exist on Instagram')
  console.log('')
  console.log('🔧 Check the Dashboard logs to see what actually happened!')
  console.log('=' .repeat(60))
}

// Execute the debug test
if (import.meta.main) {
  debugYacheslavUser().catch(console.error)
} 