/**
 * Анализ входящих цен (себестоимости) vs конкурент
 */

// ВХОДЯЩИЕ ЦЕНЫ (себестоимость через Kie.ai)
const OUR_COST_PRICES = {
  'veo-3-fast': 0.05,    // $0.05 за секунду
  'veo-3-quality': 0.25, // $0.25 за секунду
}

// Курс доллара
const USD_TO_RUB = 85

// Конкурент Synx - ПРОДАЖНАЯ цена (с их наценкой)
const SYNX_SELLING_PRICE = {
  duration: 8,
  price_rub: 45,
  price_usd: 45 / USD_TO_RUB,
  price_per_second_usd: (45 / USD_TO_RUB) / 8
}

console.log('💰 АНАЛИЗ ВХОДЯЩИХ ЦЕН (СЕБЕСТОИМОСТЬ)')
console.log('=' * 50)

console.log('\n🏪 SYNX (их ПРОДАЖНАЯ цена):')
console.log(`   • 8 секунд = ${SYNX_SELLING_PRICE.price_rub}₽`)
console.log(`   • За секунду = $${SYNX_SELLING_PRICE.price_per_second_usd.toFixed(3)} (${(SYNX_SELLING_PRICE.price_per_second_usd * USD_TO_RUB).toFixed(1)}₽)`)

console.log('\n🚀 НАШИ ВХОДЯЩИЕ ЦЕНЫ (себестоимость через Kie.ai):')

// Veo-3 Fast
const ourFastCost8sec = OUR_COST_PRICES['veo-3-fast'] * 8
const ourFastCostRub8sec = ourFastCost8sec * USD_TO_RUB

console.log(`\n   🔥 VEO-3 FAST (себестоимость):`)
console.log(`      • За секунду: $${OUR_COST_PRICES['veo-3-fast']} (${(OUR_COST_PRICES['veo-3-fast'] * USD_TO_RUB).toFixed(1)}₽)`)
console.log(`      • 8 секунд: $${ourFastCost8sec} = ${ourFastCostRub8sec.toFixed(0)}₽`)

// Veo-3 Quality  
const ourQualityCost8sec = OUR_COST_PRICES['veo-3-quality'] * 8
const ourQualityCostRub8sec = ourQualityCost8sec * USD_TO_RUB

console.log(`\n   💎 VEO-3 QUALITY (себестоимость):`)
console.log(`      • За секунду: $${OUR_COST_PRICES['veo-3-quality']} (${(OUR_COST_PRICES['veo-3-quality'] * USD_TO_RUB).toFixed(1)}₽)`)
console.log(`      • 8 секунд: $${ourQualityCost8sec} = ${ourQualityCostRub8sec.toFixed(0)}₽`)

console.log('\n📊 СРАВНЕНИЕ ВХОДЯЩИХ ЦЕН с продажной ценой Synx:')
console.log('=' * 60)

// Сравнение Fast
const fastAdvantage = ((SYNX_SELLING_PRICE.price_rub - ourFastCostRub8sec) / SYNX_SELLING_PRICE.price_rub * 100)
const fastMargin = SYNX_SELLING_PRICE.price_rub - ourFastCostRub8sec

console.log(`🔥 Veo-3 Fast (себестоимость) vs Synx (продажная):`)
console.log(`   ✅ НАША СЕБЕСТОИМОСТЬ ДЕШЕВЛЕ их продажной цены на ${fastAdvantage.toFixed(1)}%`)
console.log(`   💰 Маржа: ${fastMargin.toFixed(0)}₽ (${ourFastCostRub8sec}₽ себест. vs ${SYNX_SELLING_PRICE.price_rub}₽ у них)`)

// Сравнение Quality
const qualityAdvantage = ((SYNX_SELLING_PRICE.price_rub - ourQualityCostRub8sec) / SYNX_SELLING_PRICE.price_rub * 100)
const qualityMargin = SYNX_SELLING_PRICE.price_rub - ourQualityCostRub8sec

console.log(`\n💎 Veo-3 Quality (себестоимость) vs Synx (продажная):`)
if (qualityAdvantage > 0) {
  console.log(`   ✅ НАША СЕБЕСТОИМОСТЬ ДЕШЕВЛЕ их продажной цены на ${qualityAdvantage.toFixed(1)}%`)
  console.log(`   💰 Маржа: ${qualityMargin.toFixed(0)}₽ (${ourQualityCostRub8sec}₽ себест. vs ${SYNX_SELLING_PRICE.price_rub}₽ у них)`)
} else {
  console.log(`   ❌ НАША СЕБЕСТОИМОСТЬ ДОРОЖЕ их продажной цены на ${Math.abs(qualityAdvantage).toFixed(1)}%`)
  console.log(`   💸 Убыток: ${Math.abs(qualityMargin).toFixed(0)}₽ (${ourQualityCostRub8sec}₽ себест. vs ${SYNX_SELLING_PRICE.price_rub}₽ у них)`)
}

console.log('\n🎯 ВОЗМОЖНЫЕ ПРОДАЖНЫЕ ЦЕНЫ (с маржой):')
console.log('=' * 50)

// Варианты наценок для Fast
console.log(`🔥 Veo-3 Fast (себестоимость ${ourFastCostRub8sec}₽):`)

const margins = [1.2, 1.3, 1.5, 2.0]
margins.forEach(margin => {
  const sellingPrice = ourFastCostRub8sec * margin
  const vsSync = ((SYNX_SELLING_PRICE.price_rub - sellingPrice) / SYNX_SELLING_PRICE.price_rub * 100)
  const status = vsSync > 0 ? '✅ дешевле' : '❌ дороже'
  console.log(`   • Наценка ${((margin - 1) * 100).toFixed(0)}%: ${sellingPrice.toFixed(0)}₽ (${status} Synx на ${Math.abs(vsSync).toFixed(1)}%)`)
})

console.log('\n🏆 ВЫВОД:')
console.log(`✅ Наша ВХОДЯЩАЯ цена Veo-3 Fast ($${OUR_COST_PRICES['veo-3-fast']}) в ${(SYNX_SELLING_PRICE.price_per_second_usd / OUR_COST_PRICES['veo-3-fast']).toFixed(1)}x раза дешевле Synx!`)
console.log(`💰 Огромная маржа для конкурентных цен: до ${fastMargin.toFixed(0)}₽ прибыли с 8 сек`)
console.log(`🎯 Можем продавать по 35-40₽ и быть дешевле Synx с хорошей прибылью!`)