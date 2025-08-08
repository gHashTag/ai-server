import { supabase } from './index'
import { logger } from '@/utils/logger'
import { ExpenseCategory, ExpenseType } from './addBotFarmExpense'

/**
 * Интерфейс для отчета по расходам
 */
export interface ExpenseReport {
  id: string
  date: string
  name: string
  amount: number
  currency: string
  description: string
  category: ExpenseCategory
  expenseType: ExpenseType
  purpose: string
  url?: string
}

/**
 * Интерфейс для сводки расходов по категориям
 */
export interface ExpenseSummary {
  category: ExpenseCategory
  totalAmount: number
  currency: string
  count: number
  expenses: ExpenseReport[]
}

/**
 * Интерфейс для общей статистики расходов
 */
export interface ExpenseStats {
  totalAmount: number
  currency: string
  totalCount: number
  categorySummaries: ExpenseSummary[]
  topExpenses: ExpenseReport[]
  dateRange: {
    from: string
    to: string
  }
}

/**
 * Получает все расходы фермы ботов из БД
 * 
 * @param dateFrom - Дата начала периода (YYYY-MM-DD)
 * @param dateTo - Дата окончания периода (YYYY-MM-DD)
 * @param category - Фильтр по категории (опционально)
 * @returns Promise<ExpenseReport[]>
 */
export const getBotFarmExpenses = async (
  dateFrom?: string,
  dateTo?: string,
  category?: ExpenseCategory
): Promise<ExpenseReport[]> => {
  try {
    logger.info('📊 Получение расходов фермы ботов:', {
      description: 'Getting bot farm expenses',
      dateFrom,
      dateTo,
      category
    })

    let query = supabase
      .from('payments_v2')
      .select('*')
      .eq('telegram_id', 'SYSTEM_BOT_FARM')
      .eq('type', 'MONEY_OUTCOME')
      .order('payment_date', { ascending: false })

    // Добавляем фильтры по дате если указаны
    if (dateFrom) {
      query = query.gte('payment_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('payment_date', dateTo)
    }

    const { data, error } = await query

    if (error) {
      logger.error('❌ Ошибка при получении расходов фермы ботов:', {
        description: 'Error getting bot farm expenses',
        error: error.message,
      })
      return []
    }

    if (!data || data.length === 0) {
      logger.info('📝 Расходы фермы ботов не найдены:', {
        description: 'No bot farm expenses found',
        dateFrom,
        dateTo,
        category
      })
      return []
    }

    // Преобразуем данные в нужный формат
    const expenses: ExpenseReport[] = data
      .filter(expense => {
        // Фильтруем по категории если указана
        if (category && expense.metadata?.expense_category !== category) {
          return false
        }
        return true
      })
      .map(expense => ({
        id: expense.id,
        date: expense.payment_date || expense.created_at,
        name: expense.metadata?.original_name || expense.description.split(':')[0],
        amount: expense.amount,
        currency: expense.currency,
        description: expense.description,
        category: expense.metadata?.expense_category || ExpenseCategory.OTHER,
        expenseType: expense.metadata?.expense_type || ExpenseType.OTHER,
        purpose: expense.metadata?.purpose || '',
        url: expense.metadata?.url
      }))

    logger.info('✅ Успешно получены расходы фермы ботов:', {
      description: 'Successfully retrieved bot farm expenses',
      count: expenses.length,
      dateFrom,
      dateTo,
      category
    })

    return expenses

  } catch (error) {
    logger.error('❌ Ошибка в getBotFarmExpenses:', {
      description: 'Error in getBotFarmExpenses function',
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * Получает сводную статистику по расходам фермы ботов
 * 
 * @param dateFrom - Дата начала периода (YYYY-MM-DD)
 * @param dateTo - Дата окончания периода (YYYY-MM-DD)
 * @returns Promise<ExpenseStats>
 */
export const getBotFarmExpenseStats = async (
  dateFrom?: string,
  dateTo?: string
): Promise<ExpenseStats> => {
  try {
    const expenses = await getBotFarmExpenses(dateFrom, dateTo)

    if (expenses.length === 0) {
      return {
        totalAmount: 0,
        currency: 'THB',
        totalCount: 0,
        categorySummaries: [],
        topExpenses: [],
        dateRange: {
          from: dateFrom || '',
          to: dateTo || ''
        }
      }
    }

    // Общая сумма и количество
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const totalCount = expenses.length

    // Группировка по категориям
    const categoryGroups = expenses.reduce((acc, expense) => {
      const category = expense.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(expense)
      return acc
    }, {} as Record<ExpenseCategory, ExpenseReport[]>)

    // Создание сводок по категориям
    const categorySummaries: ExpenseSummary[] = Object.entries(categoryGroups).map(([category, categoryExpenses]) => ({
      category: category as ExpenseCategory,
      totalAmount: categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      currency: categoryExpenses[0]?.currency || 'THB',
      count: categoryExpenses.length,
      expenses: categoryExpenses.sort((a, b) => b.amount - a.amount)
    }))

    // Сортировка по сумме
    categorySummaries.sort((a, b) => b.totalAmount - a.totalAmount)

    // Топ-10 самых крупных расходов
    const topExpenses = [...expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    const stats: ExpenseStats = {
      totalAmount,
      currency: expenses[0]?.currency || 'THB',
      totalCount,
      categorySummaries,
      topExpenses,
      dateRange: {
        from: dateFrom || '',
        to: dateTo || ''
      }
    }

    logger.info('📈 Сформирована статистика расходов фермы ботов:', {
      description: 'Bot farm expense statistics generated',
      totalAmount,
      totalCount,
      categoriesCount: categorySummaries.length,
      dateFrom,
      dateTo
    })

    return stats

  } catch (error) {
    logger.error('❌ Ошибка в getBotFarmExpenseStats:', {
      description: 'Error in getBotFarmExpenseStats function',
      error: error instanceof Error ? error.message : String(error),
    })

    return {
      totalAmount: 0,
      currency: 'THB',
      totalCount: 0,
      categorySummaries: [],
      topExpenses: [],
      dateRange: {
        from: dateFrom || '',
        to: dateTo || ''
      }
    }
  }
}

/**
 * Получает расходы по конкретной категории
 * 
 * @param category - Категория расходов
 * @param dateFrom - Дата начала периода (YYYY-MM-DD)
 * @param dateTo - Дата окончания периода (YYYY-MM-DD)
 * @returns Promise<ExpenseReport[]>
 */
export const getBotFarmExpensesByCategory = async (
  category: ExpenseCategory,
  dateFrom?: string,
  dateTo?: string
): Promise<ExpenseReport[]> => {
  return getBotFarmExpenses(dateFrom, dateTo, category)
}

/**
 * Получает ежемесячную статистику расходов
 * 
 * @param year - Год (например, 2024)
 * @returns Promise<Array<{ month: string, totalAmount: number, count: number }>>
 */
export const getMonthlyExpenseStats = async (year: number): Promise<Array<{
  month: string
  totalAmount: number
  count: number
  currency: string
}>> => {
  try {
    const { data, error } = await supabase
      .from('payments_v2')
      .select('payment_date, amount, currency')
      .eq('telegram_id', 'SYSTEM_BOT_FARM')
      .eq('type', 'MONEY_OUTCOME')
      .gte('payment_date', `${year}-01-01`)
      .lte('payment_date', `${year}-12-31`)

    if (error) {
      logger.error('❌ Ошибка при получении месячной статистики:', {
        description: 'Error getting monthly expense statistics',
        error: error.message,
      })
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Группировка по месяцам
    const monthlyGroups = data.reduce((acc, expense) => {
      const date = new Date(expense.payment_date)
      const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          totalAmount: 0,
          count: 0,
          currency: expense.currency || 'THB'
        }
      }
      
      acc[monthKey].totalAmount += expense.amount
      acc[monthKey].count += 1
      
      return acc
    }, {} as Record<string, { totalAmount: number, count: number, currency: string }>)

    // Преобразование в массив
    const monthlyStats = Object.entries(monthlyGroups).map(([month, stats]) => ({
      month,
      ...stats
    }))

    monthlyStats.sort((a, b) => a.month.localeCompare(b.month))

    logger.info('📅 Сформирована месячная статистика:', {
      description: 'Monthly expense statistics generated',
      year,
      monthsCount: monthlyStats.length
    })

    return monthlyStats

  } catch (error) {
    logger.error('❌ Ошибка в getMonthlyExpenseStats:', {
      description: 'Error in getMonthlyExpenseStats function',
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}