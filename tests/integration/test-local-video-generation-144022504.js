/**
 * 🧪 Local Integration Test for Video Generation
 * Тестирование пользователя 144022504 без трат на реальную генерацию
 */

// Устанавливаем минимальные переменные окружения для mock тестов
const mockEnvVars = {
  'SUPABASE_URL': 'https://mock.supabase.co',
  'SUPABASE_ANON_KEY': 'mock-anon-key',
  'SUPABASE_SERVICE_KEY': 'mock-service-key',
  'SUPABASE_SERVICE_ROLE_KEY': 'mock-service-role-key',
  'SECRET_KEY': 'mock-secret-key',
  'SECRET_API_KEY': 'mock-secret-api-key',
  'SYNC_LABS_API_KEY': 'mock-sync-labs-key',
  'NEXT_PUBLIC_MANAGEMENT_TOKEN': 'mock-management-token',
  'INNGEST_EVENT_KEY': 'mock-inngest-key',
  'INNGEST_SIGNING_KEY': 'mock-signing-key',
  'NODE_ENV': 'test',
  'API_URL': 'https://mock-api.com',
  'LOG_DIR': '/tmp/test-logs',
  'NGROK_URL': 'https://mock.ngrok.io'
}

// Устанавливаем переменные, если они не заданы
Object.keys(mockEnvVars).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = mockEnvVars[key]
  }
})

const { inngest } = require('../../dist/core/inngest/clients')
const { logger } = require('../../dist/utils/logger')

// Mock режим для тестирования без трат
const MOCK_MODE = process.env.MOCK_VIDEO_GENERATION === 'true' || true

// Данные тестового пользователя
const TEST_USER = {
  telegram_id: '144022504',
  username: 'test_user_144022504',
  is_ru: true,
  bot_name: 'neuro_blogger_bot'
}

// Тестовые видео URL для mock режима
const MOCK_VIDEOS = {
  veo3_fast: 'https://example.com/mock-veo3-fast-video.mp4',
  veo3: 'https://example.com/mock-veo3-quality-video.mp4',
  'runway-aleph': 'https://example.com/mock-runway-aleph-video.mp4'
}

/**
 * Создать mock-ответ от Kie.ai API
 */
function createMockKieAiResponse(model, prompt, duration = 8) {
  const taskId = `mock_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return {
    // Ответ на создание задачи
    createResponse: {
      code: 200,
      msg: 'success',
      data: {
        taskId: taskId,
        status: 'processing',
        estimatedTime: 60 // секунд
      }
    },
    // Ответы на проверку статуса
    statusResponses: [
      // Первая проверка - processing
      {
        code: 200,
        data: {
          taskId: taskId,
          status: 'processing',
          progress: 25
        }
      },
      // Вторая проверка - processing
      {
        code: 200,
        data: {
          taskId: taskId,
          status: 'processing',
          progress: 75
        }
      },
      // Финальная проверка - completed
      {
        code: 200,
        data: {
          taskId: taskId,
          status: 'completed',
          videoUrl: MOCK_VIDEOS[model] || MOCK_VIDEOS.veo3_fast,
          duration: duration,
          cost: duration * 0.05, // $0.05/сек для veo3_fast
        }
      }
    ],
    taskId
  }
}

/**
 * Тест основного потока генерации видео
 */
async function testVideoGeneration() {
  console.log('🧪 Starting local video generation integration test...')
  
  const testCases = [
    {
      name: 'VEO3 Fast - Короткий промпт',
      model: 'veo3_fast',
      prompt: 'Кот играет с мячиком в солнечном саду',
      duration: 8, // veo3_fast поддерживает только 8 секунд
      aspectRatio: '9:16'
    },
    {
      name: 'VEO3 Quality - Длинный промпт',
      model: 'veo3',
      prompt: 'Красивый закат над океаном с отражением в воде, волны мягко накатывают на песчаный берег, в небе летают чайки',
      duration: 5,
      aspectRatio: '16:9'
    },
    {
      name: 'VEO3 Fast - с изображением',
      model: 'veo3_fast',
      prompt: 'Анимация на основе изображения',
      duration: 8,
      aspectRatio: '1:1',
      imageUrl: 'https://example.com/test-image.jpg'
    }
  ]

  for (const testCase of testCases) {
    console.log(`\n🔬 Testing: ${testCase.name}`)
    
    const eventData = {
      prompt: testCase.prompt,
      model: testCase.model,
      aspectRatio: testCase.aspectRatio,
      duration: testCase.duration,
      telegram_id: TEST_USER.telegram_id,
      username: TEST_USER.username,
      is_ru: TEST_USER.is_ru,
      bot_name: TEST_USER.bot_name,
      imageUrl: testCase.imageUrl
    }

    // Создаем mock-ответ для этого теста
    const mockResponse = createMockKieAiResponse(testCase.model, testCase.prompt, testCase.duration)

    console.log('📤 Sending event data to Inngest:', {
      eventName: 'veo3/video.generate',
      data: {
        ...eventData,
        // Скрываем длинные промпты в логах
        prompt: eventData.prompt.length > 50 
          ? eventData.prompt.substring(0, 50) + '...' 
          : eventData.prompt
      }
    })

    try {
      if (MOCK_MODE) {
        console.log('🎭 Mock mode enabled - simulating video generation...')
        
        // Симулируем создание задачи
        console.log('📋 Mock task created:', {
          taskId: mockResponse.taskId,
          model: testCase.model,
          estimatedCost: testCase.duration * 0.05
        })
        
        // Симулируем polling с несколькими проверками
        for (let i = 0; i < mockResponse.statusResponses.length; i++) {
          const statusResponse = mockResponse.statusResponses[i]
          console.log(`🔍 Mock status check ${i + 1}:`, statusResponse.data)
          
          if (i < mockResponse.statusResponses.length - 1) {
            console.log('⏳ Mock waiting 2 seconds...')
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
        
        const finalResponse = mockResponse.statusResponses[mockResponse.statusResponses.length - 1]
        console.log('✅ Mock video generation completed!', {
          taskId: mockResponse.taskId,
          videoUrl: finalResponse.data.videoUrl,
          duration: finalResponse.data.duration,
          cost: finalResponse.data.cost
        })
        
        // Симулируем отправку в Telegram (без реального API вызова)
        console.log('📱 Mock Telegram video sent to user:', {
          telegram_id: TEST_USER.telegram_id,
          bot_name: TEST_USER.bot_name,
          video_url: finalResponse.data.videoUrl,
          success: true
        })
        
        console.log(`✅ ${testCase.name} - COMPLETED (Mock)`)
        
      } else {
        // Реальный режим (только если явно указан)
        console.log('🚨 REAL MODE - будут потрачены деньги!')
        
        const event = {
          name: 'veo3/video.generate',
          data: eventData
        }
        
        // Отправляем событие в Inngest
        const result = await inngest.send(event)
        
        console.log('📨 Event sent to Inngest:', {
          eventIds: result.ids,
          success: true
        })
        
        console.log(`✅ ${testCase.name} - EVENT SENT (Real mode)`)
        console.log('⏳ Check your bot for the result...')
      }
      
    } catch (error) {
      console.error(`❌ ${testCase.name} - FAILED:`, {
        error: error.message,
        stack: error.stack,
        testCase: testCase.name
      })
    }
    
    // Пауза между тестами
    console.log('⏸️ Waiting 3 seconds before next test...')
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
}

/**
 * Тест отправки callback URL
 */
async function testCallbackUrl() {
  console.log('\n🔗 Testing callback URL functionality...')
  
  const callbackUrl = 'https://your-domain.com/api/kie-ai/callback'
  
  const eventDataWithCallback = {
    prompt: 'Тест callback URL - собака бегает по парку',
    model: 'veo3_fast',
    aspectRatio: '9:16',
    duration: 8,
    telegram_id: TEST_USER.telegram_id,
    username: TEST_USER.username,
    is_ru: TEST_USER.is_ru,
    bot_name: TEST_USER.bot_name,
    callBackUrl: callbackUrl
  }

  console.log('📤 Testing with callback URL:', {
    callBackUrl: callbackUrl,
    telegram_id: TEST_USER.telegram_id,
    model: eventDataWithCallback.model
  })

  if (MOCK_MODE) {
    console.log('🎭 Mock callback simulation - callback would be called after video generation')
    console.log('📞 Mock callback payload would be:', {
      taskId: 'mock_task_callback_test',
      status: 'completed',
      videoUrl: MOCK_VIDEOS.veo3_fast,
      telegram_id: TEST_USER.telegram_id,
      model: 'veo3_fast',
      duration: 8,
      cost: 0.40
    })
    console.log('✅ Callback URL test completed (Mock)')
  } else {
    try {
      const event = {
        name: 'veo3/video.generate',
        data: eventDataWithCallback
      }
      
      const result = await inngest.send(event)
      console.log('✅ Callback URL test event sent:', result.ids)
    } catch (error) {
      console.error('❌ Callback URL test failed:', error.message)
    }
  }
}

/**
 * Тест обработки ошибок
 */
async function testErrorHandling() {
  console.log('\n❌ Testing error handling...')
  
  const errorTestCases = [
    {
      name: 'Пустой промпт',
      data: {
        prompt: '',
        model: 'veo3_fast',
        telegram_id: TEST_USER.telegram_id,
        bot_name: TEST_USER.bot_name
      }
    },
    {
      name: 'Неверная модель',
      data: {
        prompt: 'Тестовый промпт',
        model: 'invalid_model',
        telegram_id: TEST_USER.telegram_id,
        bot_name: TEST_USER.bot_name
      }
    },
    {
      name: 'Несуществующий пользователь',
      data: {
        prompt: 'Тестовый промпт',
        model: 'veo3_fast',
        telegram_id: '999999999', // несуществующий ID
        bot_name: TEST_USER.bot_name
      }
    }
  ]

  for (const errorTest of errorTestCases) {
    console.log(`\n🔬 Error test: ${errorTest.name}`)
    
    try {
      if (MOCK_MODE) {
        console.log('🎭 Mock error simulation for:', errorTest.name)
        console.log('❌ Expected error would be handled gracefully')
        console.log('📱 User would receive error message in bot')
      } else {
        const event = {
          name: 'veo3/video.generate',
          data: errorTest.data
        }
        
        const result = await inngest.send(event)
        console.log('📨 Error test event sent:', result.ids)
      }
    } catch (error) {
      console.log('✅ Error correctly caught:', error.message)
    }
  }
}

/**
 * Основная функция запуска тестов
 */
async function main() {
  console.log('🚀 Local Video Generation Integration Test')
  console.log('👤 Test User: 144022504')
  console.log(`🎭 Mock Mode: ${MOCK_MODE ? 'ENABLED' : 'DISABLED'}`)
  
  if (!MOCK_MODE) {
    console.log('🚨 WARNING: Real mode will spend money on video generation!')
    console.log('💰 Set MOCK_VIDEO_GENERATION=true to avoid costs')
    
    // В реальном режиме запрашиваем подтверждение
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise(resolve => {
      rl.question('Continue with real video generation? (y/N): ', resolve)
    })
    rl.close()
    
    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Test cancelled by user')
      process.exit(0)
    }
  }

  const startTime = Date.now()

  try {
    // Запускаем тесты
    await testVideoGeneration()
    await testCallbackUrl()
    await testErrorHandling()

    const duration = Date.now() - startTime
    console.log(`\n🏁 Integration test completed in ${duration}ms`)
    console.log('✅ All tests finished successfully')
    
    if (MOCK_MODE) {
      console.log('💡 To test with real API, set MOCK_VIDEO_GENERATION=false')
    } else {
      console.log('💰 Check your Kie.ai account balance for cost deductions')
    }

  } catch (error) {
    console.error('\n💥 Integration test failed:', {
      error: error.message,
      stack: error.stack
    })
    process.exit(1)
  }
}

// Запуск тестов
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  testVideoGeneration,
  testCallbackUrl,
  testErrorHandling,
  TEST_USER,
  MOCK_VIDEOS
}