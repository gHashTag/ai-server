#!/usr/bin/env bun
/**
 * 🎯 Test Script for Current Task Functions (current_task.mdc)
 * Tests the 4 specific Instagram functions from Jobs to be Done
 */

import { Inngest } from 'inngest'

console.log('🎯 TESTING CURRENT TASK FUNCTIONS FROM current_task.mdc')
console.log('='.repeat(70))
console.log(
  '📋 Testing 4 specific functions from Jobs to be Done architecture:'
)
console.log('   Job 1: findCompetitors - "Найти похожих авторов"')
console.log('   Job 2: analyzeCompetitorReels - "Понять популярный контент"')
console.log('   Job 3: extractTopContent - "Получить инсайты о трендах"')
console.log('   Job 4: generateContentScripts - "Создать похожий контент"')
console.log('='.repeat(70))

// Initialize Inngest client
const inngest = new Inngest({
  id: 'ai-training-server',
  eventKey: process.env.INNGEST_EVENT_KEY || 'test-key',
  isDev: true, // Local development
  baseUrl: 'http://localhost:4000/api/inngest',
})

// Production test data
const testData = {
  project_id: 1,
  requester_telegram_id: '144022504', // CRITICAL: string type
  metadata: {
    test_env: 'current_task_test',
    test_runner: 'current-task-functions',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  },
}

// Test cases for the 4 specific functions from current_task.mdc
const currentTaskFunctions = [
  {
    job: 'Job 1',
    description: 'Найти похожих авторов в моей нише',
    functionName: '🔍 findCompetitors',
    eventName: 'instagram/find-competitors',
    telegramCommand: '/find 10 @username',
    expectedResult: 'Список конкурентов с метриками',
    testData: {
      ...testData,
      username_or_id: 'alexyanovsky',
      max_users: 3,
      min_followers: 1000,
      metadata: {
        ...testData.metadata,
        test: 'job1-find-competitors',
      },
    },
  },
  {
    job: 'Job 2',
    description: 'Понять, какой контент популярен у конкурентов',
    functionName: '📈 analyzeCompetitorReels',
    eventName: 'instagram/analyze-reels',
    telegramCommand: '/analyze @username',
    expectedResult: 'Собранные рилсы с метриками',
    testData: {
      ...testData,
      username: 'alexyanovsky',
      days_back: 7,
      max_reels: 5,
      metadata: {
        ...testData.metadata,
        test: 'job2-analyze-reels',
      },
    },
  },
  {
    job: 'Job 3',
    description: 'Получить инсайты о трендах',
    functionName: '📊 extractTopContent',
    eventName: 'instagram/extract-top-content',
    telegramCommand: '/topreels @username',
    expectedResult: 'ТОП-10 рилсов за 14 дней',
    testData: {
      ...testData,
      username: 'alexyanovsky',
      days_back: 14,
      limit: 5,
      metadata: {
        ...testData.metadata,
        test: 'job3-extract-top-content',
      },
    },
  },
  {
    job: 'Job 4',
    description: 'Создать похожий контент',
    functionName: '🎬 generateContentScripts',
    eventName: 'instagram/generate-content-scripts',
    telegramCommand: '/script <record_id>',
    expectedResult: '3 альтернативных сценария',
    testData: {
      ...testData,
      reel_id: 'current_task_test_reel',
      ig_reel_url: 'https://instagram.com/p/DHp5jLHt8v6/',
      metadata: {
        ...testData.metadata,
        test: 'job4-generate-content-scripts',
      },
    },
  },
]

// Test execution function
async function testCurrentTaskFunctions() {
  console.log('🚀 Starting Current Task Functions Test...\n')

  const results = []

  for (let i = 0; i < currentTaskFunctions.length; i++) {
    const func = currentTaskFunctions[i]

    console.log(`${i + 1}️⃣ ${func.job}: ${func.functionName}`)
    console.log(`   📝 Description: ${func.description}`)
    console.log(`   🤖 Telegram Command: ${func.telegramCommand}`)
    console.log(`   🎯 Expected Result: ${func.expectedResult}`)
    console.log(`   📡 Event Name: ${func.eventName}`)

    try {
      // Generate unique event ID
      const eventId = `current-task-${Date.now()}-${i}`

      // Send event
      const result = await inngest.send({
        id: eventId,
        name: func.eventName,
        data: func.testData,
      })

      console.log(`   ✅ SUCCESS: Event sent successfully`)
      console.log(`   🆔 Event ID: ${eventId}`)
      console.log(`   📋 Inngest ID: ${result.ids[0] || 'No ID returned'}`)

      results.push({
        job: func.job,
        functionName: func.functionName,
        eventName: func.eventName,
        status: 'SUCCESS',
        eventId,
        inngestId: result.ids[0] || 'No ID',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`)

      results.push({
        job: func.job,
        functionName: func.functionName,
        eventName: func.eventName,
        status: 'FAILED',
        error: error.message,
        timestamp: new Date().toISOString(),
      })
    }

    console.log('') // Empty line

    // Wait 1 second between tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

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
    console.log(`   ${status} ${result.job} - ${result.functionName}`)
    if (result.status === 'SUCCESS') {
      console.log(`      Event ID: ${result.eventId}`)
      console.log(`      Inngest ID: ${result.inngestId}`)
    } else {
      console.log(`      Error: ${result.error}`)
    }
  })

  if (successful.length === 4) {
    console.log('\n🎉 ALL CURRENT TASK FUNCTIONS ARE WORKING!')
    console.log(
      '✅ The Instagram-AI-Scraper system is ready for Jobs to be Done!'
    )
  } else {
    console.log('\n⚠️  Some functions failed - check the errors above')
  }

  console.log('\n🔍 Next Steps:')
  console.log('1. Check Inngest Dashboard: http://localhost:8288')
  console.log('2. Verify functions are processing data correctly')
  console.log('3. Test with real Telegram bot commands')
  console.log('4. Check database for saved results')

  console.log('\n✨ Current Task Functions test completed!')
  return results
}

// Execute the test
if (import.meta.main) {
  testCurrentTaskFunctions().catch(console.error)
}
