import { Scenes } from 'telegraf'
import { MyContext } from '@/interfaces'
import { ModeEnum } from '@/interfaces/modes'
import {
  getUserBalanceStats,
  getUserDetailsSubscription,
} from '@/core/supabase'
import { supabase } from '@/core/supabase'
import { logger } from '@/utils/logger'

/**
 * Интерактивная сцена статистики
 * Обрабатывает callback_query от кнопок меню статистики
 */
export const statsScene = new Scenes.BaseScene<MyContext>(ModeEnum.Stats)

// Обработчик входа в сцену
statsScene.enter(async ctx => {
  try {
    const telegram_id = ctx.from?.id?.toString()
    if (!telegram_id) {
      await ctx.reply('❌ Ошибка: не удалось определить пользователя')
      return
    }

    const is_ru = ctx.session?.language === 'ru' || true // По умолчанию русский
    const bot_name = ctx.botInfo?.username || 'unknown_bot'

    logger.info('📊 Вход в сцену статистики', {
      description: 'Entering stats scene',
      telegram_id,
      bot_name,
    })

    await sendMainStatsMenu(ctx, telegram_id, is_ru, bot_name)
  } catch (error) {
    logger.error('❌ Ошибка входа в сцену статистики', {
      description: 'Error entering stats scene',
      error: error instanceof Error ? error.message : String(error),
    })
    await ctx.reply('❌ Произошла ошибка при загрузке статистики')
  }
})

// Обработчик callback_query для кнопок меню
statsScene.action(/^stats_(.+)_(\d+)$/, async ctx => {
  try {
    const match = ctx.match
    const action = match[1] // balance, services, payments, bots, refresh
    const telegram_id = match[2]

    // Проверяем, что пользователь имеет право на эту статистику
    if (telegram_id !== ctx.from?.id?.toString()) {
      await ctx.answerCbQuery('❌ Нет доступа к этой статистике')
      return
    }

    const is_ru = ctx.session?.language === 'ru' || true
    const bot_name = ctx.botInfo?.username || 'unknown_bot'

    logger.info('🔄 Обработка действия статистики', {
      description: 'Processing stats action',
      action,
      telegram_id,
      bot_name,
    })

    await ctx.answerCbQuery() // Убираем индикатор загрузки

    switch (action) {
      case 'balance':
        await showBalanceDetails(ctx, telegram_id, is_ru, bot_name)
        break
      case 'services':
        await showServiceUsage(ctx, telegram_id, is_ru, bot_name)
        break
      case 'payments':
        await showPaymentHistory(ctx, telegram_id, is_ru, bot_name)
        break
      case 'bots':
        await showUserBots(ctx, telegram_id, is_ru, bot_name)
        break
      case 'refresh':
        await sendMainStatsMenu(ctx, telegram_id, is_ru, bot_name)
        break
      default:
        await ctx.reply('❌ Неизвестное действие')
    }
  } catch (error) {
    logger.error('❌ Ошибка обработки действия статистики', {
      description: 'Error processing stats action',
      error: error instanceof Error ? error.message : String(error),
    })
    await ctx.reply('❌ Произошла ошибка при обработке запроса')
  }
})

// Обработчик возврата в главное меню
statsScene.action(/^main_menu_(\d+)$/, async ctx => {
  try {
    await ctx.answerCbQuery()
    await ctx.scene.leave()
    // Здесь можно добавить переход в главное меню
    await ctx.reply(
      ctx.session?.language === 'ru' || true
        ? '🏠 Возврат в главное меню'
        : '🏠 Back to main menu'
    )
  } catch (error) {
    logger.error('❌ Ошибка возврата в главное меню', {
      description: 'Error returning to main menu',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// Функция отправки главного меню статистики
async function sendMainStatsMenu(
  ctx: MyContext,
  telegram_id: string,
  is_ru: boolean,
  bot_name: string
) {
  try {
    // Получаем базовую статистику
    const balanceStats = await getUserBalanceStats(telegram_id, bot_name)
    const subscriptionDetails = await getUserDetailsSubscription(telegram_id)

    // Формируем текст меню
    const menuText = is_ru
      ? `📊 *Ваша статистика*\n\n` +
        `💰 *Баланс:* ${balanceStats.stars.toFixed(2)} ⭐️\n` +
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
        `Выберите раздел для подробной информации:`
      : `📊 *Your Statistics*\n\n` +
        `💰 *Balance:* ${balanceStats.stars.toFixed(2)} ⭐️\n` +
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
        `Choose a section for detailed information:`

    // Формируем клавиатуру
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: is_ru ? '💰 Детали баланса' : '💰 Balance Details',
            callback_data: `stats_balance_${telegram_id}`,
          },
          {
            text: is_ru ? '📊 Использование сервисов' : '📊 Service Usage',
            callback_data: `stats_services_${telegram_id}`,
          },
        ],
        [
          {
            text: is_ru ? '💳 История платежей' : '💳 Payment History',
            callback_data: `stats_payments_${telegram_id}`,
          },
          {
            text: is_ru ? '🤖 Мои боты' : '🤖 My Bots',
            callback_data: `stats_bots_${telegram_id}`,
          },
        ],
        [
          {
            text: is_ru ? '🔄 Обновить' : '🔄 Refresh',
            callback_data: `stats_refresh_${telegram_id}`,
          },
          {
            text: is_ru ? '🏠 Главное меню' : '🏠 Main Menu',
            callback_data: `main_menu_${telegram_id}`,
          },
        ],
      ],
    }

    // Отправляем или редактируем сообщение
    if (ctx.callbackQuery) {
      await ctx.editMessageText(menuText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      })
    } else {
      await ctx.reply(menuText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      })
    }
  } catch (error) {
    logger.error('❌ Ошибка отправки главного меню статистики', {
      description: 'Error sending main stats menu',
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

// Функция показа деталей баланса
async function showBalanceDetails(
  ctx: MyContext,
  telegram_id: string,
  is_ru: boolean,
  bot_name: string
) {
  try {
    const balanceStats = await getUserBalanceStats(telegram_id, bot_name)

    const detailsText = is_ru
      ? `💰 *Детали баланса*\n\n` +
          `💎 *Текущий баланс:* ${balanceStats.stars.toFixed(2)} ⭐️\n` +
          `📈 *Всего потрачено:* ${balanceStats.total_spent.toFixed(2)} ⭐️\n` +
          `📊 *Всего пополнено:* ${balanceStats.total_added.toFixed(2)} ⭐️\n` +
          `🎁 *Бонусные звезды:* ${balanceStats.bonus_stars.toFixed(2)} ⭐️\n` +
          `⭐️ *Купленные звезды:* ${balanceStats.added_stars.toFixed(
            2
          )} ⭐️\n` +
          `💸 *Пополнено рублями:* ${balanceStats.added_rub.toFixed(2)} ₽\n\n` +
          `📊 *Использование по сервисам:*\n` +
          Object.entries(balanceStats.services)
            .map(
              ([service, amount]) => `• ${service}: ${amount.toFixed(2)} ⭐️`
            )
            .join('\n') || 'Нет данных'
      : `💰 *Balance Details*\n\n` +
          `💎 *Current Balance:* ${balanceStats.stars.toFixed(2)} ⭐️\n` +
          `📈 *Total Spent:* ${balanceStats.total_spent.toFixed(2)} ⭐️\n` +
          `📊 *Total Added:* ${balanceStats.total_added.toFixed(2)} ⭐️\n` +
          `🎁 *Bonus Stars:* ${balanceStats.bonus_stars.toFixed(2)} ⭐️\n` +
          `⭐️ *Purchased Stars:* ${balanceStats.added_stars.toFixed(
            2
          )} ⭐️\n` +
          `💸 *Added in Rubles:* ${balanceStats.added_rub.toFixed(2)} ₽\n\n` +
          `📊 *Usage by Services:*\n` +
          Object.entries(balanceStats.services)
            .map(
              ([service, amount]) => `• ${service}: ${amount.toFixed(2)} ⭐️`
            )
            .join('\n') || 'No data'

    const backKeyboard = {
      inline_keyboard: [
        [
          {
            text: is_ru ? '⬅️ Назад' : '⬅️ Back',
            callback_data: `stats_refresh_${telegram_id}`,
          },
        ],
      ],
    }

    await ctx.editMessageText(detailsText, {
      parse_mode: 'Markdown',
      reply_markup: backKeyboard,
    })
  } catch (error) {
    logger.error('❌ Ошибка показа деталей баланса', {
      description: 'Error showing balance details',
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

// Функция показа использования сервисов
async function showServiceUsage(
  ctx: MyContext,
  telegram_id: string,
  is_ru: boolean,
  bot_name: string
) {
  try {
    const { data: servicesData } = await supabase
      .from('payments_v2')
      .select('service_type, stars, created_at')
      .eq('telegram_id', telegram_id)
      .eq('type', 'MONEY_OUTCOME')
      .eq('status', 'COMPLETED')
      .not('service_type', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)

    const serviceCount: Record<string, { count: number; total: number }> = {}
    servicesData?.forEach(payment => {
      if (payment.service_type) {
        if (!serviceCount[payment.service_type]) {
          serviceCount[payment.service_type] = { count: 0, total: 0 }
        }
        serviceCount[payment.service_type].count++
        serviceCount[payment.service_type].total += payment.stars || 0
      }
    })

    const servicesText = is_ru
      ? `📊 *Использование сервисов*\n\n` +
          `📈 *Статистика по сервисам:*\n` +
          Object.entries(serviceCount)
            .sort(([, a], [, b]) => b.count - a.count)
            .map(
              ([service, data]) =>
                `• *${service}*: ${data.count} раз (${data.total.toFixed(
                  2
                )} ⭐️)`
            )
            .join('\n') ||
        'Нет данных\n\n' +
          `📅 *Последние операции:*\n` +
          (servicesData
            ?.slice(0, 5)
            .map(
              payment =>
                `• ${payment.service_type}: ${payment.stars?.toFixed(
                  2
                )} ⭐️ (${new Date(payment.created_at).toLocaleDateString(
                  'ru'
                )})`
            )
            .join('\n') || 'Нет данных')
      : `📊 *Service Usage*\n\n` +
          `📈 *Statistics by Services:*\n` +
          Object.entries(serviceCount)
            .sort(([, a], [, b]) => b.count - a.count)
            .map(
              ([service, data]) =>
                `• *${service}*: ${data.count} times (${data.total.toFixed(
                  2
                )} ⭐️)`
            )
            .join('\n') ||
        'No data\n\n' +
          `📅 *Recent Operations:*\n` +
          (servicesData
            ?.slice(0, 5)
            .map(
              payment =>
                `• ${payment.service_type}: ${payment.stars?.toFixed(
                  2
                )} ⭐️ (${new Date(payment.created_at).toLocaleDateString(
                  'en'
                )})`
            )
            .join('\n') || 'No data')

    const backKeyboard = {
      inline_keyboard: [
        [
          {
            text: is_ru ? '⬅️ Назад' : '⬅️ Back',
            callback_data: `stats_refresh_${telegram_id}`,
          },
        ],
      ],
    }

    await ctx.editMessageText(servicesText, {
      parse_mode: 'Markdown',
      reply_markup: backKeyboard,
    })
  } catch (error) {
    logger.error('❌ Ошибка показа использования сервисов', {
      description: 'Error showing service usage',
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

// Функция показа истории платежей
async function showPaymentHistory(
  ctx: MyContext,
  telegram_id: string,
  is_ru: boolean,
  bot_name: string
) {
  try {
    const { data: paymentsData } = await supabase
      .from('payments_v2')
      .select('type, stars, description, created_at, payment_method')
      .eq('telegram_id', telegram_id)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(10)

    const paymentsText = is_ru
      ? `💳 *История платежей*\n\n` +
        `📅 *Последние 10 операций:*\n\n` +
        (paymentsData
          ?.map((payment, index) => {
            const typeIcon = payment.type === 'MONEY_INCOME' ? '💰' : '💸'
            const sign = payment.type === 'MONEY_INCOME' ? '+' : '-'
            return (
              `${index + 1}. ${typeIcon} ${sign}${payment.stars?.toFixed(
                2
              )} ⭐️\n` +
              `   📝 ${payment.description || 'Без описания'}\n` +
              `   💳 ${payment.payment_method || 'Неизвестно'}\n` +
              `   📅 ${new Date(payment.created_at).toLocaleDateString('ru')}`
            )
          })
          .join('\n\n') || 'Нет данных')
      : `💳 *Payment History*\n\n` +
        `📅 *Last 10 Operations:*\n\n` +
        (paymentsData
          ?.map((payment, index) => {
            const typeIcon = payment.type === 'MONEY_INCOME' ? '💰' : '💸'
            const sign = payment.type === 'MONEY_INCOME' ? '+' : '-'
            return (
              `${index + 1}. ${typeIcon} ${sign}${payment.stars?.toFixed(
                2
              )} ⭐️\n` +
              `   📝 ${payment.description || 'No description'}\n` +
              `   💳 ${payment.payment_method || 'Unknown'}\n` +
              `   📅 ${new Date(payment.created_at).toLocaleDateString('en')}`
            )
          })
          .join('\n\n') || 'No data')

    const backKeyboard = {
      inline_keyboard: [
        [
          {
            text: is_ru ? '⬅️ Назад' : '⬅️ Back',
            callback_data: `stats_refresh_${telegram_id}`,
          },
        ],
      ],
    }

    await ctx.editMessageText(paymentsText, {
      parse_mode: 'Markdown',
      reply_markup: backKeyboard,
    })
  } catch (error) {
    logger.error('❌ Ошибка показа истории платежей', {
      description: 'Error showing payment history',
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

// Функция показа ботов пользователя
async function showUserBots(
  ctx: MyContext,
  telegram_id: string,
  is_ru: boolean,
  bot_name: string
) {
  try {
    // Получаем список ботов пользователя
    const { data: userBots } = await supabase
      .from('payments_v2')
      .select('bot_name, created_at')
      .eq('telegram_id', telegram_id)
      .eq('status', 'COMPLETED')

    const botStats: Record<string, { first_use: string; operations: number }> =
      {}
    userBots?.forEach(payment => {
      if (payment.bot_name) {
        if (!botStats[payment.bot_name]) {
          botStats[payment.bot_name] = {
            first_use: payment.created_at,
            operations: 0,
          }
        }
        botStats[payment.bot_name].operations++
        if (payment.created_at < botStats[payment.bot_name].first_use) {
          botStats[payment.bot_name].first_use = payment.created_at
        }
      }
    })

    const botsText = is_ru
      ? `🤖 *Мои боты*\n\n` +
          `📊 *Статистика использования:*\n\n` +
          Object.entries(botStats)
            .sort(([, a], [, b]) => b.operations - a.operations)
            .map(
              ([bot, data], index) =>
                `${index + 1}. *@${bot}*\n` +
                `   📈 Операций: ${data.operations}\n` +
                `   📅 Первое использование: ${new Date(
                  data.first_use
                ).toLocaleDateString('ru')}\n` +
                `   ${bot === bot_name ? '👈 *Текущий бот*' : ''}`
            )
            .join('\n') ||
        'Нет данных\n\n' +
          `ℹ️ *Примечание:* Вы видите только боты, которыми пользовались`
      : `🤖 *My Bots*\n\n` +
          `📊 *Usage Statistics:*\n\n` +
          Object.entries(botStats)
            .sort(([, a], [, b]) => b.operations - a.operations)
            .map(
              ([bot, data], index) =>
                `${index + 1}. *@${bot}*\n` +
                `   📈 Operations: ${data.operations}\n` +
                `   📅 First use: ${new Date(data.first_use).toLocaleDateString(
                  'en'
                )}\n` +
                `   ${bot === bot_name ? '👈 *Current bot*' : ''}`
            )
            .join('\n') ||
        'No data\n\n' + `ℹ️ *Note:* You only see bots you have used`

    const backKeyboard = {
      inline_keyboard: [
        [
          {
            text: is_ru ? '⬅️ Назад' : '⬅️ Back',
            callback_data: `stats_refresh_${telegram_id}`,
          },
        ],
      ],
    }

    await ctx.editMessageText(botsText, {
      parse_mode: 'Markdown',
      reply_markup: backKeyboard,
    })
  } catch (error) {
    logger.error('❌ Ошибка показа ботов пользователя', {
      description: 'Error showing user bots',
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
