import { Router } from 'express'
import { StatsController } from '@/controllers/stats.controller'
import { zodBodyValidation } from '@/middlewares/zod.middleware'

// Импортируем Zod схемы для валидации
import {
  userStatsRequestSchema,
  botStatsRequestSchema,
} from '@/schemas/api/stats.schemas'

/**
 * Маршруты для статистики с полной Zod валидацией
 * Обеспечивают безопасный доступ к статистике с ограничениями по ботам
 */
class StatsRoutes {
  public path = '/stats'
  public router = Router()
  public statsController = new StatsController()

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    // === ПОЛУЧЕНИЕ СТАТИСТИКИ ПОЛЬЗОВАТЕЛЯ ===
    this.router.post(
      `${this.path}/user`,
      zodBodyValidation(userStatsRequestSchema), // Zod валидация
      this.statsController.getUserStats
    )

    // === ПОЛУЧЕНИЕ СТАТИСТИКИ ПО БОТАМ ===
    this.router.post(
      `${this.path}/bots`,
      zodBodyValidation(botStatsRequestSchema), // Zod валидация
      this.statsController.getBotStats
    )

    // === ИНТЕРАКТИВНОЕ МЕНЮ СТАТИСТИКИ ===
    this.router.post(
      `${this.path}/menu`,
      zodBodyValidation(userStatsRequestSchema), // Zod валидация
      this.statsController.sendInteractiveStatsMenu
    )

    // === БЫСТРЫЙ ДОСТУП К БАЛАНСУ (упрощенная версия) ===
    this.router.post(
      `${this.path}/balance`,
      zodBodyValidation(userStatsRequestSchema), // Zod валидация
      async (req, res, next) => {
        try {
          // Быстрый доступ только к балансу без полной статистики
          const { getUserBalanceStats } = await import('@/core/supabase')
          const validatedData = req.body

          const balanceStats = await getUserBalanceStats(
            validatedData.telegram_id,
            validatedData.bot_name
          )

          res.status(200).json({
            success: true,
            message: 'Баланс получен успешно',
            data: {
              stars: balanceStats.stars,
              total_spent: balanceStats.total_spent,
              total_added: balanceStats.total_added,
            },
          })
        } catch (error) {
          next(error)
        }
      }
    )
  }
}

export default StatsRoutes
