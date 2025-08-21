#!/usr/bin/env node

// Устанавливаем необходимые переменные окружения
process.env.NODE_ENV = 'production'
process.env.SUPABASE_URL = 'https://yuukfqcsdhkyxegfwlcb.supabase.co'
process.env.SUPABASE_SERVICE_KEY = 'test_key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_role_key'
process.env.SECRET_KEY = 'test_secret'
process.env.SECRET_API_KEY = 'test_api_secret'
process.env.SYNC_LABS_API_KEY = 'test_sync_labs'
process.env.NEXT_PUBLIC_MANAGEMENT_TOKEN = 'test_management_token'
process.env.NEXRENDER_PORT = '4001'
process.env.AERENDER_PATH = '/test/path'
process.env.BOT_TOKEN_1 = 'test_token_1'
process.env.BOT_TOKEN_2 = 'test_token_2'
process.env.BOT_TOKEN_3 = 'test_token_3'
process.env.BOT_TOKEN_4 = 'test_token_4'
process.env.BOT_TOKEN_5 = 'test_token_5'
process.env.BOT_TOKEN_6 = 'test_token_6'
process.env.BOT_TOKEN_7 = 'test_token_7'
process.env.BOT_TOKEN_8 = 'test_token_8'
process.env.BOT_TOKEN_TEST_1 = 'test_token_test_1'
process.env.BOT_TOKEN_TEST_2 = 'test_token_test_2'

console.log('🔍 Тестирование расчета стоимости тренировки модели')
console.log('================================================')

// Импортируем функции расчета стоимости
const { calculateModeCost } = require('../dist/price/helpers/modelsCost.js')
const { ModeEnum } = require('../dist/interfaces/modes.js')

// Тестируем расчет для DigitalAvatarBody с 1000 шагов
const testParams = {
  mode: ModeEnum.DigitalAvatarBody,
  steps: 1000,
}

console.log('📊 Параметры теста:')
console.log('Mode:', testParams.mode)
console.log('Steps:', testParams.steps)

try {
  const result = calculateModeCost(testParams)

  console.log('\n💰 Результат расчета:')
  console.log('Stars:', result.stars)
  console.log('Dollars:', result.dollars)
  console.log('Rubles:', result.rubles)

  console.log('\n🔍 Анализ:')
  console.log('Ожидаемая стоимость (1000 × 0.22):', 1000 * 0.22, 'звезд')
  console.log('Фактическая стоимость:', result.stars, 'звезд')
  console.log('Разница:', result.stars - 1000 * 0.22, 'звезд')

  if (result.stars > 1000) {
    console.log('❌ ПРОБЛЕМА: Стоимость слишком высокая!')
  } else {
    console.log('✅ Стоимость в пределах нормы')
  }
} catch (error) {
  console.error('❌ Ошибка при расчете:', error.message)
}

console.log('\n✅ Тест завершен!')
