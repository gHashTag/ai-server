console.log('🔍 ТЕСТ: Проблема округления в calculateFinalImageCostInStars\n')

// Константы из системы (из src/price/helpers/modelsCost.ts)
const starCost = 0.016 // стоимость одной звезды в долларах
const interestRate = 0.5 // наценка 50%

console.log('📊 Текущие параметры:')
console.log(`   starCost: $${starCost}`)
console.log(`   interestRate: ${interestRate} (${interestRate * 100}%)`)
console.log('')

// Функция как она есть сейчас (с Math.ceil)
function calculateFinalImageCostInStars_CURRENT(baseCost) {
  const finalCostInDollars = baseCost * (1 + interestRate)
  return Math.ceil(finalCostInDollars / starCost)
}

// Предлагаемая функция (с Math.floor)
function calculateFinalImageCostInStars_FIXED(baseCost) {
  const finalCostInDollars = baseCost * (1 + interestRate)
  return Math.floor(finalCostInDollars / starCost)
}

// Тестовые случаи, которые могут вызвать проблему округления
const testCases = [
  { baseCost: 0.12, description: 'TextToSpeech базовая стоимость' },
  { baseCost: 0.08, description: 'NeuroPhoto базовая стоимость' },
  { baseCost: 0.14, description: 'NeuroPhotoV2 базовая стоимость' },
  { baseCost: 0.055, description: 'FLUX1.1 pro базовая стоимость' },
  { baseCost: 0.06, description: 'FLUX1.1 pro Ultra базовая стоимость' },
  { baseCost: 0.05, description: 'FLUX1.1 dev базовая стоимость' },
  { baseCost: 0.025, description: 'FLUX1.1 Depth базовая стоимость' },
]

console.log('🧪 ТЕСТИРОВАНИЕ ОКРУГЛЕНИЯ:\n')

let totalOvercharge = 0
let problemCases = 0

testCases.forEach(testCase => {
  const { baseCost, description } = testCase

  // Ручной расчет для демонстрации
  const finalCostInDollars = baseCost * (1 + interestRate)
  const exactStars = finalCostInDollars / starCost

  const currentResult = calculateFinalImageCostInStars_CURRENT(baseCost)
  const fixedResult = calculateFinalImageCostInStars_FIXED(baseCost)

  console.log(`📝 ${description}:`)
  console.log(`   Базовая стоимость: $${baseCost}`)
  console.log(`   С наценкой: $${finalCostInDollars.toFixed(4)}`)
  console.log(`   Точное значение в звездах: ${exactStars.toFixed(4)}⭐`)
  console.log(`   Текущий результат (Math.ceil): ${currentResult}⭐`)
  console.log(`   Исправленный результат (Math.floor): ${fixedResult}⭐`)

  if (exactStars % 1 !== 0) {
    const overcharge = currentResult - exactStars
    const savings = currentResult - fixedResult
    console.log(
      `   🚨 ПРОБЛЕМА: Переплата ${overcharge.toFixed(
        4
      )}⭐ при использовании Math.ceil`
    )
    console.log(`   💰 ЭКОНОМИЯ: ${savings}⭐ при использовании Math.floor`)
    totalOvercharge += overcharge
    problemCases++
  } else {
    console.log(`   ✅ Точное значение, округление не влияет`)
  }
  console.log('')
})

console.log('📊 ИТОГОВАЯ СТАТИСТИКА:\n')
console.log(`   Проблемных случаев: ${problemCases}/${testCases.length}`)
console.log(`   Общая переплата: ${totalOvercharge.toFixed(4)}⭐`)
console.log(
  `   Средняя переплата на случай: ${(totalOvercharge / problemCases).toFixed(
    4
  )}⭐`
)

console.log('\n💡 РЕКОМЕНДАЦИИ:\n')
console.log(
  '1. 🔧 Заменить Math.ceil на Math.floor в calculateFinalImageCostInStars'
)
console.log('2. 🎯 Это устранит переплаты пользователей')
console.log(
  '3. 📊 Будет соответствовать логике calculateFinalPrice (которая уже использует Math.floor)'
)
console.log('4. ⚖️ Справедливое округление в пользу пользователя')
console.log('5. 💰 Пользователи будут экономить на каждой операции')

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

console.log('\n🎯 ПРИМЕР КОНКРЕТНОЙ ПРОБЛЕМЫ:')
const exampleCost = 0.12 // TextToSpeech
const exampleFinalCost = exampleCost * (1 + interestRate)
const exampleExactStars = exampleFinalCost / starCost
console.log(
  `   TextToSpeech: $${exampleCost} → $${exampleFinalCost} → ${exampleExactStars.toFixed(
    4
  )}⭐`
)
console.log(
  `   Math.ceil: ${Math.ceil(exampleExactStars)}⭐ (переплата ${(
    Math.ceil(exampleExactStars) - exampleExactStars
  ).toFixed(4)}⭐)`
)
console.log(`   Math.floor: ${Math.floor(exampleExactStars)}⭐ (справедливо)`)
console.log(`   Это и есть ваш случай: 7.5⭐ → 8⭐!`)
