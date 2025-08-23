#!/usr/bin/env node

/**
 * ПРАВИЛЬНЫЙ АНАЛИЗ ЗА МАЙ-ИЮЛЬ 2025
 * ВСЕ БОТЫ, ВСЕ ДОХОДЫ И РАСХОДЫ
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

async function getAllBotsAndPayments() {
  try {
    console.log('🔍 Получаем ВСЕ данные за май-июль 2025...\n')

    // 1. Получаем ВСЕ боты из системы
    const { data: allBotNames, error: botsError } = await supabase
      .from('payments_v2')
      .select('bot_name')
      .not('bot_name', 'is', null)

    if (botsError) {
      console.error('❌ Ошибка получения ботов:', botsError.message)
      return null
    }

    const uniqueBots = [...new Set(allBotNames.map(b => b.bot_name))].sort()
    console.log(`🤖 ВСЕГО ботов в системе: ${uniqueBots.length}`)
    uniqueBots.forEach((bot, index) => {
      console.log(`   ${index + 1}. ${bot}`)
    })

    // 2. Получаем ВСЕ доходы за май-июль 2025
    const { data: incomes, error: incomeError } = await supabase
      .from('payments_v2')
      .select('*')
      .eq('status', 'COMPLETED')
      .eq('type', 'MONEY_INCOME')
      .gte('payment_date', '2025-05-01T00:00:00.000Z')
      .lt('payment_date', '2025-08-01T00:00:00.000Z')
      .order('payment_date', { ascending: true })

    if (incomeError) {
      console.error('❌ Ошибка получения доходов:', incomeError.message)
      return null
    }

    // 3. Получаем ВСЕ расходы за май-июль 2025
    const { data: expenses, error: expenseError } = await supabase
      .from('payments_v2')
      .select('*')
      .eq('status', 'COMPLETED')
      .eq('type', 'MONEY_OUTCOME')
      .gte('payment_date', '2025-05-01T00:00:00.000Z')
      .lt('payment_date', '2025-08-01T00:00:00.000Z')
      .order('payment_date', { ascending: true })

    if (expenseError) {
      console.error('❌ Ошибка получения расходов:', expenseError.message)
      return null
    }

    console.log(`\n📊 Данные за май-июль 2025:`)
    console.log(`   💰 Доходов: ${incomes.length}`)
    console.log(`   💸 Расходов: ${expenses.length}`)

    // Фильтруем по ботам (включаем записи с bot_name и без)
    const incomesWithBots = incomes.filter(p => p.bot_name)
    const incomesWithoutBots = incomes.filter(p => !p.bot_name)
    const expensesWithBots = expenses.filter(p => p.bot_name)
    const expensesWithoutBots = expenses.filter(p => !p.bot_name)

    console.log(
      `   📋 Доходы с ботами: ${incomesWithBots.length}, без ботов: ${incomesWithoutBots.length}`
    )
    console.log(
      `   📋 Расходы с ботами: ${expensesWithBots.length}, без ботов: ${expensesWithoutBots.length}`
    )

    return {
      uniqueBots,
      incomes: incomesWithBots,
      expenses: expensesWithBots,
      incomesWithoutBots,
      expensesWithoutBots,
    }
  } catch (error) {
    console.error('❌ Ошибка получения данных:', error)
    return null
  }
}

function analyzeThreeMonths(data) {
  const { uniqueBots, incomes, expenses } = data

  // Инициализируем всех ботов
  const botStats = new Map()
  uniqueBots.forEach(botName => {
    botStats.set(botName, {
      bot_name: botName,
      may: {
        income_rub: 0,
        income_stars: 0,
        income_virtual: 0,
        expense_rub: 0,
        expense_stars: 0,
        expense_virtual: 0,
        transactions: 0,
      },
      june: {
        income_rub: 0,
        income_stars: 0,
        income_virtual: 0,
        expense_rub: 0,
        expense_stars: 0,
        expense_virtual: 0,
        transactions: 0,
      },
      july: {
        income_rub: 0,
        income_stars: 0,
        income_virtual: 0,
        expense_rub: 0,
        expense_stars: 0,
        expense_virtual: 0,
        transactions: 0,
      },
      total_income_rub: 0,
      total_income_stars: 0,
      total_income_virtual: 0,
      total_expense_rub: 0,
      total_expense_stars: 0,
      total_expense_virtual: 0,
      total_transactions: 0,
      all_transactions: [],
    })
  })

  const monthlyTotals = {
    may: {
      income_rub: 0,
      income_stars: 0,
      income_virtual: 0,
      expense_rub: 0,
      expense_stars: 0,
      expense_virtual: 0,
      transactions: 0,
      active_bots: new Set(),
    },
    june: {
      income_rub: 0,
      income_stars: 0,
      income_virtual: 0,
      expense_rub: 0,
      expense_stars: 0,
      expense_virtual: 0,
      transactions: 0,
      active_bots: new Set(),
    },
    july: {
      income_rub: 0,
      income_stars: 0,
      income_virtual: 0,
      expense_rub: 0,
      expense_stars: 0,
      expense_virtual: 0,
      transactions: 0,
      active_bots: new Set(),
    },
  }

  // Обрабатываем доходы
  incomes.forEach(payment => {
    const date = new Date(payment.payment_date)
    const month = date.getMonth() + 1 // 5=май, 6=июнь, 7=июль

    if (![5, 6, 7].includes(month)) return

    const monthKey = month === 5 ? 'may' : month === 6 ? 'june' : 'july'
    const botName = payment.bot_name

    if (!botStats.has(botName)) {
      console.log(`⚠️ Найден новый бот: ${botName}`)
      return
    }

    const stats = botStats.get(botName)
    const monthStats = stats[monthKey]
    const globalMonth = monthlyTotals[monthKey]

    const isReal = isRealPayment(payment)
    const amount = parseFloat(payment.amount || 0)
    const stars = parseFloat(payment.stars || 0)

    if (isReal) {
      if (payment.currency === 'RUB' && amount > 0) {
        monthStats.income_rub += amount
        stats.total_income_rub += amount
        globalMonth.income_rub += amount
      } else if (payment.currency === 'STARS' && stars > 0) {
        monthStats.income_stars += stars
        stats.total_income_stars += stars
        globalMonth.income_stars += stars
      }
    } else {
      const virtualValue = amount || stars || 0
      monthStats.income_virtual += virtualValue
      stats.total_income_virtual += virtualValue
      globalMonth.income_virtual += virtualValue
    }

    monthStats.transactions += 1
    stats.total_transactions += 1
    globalMonth.transactions += 1
    globalMonth.active_bots.add(botName)

    stats.all_transactions.push({
      ...payment,
      month: monthKey,
      is_real: isReal,
    })
  })

  // Обрабатываем расходы
  expenses.forEach(payment => {
    const date = new Date(payment.payment_date)
    const month = date.getMonth() + 1

    if (![5, 6, 7].includes(month)) return

    const monthKey = month === 5 ? 'may' : month === 6 ? 'june' : 'july'
    const botName = payment.bot_name

    if (!botStats.has(botName)) {
      console.log(`⚠️ Найден новый бот в расходах: ${botName}`)
      return
    }

    const stats = botStats.get(botName)
    const monthStats = stats[monthKey]
    const globalMonth = monthlyTotals[monthKey]

    const isReal = isRealPayment(payment)
    const amount = parseFloat(payment.amount || 0)
    const stars = parseFloat(payment.stars || 0)

    if (isReal) {
      if (payment.currency === 'RUB' && amount > 0) {
        monthStats.expense_rub += amount
        stats.total_expense_rub += amount
        globalMonth.expense_rub += amount
      } else if (payment.currency === 'STARS' && stars > 0) {
        monthStats.expense_stars += stars
        stats.total_expense_stars += stars
        globalMonth.expense_stars += stars
      }
    } else {
      const virtualValue = amount || stars || 0
      monthStats.expense_virtual += virtualValue
      stats.total_expense_virtual += virtualValue
      globalMonth.expense_virtual += virtualValue
    }

    monthStats.transactions += 1
    stats.total_transactions += 1
    globalMonth.transactions += 1
    globalMonth.active_bots.add(botName)

    stats.all_transactions.push({
      ...payment,
      month: monthKey,
      is_real: isReal,
    })
  })

  // Конвертируем активных ботов в число
  Object.values(monthlyTotals).forEach(month => {
    month.active_bots = month.active_bots.size
  })

  return { botStats, monthlyTotals }
}

function isRealPayment(payment) {
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

  if (payment.currency === 'XTR') {
    return false
  }

  if (payment.currency === 'STARS' && payment.stars > 1000000) {
    return false
  }
  if (payment.currency === 'RUB' && payment.amount > 100000) {
    return false
  }

  return payment.currency === 'RUB' || payment.currency === 'STARS'
}

function displayCorrectReport(botStats, monthlyTotals) {
  console.log('\n📈 ПРАВИЛЬНЫЙ АНАЛИЗ ЗА МАЙ-ИЮЛЬ 2025 - ВСЕ БОТЫ')
  console.log('='.repeat(100))

  // Статистика по месяцам
  console.log('\n📅 ДЕТАЛЬНАЯ СТАТИСТИКА ПО МЕСЯЦАМ:')
  console.log('-'.repeat(100))

  const months = [
    { key: 'may', name: 'МАЙ 2025', data: monthlyTotals.may },
    { key: 'june', name: 'ИЮНЬ 2025', data: monthlyTotals.june },
    { key: 'july', name: 'ИЮЛЬ 2025', data: monthlyTotals.july },
  ]

  months.forEach(month => {
    console.log(`\n🗓️  ${month.name}:`)
    console.log(`   💰 ДОХОДЫ:`)
    console.log(
      `      Реальные: ${month.data.income_rub.toFixed(
        2
      )} RUB | ${month.data.income_stars.toFixed(0)} STARS`
    )
    console.log(
      `      Виртуальные: ${month.data.income_virtual.toFixed(0)} единиц`
    )
    console.log(`   💸 РАСХОДЫ:`)
    console.log(
      `      Реальные: ${month.data.expense_rub.toFixed(
        2
      )} RUB | ${month.data.expense_stars.toFixed(0)} STARS`
    )
    console.log(
      `      Виртуальные: ${month.data.expense_virtual.toFixed(0)} единиц`
    )
    console.log(
      `   📊 АКТИВНОСТЬ: ${month.data.active_bots} ботов | ${month.data.transactions} транзакций`
    )
  })

  // Статистика по ВСЕМ ботам
  console.log('\n🤖 ДЕТАЛЬНАЯ СТАТИСТИКА ПО ВСЕМ БОТАМ:')
  console.log('-'.repeat(100))

  const sortedBots = Array.from(botStats.values()).sort((a, b) => {
    const aTotal = a.total_income_rub + a.total_income_stars * 0.5
    const bTotal = b.total_income_rub + b.total_income_stars * 0.5
    return bTotal - aTotal
  })

  sortedBots.forEach((stats, index) => {
    const hasActivity = stats.total_transactions > 0
    const hasRealMoney =
      stats.total_income_rub > 0 ||
      stats.total_income_stars > 0 ||
      stats.total_expense_rub > 0 ||
      stats.total_expense_stars > 0

    console.log(
      `\n${index + 1}. 🤖 ${stats.bot_name} ${
        hasRealMoney ? '💰' : hasActivity ? '👻' : '😴'
      }`
    )

    if (hasActivity) {
      // Показываем по месяцам
      console.log(
        `   📅 МАЙ: ${stats.may.income_rub.toFixed(
          0
        )}₽+${stats.may.income_stars.toFixed(
          0
        )}⭐ доход | ${stats.may.expense_rub.toFixed(
          0
        )}₽+${stats.may.expense_stars.toFixed(0)}⭐ расход | ${
          stats.may.transactions
        } тр`
      )
      console.log(
        `   📅 ИЮНЬ: ${stats.june.income_rub.toFixed(
          0
        )}₽+${stats.june.income_stars.toFixed(
          0
        )}⭐ доход | ${stats.june.expense_rub.toFixed(
          0
        )}₽+${stats.june.expense_stars.toFixed(0)}⭐ расход | ${
          stats.june.transactions
        } тр`
      )
      console.log(
        `   📅 ИЮЛЬ: ${stats.july.income_rub.toFixed(
          0
        )}₽+${stats.july.income_stars.toFixed(
          0
        )}⭐ доход | ${stats.july.expense_rub.toFixed(
          0
        )}₽+${stats.july.expense_stars.toFixed(0)}⭐ расход | ${
          stats.july.transactions
        } тр`
      )

      if (hasRealMoney) {
        const netRub = stats.total_income_rub - stats.total_expense_rub
        const netStars = stats.total_income_stars - stats.total_expense_stars
        console.log(
          `   📊 ИТОГО РЕАЛЬНЫХ: ${stats.total_income_rub.toFixed(
            2
          )}₽ - ${stats.total_expense_rub.toFixed(2)}₽ = ${netRub.toFixed(
            2
          )}₽ | ${stats.total_income_stars.toFixed(
            0
          )}⭐ - ${stats.total_expense_stars.toFixed(0)}⭐ = ${netStars.toFixed(
            0
          )}⭐`
        )
      }

      if (stats.total_income_virtual > 0 || stats.total_expense_virtual > 0) {
        console.log(
          `   👻 Виртуальных: ${stats.total_income_virtual.toFixed(
            0
          )} доход | ${stats.total_expense_virtual.toFixed(0)} расход`
        )
      }
    } else {
      console.log(`   🚫 НЕТ АКТИВНОСТИ за май-июль 2025`)
    }
  })

  // Общие итоги
  const totalIncomeRub = sortedBots.reduce(
    (sum, bot) => sum + bot.total_income_rub,
    0
  )
  const totalIncomeStars = sortedBots.reduce(
    (sum, bot) => sum + bot.total_income_stars,
    0
  )
  const totalExpenseRub = sortedBots.reduce(
    (sum, bot) => sum + bot.total_expense_rub,
    0
  )
  const totalExpenseStars = sortedBots.reduce(
    (sum, bot) => sum + bot.total_expense_stars,
    0
  )
  const totalTransactions = sortedBots.reduce(
    (sum, bot) => sum + bot.total_transactions,
    0
  )
  const botsWithActivity = sortedBots.filter(
    bot => bot.total_transactions > 0
  ).length
  const botsWithRealMoney = sortedBots.filter(
    bot =>
      bot.total_income_rub > 0 ||
      bot.total_income_stars > 0 ||
      bot.total_expense_rub > 0 ||
      bot.total_expense_stars > 0
  ).length

  console.log('\n' + '='.repeat(100))
  console.log('📊 ОБЩИЕ ИТОГИ ЗА МАЙ-ИЮЛЬ 2025:')
  console.log(`🤖 Всего ботов в системе: ${sortedBots.length}`)
  console.log(`📱 Ботов с активностью: ${botsWithActivity}`)
  console.log(`💰 Ботов с реальными деньгами: ${botsWithRealMoney}`)
  console.log(`📋 Всего транзакций: ${totalTransactions}`)
  console.log('\n💰 РЕАЛЬНЫЕ ДЕНЬГИ:')
  console.log(
    `   Доходы: ${totalIncomeRub.toFixed(2)} RUB | ${totalIncomeStars.toFixed(
      0
    )} STARS`
  )
  console.log(
    `   Расходы: ${totalExpenseRub.toFixed(
      2
    )} RUB | ${totalExpenseStars.toFixed(0)} STARS`
  )
  console.log(
    `   ЧИСТАЯ ПРИБЫЛЬ: ${(totalIncomeRub - totalExpenseRub).toFixed(
      2
    )} RUB | ${(totalIncomeStars - totalExpenseStars).toFixed(0)} STARS`
  )
  console.log('='.repeat(100))
}

function createCorrectExcel(botStats, monthlyTotals) {
  try {
    console.log('\n📊 Создаем правильный Excel отчет...')

    const workbook = XLSX.utils.book_new()

    // 1. Сводка по всем ботам
    const botsData = []
    botsData.push([
      'БОТ',
      'МАЙ ДОХОД RUB',
      'МАЙ ДОХОД STARS',
      'МАЙ РАСХОД RUB',
      'МАЙ РАСХОД STARS',
      'МАЙ ТРАНЗАКЦИЙ',
      'ИЮНЬ ДОХОД RUB',
      'ИЮНЬ ДОХОД STARS',
      'ИЮНЬ РАСХОД RUB',
      'ИЮНЬ РАСХОД STARS',
      'ИЮНЬ ТРАНЗАКЦИЙ',
      'ИЮЛЬ ДОХОД RUB',
      'ИЮЛЬ ДОХОД STARS',
      'ИЮЛЬ РАСХОД RUB',
      'ИЮЛЬ РАСХОД STARS',
      'ИЮЛЬ ТРАНЗАКЦИЙ',
      'ИТОГО ДОХОД RUB',
      'ИТОГО ДОХОД STARS',
      'ИТОГО РАСХОД RUB',
      'ИТОГО РАСХОД STARS',
      'ЧИСТАЯ ПРИБЫЛЬ RUB',
      'ЧИСТАЯ ПРИБЫЛЬ STARS',
      'ВСЕГО ТРАНЗАКЦИЙ',
    ])

    const sortedBots = Array.from(botStats.values()).sort((a, b) => {
      const aTotal = a.total_income_rub + a.total_income_stars * 0.5
      const bTotal = b.total_income_rub + b.total_income_stars * 0.5
      return bTotal - aTotal
    })

    sortedBots.forEach(stats => {
      botsData.push([
        stats.bot_name,
        stats.may.income_rub,
        stats.may.income_stars,
        stats.may.expense_rub,
        stats.may.expense_stars,
        stats.may.transactions,
        stats.june.income_rub,
        stats.june.income_stars,
        stats.june.expense_rub,
        stats.june.expense_stars,
        stats.june.transactions,
        stats.july.income_rub,
        stats.july.income_stars,
        stats.july.expense_rub,
        stats.july.expense_stars,
        stats.july.transactions,
        stats.total_income_rub,
        stats.total_income_stars,
        stats.total_expense_rub,
        stats.total_expense_stars,
        stats.total_income_rub - stats.total_expense_rub,
        stats.total_income_stars - stats.total_expense_stars,
        stats.total_transactions,
      ])
    })

    const botsSheet = XLSX.utils.aoa_to_sheet(botsData)
    XLSX.utils.book_append_sheet(workbook, botsSheet, 'Все боты май-июль 2025')

    // 2. Сводка по месяцам
    const monthData = []
    monthData.push([
      'МЕСЯЦ',
      'ДОХОД RUB',
      'ДОХОД STARS',
      'РАСХОД RUB',
      'РАСХОД STARS',
      'БОТОВ АКТИВНЫХ',
      'ТРАНЗАКЦИЙ',
    ])

    monthData.push([
      'МАЙ 2025',
      monthlyTotals.may.income_rub,
      monthlyTotals.may.income_stars,
      monthlyTotals.may.expense_rub,
      monthlyTotals.may.expense_stars,
      monthlyTotals.may.active_bots,
      monthlyTotals.may.transactions,
    ])
    monthData.push([
      'ИЮНЬ 2025',
      monthlyTotals.june.income_rub,
      monthlyTotals.june.income_stars,
      monthlyTotals.june.expense_rub,
      monthlyTotals.june.expense_stars,
      monthlyTotals.june.active_bots,
      monthlyTotals.june.transactions,
    ])
    monthData.push([
      'ИЮЛЬ 2025',
      monthlyTotals.july.income_rub,
      monthlyTotals.july.income_stars,
      monthlyTotals.july.expense_rub,
      monthlyTotals.july.expense_stars,
      monthlyTotals.july.active_bots,
      monthlyTotals.july.transactions,
    ])

    const monthSheet = XLSX.utils.aoa_to_sheet(monthData)
    XLSX.utils.book_append_sheet(workbook, monthSheet, 'По месяцам')

    // 3. Все транзакции
    const transData = []
    transData.push([
      'БОТ',
      'ДАТА',
      'МЕСЯЦ',
      'ТИП',
      'РЕАЛЬНЫЙ',
      'RUB',
      'STARS',
      'ВАЛЮТА',
      'МЕТОД',
      'ОПИСАНИЕ',
    ])

    const allTransactions = []
    botStats.forEach(stats => {
      stats.all_transactions.forEach(t => allTransactions.push(t))
    })

    allTransactions
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
      .forEach(t => {
        transData.push([
          t.bot_name,
          t.payment_date,
          t.month.toUpperCase(),
          t.type,
          t.is_real ? 'ДА' : 'НЕТ',
          t.amount || 0,
          t.stars || 0,
          t.currency,
          t.payment_method,
          t.description || '',
        ])
      })

    const transSheet = XLSX.utils.aoa_to_sheet(transData)
    XLSX.utils.book_append_sheet(workbook, transSheet, 'Все транзакции')

    // Сохраняем
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[T:]/g, '-')
    const filename = `reports/correct-3months-analysis-${timestamp}.xlsx`

    const reportsDir = path.dirname(filename)
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }

    XLSX.writeFile(workbook, filename)

    console.log(`✅ Правильный Excel отчет создан: ${filename}`)
    console.log(`📁 Абсолютный путь: ${path.resolve(filename)}`)

    return filename
  } catch (error) {
    console.error('❌ Ошибка создания Excel отчета:', error)
    return null
  }
}

async function main() {
  console.log('🚀 ПРАВИЛЬНЫЙ АНАЛИЗ ВСЕХ БОТОВ ЗА МАЙ-ИЮЛЬ 2025...\n')

  try {
    const data = await getAllBotsAndPayments()

    if (!data) {
      console.error('💥 Не удалось получить данные')
      process.exit(1)
    }

    const analysis = analyzeThreeMonths(data)

    // Выводим правильный отчет
    displayCorrectReport(analysis.botStats, analysis.monthlyTotals)

    // Создаем правильный Excel
    const excelFile = createCorrectExcel(
      analysis.botStats,
      analysis.monthlyTotals
    )

    if (excelFile) {
      console.log('\n✅ ПРАВИЛЬНЫЙ анализ завершен!')
      console.log(`📊 Excel отчет: ${excelFile}`)
    }
  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
    process.exit(1)
  }
}

main()
