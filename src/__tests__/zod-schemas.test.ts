import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'

// Импортируем схемы
import {
  // Базовые схемы
  telegramIdSchema,
  languageSchema,
  isRuSchema,
  urlSchema,
  emailSchema,
  successResponseSchema,
  errorResponseSchema,
} from '../schemas/common/base.schemas'

import {
  // Telegram схемы
  usernameSchema,
  botNameSchema,
  genderSchema,
  userParamsSchema,
  telegramUserSchema,
} from '../schemas/common/telegram.schemas'

import {
  // Generation API схемы
  textToImageRequestSchema,
  neuroPhotoRequestSchema,
  neuroPhotoV2RequestSchema,
  textToSpeechRequestSchema,
  textToVideoRequestSchema,
  imageToVideoRequestSchema,
  createModelTrainingRequestSchema,
  promptSchema,
  modelUrlSchema,
  numImagesSchema,
  stepsSchema,
} from '../schemas/api/generation.schemas'

import {
  // Webhook схемы
  replicateWebhookSchema,
  replicateStatusSchema,
  syncLabsWebhookSchema,
  syncLabsStatusSchema,
  robokassaCallbackSchema,
  robokassaResultSchema,
} from '../schemas'

describe('🔴 TDD: Zod Schemas Validation', () => {
  describe('📋 Базовые схемы (base.schemas)', () => {
    it('🔴 telegramIdSchema должна валидировать Telegram ID', () => {
      // Валидные значения
      expect(telegramIdSchema.parse('123456789')).toBe('123456789')
      expect(telegramIdSchema.parse(123456789)).toBe('123456789')
      expect(telegramIdSchema.parse('144022504')).toBe('144022504')

      // Невалидные значения
      expect(() => telegramIdSchema.parse('')).toThrow()
      expect(() => telegramIdSchema.parse('abc')).toThrow()
      expect(() => telegramIdSchema.parse(-123)).toThrow()
      expect(() => telegramIdSchema.parse(0)).toThrow()
    })

    it('🔴 languageSchema должна валидировать языки', () => {
      // Валидные значения
      expect(languageSchema.parse('ru')).toBe('ru')
      expect(languageSchema.parse('en')).toBe('en')

      // Невалидные значения
      expect(() => languageSchema.parse('fr')).toThrow()
      expect(() => languageSchema.parse('de')).toThrow()
      expect(() => languageSchema.parse('')).toThrow()
    })

    it('🔴 isRuSchema должна валидировать boolean', () => {
      // Валидные значения
      expect(isRuSchema.parse(true)).toBe(true)
      expect(isRuSchema.parse(false)).toBe(false)

      // Невалидные значения
      expect(() => isRuSchema.parse('true')).toThrow()
      expect(() => isRuSchema.parse(1)).toThrow()
      expect(() => isRuSchema.parse(0)).toThrow()
    })

    it('🔴 urlSchema должна валидировать URL', () => {
      // Валидные значения
      expect(urlSchema.parse('https://example.com')).toBe('https://example.com')
      expect(urlSchema.parse('http://localhost:3000')).toBe(
        'http://localhost:3000'
      )

      // Невалидные значения
      expect(() => urlSchema.parse('not-a-url')).toThrow()
      expect(() => urlSchema.parse('')).toThrow()
      expect(() => urlSchema.parse('just-text')).toThrow()
    })

    it('🔴 successResponseSchema должна валидировать успешные ответы', () => {
      const validResponse = {
        success: true,
        message: 'Операция выполнена успешно',
        data: { id: 1 },
      }

      const result = successResponseSchema.parse(validResponse)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Операция выполнена успешно')
      expect(result.data).toEqual({ id: 1 })
    })
  })

  describe('📱 Telegram схемы (telegram.schemas)', () => {
    it('🔴 usernameSchema должна валидировать username', () => {
      // Валидные значения
      expect(usernameSchema.parse('test_user')).toBe('test_user')
      expect(usernameSchema.parse('user123')).toBe('user123')
      expect(usernameSchema.parse(undefined)).toBe(undefined)

      // Невалидные значения
      expect(() => usernameSchema.parse('')).toThrow()
      expect(() => usernameSchema.parse('user-name')).toThrow() // дефис не разрешен
      expect(() => usernameSchema.parse('a'.repeat(33))).toThrow() // слишком длинный
    })

    it('🔴 botNameSchema должна валидировать имена ботов', () => {
      // Валидные значения
      expect(botNameSchema.parse('neuro_blogger_bot')).toBe('neuro_blogger_bot')
      expect(botNameSchema.parse('test_bot')).toBe('test_bot')

      // Невалидные значения
      expect(() => botNameSchema.parse('')).toThrow()
      expect(() => botNameSchema.parse('bot-name')).toThrow() // дефис не разрешен
    })

    it('🔴 genderSchema должна валидировать пол', () => {
      // Валидные значения
      expect(genderSchema.parse('male')).toBe('male')
      expect(genderSchema.parse('female')).toBe('female')

      // Невалидные значения
      expect(() => genderSchema.parse('other')).toThrow()
      expect(() => genderSchema.parse('')).toThrow()
    })

    it('🔴 userParamsSchema должна валидировать пользовательские параметры', () => {
      const validParams = {
        telegram_id: '123456789',
        username: 'test_user',
        is_ru: true,
        bot_name: 'test_bot',
      }

      const result = userParamsSchema.parse(validParams)
      expect(result.telegram_id).toBe('123456789')
      expect(result.username).toBe('test_user')
      expect(result.is_ru).toBe(true)
      expect(result.bot_name).toBe('test_bot')
    })
  })

  describe('🎨 Generation API схемы (generation.schemas)', () => {
    it('🔴 promptSchema должна валидировать промпты', () => {
      // Валидные значения
      expect(promptSchema.parse('beautiful woman')).toBe('beautiful woman')
      expect(promptSchema.parse('a'.repeat(2000))).toBe('a'.repeat(2000))

      // Невалидные значения
      expect(() => promptSchema.parse('')).toThrow()
      expect(() => promptSchema.parse('a'.repeat(2001))).toThrow() // слишком длинный
    })

    it('🔴 modelUrlSchema должна валидировать URL моделей', () => {
      // Валидные значения
      expect(modelUrlSchema.parse('username/model:version')).toBe(
        'username/model:version'
      )
      expect(modelUrlSchema.parse('test_user/my_model:v1')).toBe(
        'test_user/my_model:v1'
      )

      // Невалидные значения
      expect(() => modelUrlSchema.parse('invalid-format')).toThrow()
      expect(() => modelUrlSchema.parse('username/model')).toThrow() // нет версии
      expect(() => modelUrlSchema.parse('')).toThrow()
    })

    it('🔴 numImagesSchema должна валидировать количество изображений', () => {
      // Валидные значения
      expect(numImagesSchema.parse(1)).toBe(1)
      expect(numImagesSchema.parse(5)).toBe(5)
      expect(numImagesSchema.parse(10)).toBe(10)

      // Невалидные значения
      expect(() => numImagesSchema.parse(0)).toThrow()
      expect(() => numImagesSchema.parse(11)).toThrow()
      expect(() => numImagesSchema.parse(1.5)).toThrow() // не целое число
    })

    it('🔴 stepsSchema должна валидировать количество шагов', () => {
      // Валидные значения
      expect(stepsSchema.parse(1)).toBe(1)
      expect(stepsSchema.parse(500)).toBe(500)
      expect(stepsSchema.parse(1000)).toBe(1000)

      // Невалидные значения
      expect(() => stepsSchema.parse(0)).toThrow()
      expect(() => stepsSchema.parse(1001)).toThrow()
      expect(() => stepsSchema.parse(50.5)).toThrow() // не целое число
    })

    it('🔴 textToImageRequestSchema должна валидировать запросы text-to-image', () => {
      const validRequest = {
        prompt: 'beautiful landscape',
        model: 'stable-diffusion',
        num_images: 2,
        telegram_id: '123456789',
        username: 'test_user',
        is_ru: true,
        bot_name: 'test_bot',
      }

      const result = textToImageRequestSchema.parse(validRequest)
      expect(result.prompt).toBe('beautiful landscape')
      expect(result.num_images).toBe(2)
      expect(result.telegram_id).toBe('123456789')
    })

    it('🔴 neuroPhotoRequestSchema должна валидировать запросы neuro-photo', () => {
      const validRequest = {
        prompt: 'beautiful woman',
        model_url: 'username/model:version',
        num_images: 1,
        telegram_id: '123456789',
        username: 'test_user',
        is_ru: true,
        bot_name: 'test_bot',
        gender: 'female',
      }

      const result = neuroPhotoRequestSchema.parse(validRequest)
      expect(result.gender).toBe('female')
      expect(result.model_url).toBe('username/model:version')
    })

    it('🔴 imageToVideoRequestSchema должна валидировать запросы image-to-video', () => {
      // Стандартная генерация
      const standardRequest = {
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'make it move',
        videoModel: 'runway-gen3',
        telegram_id: '123456789',
        username: 'test_user',
        is_ru: true,
        bot_name: 'test_bot',
      }

      const standardResult = imageToVideoRequestSchema.parse(standardRequest)
      expect(standardResult.imageUrl).toBe('https://example.com/image.jpg')
      expect(standardResult.prompt).toBe('make it move')

      // Морфинг
      const morphingRequest = {
        imageAUrl: 'https://example.com/imageA.jpg',
        imageBUrl: 'https://example.com/imageB.jpg',
        is_morphing: true,
        videoModel: 'runway-gen3',
        telegram_id: '123456789',
        username: 'test_user',
        is_ru: true,
        bot_name: 'test_bot',
      }

      const morphingResult = imageToVideoRequestSchema.parse(morphingRequest)
      expect(morphingResult.is_morphing).toBe(true)
      expect(morphingResult.imageAUrl).toBe('https://example.com/imageA.jpg')
    })

    it('🔴 createModelTrainingRequestSchema должна валидировать запросы тренировки', () => {
      const validRequest = {
        type: 'model-training',
        triggerWord: 'myface',
        modelName: 'my_model',
        steps: 500,
        telegram_id: '123456789',
        is_ru: true,
        bot_name: 'test_bot',
        gender: 'male',
      }

      const result = createModelTrainingRequestSchema.parse(validRequest)
      expect(result.triggerWord).toBe('myface')
      expect(result.steps).toBe(500)
      expect(result.gender).toBe('male')
    })
  })

  describe('🔗 Webhook схемы', () => {
    it('🔴 replicateStatusSchema должна валидировать статусы Replicate', () => {
      // Валидные значения
      expect(replicateStatusSchema.parse('starting')).toBe('starting')
      expect(replicateStatusSchema.parse('processing')).toBe('processing')
      expect(replicateStatusSchema.parse('succeeded')).toBe('succeeded')
      expect(replicateStatusSchema.parse('failed')).toBe('failed')
      expect(replicateStatusSchema.parse('canceled')).toBe('canceled')

      // Невалидные значения
      expect(() => replicateStatusSchema.parse('unknown')).toThrow()
      expect(() => replicateStatusSchema.parse('')).toThrow()
    })

    it('🔴 syncLabsStatusSchema должна валидировать статусы SyncLabs', () => {
      // Валидные значения
      expect(syncLabsStatusSchema.parse('PENDING')).toBe('PENDING')
      expect(syncLabsStatusSchema.parse('PROCESSING')).toBe('PROCESSING')
      expect(syncLabsStatusSchema.parse('COMPLETED')).toBe('COMPLETED')
      expect(syncLabsStatusSchema.parse('FAILED')).toBe('FAILED')

      // Невалидные значения
      expect(() => syncLabsStatusSchema.parse('UNKNOWN')).toThrow()
      expect(() => syncLabsStatusSchema.parse('pending')).toThrow() // lowercase
    })

    it('🔴 robokassaCallbackSchema должна валидировать Robokassa callback', () => {
      const validCallback = {
        inv_id: '12345',
        IncSum: 100.5,
        shp_telegram_id: '123456789',
        shp_bot_name: 'test_bot',
      }

      const result = robokassaCallbackSchema.parse(validCallback)
      expect(result.inv_id).toBe('12345')
      expect(result.IncSum).toBe(100.5)
      expect(result.shp_telegram_id).toBe('123456789')
    })

    it('🔴 replicateWebhookSchema должна валидировать Replicate webhook', () => {
      const validWebhook = {
        id: 'pred_123',
        version: 'v1.0.0',
        status: 'succeeded',
        input: { prompt: 'test' },
        output: 'https://example.com/result.jpg',
        urls: {
          get: 'https://api.replicate.com/v1/predictions/pred_123',
        },
        created_at: '2025-01-27T10:00:00Z',
      }

      const result = replicateWebhookSchema.parse(validWebhook)
      expect(result.id).toBe('pred_123')
      expect(result.status).toBe('succeeded')
      expect(result.output).toBe('https://example.com/result.jpg')
    })
  })

  describe('❌ Обработка ошибок валидации', () => {
    it('🔴 должна возвращать понятные сообщения об ошибках', () => {
      try {
        telegramIdSchema.parse('invalid')
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError)
        const zodError = error as ZodError
        expect(zodError.errors[0].message).toContain(
          'Telegram ID должен содержать только цифры'
        )
      }
    })

    it('🔴 должна валидировать вложенные объекты', () => {
      const invalidRequest = {
        prompt: '', // пустой промпт
        model_url: 'invalid-format', // неправильный формат
        num_images: 0, // неправильное количество
        telegram_id: 'abc', // неправильный ID
        is_ru: 'true', // строка вместо boolean
      }

      expect(() => neuroPhotoRequestSchema.parse(invalidRequest)).toThrow()
    })

    it('🔴 должна обрабатывать трансформации данных', () => {
      // Числовой telegram_id должен преобразоваться в строку
      const result = telegramIdSchema.parse(123456789)
      expect(typeof result).toBe('string')
      expect(result).toBe('123456789')
    })
  })
})
