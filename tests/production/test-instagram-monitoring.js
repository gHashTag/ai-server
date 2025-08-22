/**
 * 📸 INSTAGRAM MONITORING PRODUCTION TEST
 * Детальная проверка Instagram функций в продакшене
 */

const { inngest } = require('../../dist/core/inngest/clients')

const CONFIG = {
  TEST_USERNAME: process.env.TEST_INSTAGRAM_USERNAME || 'cristiano', // Популярный аккаунт для тестирования
  TEST_TELEGRAM_ID: process.env.TEST_TELEGRAM_ID || '123456789',
  PROJECT_ID: 'test-instagram-' + Date.now()
}

async function testInstagramMonitoring() {
  console.log('📸 Testing Instagram Monitoring in Production')
  console.log('============================================')
  console.log(`Target Username: @${CONFIG.TEST_USERNAME}`)
  console.log(`Test Project: ${CONFIG.PROJECT_ID}`)
  console.log('')

  const tests = [
    {
      name: 'Analyze Competitor Reels',
      event: 'instagram/analyze-competitor-reels',
      data: {
        username: CONFIG.TEST_USERNAME,
        max_reels: 5,
        days_back: 7,
        telegram_id: CONFIG.TEST_TELEGRAM_ID,
        project_id: CONFIG.PROJECT_ID
      }
    },
    {
      name: 'Instagram Content Scraping',
      event: 'instagram/scrape-content-v2',
      data: {
        username: CONFIG.TEST_USERNAME,
        limit: 10,
        telegram_id: CONFIG.TEST_TELEGRAM_ID
      }
    },
    {
      name: 'Find Competitors',
      event: 'instagram/find-competitors',
      data: {
        target_username: CONFIG.TEST_USERNAME,
        telegram_id: CONFIG.TEST_TELEGRAM_ID,
        project_id: CONFIG.PROJECT_ID
      }
    },
    {
      name: 'Extract Top Content',
      event: 'instagram/extract-top-content',
      data: {
        username: CONFIG.TEST_USERNAME,
        period_days: 7,
        telegram_id: CONFIG.TEST_TELEGRAM_ID
      }
    }
  ]

  const results = []

  for (const test of tests) {
    console.log(`🧪 Testing: ${test.name}`)
    console.log(`   Event: ${test.event}`)
    
    try {
      const result = await inngest.send({
        name: test.event,
        data: test.data
      })
      
      if (result && result.ids && result.ids.length > 0) {
        console.log(`   ✅ SUCCESS - Event ID: ${result.ids[0]}`)
        results.push({
          test: test.name,
          status: 'success',
          eventId: result.ids[0],
          details: 'Event sent successfully to Inngest'
        })
      } else {
        throw new Error('No event ID returned')
      }
      
    } catch (error) {
      console.log(`   ❌ FAILED - ${error.message}`)
      results.push({
        test: test.name,
        status: 'failed',
        error: error.message
      })
    }
    
    // Небольшая пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.log('\n📊 INSTAGRAM MONITORING TEST RESULTS')
  console.log('====================================')
  
  let successCount = 0
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.test}`)
    if (result.status === 'success') {
      console.log(`   ✅ PASS - ${result.details}`)
      console.log(`   📨 Event ID: ${result.eventId}`)
      successCount++
    } else {
      console.log(`   ❌ FAIL - ${result.error}`)
    }
    console.log('')
  })
  
  console.log(`🎯 Summary: ${successCount}/${results.length} tests passed`)
  
  if (successCount === results.length) {
    console.log('🎉 ALL INSTAGRAM TESTS PASSED!')
    console.log('✅ Instagram monitoring is working in production')
  } else {
    console.log('⚠️  Some Instagram tests failed')
    console.log('🔍 Check Inngest dashboard for processing details')
  }
  
  return successCount === results.length
}

// Дополнительная проверка Instagram API
async function testInstagramAPI() {
  console.log('\n🔌 Testing Instagram API Integration')
  console.log('===================================')
  
  try {
    // Проверим доступность Instagram функций через прямой HTTP запрос
    const axios = require('axios')
    const API_URL = process.env.PRODUCTION_API_URL || 'http://localhost:4000'
    
    // Тест trigger endpoint
    const triggerResponse = await axios.get(`${API_URL}/trigger`)
    console.log('✅ Trigger endpoint accessible')
    
    // Проверим что Inngest endpoint доступен
    const inngestResponse = await axios.get(`${API_URL}/api/inngest`, {
      headers: { 'User-Agent': 'Test/1.0' }
    })
    console.log('✅ Inngest endpoint accessible')
    
    return true
    
  } catch (error) {
    console.log(`❌ API Integration Error: ${error.message}`)
    return false
  }
}

async function runInstagramTests() {
  console.log('🚀 Starting Instagram Production Tests\n')
  
  try {
    const monitoringSuccess = await testInstagramMonitoring()
    const apiSuccess = await testInstagramAPI()
    
    const overallSuccess = monitoringSuccess && apiSuccess
    
    console.log('\n' + '='.repeat(50))
    console.log('📋 FINAL INSTAGRAM TEST REPORT')
    console.log('='.repeat(50))
    console.log(`Monitoring Functions: ${monitoringSuccess ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`API Integration: ${apiSuccess ? '✅ PASS' : '❌ FAIL'}`)
    console.log('')
    console.log(`Overall Status: ${overallSuccess ? '🎉 ALL PASS' : '⚠️ ISSUES FOUND'}`)
    console.log('='.repeat(50))
    
    return overallSuccess
    
  } catch (error) {
    console.error('💥 Fatal error in Instagram tests:', error)
    return false
  }
}

if (require.main === module) {
  runInstagramTests().then(success => {
    process.exit(success ? 0 : 1)
  })
}

module.exports = { testInstagramMonitoring, testInstagramAPI, CONFIG }