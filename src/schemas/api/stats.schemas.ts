import { z } from 'zod'
import {
  telegramIdSchema,
  isRuSchema,
  successResponseSchema,
} from '../common/base.schemas'
import { botNameSchema } from '../common/telegram.schemas'

// Схема для запроса статистики пользователя
export const userStatsRequestSchema = z.object({
  telegram_id: telegramIdSchema,
  is_ru: isRuSchema,
  bot_name: botNameSchema,
})

// Схема для статистики баланса
export const balanceStatsSchema = z.object({
  stars: z.number().min(0, 'Баланс не может быть отрицательным'),
  total_added: z
    .number()
    .min(0, 'Общая сумма пополнений не может быть отрицательной'),
  total_spent: z
    .number()
    .min(0, 'Общая сумма трат не может быть отрицательной'),
  bonus_stars: z
    .number()
    .min(0, 'Бонусные звезды не могут быть отрицательными'),
  added_stars: z
    .number()
    .min(0, 'Добавленные звезды не могут быть отрицательными'),
  added_rub: z
    .number()
    .min(0, 'Добавленные рубли не могут быть отрицательными'),
  services: z.record(z.string(), z.number()),
  payment_methods: z.record(z.string(), z.number()).optional(),
})

// Схема для статистики подписки
export const subscriptionStatsSchema = z.object({
  isSubscriptionActive: z.boolean(),
  subscriptionType: z.string().nullable(),
  subscriptionStartDate: z.string().datetime().nullable(),
  daysRemaining: z.number().nullable(),
})

// Схема для общей статистики пользователя
export const userStatsSchema = z.object({
  balance: balanceStatsSchema,
  subscription: subscriptionStatsSchema,
  user_level: z.number().min(0).max(20),
  registration_date: z.string().datetime(),
  last_activity: z.string().datetime().nullable(),
  total_generations: z.number().min(0),
  favorite_services: z.array(z.string()),
})

// Схема ответа статистики
export const userStatsResponseSchema = successResponseSchema.extend({
  data: userStatsSchema,
})

// Схема для запроса статистики по ботам (для админов)
export const botStatsRequestSchema = z.object({
  telegram_id: telegramIdSchema,
  is_ru: isRuSchema,
  bot_name: botNameSchema,
  target_bot: botNameSchema.optional(), // Конкретный бот для статистики
})

// Схема статистики по ботам
export const botStatsSchema = z.object({
  bot_name: z.string(),
  total_users: z.number().min(0),
  active_users_today: z.number().min(0),
  total_generations: z.number().min(0),
  revenue_today: z.number().min(0),
  revenue_total: z.number().min(0),
})

// Схема ответа статистики по ботам
export const botStatsResponseSchema = successResponseSchema.extend({
  data: z.object({
    user_bots: z.array(botStatsSchema), // Боты пользователя
    accessible_bots: z.array(z.string()), // Боты, к которым есть доступ
  }),
})

// Типы TypeScript из схем
export type UserStatsRequest = z.infer<typeof userStatsRequestSchema>
export type BalanceStats = z.infer<typeof balanceStatsSchema>
export type SubscriptionStats = z.infer<typeof subscriptionStatsSchema>
export type UserStats = z.infer<typeof userStatsSchema>
export type UserStatsResponse = z.infer<typeof userStatsResponseSchema>
export type BotStatsRequest = z.infer<typeof botStatsRequestSchema>
export type BotStats = z.infer<typeof botStatsSchema>
export type BotStatsResponse = z.infer<typeof botStatsResponseSchema>
