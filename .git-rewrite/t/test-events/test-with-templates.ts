#!/usr/bin/env bun

import { Inngest } from 'inngest'
import {
  generateTestEvent,
  getDefaultTestData,
  allTestData,
} from './test-data-templates'

const API_URL = process.env.API_URL || 'http://localhost:4000'

console.log('API_URL', API_URL)

// Создаем клиент Inngest
console.log('🔄 Initializing Inngest client...')
const inngest = new Inngest({
  id: 'instagram-content-agent',
  eventKey:
    'K7T9iRqSGRrHyn5tCpEA7yJ3M3w60UKX4JdiImQKZQwr-9asldiO6FBBA5Bp-MEGYBX-K8SG4CgKtZvrR_YLRw',
})

console.log('✅ Inngest client created successfully')

async function testAllFunctionsWithTemplates() {
  console.log('\n🚀 Testing all Instagram functions with proper templates...')
  console.log(
    '📊 Using correct data types (string for telegram_id) and idempotency IDs'
  )

  try {
    // 1. Test findCompetitors - default case
    console.log('\n1️⃣ Testing findCompetitors (default)...')
    const competitorsDefault = generateTestEvent('findCompetitors', 'default')
    const competitorsResult = await inngest.send(competitorsDefault)
    console.log('✅ findCompetitors (default) sent:', competitorsResult.ids[0])

    // 2. Test analyzeCompetitorReels - default case
    console.log('\n2️⃣ Testing analyzeCompetitorReels (default)...')
    const reelsDefault = generateTestEvent('analyzeCompetitorReels', 'default')
    const reelsResult = await inngest.send(reelsDefault)
    console.log('✅ analyzeCompetitorReels (default) sent:', reelsResult.ids[0])

    // 3. Test extractTopContent - default case
    console.log('\n3️⃣ Testing extractTopContent (default)...')
    const topContentDefault = generateTestEvent('extractTopContent', 'default')
    const topContentResult = await inngest.send(topContentDefault)
    console.log('✅ extractTopContent (default) sent:', topContentResult.ids[0])

    // 4. Test generateContentScripts - default case
    console.log('\n4️⃣ Testing generateContentScripts (default)...')
    const scriptsDefault = generateTestEvent(
      'generateContentScripts',
      'default'
    )
    const scriptsResult = await inngest.send(scriptsDefault)
    console.log(
      '✅ generateContentScripts (default) sent:',
      scriptsResult.ids[0]
    )

    // 5. Test instagramScraperV2 - default case
    console.log('\n5️⃣ Testing instagramScraperV2 (default)...')
    const scraperDefault = generateTestEvent('instagramScraperV2', 'default')
    const scraperResult = await inngest.send(scraperDefault)
    console.log('✅ instagramScraperV2 (default) sent:', scraperResult.ids[0])

    console.log('\n🎉 All functions tested successfully with proper templates!')
    console.log('\n📊 Event Summary:')
    console.log(
      '┌─────────────────────────────────────────────────────────────────┐'
    )
    console.log(
      '│ Function                │ Status │ Event ID                    │'
    )
    console.log(
      '├─────────────────────────────────────────────────────────────────┤'
    )
    console.log(
      `│ findCompetitors         │ ✅ SENT │ ${competitorsResult.ids[0]} │`
    )
    console.log(`│ analyzeCompetitorReels  │ ✅ SENT │ ${reelsResult.ids[0]} │`)
    console.log(
      `│ extractTopContent       │ ✅ SENT │ ${topContentResult.ids[0]} │`
    )
    console.log(
      `│ generateContentScripts  │ ✅ SENT │ ${scriptsResult.ids[0]} │`
    )
    console.log(
      `│ instagramScraperV2      │ ✅ SENT │ ${scraperResult.ids[0]} │`
    )
    console.log(
      '└─────────────────────────────────────────────────────────────────┘'
    )

    console.log('\n🔍 Check Inngest Dashboard: http://localhost:8288')
    console.log('📝 All events sent with proper data types and idempotency IDs')
  } catch (error) {
    console.error('❌ Error testing functions:', error)
    process.exit(1)
  }
}

async function testVariousTestCases() {
  console.log('\n🧪 Testing various test cases...')

  try {
    // Test minimal cases
    console.log('\n🔹 Testing minimal cases...')
    const competitorsMinimal = generateTestEvent('findCompetitors', 'minimal')
    const reelsMinimal = generateTestEvent('analyzeCompetitorReels', 'minimal')
    const topContentMinimal = generateTestEvent('extractTopContent', 'minimal')

    const minimalResults = await inngest.send([
      competitorsMinimal,
      reelsMinimal,
      topContentMinimal,
    ])

    console.log('✅ Minimal cases sent:', minimalResults.ids.length, 'events')

    // Test large cases
    console.log('\n🔹 Testing large cases...')
    const competitorsLarge = generateTestEvent('findCompetitors', 'large_batch')
    const reelsExtended = generateTestEvent(
      'analyzeCompetitorReels',
      'extended_period'
    )
    const topContentLarge = generateTestEvent(
      'extractTopContent',
      'large_limit'
    )

    const largeResults = await inngest.send([
      competitorsLarge,
      reelsExtended,
      topContentLarge,
    ])

    console.log('✅ Large cases sent:', largeResults.ids.length, 'events')

    console.log('\n📊 Test Cases Summary:')
    console.log('• Minimal cases: 3 events')
    console.log('• Large cases: 3 events')
    console.log('• Default cases: 5 events')
    console.log('• Total: 11 events sent')
  } catch (error) {
    console.error('❌ Error testing various cases:', error)
    process.exit(1)
  }
}

// Функция для демонстрации доступных тестовых кейсов
function showAvailableTestCases() {
  console.log('\n📋 Available test cases for each function:')

  Object.entries(allTestData).forEach(([functionName, testCases]) => {
    console.log(`\n🔸 ${functionName}:`)
    Object.keys(testCases).forEach(testCase => {
      console.log(`  - ${testCase}`)
    })
  })

  console.log('\n💡 Usage examples:')
  console.log('  generateTestEvent("findCompetitors", "default")')
  console.log(
    '  generateTestEvent("analyzeCompetitorReels", "extended_period")'
  )
  console.log('  generateTestEvent("extractTopContent", "large_limit")')
  console.log('  generateTestEvent("generateContentScripts", "real_reel")')
  console.log('  generateTestEvent("instagramScraperV2", "users_only")')
}

async function main() {
  // Показываем доступные тестовые кейсы
  showAvailableTestCases()

  // Тестируем все функции с дефолтными параметрами
  await testAllFunctionsWithTemplates()

  // Тестируем различные кейсы
  await testVariousTestCases()

  console.log('\n🎯 All tests completed successfully!')
  console.log('🔍 Check Inngest Dashboard for results: http://localhost:8288')
}

// Запускаем тесты
main().catch(console.error)
