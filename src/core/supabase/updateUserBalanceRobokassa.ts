// src/core/supabase/updateUserBalance.ts
import { supabase } from '@/core/supabase'
import { logger } from '@/utils/logger'
import { invalidateBalanceCache } from './getUserBalance'

type BalanceUpdateMetadata = {
  // ... разные метаданные
  [key: string]: any
}

/**
 * Создает или обновляет запись о транзакции в таблице payments
 * @returns Promise<boolean> - успешно ли выполнено добавление/обновление записи
 */
export const updateUserBalanceRobokassa = async (
  telegram_id: string,
  amount: number, // Сумма изменения баланса (положительная для income, отрицательная для outcome)
  type: 'money_income' | 'money_outcome', // Тип операции
  description?: string,
  metadata?: BalanceUpdateMetadata
): Promise<boolean> => {
  try {
    logger.info('🔍 Входные данные updateUserBalance:', {
      /*...*/
    })

    // ... Проверки входных данных (telegram_id, amount) ...

    const safeAmount = Number(amount) // Безопасное преобразование

    // ... Логика обработки amount (если передан баланс вместо суммы, проверка на большие суммы) ...

    // ... Проверка существования пользователя и его баланса для outcome операций ...
    // Важно: Получает текущий баланс, вызывает supabase.rpc('get_user_balance', ...) или считает по payments_v2
    // Проверяет, достаточно ли средств (currentBalance < safeAmount)

    // ... Проверка наличия inv_id в metadata для обновления существующей записи ...
    if (metadata?.inv_id) {
      // Обновляем существующую запись в payments_v2 на COMPLETED
      // ...
    } else {
      // Если inv_id не передан, создаем новую запись в payments_v2
      const invId = `${Date.now()}-...` // Генерация ID
      const transactionAmount = Math.abs(safeAmount)
      logger.info('💼 Создание новой записи о транзакции:', {
        /*...*/
      })

      const { error: paymentError } = await supabase
        .from('payments_v2') // Работает с НОВОЙ таблицей
        .insert({
          telegram_id,
          inv_id: invId,
          currency: metadata?.currency || 'STARS',
          amount: Math.round(transactionAmount), // Сумма операции
          status: 'COMPLETED', // Сразу ставит COMPLETED
          stars: Math.round(transactionAmount), // Предполагается, что amount == stars для системных операций
          type, // 'money_income' или 'money_outcome'
          description: description || `Balance ${type}`,
          payment_method: metadata?.service_type, // Использует service_type как payment_method? 🤔
          bot_name: metadata?.bot_name || 'neuro_blogger_bot',
          language: metadata?.language || 'ru',
          // ВАЖНО: Не устанавливает subscription_type!
        })

      if (paymentError) {
        // ... обработка ошибки ...
        return false
      }
      logger.info('✅ Транзакция успешно создана:', {
        /*...*/
      })
    }

    // --- ДОБАВЛЕНО: Инвалидация кэша ---
    // Нужно импортировать invalidateBalanceCache из ./getUserBalance
    invalidateBalanceCache(telegram_id)

    return true // Возвращает true в случае успеха
  } catch (error) {
    logger.error('❌ Ошибка в updateUserBalance:', {
      /*...*/
    })
    return false
  }
}
