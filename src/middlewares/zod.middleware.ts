import { Request, Response, NextFunction } from 'express'
import { z, ZodError, ZodSchema } from 'zod'
import { HttpException } from '@/exceptions/HttpException'
import { logger } from '@/utils/logger'

// Интерфейс для конфигурации валидации
interface ValidationConfig {
  body?: ZodSchema
  params?: ZodSchema
  query?: ZodSchema
  headers?: ZodSchema
}

/**
 * Универсальный Zod middleware для валидации запросов
 * Заменяет старый ValidationMiddleware и validateUserParams
 */
export const zodValidation = (config: ValidationConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Валидация body
      if (config.body) {
        const validatedBody = await config.body.parseAsync(req.body)
        req.body = validatedBody

        logger.debug('✅ Zod валидация body прошла успешно', {
          description: 'Zod body validation successful',
          originalBody: req.body,
          validatedBody,
        })
      }

      // Валидация params
      if (config.params) {
        const validatedParams = await config.params.parseAsync(req.params)
        req.params = validatedParams

        logger.debug('✅ Zod валидация params прошла успешно', {
          description: 'Zod params validation successful',
          originalParams: req.params,
          validatedParams,
        })
      }

      // Валидация query
      if (config.query) {
        const validatedQuery = await config.query.parseAsync(req.query)
        req.query = validatedQuery

        logger.debug('✅ Zod валидация query прошла успешно', {
          description: 'Zod query validation successful',
          originalQuery: req.query,
          validatedQuery,
        })
      }

      // Валидация headers
      if (config.headers) {
        const validatedHeaders = await config.headers.parseAsync(req.headers)
        req.headers = { ...req.headers, ...validatedHeaders }

        logger.debug('✅ Zod валидация headers прошла успешно', {
          description: 'Zod headers validation successful',
        })
      }

      next()
    } catch (error) {
      if (error instanceof ZodError) {
        // Форматируем ошибки Zod в понятный вид
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: 'received' in err ? err.received : undefined,
        }))

        const errorMessage = formattedErrors
          .map(err => `${err.field}: ${err.message}`)
          .join(', ')

        logger.warn('❌ Ошибка валидации Zod', {
          description: 'Zod validation error',
          errors: formattedErrors,
          originalBody: req.body,
          originalParams: req.params,
          originalQuery: req.query,
        })

        next(new HttpException(400, `Ошибка валидации: ${errorMessage}`))
      } else {
        logger.error('❌ Неожиданная ошибка в Zod middleware', {
          description: 'Unexpected error in Zod middleware',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })

        next(new HttpException(500, 'Внутренняя ошибка валидации'))
      }
    }
  }
}

/**
 * Упрощенный middleware для валидации только body
 */
export const zodBodyValidation = (schema: ZodSchema) => {
  return zodValidation({ body: schema })
}

/**
 * Упрощенный middleware для валидации только params
 */
export const zodParamsValidation = (schema: ZodSchema) => {
  return zodValidation({ params: schema })
}

/**
 * Упрощенный middleware для валидации только query
 */
export const zodQueryValidation = (schema: ZodSchema) => {
  return zodValidation({ query: schema })
}

/**
 * Middleware для валидации пользовательских параметров
 * Заменяет старый validateUserParams
 */
export const validateUserParamsZod = zodBodyValidation(
  z.object({
    telegram_id: z
      .union([
        z.string().regex(/^\d+$/, 'Telegram ID должен содержать только цифры'),
        z
          .number()
          .int()
          .positive('Telegram ID должен быть положительным числом'),
      ])
      .transform(val => String(val)),
    username: z.string().min(1, 'Username не может быть пустым').optional(),
    is_ru: z.boolean({
      errorMap: () => ({ message: 'is_ru должно быть boolean' }),
    }),
    bot_name: z.string().min(1, 'Bot name не может быть пустым').optional(),
  })
)

/**
 * Middleware для валидации файлов (используется с multer)
 */
export const zodFileValidation = (
  requiredFields: string[],
  allowedMimeTypes?: string[]
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Проверяем наличие обязательных файлов
      for (const fieldName of requiredFields) {
        const file =
          req.file?.fieldname === fieldName
            ? req.file
            : Array.isArray(req.files)
            ? req.files.find(f => f.fieldname === fieldName)
            : req.files?.[fieldName]

        if (!file) {
          throw new Error(`Файл ${fieldName} обязателен`)
        }

        // Проверяем MIME тип если указан
        if (allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype)) {
          throw new Error(
            `Неподдерживаемый тип файла ${fieldName}: ${file.mimetype}`
          )
        }
      }

      logger.debug('✅ Zod валидация файлов прошла успешно', {
        description: 'Zod file validation successful',
        requiredFields,
        uploadedFiles: req.file
          ? [req.file.fieldname]
          : Array.isArray(req.files)
          ? req.files.map(f => f.fieldname)
          : req.files
          ? Object.keys(req.files)
          : [],
      })

      next()
    } catch (error) {
      logger.warn('❌ Ошибка валидации файлов', {
        description: 'File validation error',
        error: error instanceof Error ? error.message : String(error),
        requiredFields,
        uploadedFiles: req.file
          ? [req.file.fieldname]
          : Array.isArray(req.files)
          ? req.files.map(f => f.fieldname)
          : req.files
          ? Object.keys(req.files)
          : [],
      })

      next(
        new HttpException(
          400,
          error instanceof Error ? error.message : 'Ошибка валидации файлов'
        )
      )
    }
  }
}
