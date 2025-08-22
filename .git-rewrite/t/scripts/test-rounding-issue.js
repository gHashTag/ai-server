const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Импортируем функции для тестирования
const {
  calculateFinalImageCostInStars,
} = require('../src/price/helpers/calculateFinalImageCostInStars')
const { starCost, interestRate } = require('../src/price/helpers/modelsCost')

console.log('🔍 ТЕСТ: Проблема округления в calculateFinalImageCostInStars\n')

console.log('📊 Текущие параметры:')
console.log(`   starCost: ${starCost}`)
console.log(`   interestRate: ${interestRate}`)
console.log('')

// Тестовые случаи, которые могут вызвать проблему округления
const testCases = [
  { baseCost: 0.12, description: 'TextToSpeech базовая стоимость' },
  { baseCost: 0.08, description: 'NeuroPhoto базовая стоимость' },
  { baseCost: 0.14, description: 'NeuroPhotoV2 базовая стоимость' },
  { baseCost: 0.055, description: 'FLUX1.1 pro базовая стоимость' },
  { baseCost: 0.06, description: 'FLUX1.1 pro Ultra базовая стоимость' },
]

console.log('🧪 ТЕСТИРОВАНИЕ ОКРУГЛЕНИЯ:\n')

testCases.forEach(testCase => {
  const { baseCost, description } = testCase

  // Ручной расчет для демонстрации
  const finalCostInDollars = baseCost * (1 + interestRate)
  const exactStars = finalCostInDollars / starCost
  const ceilResult = Math.ceil(exactStars)
  const floorResult = Math.floor(exactStars)
  const roundResult = Math.round(exactStars)

  // Результат текущей функции
  const currentResult = calculateFinalImageCostInStars(baseCost)

  console.log(`📝 ${description}:`)
  console.log(`   Базовая стоимость: $${baseCost}`)
  console.log(`   С наценкой: $${finalCostInDollars.toFixed(4)}`)
  console.log(`   Точное значение в звездах: ${exactStars.toFixed(4)}⭐`)
  console.log(`   Math.ceil (текущий): ${ceilResult}⭐`)
  console.log(`   Math.floor: ${floorResult}⭐`)
  console.log(`   Math.round: ${roundResult}⭐`)
  console.log(`   Текущий результат функции: ${currentResult}⭐`)

  if (exactStars % 1 !== 0) {
    const overcharge = ceilResult - exactStars
    const undercharge = exactStars - floorResult
    console.log(
      `   🚨 ПРОБЛЕМА: Переплата ${overcharge.toFixed(
        4
      )}⭐ при использовании Math.ceil`
    )
    console.log(
      `   💡 Экономия ${undercharge.toFixed(4)}⭐ при использовании Math.floor`
    )
  }
  console.log('')
})

console.log('💡 РЕКОМЕНДАЦИИ:\n')
console.log(
  '1. 🔧 Заменить Math.ceil на Math.floor в calculateFinalImageCostInStars'
)
console.log('2. 🎯 Это устранит переплаты пользователей')
console.log(
  '3. 📊 Будет соответствовать логике calculateFinalPrice (которая уже использует Math.floor)'
)
console.log('4. ⚖️ Справедливое округление в пользу пользователя')

console.log('\n🔧 ПРЕДЛАГАЕМОЕ ИСПРАВЛЕНИЕ:')
console.log('```typescript')
console.log(
  'export function calculateFinalImageCostInStars(baseCost: number): number {'
)
console.log('  const finalCostInDollars = baseCost * (1 + interestRate)')
console.log(
  '  return Math.floor(finalCostInDollars / starCost) // ← ИЗМЕНЕНО: ceil → floor'
)
console.log('}')
console.log('```')
