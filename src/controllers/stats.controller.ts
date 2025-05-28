import { Request, Response, NextFunction } from 'express'
import {
  getUserBalanceStats,
  getUserDetailsSubscription,
} from '@/core/supabase'
import { supabase } from '@/core/supabase'
import { logger } from '@/utils/logger'
import { getBotByName } from '@/core/bot'

// Импортируем Zod схемы и типы
import {
  UserStatsRequest,
  BotStatsRequest,
  UserStatsResponse,
  BotStatsResponse,
} from '@/schemas/api/stats.schemas'

/**
 * Контроллер статистики с интерактивным меню
 * Предоставляет детальную статистику для пользователей с ограничениями по ботам
 */
export class StatsController {
  /**
   * Получение статистики пользователя
   * Пользователи видят только статистику своих ботов
   */
  public getUserStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = req.body as UserStatsRequest

      logger.info('📊 Запрос статистики пользователя', {
        description: 'User stats request',
        telegram_id: validatedData.telegram_id,
        bot_name: validatedData.bot_name,
      })

      // Получаем статистику баланса
      const balanceStats = await getUserBalanceStats(
        validatedData.telegram_id,
        validatedData.bot_name
      )

      // Получаем статистику подписки
      const subscriptionDetails = await getUserDetailsSubscription(
        validatedData.telegram_id
      )

      // Получаем информацию о пользователе
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('level, created_at, last_activity')
        .eq('telegram_id', validatedData.telegram_id)
        .single()

      if (userError) {
        logger.error('❌ Ошибка получения данных пользователя', {
          description: 'Error getting user data',
          telegram_id: validatedData.telegram_id,
          error: userError.message,
        })
        res.status(404).json({
          success: false,
          message: 'Пользователь не найден',
        })
        return
      }

      // Получаем статистику генераций
      const { data: generationsData } = await supabase
        .from('payments_v2')
        .select('service_type')
        .eq('telegram_id', validatedData.telegram_id)
        .eq('type', 'MONEY_OUTCOME')
        .eq('status', 'COMPLETED')
        .not('service_type', 'is', null)

      const totalGenerations = generationsData?.length || 0

      // Определяем любимые сервисы
      const serviceCount: Record<string, number> = {}
      generationsData?.forEach(payment => {
        if (payment.service_type) {
          serviceCount[payment.service_type] =
            (serviceCount[payment.service_type] || 0) + 1
        }
      })

      const favoriteServices = Object.entries(serviceCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([service]) => service)

      // Рассчитываем дни до окончания подписки
      let daysRemaining: number | null = null
      if (
        subscriptionDetails.isSubscriptionActive &&
        subscriptionDetails.subscriptionStartDate
      ) {
        const startDate = new Date(subscriptionDetails.subscriptionStartDate)
        const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000) // +30 дней
        const now = new Date()
        daysRemaining = Math.ceil(
          (endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        )
      }

      const response: UserStatsResponse = {
        success: true,
        message: 'Статистика получена успешно',
        data: {
          balance: {
            stars: balanceStats.stars,
            total_added: balanceStats.total_added,
            total_spent: balanceStats.total_spent,
            bonus_stars: balanceStats.bonus_stars,
            added_stars: balanceStats.added_stars,
            added_rub: balanceStats.added_rub,
            services: balanceStats.services,
            payment_methods: balanceStats.payment_methods,
          },
          subscription: {
            isSubscriptionActive: subscriptionDetails.isSubscriptionActive,
            subscriptionType: subscriptionDetails.subscriptionType,
            subscriptionStartDate: subscriptionDetails.subscriptionStartDate,
            daysRemaining,
          },
          user_level: userData.level || 0,
          registration_date: userData.created_at,
          last_activity: userData.last_activity,
          total_generations: totalGenerations,
          favorite_services: favoriteServices,
        },
      }

      logger.info('✅ Статистика пользователя отправлена', {
        description: 'User stats sent successfully',
        telegram_id: validatedData.telegram_id,
        total_generations: totalGenerations,
        balance: balanceStats.stars,
      })

      res.status(200).json(response)
    } catch (error) {
      logger.error('❌ Ошибка в getUserStats контроллере', {
        description: 'Error in getUserStats controller',
        error: error instanceof Error ? error.message : String(error),
        telegram_id: req.body?.telegram_id,
      })
      next(error)
    }
  }

  /**
   * Получение статистики по ботам
   * Пользователи видят только свои боты, админы - все
   */
  public getBotStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = req.body as BotStatsRequest

      logger.info('🤖 Запрос статистики по ботам', {
        description: 'Bot stats request',
        telegram_id: validatedData.telegram_id,
        bot_name: validatedData.bot_name,
        target_bot: validatedData.target_bot,
      })

      // Проверяем, является ли пользователь админом
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('telegram_id', validatedData.telegram_id)
        .single()

      const isAdmin =
        userData?.role === 'admin' || userData?.role === 'super_admin'

      // Получаем список ботов пользователя
      const { data: userBots } = await supabase
        .from('payments_v2')
        .select('bot_name')
        .eq('telegram_id', validatedData.telegram_id)
        .eq('status', 'COMPLETED')

      const userBotNames = [...new Set(userBots?.map(p => p.bot_name) || [])]

      // Определяем, какие боты показывать
      let botsToShow: string[] = []
      if (isAdmin) {
        // Админы видят все боты
        const { data: allBots } = await supabase
          .from('payments_v2')
          .select('bot_name')
          .eq('status', 'COMPLETED')

        botsToShow = [...new Set(allBots?.map(p => p.bot_name) || [])]
      } else {
        // Обычные пользователи видят только свои боты
        botsToShow = userBotNames
      }

      // Если указан конкретный бот, проверяем доступ
      if (validatedData.target_bot) {
        if (!isAdmin && !userBotNames.includes(validatedData.target_bot)) {
          res.status(403).json({
            success: false,
            message: 'Нет доступа к статистике этого бота',
          })
          return
        }
        botsToShow = [validatedData.target_bot]
      }

      // Получаем статистику для каждого бота
      const botStatsPromises = botsToShow.map(async botName => {
        // Общее количество пользователей бота
        const { data: totalUsersData } = await supabase
          .from('payments_v2')
          .select('telegram_id')
          .eq('bot_name', botName)
          .eq('status', 'COMPLETED')

        const totalUsers = new Set(
          totalUsersData?.map(p => p.telegram_id) || []
        ).size

        // Активные пользователи сегодня
        const today = new Date().toISOString().split('T')[0]
        const { data: activeTodayData } = await supabase
          .from('payments_v2')
          .select('telegram_id')
          .eq('bot_name', botName)
          .eq('status', 'COMPLETED')
          .gte('created_at', today)

        const activeUsersToday = new Set(
          activeTodayData?.map(p => p.telegram_id) || []
        ).size

        // Общее количество генераций
        const { data: generationsData } = await supabase
          .from('payments_v2')
          .select('id')
          .eq('bot_name', botName)
          .eq('type', 'MONEY_OUTCOME')
          .eq('status', 'COMPLETED')

        const totalGenerations = generationsData?.length || 0

        // Доход сегодня
        const { data: revenueTodayData } = await supabase
          .from('payments_v2')
          .select('stars')
          .eq('bot_name', botName)
          .eq('type', 'MONEY_INCOME')
          .eq('status', 'COMPLETED')
          .gte('created_at', today)

        const revenueToday =
          revenueTodayData?.reduce((sum, p) => sum + (p.stars || 0), 0) || 0

        // Общий доход
        const { data: revenueTotalData } = await supabase
          .from('payments_v2')
          .select('stars')
          .eq('bot_name', botName)
          .eq('type', 'MONEY_INCOME')
          .eq('status', 'COMPLETED')

        const revenueTotal =
          revenueTotalData?.reduce((sum, p) => sum + (p.stars || 0), 0) || 0

        return {
          bot_name: botName,
          total_users: totalUsers,
          active_users_today: activeUsersToday,
          total_generations: totalGenerations,
          revenue_today: revenueToday,
          revenue_total: revenueTotal,
        }
      })

      const botStats = await Promise.all(botStatsPromises)

      const response: BotStatsResponse = {
        success: true,
        message: 'Статистика по ботам получена успешно',
        data: {
          user_bots: botStats,
          accessible_bots: botsToShow,
        },
      }

      logger.info('✅ Статистика по ботам отправлена', {
        description: 'Bot stats sent successfully',
        telegram_id: validatedData.telegram_id,
        bots_count: botStats.length,
        is_admin: isAdmin,
      })

      res.status(200).json(response)
    } catch (error) {
      logger.error('❌ Ошибка в getBotStats контроллере', {
        description: 'Error in getBotStats controller',
        error: error instanceof Error ? error.message : String(error),
        telegram_id: req.body?.telegram_id,
      })
      next(error)
    }
  }

  /**
   * Интерактивное меню статистики
   * Отправляет красивое меню с кнопками в Telegram
   */
  public sendInteractiveStatsMenu = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = req.body as UserStatsRequest

      logger.info('📱 Отправка интерактивного меню статистики', {
        description: 'Sending interactive stats menu',
        telegram_id: validatedData.telegram_id,
        bot_name: validatedData.bot_name,
      })

      const { bot } = getBotByName(validatedData.bot_name)
      if (!bot) {
        res.status(400).json({
          success: false,
          message: 'Бот не найден',
        })
        return
      }

      // Получаем базовую статистику для отображения
      const balanceStats = await getUserBalanceStats(
        validatedData.telegram_id,
        validatedData.bot_name
      )

      const subscriptionDetails = await getUserDetailsSubscription(
        validatedData.telegram_id
      )

      // Формируем текст меню
      const menuText = validatedData.is_ru
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
              text: validatedData.is_ru
                ? '💰 Детали баланса'
                : '💰 Balance Details',
              callback_data: `stats_balance_${validatedData.telegram_id}`,
            },
            {
              text: validatedData.is_ru
                ? '📊 Использование сервисов'
                : '📊 Service Usage',
              callback_data: `stats_services_${validatedData.telegram_id}`,
            },
          ],
          [
            {
              text: validatedData.is_ru
                ? '💳 История платежей'
                : '💳 Payment History',
              callback_data: `stats_payments_${validatedData.telegram_id}`,
            },
            {
              text: validatedData.is_ru ? '🤖 Мои боты' : '🤖 My Bots',
              callback_data: `stats_bots_${validatedData.telegram_id}`,
            },
          ],
          [
            {
              text: validatedData.is_ru ? '🔄 Обновить' : '🔄 Refresh',
              callback_data: `stats_refresh_${validatedData.telegram_id}`,
            },
            {
              text: validatedData.is_ru ? '🏠 Главное меню' : '🏠 Main Menu',
              callback_data: `main_menu_${validatedData.telegram_id}`,
            },
          ],
        ],
      }

      // Отправляем меню
      await bot.telegram.sendMessage(validatedData.telegram_id, menuText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      })

      logger.info('✅ Интерактивное меню статистики отправлено', {
        description: 'Interactive stats menu sent successfully',
        telegram_id: validatedData.telegram_id,
        balance: balanceStats.stars,
        subscription_active: subscriptionDetails.isSubscriptionActive,
      })

      res.status(200).json({
        success: true,
        message: 'Интерактивное меню отправлено',
      })
    } catch (error) {
      logger.error('❌ Ошибка в sendInteractiveStatsMenu контроллере', {
        description: 'Error in sendInteractiveStatsMenu controller',
        error: error instanceof Error ? error.message : String(error),
        telegram_id: req.body?.telegram_id,
      })
      next(error)
    }
  }
}
