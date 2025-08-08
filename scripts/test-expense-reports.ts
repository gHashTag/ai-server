#!/usr/bin/env bun

/**
 * Скрипт для тестирования отчетов по расходам фермы ботов
 * 
 * Использование:
 * bun run scripts/test-expense-reports.ts
 */

import { 
  getBotFarmExpenses, 
  getBotFarmExpenseStats, 
  getBotFarmExpensesByCategory,
  getMonthlyExpenseStats
} from '../src/core/supabase/getBotFarmExpenseReports'
import { ExpenseCategory } from '../src/core/supabase/addBotFarmExpense'

async function testExpenseReports() {
  console.log('🧪 Тестирование отчетов по расходам фермы ботов...\n')

  try {
    // 1. Получаем все расходы за май 2024
    console.log('📊 1. Получение всех расходов за май 2024:')
    const mayExpenses = await getBotFarmExpenses('2024-05-01', '2024-05-31')
    console.log(`   Найдено расходов: ${mayExpenses.length}`)
    
    if (mayExpenses.length > 0) {
      const totalAmount = mayExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      console.log(`   Общая сумма: ${totalAmount.toFixed(2)} ${mayExpenses[0].currency}`)
      console.log(`   Первые 3 расхода:`)
      mayExpenses.slice(0, 3).forEach((expense, index) => {
        console.log(`     ${index + 1}. ${expense.name}: ${expense.amount} ${expense.currency} (${expense.category})`)
      })
    }
    console.log()

    // 2. Получаем статистику за май 2024
    console.log('📈 2. Статистика расходов за май 2024:')
    const mayStats = await getBotFarmExpenseStats('2024-05-01', '2024-05-31')
    console.log(`   Общая сумма: ${mayStats.totalAmount.toFixed(2)} ${mayStats.currency}`)
    console.log(`   Всего транзакций: ${mayStats.totalCount}`)
    console.log(`   Категорий расходов: ${mayStats.categorySummaries.length}`)
    
    console.log('   Расходы по категориям:')
    mayStats.categorySummaries.forEach((summary, index) => {
      const percentage = ((summary.totalAmount / mayStats.totalAmount) * 100).toFixed(1)
      console.log(`     ${index + 1}. ${summary.category}: ${summary.totalAmount.toFixed(2)} ${summary.currency} (${percentage}%) - ${summary.count} транзакций`)
    })
    
    console.log('   Топ-5 крупнейших расходов:')
    mayStats.topExpenses.slice(0, 5).forEach((expense, index) => {
      console.log(`     ${index + 1}. ${expense.name}: ${expense.amount} ${expense.currency}`)
    })
    console.log()

    // 3. Получаем расходы по категории AI_SERVICES
    console.log('🤖 3. Расходы на AI сервисы за май 2024:')
    const aiExpenses = await getBotFarmExpensesByCategory(ExpenseCategory.AI_SERVICES, '2024-05-01', '2024-05-31')
    console.log(`   Найдено AI расходов: ${aiExpenses.length}`)
    
    if (aiExpenses.length > 0) {
      const aiTotalAmount = aiExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      console.log(`   Общая сумма на AI: ${aiTotalAmount.toFixed(2)} ${aiExpenses[0].currency}`)
      console.log(`   AI расходы:`)
      aiExpenses.forEach((expense, index) => {
        console.log(`     ${index + 1}. ${expense.name}: ${expense.amount} ${expense.currency} - ${expense.expenseType}`)
      })
    }
    console.log()

    // 4. Получаем месячную статистику за 2024 год
    console.log('📅 4. Месячная статистика за 2024 год:')
    const monthlyStats = await getMonthlyExpenseStats(2024)
    console.log(`   Месяцев с расходами: ${monthlyStats.length}`)
    
    monthlyStats.forEach((monthStat) => {
      const monthName = new Date(monthStat.month + '-01').toLocaleDateString('ru-RU', { 
        year: 'numeric', 
        month: 'long' 
      })
      console.log(`     ${monthName}: ${monthStat.totalAmount.toFixed(2)} ${monthStat.currency} (${monthStat.count} транзакций)`)
    })
    console.log()

    // 5. Тестируем расходы по категории DEVELOPMENT
    console.log('💻 5. Расходы на разработку за май 2024:')
    const devExpenses = await getBotFarmExpensesByCategory(ExpenseCategory.DEVELOPMENT, '2024-05-01', '2024-05-31')
    console.log(`   Найдено расходов на разработку: ${devExpenses.length}`)
    
    if (devExpenses.length > 0) {
      const devTotalAmount = devExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      console.log(`   Общая сумма на разработку: ${devTotalAmount.toFixed(2)} ${devExpenses[0].currency}`)
      devExpenses.forEach((expense, index) => {
        console.log(`     ${index + 1}. ${expense.name}: ${expense.amount} ${expense.currency}`)
      })
    }
    console.log()

    console.log('✅ Тестирование отчетов завершено успешно!')

  } catch (error) {
    console.error('❌ Ошибка при тестировании отчетов:', error)
    process.exit(1)
  }
}

// Запускаем тест
testExpenseReports().catch(console.error)