#!/usr/bin/env node

/**
 * Скрипт для анализа РЕАЛЬНОЙ прибыльности всех ботов с созданием Excel отчета
 * Исключает виртуальные деньги и тестовые операции
 */

require('dotenv').config({ path: '.env' })
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}.local`,
})

const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Функция для определения реальных платежей
function isRealPayment(payment) {
  // Исключаем тестовые методы оплаты
  const testMethods = [
    'System',
    'SYSTEM',
    'Manual',
    'test',
    'System_Balance_Migration',
    'System_Operation',
  ]
  if (testMethods.includes(payment.payment_method)) {
    return false
  }

  // Исключаем тестовые описания
  const testDescriptions = [
    'Test',
    'System Grant',
    'System Correction',
    'NEUROTESTER',
    'simulation',
    'Refund for image morphing',
    'тестовых',
  ]
  if (
    payment.description &&
    testDescriptions.some(test =>
      payment.description.toLowerCase().includes(test.toLowerCase())
    )
  ) {
    return false
  }

  // Исключаем виртуальную валюту XTR
  if (payment.currency === 'XTR') {
    return false
  }

  // Исключаем аномально большие суммы (явные ошибки)
  if (payment.currency === 'STARS' && payment.stars > 1000000) {
    return false
  }
  if (payment.currency === 'RUB' && payment.amount > 100000) {
    return false
  }

  // Оставляем только реальные валюты
  return payment.currency === 'RUB' || payment.currency === 'STARS'
}

async function getRealBotProfitability() {
  try {
    console.log('🔍 Получаем данные о РЕАЛЬНОЙ прибыльности всех ботов...\n')

    // Получаем все доходы
    const { data: allPayments, error } = await supabase
      .from('payments_v2')
      .select('*')
      .eq('status', 'COMPLETED')
      .eq('type', 'MONEY_INCOME')
      .not('bot_name', 'is', null)
      .order('payment_date', { ascending: true })

    if (error) {
      console.error('❌ Ошибка получения данных:', error.message)
      return null
    }

    console.log(`📊 Всего получено ${allPayments.length} записей доходов`)

    // Фильтруем только реальные платежи
    const realPayments = allPayments.filter(isRealPayment)
    console.log(`✅ Реальных платежей: ${realPayments.length}`)
    console.log(
      `❌ Исключено виртуальных/тестовых: ${
        allPayments.length - realPayments.length
      }\n`
    )

    // Группируем данные по ботам и месяцам
    const botStats = new Map()
    const monthlyData = []

    realPayments.forEach(payment => {
      const date = new Date(payment.payment_date)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`
      const botName = payment.bot_name

      // Инициализация данных бота
      if (!botStats.has(botName)) {
        botStats.set(botName, {
          bot_name: botName,
          total_rub: 0,
          total_stars: 0,
          rub_transactions: 0,
          stars_transactions: 0,
          months: new Map(),
        })
      }

      const stats = botStats.get(botName)

      // Инициализация данных месяца
      if (!stats.months.has(monthKey)) {
        stats.months.set(monthKey, {
          month: monthKey,
          rub_income: 0,
          stars_income: 0,
          rub_transactions: 0,
          stars_transactions: 0,
        })
      }

      const monthStats = stats.months.get(monthKey)

      // Обновляем статистику
      if (payment.currency === 'RUB' && payment.amount > 0) {
        const amount = parseFloat(payment.amount)
        stats.total_rub += amount
        stats.rub_transactions += 1
        monthStats.rub_income += amount
        monthStats.rub_transactions += 1
      } else if (payment.currency === 'STARS' && payment.stars > 0) {
        const stars = parseFloat(payment.stars)
        stats.total_stars += stars
        stats.stars_transactions += 1
        monthStats.stars_income += stars
        monthStats.stars_transactions += 1
      }

      // Добавляем в детальные данные для Excel
      monthlyData.push({
        bot_name: botName,
        payment_date: payment.payment_date,
        month: monthKey,
        amount: payment.amount || 0,
        stars: payment.stars || 0,
        currency: payment.currency,
        payment_method: payment.payment_method,
        description: payment.description || '',
        subscription_type: payment.subscription_type || '',
      })
    })

    return { botStats, monthlyData }
  } catch (error) {
    console.error('❌ Ошибка анализа данных:', error)
    return null
  }
}

function displayConsoleReport(botStats) {
  console.log('📈 АНАЛИЗ РЕАЛЬНОЙ ПРИБЫЛЬНОСТИ ВСЕХ БОТОВ')
  console.log('='.repeat(80))

  if (botStats.size === 0) {
    console.log('❌ Реальных доходов не найдено')
    return
  }

  let totalRub = 0
  let totalStars = 0

  // Сортируем ботов по общей доходности
  const sortedBots = Array.from(botStats.values()).sort((a, b) => {
    const aValue = a.total_rub + a.total_stars * 0.5 // 1 STAR ≈ 0.5 RUB
    const bValue = b.total_rub + b.total_stars * 0.5
    return bValue - aValue
  })

  sortedBots.forEach((stats, index) => {
    console.log(`\n${index + 1}. 🤖 БОТ: ${stats.bot_name}`)
    console.log('-'.repeat(50))

    // Показываем данные по месяцам
    const sortedMonths = Array.from(stats.months.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    )

    if (sortedMonths.length > 0) {
      console.log('   📅 По месяцам:')
      sortedMonths.forEach(month => {
        if (month.rub_income > 0 || month.stars_income > 0) {
          console.log(
            `   ${month.month}: ${month.rub_income.toFixed(2)} RUB (${
              month.rub_transactions
            } тр.) | ${month.stars_income.toFixed(2)} STARS (${
              month.stars_transactions
            } тр.)`
          )
        }
      })
    }

    console.log(
      `   📊 ИТОГО: ${stats.total_rub.toFixed(
        2
      )} RUB | ${stats.total_stars.toFixed(2)} STARS`
    )
    console.log(
      `   💎 Условная стоимость: ${(
        stats.total_rub +
        stats.total_stars * 0.5
      ).toFixed(2)} RUB`
    )

    totalRub += stats.total_rub
    totalStars += stats.total_stars
  })

  console.log('\n' + '='.repeat(80))
  console.log('📊 ОБЩИЙ ИТОГ ПО ВСЕМ БОТАМ:')
  console.log(`💰 Общий доход в рублях: ${totalRub.toFixed(2)} RUB`)
  console.log(`⭐ Общий доход в звездах: ${totalStars.toFixed(2)} STARS`)
  console.log(`🤖 Количество ботов с доходами: ${botStats.size}`)
  console.log(
    `💎 Общая условная стоимость: ${(totalRub + totalStars * 0.5).toFixed(
      2
    )} RUB`
  )
  console.log('='.repeat(80))
}

function createExcelReport(botStats, monthlyData) {
  try {
    console.log('\n📊 Создаем Excel отчет...')

    const workbook = XLSX.utils.book_new()

    // 1. Лист "Сводка по ботам"
    const summaryData = []
    summaryData.push([
      'БОТ',
      'ОБЩИЙ ДОХОД RUB',
      'ОБЩИЙ ДОХОД STARS',
      'ТРАНЗАКЦИЙ RUB',
      'ТРАНЗАКЦИЙ STARS',
      'УСЛОВНАЯ СТОИМОСТЬ RUB',
    ])

    const sortedBots = Array.from(botStats.values()).sort((a, b) => {
      const aValue = a.total_rub + a.total_stars * 0.5
      const bValue = b.total_rub + b.total_stars * 0.5
      return bValue - aValue
    })

    let totalRub = 0
    let totalStars = 0

    sortedBots.forEach(stats => {
      summaryData.push([
        stats.bot_name,
        parseFloat(stats.total_rub.toFixed(2)),
        parseFloat(stats.total_stars.toFixed(2)),
        stats.rub_transactions,
        stats.stars_transactions,
        parseFloat((stats.total_rub + stats.total_stars * 0.5).toFixed(2)),
      ])
      totalRub += stats.total_rub
      totalStars += stats.total_stars
    })

    // Добавляем итого
    summaryData.push([])
    summaryData.push([
      'ИТОГО',
      parseFloat(totalRub.toFixed(2)),
      parseFloat(totalStars.toFixed(2)),
      sortedBots.reduce((sum, bot) => sum + bot.rub_transactions, 0),
      sortedBots.reduce((sum, bot) => sum + bot.stars_transactions, 0),
      parseFloat((totalRub + totalStars * 0.5).toFixed(2)),
    ])

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Сводка по ботам')

    // 2. Лист "Детализация по месяцам"
    const monthlyDetails = []
    monthlyDetails.push([
      'БОТ',
      'МЕСЯЦ',
      'ДОХОД RUB',
      'ДОХОД STARS',
      'ТРАНЗАКЦИЙ RUB',
      'ТРАНЗАКЦИЙ STARS',
    ])

    sortedBots.forEach(stats => {
      const sortedMonths = Array.from(stats.months.values()).sort((a, b) =>
        a.month.localeCompare(b.month)
      )
      sortedMonths.forEach(month => {
        if (month.rub_income > 0 || month.stars_income > 0) {
          monthlyDetails.push([
            stats.bot_name,
            month.month,
            parseFloat(month.rub_income.toFixed(2)),
            parseFloat(month.stars_income.toFixed(2)),
            month.rub_transactions,
            month.stars_transactions,
          ])
        }
      })
    })

    const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyDetails)
    XLSX.utils.book_append_sheet(workbook, monthlySheet, 'По месяцам')

    // 3. Лист "Все транзакции"
    const transactionData = []
    transactionData.push([
      'БОТ',
      'ДАТА',
      'МЕСЯЦ',
      'СУММА RUB',
      'ЗВЕЗДЫ',
      'ВАЛЮТА',
      'МЕТОД ОПЛАТЫ',
      'ОПИСАНИЕ',
      'ПОДПИСКА',
    ])

    monthlyData
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
      .forEach(payment => {
        transactionData.push([
          payment.bot_name,
          payment.payment_date,
          payment.month,
          payment.amount,
          payment.stars,
          payment.currency,
          payment.payment_method,
          payment.description,
          payment.subscription_type,
        ])
      })

    const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData)
    XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Все транзакции')

    // Сохраняем файл
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[T:]/g, '-')
    const filename = `reports/bot-profitability-${timestamp}.xlsx`

    // Создаем папку reports если её нет
    const reportsDir = path.dirname(filename)
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }

    XLSX.writeFile(workbook, filename)

    console.log(`✅ Excel отчет создан: ${filename}`)
    console.log(`📁 Абсолютный путь: ${path.resolve(filename)}`)

    return filename
  } catch (error) {
    console.error('❌ Ошибка создания Excel отчета:', error)
    return null
  }
}

async function main() {
  console.log('🚀 Анализ РЕАЛЬНОЙ прибыльности всех ботов-амбассадоров...\n')

  try {
    const result = await getRealBotProfitability()

    if (!result) {
      console.error('💥 Не удалось получить данные')
      process.exit(1)
    }

    const { botStats, monthlyData } = result

    // Выводим отчет в консоль
    displayConsoleReport(botStats)

    // Создаем Excel отчет
    const excelFile = createExcelReport(botStats, monthlyData)

    if (excelFile) {
      console.log('\n✅ Анализ завершен успешно!')
      console.log(`📊 Excel отчет: ${excelFile}`)
    } else {
      console.log('\n⚠️ Анализ завершен, но Excel отчет не создан')
    }
  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
    process.exit(1)
  }
}

main()
