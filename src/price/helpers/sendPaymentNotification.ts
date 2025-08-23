import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { logger } from '@/utils/logger'
export const sendPaymentNotification = async ({
  amount,
  stars, // Звезды все еще нужны, если это пополнение
  telegramId,
  language_code,
  username,
  groupId,
  bot,
  subscription, // Этот параметр определяет тип покупки
}: {
  amount: string
  stars: number
  telegramId: string
  language_code: string
  username: string
  groupId: string // ID группы для уведомления
  bot: Telegraf<MyContext>
  subscription?: string // Имя подписки или undefined/пусто
}) => {
  try {
    // Защитная проверка бота
    if (!bot || !bot.telegram) {
      console.error('❌ Bot instance is invalid in sendPaymentNotification');
      logger.error('[sendPaymentNotification] Bot instance is invalid');
      return; // Не бросаем ошибку, чтобы не ломать процесс платежа
    }

    let caption = '' // Инициализируем пустой строкой

    const userInfo = `@${
      username ||
      (language_code === 'ru'
        ? 'Пользователь без username'
        : 'User without username')
    } (ID: ${telegramId.toString()})`

    if (language_code === 'ru') {
      if (subscription) {
        // Если есть подписка
        caption = `✅ Пользователь ${userInfo} купил подписку "${subscription}" за ${amount} рублей.`
        // Можно добавить звезды, если хочешь: caption += `\n(Начислено звезд по тарифу: ${stars} ⭐)`;
      } else {
        // Если это пополнение звезд
        caption = `💸 Пользователь ${userInfo} пополнил баланс на ${stars} ⭐ (оплатил ${amount} рублей).`
      }
    } else {
      // Английская версия
      if (subscription) {
        caption = `✅ User ${userInfo} purchased subscription "${subscription}" for ${amount} RUB.`
        // Optional stars: caption += `\n(Stars awarded: ${stars} ⭐)`;
      } else {
        caption = `💸 User ${userInfo} topped up balance by ${stars} ⭐ (paid ${amount} RUB).`
      }
    }

    // Отправляем сформированное сообщение в группу
    await bot.telegram.sendMessage(groupId, caption) // Убедись, что groupId правильный
  } catch (error) {
    console.error('Ошибка при отправке уведомления об оплате в группу:', error)
    // Можно не бросать ошибку дальше, чтобы не ломать весь процесс из-за уведомления
    // throw new Error('Ошибка при отправке уведомления об оплате')
    logger.error(
      `[sendPaymentNotification] Failed to send group notification to ${groupId}`,
      error
    ) // Используем logger, если он доступен глобально или передан
  }
}
