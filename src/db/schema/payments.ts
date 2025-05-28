import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  uuid,
  bigint,
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { users } from './users'

// Enums для типов платежей
export const paymentStatusEnum = z.enum([
  'PENDING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
])
export const operationTypeEnum = z.enum([
  'MONEY_INCOME',
  'MONEY_OUTCOME',
  'REFUND',
])
export const subscriptionTypeEnum = z.enum([
  'NEUROPHOTO',
  'NEUROBASE',
  'NEUROTESTER',
])

// Drizzle схема для таблицы payments_v2
export const paymentsV2 = pgTable('payments_v2', {
  id: uuid('id').primaryKey().defaultRandom(),
  inv_id: bigint('inv_id', { mode: 'number' }).unique(),
  telegram_id: text('telegram_id').notNull(),
  bot_name: text('bot_name'),
  amount: numeric('amount', { precision: 10, scale: 2 }),
  stars: numeric('stars', { precision: 10, scale: 2 }), // Изменено с integer на numeric
  currency: text('currency'),
  status: text('status').notNull(), // PENDING, COMPLETED, FAILED, CANCELLED
  type: text('type').notNull(), // MONEY_INCOME, MONEY_OUTCOME, REFUND
  payment_method: text('payment_method'),
  description: text('description'),
  metadata: jsonb('metadata'),
  subscription_type: text('subscription_type'), // NEUROPHOTO, NEUROBASE, NEUROTESTER
  service_type: text('service_type'), // IMAGE_GENERATION, TEXT_TO_SPEECH, etc.
  payment_date: timestamp('payment_date', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// Базовые Zod схемы от Drizzle
export const insertPaymentSchema = createInsertSchema(paymentsV2)
export const selectPaymentSchema = createSelectSchema(paymentsV2)
export const updatePaymentSchema = insertPaymentSchema.partial().omit({
  id: true,
  created_at: true,
} as const)

// TypeScript типы
export type Payment = typeof paymentsV2.$inferSelect
export type NewPayment = typeof paymentsV2.$inferInsert
export type UpdatePayment = z.infer<typeof updatePaymentSchema>

// Кастомные схемы для API валидации
export const createPaymentApiSchema = z.object({
  telegram_id: z.string().min(1, 'Telegram ID обязателен'),
  bot_name: z.string().min(1, 'Bot name обязателен'),
  amount: z.number().positive('Сумма должна быть положительной').optional(),
  stars: z
    .number()
    .positive('Количество звезд должно быть положительным')
    .optional(),
  currency: z.string().optional(),
  status: paymentStatusEnum,
  type: operationTypeEnum,
  payment_method: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  subscription_type: subscriptionTypeEnum.optional(),
  service_type: z.string().optional(),
  payment_date: z.date().optional(),
})

// Специальные схемы для операций
export const createPaymentOperationSchema = z.object({
  telegram_id: z.string().min(1, 'Telegram ID обязателен'),
  amount: z.number().positive('Сумма должна быть положительной'),
  stars: z.number().positive('Количество звезд должно быть положительным'),
  type: operationTypeEnum,
  description: z.string().min(1, 'Описание обязательно'),
  bot_name: z.string().optional(),
  payment_method: z.string().default('System'),
  currency: z.string().default('STARS'),
  subscription_type: subscriptionTypeEnum.optional(),
  service_type: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export const balanceOperationSchema = z.object({
  telegram_id: z.string().min(1, 'Telegram ID обязателен'),
  amount: z.number().positive('Сумма должна быть положительной'),
  type: operationTypeEnum,
  description: z.string().min(1, 'Описание обязательно'),
  metadata: z.object({
    stars: z.number().positive(),
    payment_method: z.string(),
    bot_name: z.string().optional(),
    language: z.string().optional(),
    service_type: z.string().optional(),
    operation_id: z.string().optional(),
    category: z.string().optional(),
    cost: z.number().optional(),
  }),
})

// Типы для API
export type CreatePaymentApi = z.infer<typeof createPaymentApiSchema>
export type CreatePaymentOperation = z.infer<
  typeof createPaymentOperationSchema
>
export type BalanceOperation = z.infer<typeof balanceOperationSchema>
