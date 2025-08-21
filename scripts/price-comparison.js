/**
 * Сравнение цен с конкурентом Synx
 */

// Наши цены на Veo-3
const OUR_PRICES = {
  'veo-3-fast': {
    pricePerSecond: 0.05, // USD
    title: 'Veo-3 Fast'
  },
  'veo-3-quality': {
    pricePerSecond: 0.25, // USD  
    title: 'Veo-3 Quality'
  }
}

// Курс и константы
const USD_TO_RUB = 85 // текущий курс
const STAR_COST_USD = 0.016 // стоимость звезды в USD
const MARKUP_RATE = 1.5 // наша наценка 50%

// Конкурент Synx
const SYNX_PRICE = {
  duration: 8, // секунд
  price_rub: 45, // рублей
  price_usd: 45 / USD_TO_RUB // в долларах
}

console.log('💰 СРАВНЕНИЕ ЦЕН: МЫ vs SYNX (8 секунд, Veo-3)')
console.log('=' * 60)

console.log('\n🏪 КОНКУРЕНТ (Synx):')
console.log(`   • 8 секунд = ${SYNX_PRICE.price_rub}₽`)
console.log(`   • В долларах = $${SYNX_PRICE.price_usd.toFixed(2)}`)
console.log(`   • Цена за секунду = $${(SYNX_PRICE.price_usd / 8).toFixed(3)}`)

console.log('\n🚀 НАШИ ЦЕНЫ (через Kie.ai):')

// Veo-3 Fast
const veoFast8sec = {
  baseUSD: OUR_PRICES['veo-3-fast'].pricePerSecond * 8,
  withMarkupUSD: OUR_PRICES['veo-3-fast'].pricePerSecond * 8 * MARKUP_RATE,
}
veoFast8sec.withMarkupRUB = veoFast8sec.withMarkupUSD * USD_TO_RUB
veoFast8sec.stars = veoFast8sec.withMarkupUSD / STAR_COST_USD

console.log(`\n   🔥 VEO-3 FAST (8 сек):`)
console.log(`      • Базовая цена: $${veoFast8sec.baseUSD.toFixed(2)}`)
console.log(`      • С наценкой 50%: $${veoFast8sec.withMarkupUSD.toFixed(2)}`)
console.log(`      • В рублях: ${veoFast8sec.withMarkupRUB.toFixed(0)}₽`)
console.log(`      • В звездах: ${Math.ceil(veoFast8sec.stars)}⭐`)

// Veo-3 Quality
const veoQuality8sec = {
  baseUSD: OUR_PRICES['veo-3-quality'].pricePerSecond * 8,
  withMarkupUSD: OUR_PRICES['veo-3-quality'].pricePerSecond * 8 * MARKUP_RATE,
}
veoQuality8sec.withMarkupRUB = veoQuality8sec.withMarkupUSD * USD_TO_RUB
veoQuality8sec.stars = veoQuality8sec.withMarkupUSD / STAR_COST_USD

console.log(`\n   💎 VEO-3 QUALITY (8 сек):`)
console.log(`      • Базовая цена: $${veoQuality8sec.baseUSD.toFixed(2)}`)
console.log(`      • С наценкой 50%: $${veoQuality8sec.withMarkupUSD.toFixed(2)}`)
console.log(`      • В рублях: ${veoQuality8sec.withMarkupRUB.toFixed(0)}₽`)
console.log(`      • В звездах: ${Math.ceil(veoQuality8sec.stars)}⭐`)

console.log('\n📊 СРАВНЕНИЕ (8 секунд):')
console.log('=' * 50)

// Сравнение Fast
const fastSavings = ((SYNX_PRICE.price_rub - veoFast8sec.withMarkupRUB) / SYNX_PRICE.price_rub * 100)
const fastSavingsAbs = SYNX_PRICE.price_rub - veoFast8sec.withMarkupRUB

console.log(`🔥 Veo-3 Fast vs Synx:`)
if (fastSavings > 0) {
  console.log(`   ✅ МЫ ДЕШЕВЛЕ на ${fastSavings.toFixed(1)}% (экономия ${fastSavingsAbs.toFixed(0)}₽)`)
  console.log(`   📉 ${Math.ceil(veoFast8sec.withMarkupRUB)}₽ vs ${SYNX_PRICE.price_rub}₽`)
} else {
  console.log(`   ❌ МЫ ДОРОЖЕ на ${Math.abs(fastSavings).toFixed(1)}% (переплата ${Math.abs(fastSavingsAbs).toFixed(0)}₽)`)
  console.log(`   📈 ${Math.ceil(veoFast8sec.withMarkupRUB)}₽ vs ${SYNX_PRICE.price_rub}₽`)
}

// Сравнение Quality
const qualitySavings = ((SYNX_PRICE.price_rub - veoQuality8sec.withMarkupRUB) / SYNX_PRICE.price_rub * 100)
const qualitySavingsAbs = SYNX_PRICE.price_rub - veoQuality8sec.withMarkupRUB

console.log(`\n💎 Veo-3 Quality vs Synx:`)
if (qualitySavings > 0) {
  console.log(`   ✅ МЫ ДЕШЕВЛЕ на ${qualitySavings.toFixed(1)}% (экономия ${qualitySavingsAbs.toFixed(0)}₽)`)
  console.log(`   📉 ${Math.ceil(veoQuality8sec.withMarkupRUB)}₽ vs ${SYNX_PRICE.price_rub}₽`)
} else {
  console.log(`   ❌ МЫ ДОРОЖЕ на ${Math.abs(qualitySavings).toFixed(1)}% (переплата ${Math.abs(qualitySavingsAbs).toFixed(0)}₽)`)
  console.log(`   📈 ${Math.ceil(veoQuality8sec.withMarkupRUB)}₽ vs ${SYNX_PRICE.price_rub}₽`)
}

console.log('\n🎯 ВЫВОДЫ:')
console.log('=' * 40)

if (fastSavings > 0) {
  console.log(`✅ Veo-3 Fast - КОНКУРЕНТНАЯ ЦЕНА (дешевле на ${fastSavings.toFixed(1)}%)`)
} else {
  console.log(`⚠️  Veo-3 Fast - ДОРОГО (дороже на ${Math.abs(fastSavings).toFixed(1)}%)`)
}

if (qualitySavings > 0) {
  console.log(`✅ Veo-3 Quality - КОНКУРЕНТНАЯ ЦЕНА (дешевле на ${qualitySavings.toFixed(1)}%)`)
} else {
  console.log(`⚠️  Veo-3 Quality - ОЧЕНЬ ДОРОГО (дороже на ${Math.abs(qualitySavings).toFixed(1)}%)`)
}

console.log('\n💡 РЕКОМЕНДАЦИИ:')
if (fastSavings <= 0 || qualitySavings <= 0) {
  console.log('   🔧 Рассмотреть снижение наценки или поиск более дешевого провайдера')
  console.log('   📱 Продвигать уникальные преимущества (качество, скорость, удобство)')
} else {
  console.log('   🚀 Продвигать как более выгодную альтернативу Synx!')
  console.log('   📢 Использовать в маркетинге: "Дешевле Synx"')
}