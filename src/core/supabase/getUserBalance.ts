import { supabase } from './index'
import { logger } from '@/utils/logger'

/**
 * Получает баланс пользователя путем суммирования всех транзакций в таблице payments
 * @param telegram_id ID пользователя в Telegram
 * @returns Promise<number> Текущий баланс пользователя
 */
export const getUserBalance = async (telegram_id: string): Promise<number> => {
  try {
    // Проверяем существует ли пользователь
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegram_id)
      .single()

    if (userError) {
      if (userError.code === 'PGRST116') {
        logger.error(`❌ Пользователь с ID ${telegram_id} не найден.`, {
          description: 'User not found',
          telegram_id,
        })
        throw new Error('Пользователь не найден')
      }
      logger.error('❌ Ошибка при проверке пользователя:', {
        description: 'Error checking user',
        telegram_id,
        error: userError.message,
      })
      throw new Error('Не удалось проверить существование пользователя')
    }

    // Получаем все записи доходов (income)
    const { data: incomeData, error: incomeError } = await supabase
      .from('payments')
      .select('stars')
      .eq('telegram_id', telegram_id)
      .eq('type', 'income')
      .eq('status', 'COMPLETED')

    if (incomeError) {
      logger.error('❌ Ошибка при получении записей о доходах:', {
        description: 'Error fetching income records',
        telegram_id,
        error: incomeError.message,
      })
      throw new Error('Не удалось получить записи о доходах')
    }

    // Получаем все записи расходов (outcome)
    const { data: outcomeData, error: outcomeError } = await supabase
      .from('payments')
      .select('stars')
      .eq('telegram_id', telegram_id)
      .eq('type', 'outcome')
      .eq('status', 'COMPLETED')

    if (outcomeError) {
      logger.error('❌ Ошибка при получении записей о расходах:', {
        description: 'Error fetching outcome records',
        telegram_id,
        error: outcomeError.message,
      })
      throw new Error('Не удалось получить записи о расходах')
    }

    // Суммируем все доходы (income)
    const totalIncome = incomeData.reduce(
      (sum, record) => sum + (record.stars || 0),
      0
    )

    // Суммируем все расходы (outcome)
    const totalOutcome = outcomeData.reduce(
      (sum, record) => sum + (record.stars || 0),
      0
    )

    // Вычисляем итоговый баланс
    const balance = totalIncome - totalOutcome

    logger.info('💰 Баланс пользователя рассчитан:', {
      description: 'User balance calculated',
      telegram_id,
      totalIncome,
      totalOutcome,
      balance,
    })

    return balance
  } catch (error) {
    // Если произошла неожиданная ошибка, логируем её и пробрасываем дальше
    if (error instanceof Error) {
      if (error.message === 'Пользователь не найден') {
        throw error
      }
      logger.error('❌ Неожиданная ошибка при расчете баланса:', {
        description: 'Unexpected error calculating balance',
        telegram_id,
        error: error.message,
        stack: error.stack,
      })
    }
    throw new Error('Не удалось рассчитать баланс пользователя')
  }
}
