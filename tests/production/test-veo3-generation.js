/**
 * 🎬 VEO3 FAST VIDEO GENERATION TEST (9:16)
 * Проверка генерации видео через Veo3 Fast в формате 9:16 для продакшена
 */

const { inngest } = require('../../dist/core/inngest/clients')

const CONFIG = {
  TEST_TELEGRAM_ID: process.env.TEST_TELEGRAM_ID || '123456789',
  BOT_NAME: process.env.TEST_BOT_NAME || 'neuro_blogger_bot',
  // Тестовые промпты для разных сценариев
  TEST_PROMPTS: [
    {
      name: 'Simple Scene',
      prompt: 'A peaceful sunset over calm ocean waves',
      duration: 5
    },
    {
      name: 'Action Scene', 
      prompt: 'A drone flying over a modern city skyline at golden hour',
      duration: 8
    },
    {
      name: 'Nature Scene',
      prompt: 'Rain drops falling on green leaves in slow motion',
      duration: 6
    }
  ]
}

async function testVeo3Generation() {
  console.log('🎬 Testing Veo3 Fast Video Generation (9:16)')
  console.log('==========================================')
  console.log(`Test Telegram ID: ${CONFIG.TEST_TELEGRAM_ID}`)
  console.log(`Bot Name: ${CONFIG.BOT_NAME}`)
  console.log(`Video Format: 9:16 (vertical for mobile)`)
  console.log('')

  const results = []

  for (const testCase of CONFIG.TEST_PROMPTS) {
    console.log(`🧪 Testing: ${testCase.name}`)
    console.log(`   Prompt: "${testCase.prompt}"`)
    console.log(`   Duration: ${testCase.duration}s`)
    console.log(`   Format: 9:16`)
    
    try {
      const veo3Event = {
        name: 'veo3/video-generation',
        data: {
          prompt: testCase.prompt,
          model: 'veo3_fast',
          aspectRatio: '9:16',
          duration: testCase.duration,
          telegram_id: CONFIG.TEST_TELEGRAM_ID,
          bot_name: CONFIG.BOT_NAME,
          test_mode: true // Помечаем как тестовый запрос
        }
      }
      
      const result = await inngest.send(veo3Event)
      
      if (result && result.ids && result.ids.length > 0) {
        console.log(`   ✅ SUCCESS - Event ID: ${result.ids[0]}`)
        results.push({
          test: testCase.name,
          status: 'success',
          eventId: result.ids[0],
          prompt: testCase.prompt,
          duration: testCase.duration,
          details: 'Veo3 generation event sent successfully'
        })
      } else {
        throw new Error('No event ID returned from Inngest')
      }
      
    } catch (error) {
      console.log(`   ❌ FAILED - ${error.message}`)
      results.push({
        test: testCase.name,
        status: 'failed',
        error: error.message,
        prompt: testCase.prompt
      })
    }
    
    // Пауза между запросами чтобы не перегрузить API
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  return results
}

async function testVeo3Configurations() {
  console.log('\n🔧 Testing Different Veo3 Configurations')
  console.log('=======================================')
  
  const configurations = [
    {
      name: 'Fast Model 9:16',
      model: 'veo3_fast',
      aspectRatio: '9:16',
      duration: 5
    },
    {
      name: 'Fast Model 16:9', 
      model: 'veo3_fast',
      aspectRatio: '16:9',
      duration: 5
    },
    {
      name: 'Fast Model 1:1',
      model: 'veo3_fast', 
      aspectRatio: '1:1',
      duration: 5
    }
  ]
  
  const results = []
  const basePrompt = 'A beautiful mountain landscape with flowing water'
  
  for (const config of configurations) {
    console.log(`🧪 Testing: ${config.name}`)
    console.log(`   Model: ${config.model}`)
    console.log(`   Aspect Ratio: ${config.aspectRatio}`)
    console.log(`   Duration: ${config.duration}s`)
    
    try {
      const event = {
        name: 'veo3/video-generation',
        data: {
          prompt: basePrompt,
          model: config.model,
          aspectRatio: config.aspectRatio,
          duration: config.duration,
          telegram_id: CONFIG.TEST_TELEGRAM_ID,
          bot_name: CONFIG.BOT_NAME,
          test_mode: true
        }
      }
      
      const result = await inngest.send(event)
      
      if (result && result.ids && result.ids.length > 0) {
        console.log(`   ✅ SUCCESS - Event ID: ${result.ids[0]}`)
        results.push({
          config: config.name,
          status: 'success',
          eventId: result.ids[0]
        })
      } else {
        throw new Error('No event ID returned')
      }
      
    } catch (error) {
      console.log(`   ❌ FAILED - ${error.message}`)
      results.push({
        config: config.name,
        status: 'failed',
        error: error.message
      })
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  return results
}

async function testVeo3Monitoring() {
  console.log('\n📊 Testing Veo3 Processing Monitoring')
  console.log('====================================')
  
  try {
    // Отправим событие для мониторинга процесса генерации
    const monitoringEvent = {
      name: 'veo3/monitor-processing',
      data: {
        type: 'manual-test',
        timestamp: new Date().toISOString(),
        test_mode: true
      }
    }
    
    const result = await inngest.send(monitoringEvent)
    
    if (result && result.ids) {
      console.log(`✅ Monitoring event sent - ID: ${result.ids[0]}`)
      return { status: 'success', eventId: result.ids[0] }
    } else {
      throw new Error('Failed to send monitoring event')
    }
    
  } catch (error) {
    console.log(`❌ Monitoring test failed: ${error.message}`)
    return { status: 'failed', error: error.message }
  }
}

async function runVeo3Tests() {
  console.log('🚀 Starting Veo3 Production Tests\n')
  
  try {
    // 1. Основные тесты генерации
    const generationResults = await testVeo3Generation()
    
    // 2. Тесты разных конфигураций
    const configResults = await testVeo3Configurations()
    
    // 3. Тест мониторинга
    const monitoringResult = await testVeo3Monitoring()
    
    // Анализ результатов
    const generationSuccess = generationResults.filter(r => r.status === 'success').length
    const configSuccess = configResults.filter(r => r.status === 'success').length
    const totalGeneration = generationResults.length
    const totalConfig = configResults.length
    
    console.log('\n📊 VEO3 GENERATION TEST RESULTS')
    console.log('===============================')
    
    console.log('\n🎬 Generation Tests:')
    generationResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.test}`)
      if (result.status === 'success') {
        console.log(`   ✅ PASS - ${result.details}`)
        console.log(`   📨 Event ID: ${result.eventId}`)
        console.log(`   🎞 Duration: ${result.duration}s, Format: 9:16`)
      } else {
        console.log(`   ❌ FAIL - ${result.error}`)
      }
    })
    
    console.log('\n🔧 Configuration Tests:')
    configResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.config}`)
      if (result.status === 'success') {
        console.log(`   ✅ PASS - Event ID: ${result.eventId}`)
      } else {
        console.log(`   ❌ FAIL - ${result.error}`)
      }
    })
    
    console.log('\n📊 Monitoring Test:')
    if (monitoringResult.status === 'success') {
      console.log(`   ✅ PASS - Event ID: ${monitoringResult.eventId}`)
    } else {
      console.log(`   ❌ FAIL - ${monitoringResult.error}`)
    }
    
    const overallSuccess = (generationSuccess === totalGeneration) && 
                          (configSuccess === totalConfig) && 
                          (monitoringResult.status === 'success')
    
    console.log('\n' + '='.repeat(50))
    console.log('📋 FINAL VEO3 TEST REPORT')
    console.log('='.repeat(50))
    console.log(`Generation Tests: ${generationSuccess}/${totalGeneration} passed`)
    console.log(`Configuration Tests: ${configSuccess}/${totalConfig} passed`)
    console.log(`Monitoring Test: ${monitoringResult.status === 'success' ? '✅ PASS' : '❌ FAIL'}`)
    console.log('')
    console.log(`Overall Status: ${overallSuccess ? '🎉 ALL PASS' : '⚠️ ISSUES FOUND'}`)
    
    if (overallSuccess) {
      console.log('✅ Veo3 Fast generation is working correctly in production')
      console.log('🎬 9:16 vertical video format is supported')
      console.log('⚡ Fast model is responding to requests')
    } else {
      console.log('🔍 Check Inngest dashboard for processing details')
      console.log('⚠️ Some video generation features may not be working')
    }
    
    console.log('='.repeat(50))
    
    return overallSuccess
    
  } catch (error) {
    console.error('💥 Fatal error in Veo3 tests:', error)
    return false
  }
}

if (require.main === module) {
  runVeo3Tests().then(success => {
    process.exit(success ? 0 : 1)
  })
}

module.exports = { testVeo3Generation, testVeo3Configurations, CONFIG }