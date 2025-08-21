import { supabase } from '.'
import { logger } from '@/utils/logger'

// Интерфейс для отчета о прибыльности бота
export interface BotProfitabilityReport {
  id: string
  bot_name: string
  amount: number
  stars: number
  currency: 'RUB' | 'STARS'
  payment_date: string
  month: number
  month_name: string
  type: string
  status: string
  subscription_type?: string
  payment_method: string
  description?: string
}

// Интерфейс для сводной статистики по боту
export interface BotProfitabilityStats {
  bot_name: string
  total_rub_income: number
  total_stars_income: number
  rub_transactions: number
  stars_transactions: number
  months: {
    [key: string]: {
      month_name: string
      rub_income: number
      stars_income: number
      rub_transactions: number
      stars_transactions: number
    }
  }
}

// Названия месяцев
const monthNames: { [key: number]: string } = {
  5: 'Май',
  6: 'Июнь',
  7: 'Июль',
}

/**
 * Получает данные о прибыльности ботов из таблицы payments_v2
 *
 * @param dateFrom - Дата начала периода (YYYY-MM-DD)
 * @param dateTo - Дата окончания периода (YYYY-MM-DD)
 * @param botName - Фильтр по имени бота (опционально)
 * @returns Promise<BotProfitabilityReport[]>
 */
export const getBotProfitability = async (
  dateFrom?: string,
  dateTo?: string,
  botName?: string
): Promise<BotProfitabilityReport[]> => {
  try {
    logger.info('📊 Получение данных о прибыльности ботов:', {
      description: 'Getting bot profitability data',
      dateFrom,
      dateTo,
      botName,
    })

    let query = supabase
      .from('payments_v2')
      .select('*')
      .eq('status', 'COMPLETED')
      .eq('type', 'MONEY_INCOME')
      .not('bot_name', 'is', null)
      .order('payment_date', { ascending: false })

    // Добавляем фильтры по дате если указаны
    if (dateFrom) {
      query = query.gte('payment_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('payment_date', dateTo)
    }

    // Добавляем фильтр по имени бота если указан
    if (botName) {
      query = query.eq('bot_name', botName)
    }

    const { data, error } = await query

    if (error) {
      logger.error('❌ Ошибка при получении данных о прибыльности ботов:', {
        description: 'Error getting bot profitability data',
        error: error.message,
      })
      return []
    }

    if (!data || data.length === 0) {
      logger.info('📝 Данные о прибыльности ботов не найдены:', {
        description: 'No bot profitability data found',
        dateFrom,
        dateTo,
        botName,
      })
      return []
    }

    // Преобразуем данные в нужный формат
    const profitabilityReports: BotProfitabilityReport[] = data.map(payment => {
      const paymentDate = new Date(payment.payment_date)
      const month = paymentDate.getMonth() + 1

      return {
        id: payment.id,
        bot_name: payment.bot_name,
        amount: payment.amount || 0,
        stars: payment.stars || 0,
        currency: payment.currency,
        payment_date: payment.payment_date,
        month,
        month_name: monthNames[month] || `Месяц ${month}`,
        type: payment.type,
        status: payment.status,
        subscription_type: payment.subscription_type,
        payment_method: payment.payment_method,
        description: payment.description,
      }
    })

    logger.info('✅ Получены данные о прибыльности ботов:', {
      description: 'Bot profitability data retrieved successfully',
      count: profitabilityReports.length,
      dateFrom,
      dateTo,
      botName,
    })

    return profitabilityReports
  } catch (error) {
    logger.error(
      '❌ Критическая ошибка при получении данных о прибыльности ботов:',
      {
        description: 'Critical error getting bot profitability data',
        error: error instanceof Error ? error.message : String(error),
      }
    )
    return []
  }
}

/**
 * Группирует данные о прибыльности ботов и создает сводную статистику
 *
 * @param profitabilityData - Массив данных о прибыльности
 * @returns BotProfitabilityStats[]
 */
export const generateBotProfitabilityStats = (
  profitabilityData: BotProfitabilityReport[]
): BotProfitabilityStats[] => {
  const statsMap = new Map<string, BotProfitabilityStats>()

  profitabilityData.forEach(payment => {
    if (!statsMap.has(payment.bot_name)) {
      statsMap.set(payment.bot_name, {
        bot_name: payment.bot_name,
        total_rub_income: 0,
        total_stars_income: 0,
        rub_transactions: 0,
        stars_transactions: 0,
        months: {},
      })
    }

    const stats = statsMap.get(payment.bot_name)!
    const monthKey = `${payment.month.toString().padStart(2, '0')}`

    // Инициализируем данные месяца если их нет
    if (!stats.months[monthKey]) {
      stats.months[monthKey] = {
        month_name: payment.month_name,
        rub_income: 0,
        stars_income: 0,
        rub_transactions: 0,
        stars_transactions: 0,
      }
    }

    const monthStats = stats.months[monthKey]

    // Обновляем статистику в зависимости от валюты
    if (payment.currency === 'RUB' && payment.amount > 0) {
      stats.total_rub_income += payment.amount
      stats.rub_transactions += 1
      monthStats.rub_income += payment.amount
      monthStats.rub_transactions += 1
    } else if (payment.currency === 'STARS' && payment.stars > 0) {
      stats.total_stars_income += payment.stars
      stats.stars_transactions += 1
      monthStats.stars_income += payment.stars
      monthStats.stars_transactions += 1
    }
  })

  return Array.from(statsMap.values()).sort((a, b) =>
    a.bot_name.localeCompare(b.bot_name)
  )
}

/**
 * Отображает отчет о прибыльности ботов в консоли
 *
 * @param stats - Статистика прибыльности ботов
 */
export const displayBotProfitabilityReport = (
  stats: BotProfitabilityStats[]
): void => {
  console.log('\n📈 АНАЛИЗ ПРИБЫЛЬНОСТИ БОТОВ')
  console.log('=' * 80)

  if (stats.length === 0) {
    console.log('❌ Данные не найдены')
    return
  }

  let totalRubIncome = 0
  let totalStarsIncome = 0

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

  console.log('\n' + '=' * 80)
  console.log('📊 ОБЩИЙ ИТОГ:')
  console.log(`💰 Общий доход в рублях: ${totalRubIncome.toFixed(2)} RUB`)
  console.log(`⭐ Общий доход в звездах: ${totalStarsIncome} STARS`)
  console.log(`🤖 Количество активных ботов: ${stats.length}`)
  console.log('=' * 80)
}
