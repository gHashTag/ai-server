import { z } from 'zod'

// Схема для параметров Robokassa callback (согласно robokassa-params.mdc)
export const robokassaCallbackSchema = z.object({
  inv_id: z
    .union([
      z.string().regex(/^\d+$/, 'inv_id должен содержать только цифры'),
      z.number().int().positive('inv_id должен быть положительным числом'),
    ])
    .transform(val => String(val)),

  IncSum: z
    .union([
      z
        .string()
        .regex(
          /^\d+(\.\d{1,2})?$/,
          'IncSum должен быть числом с максимум 2 знаками после запятой'
        ),
      z.number().positive('IncSum должен быть положительным числом'),
    ])
    .transform(val => Number(val)),

  // Дополнительные параметры, которые могут приходить от Robokassa
  OutSum: z
    .union([
      z.string().regex(/^\d+(\.\d{1,2})?$/, 'OutSum должен быть числом'),
      z.number().positive('OutSum должен быть положительным числом'),
    ])
    .transform(val => Number(val))
    .optional(),

  InvId: z
    .union([
      z.string().regex(/^\d+$/, 'InvId должен содержать только цифры'),
      z.number().int().positive('InvId должен быть положительным числом'),
    ])
    .transform(val => String(val))
    .optional(),

  SignatureValue: z
    .string()
    .min(1, 'SignatureValue не может быть пустой')
    .optional(),
  PaymentMethod: z.string().optional(),
  IncCurrLabel: z.string().optional(),
  EMail: z.string().email('Некорректный email').optional(),

  // Пользовательские параметры (shp_*)
  shp_item: z.string().optional(),
  shp_telegram_id: z
    .union([
      z
        .string()
        .regex(/^\d+$/, 'shp_telegram_id должен содержать только цифры'),
      z
        .number()
        .int()
        .positive('shp_telegram_id должен быть положительным числом'),
    ])
    .transform(val => String(val))
    .optional(),
  shp_bot_name: z.string().optional(),
  shp_subscription_type: z.string().optional(),
})

// Схема для Result URL (основной callback)
export const robokassaResultSchema = robokassaCallbackSchema.extend({
  // Result URL должен содержать обязательные поля
  inv_id: z
    .union([
      z.string().regex(/^\d+$/, 'inv_id должен содержать только цифры'),
      z.number().int().positive('inv_id должен быть положительным числом'),
    ])
    .transform(val => String(val)),

  IncSum: z
    .union([
      z.string().regex(/^\d+(\.\d{1,2})?$/, 'IncSum должен быть числом'),
      z.number().positive('IncSum должен быть положительным числом'),
    ])
    .transform(val => Number(val)),
})

// Схема для Success URL (страница успеха)
export const robokassaSuccessSchema = z.object({
  inv_id: z
    .union([
      z.string().regex(/^\d+$/, 'inv_id должен содержать только цифры'),
      z.number().int().positive('inv_id должен быть положительным числом'),
    ])
    .transform(val => String(val)),

  OutSum: z
    .union([
      z.string().regex(/^\d+(\.\d{1,2})?$/, 'OutSum должен быть числом'),
      z.number().positive('OutSum должен быть положительным числом'),
    ])
    .transform(val => Number(val)),

  SignatureValue: z.string().min(1, 'SignatureValue не может быть пустой'),

  // Пользовательские параметры
  shp_item: z.string().optional(),
  shp_telegram_id: z
    .union([
      z
        .string()
        .regex(/^\d+$/, 'shp_telegram_id должен содержать только цифры'),
      z
        .number()
        .int()
        .positive('shp_telegram_id должен быть положительным числом'),
    ])
    .transform(val => String(val))
    .optional(),
  shp_bot_name: z.string().optional(),
  shp_subscription_type: z.string().optional(),
})

// Схема для Fail URL (страница ошибки)
export const robokassaFailSchema = z.object({
  inv_id: z
    .union([
      z.string().regex(/^\d+$/, 'inv_id должен содержать только цифры'),
      z.number().int().positive('inv_id должен быть положительным числом'),
    ])
    .transform(val => String(val)),

  OutSum: z
    .union([
      z.string().regex(/^\d+(\.\d{1,2})?$/, 'OutSum должен быть числом'),
      z.number().positive('OutSum должен быть положительным числом'),
    ])
    .transform(val => Number(val))
    .optional(),

  // Дополнительные параметры для отладки
  error_code: z.string().optional(),
  error_message: z.string().optional(),
})

// Схема для создания платежа в Robokassa
export const robokassaPaymentCreateSchema = z.object({
  OutSum: z.number().positive('Сумма должна быть положительной'),
  InvId: z.number().int().positive('ID инвойса должен быть положительным'),
  Description: z.string().min(1, 'Описание не может быть пустым'),
  SignatureValue: z.string().min(1, 'Подпись не может быть пустой'),
  Culture: z.enum(['ru', 'en']).default('ru'),
  Encoding: z.string().default('utf-8'),

  // Пользовательские параметры
  shp_item: z.string().optional(),
  shp_telegram_id: z.string().optional(),
  shp_bot_name: z.string().optional(),
  shp_subscription_type: z.string().optional(),
})

// Схема для ответа Robokassa API
export const robokassaApiResponseSchema = z.object({
  result: z.boolean(),
  errorCode: z.number().optional(),
  errorMessage: z.string().optional(),
  invoiceID: z.number().optional(),
  paymentUrl: z.string().url().optional(),
})

// Типы TypeScript из схем
export type RobokassaCallback = z.infer<typeof robokassaCallbackSchema>
export type RobokassaResult = z.infer<typeof robokassaResultSchema>
export type RobokassaSuccess = z.infer<typeof robokassaSuccessSchema>
export type RobokassaFail = z.infer<typeof robokassaFailSchema>
export type RobokassaPaymentCreate = z.infer<
  typeof robokassaPaymentCreateSchema
>
export type RobokassaApiResponse = z.infer<typeof robokassaApiResponseSchema>
