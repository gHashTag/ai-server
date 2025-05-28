import { MyContext } from '@/interfaces'
import { ModeEnum } from '@/interfaces/modes'
import { logger } from '@/utils/logger'

/**
 * Команда /stats для вызова интерактивного меню статистики
 * Доступна всем пользователям, показывает только их данные
 */
export const statsCommand = async (ctx: MyContext) => {
  try {
    const telegram_id = ctx.from?.id?.toString()
    if (!telegram_id) {
      await ctx.reply('❌ Ошибка: не удалось определить пользователя')
      return
    }

    const is_ru = ctx.session?.language === 'ru' || true // По умолчанию русский
    const bot_name = ctx.botInfo?.username || 'unknown_bot'

    logger.info('📊 Команда /stats вызвана', {
      description: 'Stats command called',
      telegram_id,
      bot_name,
      is_ru,
    })

    // Переходим в сцену статистики
    await ctx.scene.enter(ModeEnum.Stats)
  } catch (error) {
    logger.error('❌ Ошибка в команде /stats', {
      description: 'Error in stats command',
      error: error instanceof Error ? error.message : String(error),
      telegram_id: ctx.from?.id?.toString(),
    })

    const is_ru = ctx.session?.language === 'ru' || true
    await ctx.reply(
      is_ru
        ? '❌ Произошла ошибка при загрузке статистики. Попробуйте позже.'
        : '❌ An error occurred while loading statistics. Please try again later.'
    )
  }
}

/**
 * Команда /balance для быстрого доступа к балансу
 * Упрощенная версия без полной статистики
 */
export const balanceCommand = async (ctx: MyContext) => {
  try {
    const telegram_id = ctx.from?.id?.toString()
    if (!telegram_id) {
      await ctx.reply('❌ Ошибка: не удалось определить пользователя')
      return
    }

    const is_ru = ctx.session?.language === 'ru' || true
    const bot_name = ctx.botInfo?.username || 'unknown_bot'

    logger.info('💰 Команда /balance вызвана', {
      description: 'Balance command called',
      telegram_id,
      bot_name,
    })

    // Импортируем функции динамически для избежания циклических зависимостей
    const { getUserBalanceStats, getUserDetailsSubscription } = await import(
      '@/core/supabase'
    )

    // Получаем статистику баланса
    const balanceStats = await getUserBalanceStats(telegram_id, bot_name)
    const subscriptionDetails = await getUserDetailsSubscription(telegram_id)

    // Формируем сообщение о балансе
    const balanceText = is_ru
      ? `💰 *Ваш баланс*\n\n` +
        `💎 *Текущий баланс:* ${balanceStats.stars.toFixed(2)} ⭐️\n` +
        `📈 *Всего потрачено:* ${balanceStats.total_spent.toFixed(2)} ⭐️\n` +
        `📊 *Всего пополнено:* ${balanceStats.total_added.toFixed(2)} ⭐️\n` +
        `🎁 *Бонусы:* ${balanceStats.bonus_stars.toFixed(2)} ⭐️\n\n` +
        `${
          subscriptionDetails.isSubscriptionActive
            ? `✅ *Подписка:* ${
                subscriptionDetails.subscriptionType || 'Активна'
              }`
            : '❌ *Подписка:* Неактивна'
        }\n\n` +
        `Для подробной статистики используйте /stats`
      : `💰 *Your Balance*\n\n` +
        `💎 *Current Balance:* ${balanceStats.stars.toFixed(2)} ⭐️\n` +
        `📈 *Total Spent:* ${balanceStats.total_spent.toFixed(2)} ⭐️\n` +
        `📊 *Total Added:* ${balanceStats.total_added.toFixed(2)} ⭐️\n` +
        `🎁 *Bonuses:* ${balanceStats.bonus_stars.toFixed(2)} ⭐️\n\n` +
        `${
          subscriptionDetails.isSubscriptionActive
            ? `✅ *Subscription:* ${
                subscriptionDetails.subscriptionType || 'Active'
              }`
            : '❌ *Subscription:* Inactive'
        }\n\n` +
        `For detailed statistics use /stats`

    // Добавляем кнопки для быстрых действий
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: is_ru ? '📊 Подробная статистика' : '📊 Detailed Statistics',
            callback_data: `stats_refresh_${telegram_id}`,
          },
        ],
        [
          {
            text: is_ru ? '💎 Пополнить баланс' : '💎 Top Up Balance',
            callback_data: `topup_${telegram_id}`,
          },
        ],
      ],
    }

    await ctx.reply(balanceText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })

    logger.info('✅ Баланс отправлен пользователю', {
      description: 'Balance sent to user',
      telegram_id,
      balance: balanceStats.stars,
      subscription_active: subscriptionDetails.isSubscriptionActive,
    })
  } catch (error) {
    logger.error('❌ Ошибка в команде /balance', {
      description: 'Error in balance command',
      error: error instanceof Error ? error.message : String(error),
      telegram_id: ctx.from?.id?.toString(),
    })

    const is_ru = ctx.session?.language === 'ru' || true
    await ctx.reply(
      is_ru
        ? '❌ Произошла ошибка при загрузке баланса. Попробуйте позже.'
        : '❌ An error occurred while loading balance. Please try again later.'
    )
  }
}
