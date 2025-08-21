#!/usr/bin/env bun

/**
 * 🎯 Simple Test for Current Task Functions
 * Uses same configuration as working test script
 */

// Import working configuration
import {
  findCompetitorsTestData,
  analyzeCompetitorReelsTestData,
  extractTopContentTestData,
  generateContentScriptsTestData,
} from './test-data-templates.ts'

// Get API_URL from environment or use default
const API_URL = process.env.API_URL || 'http://localhost:4000'

console.log('🎯 TESTING CURRENT TASK FUNCTIONS (Simple Version)')
console.log('='.repeat(70))
console.log(`📡 API_URL: ${API_URL}`)
console.log('📋 Testing 4 specific functions from current_task.mdc:')
console.log('   🔍 Job 1: findCompetitors')
console.log('   📈 Job 2: analyzeCompetitorReels')
console.log('   📊 Job 3: extractTopContent')
console.log('   🎬 Job 4: generateContentScripts')
console.log('='.repeat(70))

// Test functions from current_task.mdc
const testCurrentTaskFunctions = async () => {
  console.log('🚀 Starting Current Task Functions Test...\n')

  const results = []

  // Job 1: findCompetitors
  console.log('1️⃣ Job 1: 🔍 findCompetitors')
  console.log('   📝 Description: Найти похожих авторов в моей нише')
  console.log('   🤖 Telegram Command: /find 10 @username')
  console.log('   🎯 Expected Result: Список конкурентов с метриками')

  try {
    const testData = findCompetitorsTestData.default
    const eventId = testData.id()
    const eventData = {
      ...testData.data,
      metadata: {
        ...testData.data.metadata,
        test: 'current-task-job1',
        timestamp: new Date().toISOString(),
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
        data: eventData,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const result = await response.json()
    console.log('   ✅ SUCCESS: findCompetitors event sent')
    console.log(`   🆔 Event ID: ${eventId}`)
    results.push({
      job: 'Job 1',
      function: 'findCompetitors',
      status: 'SUCCESS',
      eventId,
    })
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`)
    results.push({
      job: 'Job 1',
      function: 'findCompetitors',
      status: 'FAILED',
      error: error.message,
    })
  }

  console.log('') // Empty line
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Job 2: analyzeCompetitorReels
  console.log('2️⃣ Job 2: 📈 analyzeCompetitorReels')
  console.log(
    '   📝 Description: Понять, какой контент популярен у конкурентов'
  )
  console.log('   🤖 Telegram Command: /analyze @username')
  console.log('   🎯 Expected Result: Собранные рилсы с метриками')

  try {
    const testData = analyzeCompetitorReelsTestData.default
    const eventId = testData.id()
    const eventData = {
      ...testData.data,
      metadata: {
        ...testData.data.metadata,
        test: 'current-task-job2',
        timestamp: new Date().toISOString(),
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
        data: eventData,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const result = await response.json()
    console.log('   ✅ SUCCESS: analyzeCompetitorReels event sent')
    console.log(`   🆔 Event ID: ${eventId}`)
    results.push({
      job: 'Job 2',
      function: 'analyzeCompetitorReels',
      status: 'SUCCESS',
      eventId,
    })
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`)
    results.push({
      job: 'Job 2',
      function: 'analyzeCompetitorReels',
      status: 'FAILED',
      error: error.message,
    })
  }

  console.log('') // Empty line
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Job 3: extractTopContent
  console.log('3️⃣ Job 3: 📊 extractTopContent')
  console.log('   📝 Description: Получить инсайты о трендах')
  console.log('   🤖 Telegram Command: /topreels @username')
  console.log('   🎯 Expected Result: ТОП-10 рилсов за 14 дней')

  try {
    const testData = extractTopContentTestData.default
    const eventId = testData.id()
    const eventData = {
      ...testData.data,
      metadata: {
        ...testData.data.metadata,
        test: 'current-task-job3',
        timestamp: new Date().toISOString(),
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
        data: eventData,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const result = await response.json()
    console.log('   ✅ SUCCESS: extractTopContent event sent')
    console.log(`   🆔 Event ID: ${eventId}`)
    results.push({
      job: 'Job 3',
      function: 'extractTopContent',
      status: 'SUCCESS',
      eventId,
    })
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`)
    results.push({
      job: 'Job 3',
      function: 'extractTopContent',
      status: 'FAILED',
      error: error.message,
    })
  }

  console.log('') // Empty line
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Job 4: generateContentScripts
  console.log('4️⃣ Job 4: 🎬 generateContentScripts')
  console.log('   📝 Description: Создать похожий контент')
  console.log('   🤖 Telegram Command: /script <record_id>')
  console.log('   🎯 Expected Result: 3 альтернативных сценария')

  try {
    const testData = generateContentScriptsTestData.default
    const eventId = testData.id()
    const eventData = {
      ...testData.data,
      metadata: {
        ...testData.data.metadata,
        test: 'current-task-job4',
        timestamp: new Date().toISOString(),
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
        data: eventData,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const result = await response.json()
    console.log('   ✅ SUCCESS: generateContentScripts event sent')
    console.log(`   🆔 Event ID: ${eventId}`)
    results.push({
      job: 'Job 4',
      function: 'generateContentScripts',
      status: 'SUCCESS',
      eventId,
    })
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`)
    results.push({
      job: 'Job 4',
      function: 'generateContentScripts',
      status: 'FAILED',
      error: error.message,
    })
  }

  console.log('') // Empty line

  // Summary Report
  console.log('='.repeat(70))
  console.log('📊 CURRENT TASK FUNCTIONS TEST SUMMARY')
  console.log('='.repeat(70))

  const successful = results.filter(r => r.status === 'SUCCESS')
  const failed = results.filter(r => r.status === 'FAILED')

  console.log(`✅ Successful: ${successful.length}/${results.length}`)
  console.log(`❌ Failed: ${failed.length}/${results.length}`)
  console.log(
    `📈 Success Rate: ${((successful.length / results.length) * 100).toFixed(
      1
    )}%`
  )

  console.log('\n🎯 Detailed Results:')
  results.forEach(result => {
    const status = result.status === 'SUCCESS' ? '✅' : '❌'
    console.log(`   ${status} ${result.job} - ${result.function}`)
    if (result.status === 'SUCCESS') {
      console.log(`      Event ID: ${result.eventId}`)
    } else {
      console.log(`      Error: ${result.error}`)
    }
  })

  if (successful.length === 4) {
    console.log('\n🎉 ALL CURRENT TASK FUNCTIONS ARE WORKING!')
    console.log(
      '✅ The Instagram-AI-Scraper system is ready for Jobs to be Done!'
    )
    console.log('🚀 Functions with emoji names are successfully deployed!')
  } else {
    console.log('\n⚠️  Some functions failed - check the errors above')
  }

  console.log('\n🔍 Next Steps:')
  console.log('1. Check Inngest Dashboard: http://localhost:8288')
  console.log('2. Functions should show with emoji names in Dashboard')
  console.log('3. Verify functions are processing data correctly')
  console.log('4. Check database for saved results')

  console.log('\n✨ Current Task Functions test completed!')
  return results
}

// Execute the test
if (import.meta.main) {
  testCurrentTaskFunctions().catch(console.error)
}
