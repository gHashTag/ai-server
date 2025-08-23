#!/usr/bin/env node

/**
 * Node.js скрипт для анализа прибыльности ботов за май, июнь, июль 2025
 *
 * Использование:
 * node scripts/bot-profitability-node.js
 */

// Загружаем переменные окружения
require('dotenv').config({ path: '.env' })
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}.local`,
})

const { createClient } = require('@supabase/supabase-js')

// Названия месяцев
const monthNames = {
  5: 'Май',
  6: 'Июнь',
  7: 'Июль',
}

// Инициализируем Supabase клиент
let supabase
try {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  supabase = createClient(supabaseUrl, supabaseKey)
  console.log('✅ Supabase клиент инициализирован')
} catch (error) {
  console.error('❌ Ошибка инициализации Supabase:', error.message)
  process.exit(1)
}

async function testConnection() {
  console.log('🔍 Проверка подключения к Supabase...')

  try {
    const { data, error } = await supabase
      .from('payments_v2')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ Ошибка подключения:', error.message)
      return false
    }

    console.log('✅ Подключение к Supabase работает!')
    return true
  } catch (error) {
    console.error('❌ Критическая ошибка подключения:', error)
    return false
  }
}

async function analyzeBotProfitability() {
  console.log('📊 Начинаем анализ прибыльности ботов...')

  try {
    // Получаем данные за май-июль 2025
    const { data, error } = await supabase
      .from('payments_v2')
      .select(
        `
        bot_name,
        amount,
        stars,
        currency,
        payment_date,
        type,
        status,
        subscription_type,
        payment_method
      `
      )
      .eq('status', 'COMPLETED')
      .eq('type', 'MONEY_INCOME')
      .gte('payment_date', '2025-05-01T00:00:00.000Z')
      .lt('payment_date', '2025-08-01T00:00:00.000Z')
      .not('bot_name', 'is', null)
      .order('payment_date', { ascending: true })

    if (error) {
      console.error('❌ Ошибка выполнения запроса:', error.message)
      throw error
    }

    console.log(`✅ Получено ${data?.length || 0} записей`)

    if (!data || data.length === 0) {
      console.log('❌ Данные о прибыльности ботов за май-июль 2025 не найдены')
      return
    }

    // Обрабатываем данные
    const botStats = new Map()

    data.forEach(payment => {
      if (!payment.payment_date || !payment.bot_name) return

      const date = new Date(payment.payment_date)
      const month = date.getMonth() + 1
      const year = date.getFullYear()

      // Рассматриваем только май, июнь, июль 2025
      if (year !== 2025 || ![5, 6, 7].includes(month)) return

      const botName = payment.bot_name

      if (!botStats.has(botName)) {
        botStats.set(botName, {
          bot_name: botName,
          total_rub_income: 0,
          total_stars_income: 0,
          rub_transactions: 0,
          stars_transactions: 0,
          months: {},
        })
      }

      const stats = botStats.get(botName)
      const monthKey = month.toString().padStart(2, '0')

      // Инициализируем данные месяца если их нет
      if (!stats.months[monthKey]) {
        stats.months[monthKey] = {
          month_name: monthNames[month],
          rub_income: 0,
          stars_income: 0,
          rub_transactions: 0,
          stars_transactions: 0,
        }
      }

      const monthStats = stats.months[monthKey]

      // Обновляем статистику в зависимости от валюты
      if (payment.currency === 'RUB' && payment.amount > 0) {
        const amount = Number(payment.amount)
        stats.total_rub_income += amount
        stats.rub_transactions += 1
        monthStats.rub_income += amount
        monthStats.rub_transactions += 1
      } else if (payment.currency === 'STARS' && payment.stars > 0) {
        const stars = Number(payment.stars)
        stats.total_stars_income += stars
        stats.stars_transactions += 1
        monthStats.stars_income += stars
        monthStats.stars_transactions += 1
      }
    })

    // Отображаем результаты
    displayResults(Array.from(botStats.values()))
  } catch (error) {
    console.error('❌ Ошибка анализа данных:', error)
    throw error
  }
}

function displayResults(stats) {
  console.log('\n📈 АНАЛИЗ ПРИБЫЛЬНОСТИ БОТОВ (МАЙ - ИЮЛЬ 2025)')
  console.log('='.repeat(80))

  if (stats.length === 0) {
    console.log('❌ Данные не найдены')
    return
  }

  let totalRubIncome = 0
  let totalStarsIncome = 0

  // Сортируем ботов по имени
  stats.sort((a, b) => a.bot_name.localeCompare(b.bot_name))

  stats.forEach(botStats => {
    console.log(`\n🤖 БОТ: ${botStats.bot_name}`)
    console.log('-'.repeat(50))

    // Сортируем месяцы по порядку
    const sortedMonths = Object.entries(botStats.months).sort(([a], [b]) =>
      a.localeCompare(b)
    )

    sortedMonths.forEach(([monthKey, monthData]) => {
      console.log(`  📅 ${monthData.month_name} (${monthKey}):`)

      if (monthData.rub_income > 0) {
        console.log(
          `    💰 Рубли: ${monthData.rub_income.toFixed(2)} RUB (${
            monthData.rub_transactions
          } транзакций)`
        )
      }

      if (monthData.stars_income > 0) {
        console.log(
          `    ⭐ Звезды: ${monthData.stars_income} STARS (${monthData.stars_transactions} транзакций)`
        )
      }

      if (monthData.rub_income === 0 && monthData.stars_income === 0) {
        console.log(`    🚫 Нет доходов`)
      }
    })

    console.log(
      `  📊 ИТОГО по боту: ${botStats.total_rub_income.toFixed(2)} RUB | ${
        botStats.total_stars_income
      } STARS`
    )

    totalRubIncome += botStats.total_rub_income
    totalStarsIncome += botStats.total_stars_income
  })

  console.log('\n' + '='.repeat(80))
  console.log('📊 ОБЩИЙ ИТОГ ЗА ТРИ МЕСЯЦА:')
  console.log(`💰 Общий доход в рублях: ${totalRubIncome.toFixed(2)} RUB`)
  console.log(`⭐ Общий доход в звездах: ${totalStarsIncome} STARS`)
  console.log(`🤖 Количество активных ботов: ${stats.length}`)
  console.log('='.repeat(80))

  // Дополнительная статистика - топ ботов
  console.log('\n🏆 ТОП-5 БОТОВ ПО ДОХОДНОСТИ:')
  console.log('-'.repeat(50))

  const sortedByIncome = stats
    .map(bot => ({
      ...bot,
      totalValue: bot.total_rub_income + bot.total_stars_income * 0.5, // 1 звезда ≈ 0.5 рубля условно
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5)

  sortedByIncome.forEach((bot, index) => {
    console.log(
      `${index + 1}. 🤖 ${bot.bot_name}: ${bot.total_rub_income.toFixed(
        2
      )} RUB + ${bot.total_stars_income} STARS (≈${bot.totalValue.toFixed(
        2
      )} RUB)`
    )
  })
}

async function main() {
  console.log(
    '🚀 Начинаем анализ прибыльности ботов за май, июнь, июль 2025...'
  )

  try {
    // Сначала проверяем подключение
    const connectionOk = await testConnection()
    if (!connectionOk) {
      console.error('💥 Не удалось подключиться к Supabase. Завершение работы.')
      process.exit(1)
    }

    // Выполняем анализ
    await analyzeBotProfitability()

    console.log('\n✅ Анализ завершен успешно!')
  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
    process.exit(1)
  }
}

// Запускаем основную функцию
main()
