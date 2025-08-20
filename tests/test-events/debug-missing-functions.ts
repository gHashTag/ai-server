#!/usr/bin/env bun

/**
 * 🔍 Debug Script for Missing Functions in Runs
 * Specifically tests extractTopContent and generateContentScripts
 */

import {
  extractTopContentTestData,
  generateContentScriptsTestData,
} from './test-data-templates.ts'

const API_URL = 'http://localhost:4000'

console.log('🔍 DEBUGGING MISSING FUNCTIONS IN RUNS')
console.log('='.repeat(60))
console.log('🎯 Testing functions that appear in Functions but not in Runs:')
console.log('   📊 extractTopContent (Job 3)')
console.log('   🎬 generateContentScripts (Job 4)')
console.log('='.repeat(60))

// Test missing functions
const testMissingFunctions = async () => {
  console.log('🚀 Testing Missing Functions...\n')

  // Test 1: extractTopContent
  console.log('1️⃣ Testing extractTopContent (Job 3)')
  console.log('   📝 Event: instagram/extract-top-content')
  console.log('   🎯 Expected: ТОП-10 рилсов за 14 дней')

  try {
    const testData = extractTopContentTestData.default
    const eventId = testData.id()
    const eventData = {
      ...testData.data,
      metadata: {
        ...testData.data.metadata,
        test: 'debug-extract-top-content',
        timestamp: new Date().toISOString(),
      },
    }

    console.log('   📤 Sending event data:', {
      id: eventId,
      name: testData.name,
      data: {
        username: eventData.username,
        days_back: eventData.days_back,
        limit: eventData.limit,
        project_id: eventData.project_id,
      },
    })

    const response = await fetch(`${API_URL}/api/inngest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: eventId,
        name: testData.name,
        data: eventData,
      }),
    })

    const responseText = await response.text()
    console.log(`   📥 Response status: ${response.status}`)
    console.log(`   📥 Response body: ${responseText}`)

    if (response.ok) {
      console.log('   ✅ SUCCESS: extractTopContent event sent')
    } else {
      console.log('   ❌ FAILED: extractTopContent event failed')
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`)
  }

  console.log('') // Empty line
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Test 2: generateContentScripts
  console.log('2️⃣ Testing generateContentScripts (Job 4)')
  console.log('   📝 Event: instagram/generate-content-scripts')
  console.log('   🎯 Expected: 3 альтернативных сценария')

  try {
    const testData = generateContentScriptsTestData.default
    const eventId = testData.id()
    const eventData = {
      ...testData.data,
      metadata: {
        ...testData.data.metadata,
        test: 'debug-generate-content-scripts',
        timestamp: new Date().toISOString(),
      },
    }

    console.log('   📤 Sending event data:', {
      id: eventId,
      name: testData.name,
      data: {
        reel_id: eventData.reel_id,
        ig_reel_url: eventData.ig_reel_url,
        project_id: eventData.project_id,
      },
    })

    const response = await fetch(`${API_URL}/api/inngest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: eventId,
        name: testData.name,
        data: eventData,
      }),
    })

    const responseText = await response.text()
    console.log(`   📥 Response status: ${response.status}`)
    console.log(`   📥 Response body: ${responseText}`)

    if (response.ok) {
      console.log('   ✅ SUCCESS: generateContentScripts event sent')
    } else {
      console.log('   ❌ FAILED: generateContentScripts event failed')
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`)
  }

  console.log('')
  console.log('='.repeat(60))
  console.log('🔍 DEBUG SUMMARY')
  console.log('='.repeat(60))
  console.log('1. Check if events appear in Dashboard Runs')
  console.log('2. Check server logs for any errors')
  console.log('3. Verify function implementations')
  console.log('4. Look for any execution failures')
  console.log('')
  console.log('🔍 Next steps:')
  console.log('- Open Dashboard: http://localhost:8288')
  console.log('- Check Runs tab for new executions')
  console.log('- Look for any failed or stuck runs')
  console.log('')
  console.log('✨ Debug test completed!')
}

// Execute the test
if (import.meta.main) {
  testMissingFunctions().catch(console.error)
}
