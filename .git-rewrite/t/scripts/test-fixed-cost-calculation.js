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

console.log('🔍 Тестирование исправленного расчета стоимости')
console.log('==============================================')

// Импортируем функции расчета стоимости
const { calculateModeCost } = require('../dist/price/helpers/modelsCost.js')
const { ModeEnum } = require('../dist/interfaces/modes.js')

// Тестовые случаи
const testCases = [
  {
    name: 'DigitalAvatarBody - 1000 шагов',
    params: { mode: ModeEnum.DigitalAvatarBody, steps: 1000 },
    expected: 220, // 1000 * 0.22
  },
  {
    name: 'DigitalAvatarBody - 500 шагов',
    params: { mode: ModeEnum.DigitalAvatarBody, steps: 500 },
    expected: 110, // 500 * 0.22
  },
  {
    name: 'NeuroPhoto - фиксированная стоимость',
    params: { mode: ModeEnum.NeuroPhoto },
    expected: 7.5, // calculateFinalStarCostFromDollars(0.08) = (0.08 / 0.016) * 1.5 = 7.5
  },
]

console.log('📊 Запуск тестов...\n')

let allTestsPassed = true

for (const testCase of testCases) {
  try {
    const result = calculateModeCost(testCase.params)

    console.log(`🧪 ${testCase.name}:`)
    console.log(`   Параметры: ${JSON.stringify(testCase.params)}`)
    console.log(`   Ожидаемо: ${testCase.expected} звезд`)
    console.log(`   Получено: ${result.stars} звезд`)

    if (Math.abs(result.stars - testCase.expected) < 0.01) {
      console.log(`   ✅ ПРОЙДЕН`)
    } else {
      console.log(
        `   ❌ ПРОВАЛЕН - разница: ${result.stars - testCase.expected}`
      )
      allTestsPassed = false
    }
    console.log()
  } catch (error) {
    console.error(`❌ Ошибка в тесте "${testCase.name}":`, error.message)
    allTestsPassed = false
  }
}

console.log('📋 Результат тестирования:')
if (allTestsPassed) {
  console.log('✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Расчет стоимости работает корректно.')
} else {
  console.log(
    '❌ НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ! Требуется дополнительная проверка.'
  )
}

console.log('\n🎯 Проверка реального случая из БД:')
console.log('Запись из БД: 25,425 звезд за 1000 шагов')
console.log('Правильная стоимость: 220 звезд за 1000 шагов')
console.log('Переплата составляла:', 25425 - 220, 'звезд')
console.log('Коэффициент ошибки:', (25425 / 220).toFixed(2) + 'x')

console.log('\n✅ Тест завершен!')
