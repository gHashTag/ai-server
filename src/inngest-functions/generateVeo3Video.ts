/**
 * 🎬 VEO3 Video Generation via Kie.ai API
 * Генерация видео через Kie.ai с поддержкой разных форматов (9:16, 16:9, 1:1)
 * С fallback на Vertex AI при недоступности Kie.ai
 */

import { inngest } from '@/core/inngest/clients'
import { KieAiService } from '@/services/kieAiService'
import { processVideoGeneration } from '@/services/generateTextToVideo'
import { getBotByName } from '@/core/bot'
import {
  getUserByTelegramId,
  supabase,
} from '@/core/supabase'
import { ProjectManager } from '@/core/instagram/project-manager'
import { errorMessage, errorMessageAdmin } from '@/helpers'
import { logger } from '@/utils/logger'
import { PaymentType } from '@/interfaces/payments.interface'
import { ModeEnum } from '@/interfaces/modes'

// Вспомогательные функции для обработки ошибок
function categorizeError(error: any): { type: string; critical: boolean } {
  const message = error.message?.toLowerCase() || ''
  const status = error.response?.status

  if (
    status === 401 ||
    message.includes('api key') ||
    message.includes('unauthorized')
  ) {
    return { type: 'authentication', critical: true }
  }

  if (
    status === 402 ||
    message.includes('insufficient') ||
    message.includes('credits') ||
    message.includes('balance')
  ) {
    return { type: 'insufficient_credits', critical: false }
  }

  if (
    status === 429 ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return { type: 'rate_limit', critical: false }
  }

  if (message.includes('bot not found') || message.includes('user not found')) {
    return { type: 'user_not_found', critical: false }
  }

  if (
    message.includes('kie.ai unavailable') ||
    message.includes('connection') ||
    message.includes('network')
  ) {
    return { type: 'service_unavailable', critical: false }
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return { type: 'timeout', critical: false }
  }

  return { type: 'unknown', critical: true }
}

function getUserFriendlyErrorMessage(error: any, isRu: boolean): string {
  const errorType = categorizeError(error)

  const messages = {
    authentication: {
      ru: '🔐 Проблема с авторизацией сервиса. Администратор уведомлен.',
      en: '🔐 Service authentication issue. Administrator has been notified.',
    },
    insufficient_credits: {
      ru: '💰 Недостаточно средств в системе. Попробуйте позже или обратитесь к администратору.',
      en: '💰 Insufficient system credits. Please try later or contact administrator.',
    },
    rate_limit: {
      ru: '⏱️ Система временно перегружена. Попробуйте через несколько минут.',
      en: '⏱️ System temporarily overloaded. Please try again in a few minutes.',
    },
    user_not_found: {
      ru: '❌ Пользователь не найден. Попробуйте перезапустить бота командой /start',
      en: '❌ User not found. Please restart the bot with /start command.',
    },
    service_unavailable: {
      ru: '🔧 Сервис временно недоступен. Попробуйте позже.',
      en: '🔧 Service temporarily unavailable. Please try later.',
    },
    timeout: {
      ru: '⏰ Превышено время ожидания. Попробуйте еще раз.',
      en: '⏰ Request timed out. Please try again.',
    },
    unknown: {
      ru: '❌ Произошла неожиданная ошибка. Администратор уведомлен.',
      en: '❌ An unexpected error occurred. Administrator has been notified.',
    },
  }

  return (
    messages[errorType.type]?.[isRu ? 'ru' : 'en'] ||
    messages.unknown[isRu ? 'ru' : 'en']
  )
}
import { slugify } from 'inngest'

// Интерфейс для данных события
interface Veo3GenerationEventData {
  prompt: string
  model: 'veo3_fast' | 'veo3' | 'runway-aleph'
  aspectRatio: '9:16' | '16:9' | '1:1'
  duration: number // 2-10 секунд
  telegram_id: string
  username: string
  is_ru: boolean
  bot_name: string
  imageUrl?: string // для image-to-video
  style?: string
  cameraMovement?: string
}

export const generateVeo3Video = inngest.createFunction(
  {
    id: slugify('veo3-video-generation'),
    name: '🎬 VEO3 Video Generation',
    retries: 3,
  },
  { event: 'veo3/video.generate' },
  async ({ event, step }) => {
    // ✅ ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ПОЛУЧЕНИЯ СОБЫТИЯ ОТ INNGEST 
    logger.info('📨 VEO3 INNGEST ФУНКЦИЯ ПОЛУЧИЛА СОБЫТИЕ:', {
      timestamp: new Date().toISOString(),
      eventId: event.id,
      eventName: event.name,
      eventTimestamp: event.timestamp,
      rawEventData: event.data,
      eventDataSize: JSON.stringify(event.data).length,
      source: 'generateVeo3Video.inngest.received'
    })

    try {
      const {
        prompt,
        model = 'veo3_fast',
        aspectRatio = '9:16',
        duration: inputDuration,
        telegram_id,
        username,
        is_ru,
        bot_name: rawBotName,
        imageUrl,
        style,
        cameraMovement,
      } = event.data as Veo3GenerationEventData

      // ✅ VEO3_FAST ВСЕГДА 8 СЕКУНД - НЕ ПРИНИМАЕМ ДРУГИЕ ЗНАЧЕНИЯ!
      const duration = model === 'veo3_fast' ? 8 : (inputDuration || 5)

      // Обеспечиваем fallback для bot_name
      const bot_name = rawBotName || 'neuro_blogger_bot'

      // ✅ ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ РАЗОБРАННЫХ ПАРАМЕТРОВ
      logger.info('🔍 VEO3 РАЗОБРАННЫЕ ПАРАМЕТРЫ СОБЫТИЯ:', {
        telegram_id,
        username,
        is_ru,
        received_bot_name: rawBotName,
        actual_bot_name: bot_name,
        model,
        aspectRatio,
        duration,
        prompt: prompt ? `"${prompt.substring(0, 150)}${prompt.length > 150 ? '...' : ''}"` : 'ОТСУТСТВУЕТ',
        promptLength: prompt?.length || 0,
        imageUrl: imageUrl ? `PROVIDED (${imageUrl.substring(0, 100)}...)` : 'NOT_PROVIDED',
        style: style || 'NOT_PROVIDED',
        cameraMovement: cameraMovement || 'NOT_PROVIDED',
        timestamp: new Date().toISOString(),
        source: 'generateVeo3Video.inngest.parsed'
      })

      logger.info('📋 Event data validation:', {
        received_bot_name: rawBotName,
        actual_bot_name: bot_name,
        telegram_id,
        has_prompt: !!prompt,
      })

      logger.info({
        message: '🎬 Starting VEO3 video generation',
        telegram_id,
        model,
        aspectRatio,
        duration,
        prompt: prompt.substring(0, 50) + '...',
      })

      // Шаг 1: Получение экземпляра бота
      const botData = (await step.run('get-bot', async () => {
        logger.info({
          message: '🤖 Getting bot instance',
          botName: bot_name,
          step: 'get-bot',
        })
        return getBotByName(bot_name)
      })) as { bot: any }

      const bot = botData.bot
      if (!bot) {
        logger.error({
          message: '❌ Bot instance not found',
          bot_name,
          telegram_id,
        })
        throw new Error(`Bot not found: ${bot_name}`)
      }

      // Шаг 2: Проверка пользователя
      const userExists = await step.run('check-user', async () => {
        logger.info({
          message: '👤 Checking user exists',
          telegram_id,
          step: 'check-user',
        })
        return await getUserByTelegramId(telegram_id)
      })

      if (!userExists) {
        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? '❌ Пользователь не найден. Пожалуйста, начните заново /start'
            : '❌ User not found. Please start again /start'
        )
        throw new Error(`User not found: ${telegram_id}`)
      }

      // Шаг 3: Генерация видео через KieAi API
      const generationResult = await step.run('generate-video', async () => {
        logger.info({
          message: '🎬 Starting video generation',
          provider: 'kie.ai',
          model,
          aspectRatio,
          duration,
          step: 'generate-video',
        })

        const kieAiService = new KieAiService()

        try {
          // Проверяем доступность Kie.ai
          const isHealthy = await kieAiService.checkHealth()
          if (!isHealthy) {
            logger.warn(
              '⚠️ Kie.ai API не доступен, используем fallback на Vertex AI'
            )
            throw new Error('Kie.ai unavailable, fallback to Vertex AI')
          }

          // ✅ ПОЛУЧАЕМ ИЛИ СОЗДАЕМ ПРОЕКТ ДЛЯ ПОЛЬЗОВАТЕЛЯ ПЕРВЫМ ДЕЛОМ
          const projectManager = new ProjectManager()
          const { project } = await projectManager.validateOrCreateProject(
            undefined, // project_id не передан
            telegram_id,
            username,
            bot_name
          )
          
          logger.info('📊 Project validated/created', {
            projectId: project.id,
            projectName: project.name,
            telegram_id,
            username
          })

          // ✅ ЛОГИРУЕМ ДАННЫЕ ПЕРЕД ОТПРАВКОЙ В KIE.AI API
          // ⚡ ВАЖНО: Добавляем callback URL для асинхронной доставки
          const callbackUrl = process.env.API_URL 
            ? `${process.env.API_URL}/api/kie-ai/callback`
            : process.env.CALLBACK_BASE_URL 
            ? `${process.env.CALLBACK_BASE_URL}/api/kie-ai/callback`
            : null

          const requestPayload = {
            model,
            prompt,
            duration,
            aspectRatio,
            imageUrl,
            userId: telegram_id,
            projectId: project.id, // ✅ Уникальный ID проекта из БД
            callBackUrl: callbackUrl, // 🔗 Добавляем callback URL!
          }
          
          logger.info('📤 ОТПРАВЛЯЮ ЗАПРОС В KIE.AI API:', {
            telegram_id,
            bot_name,
            callbackUrl: callbackUrl || 'НЕ НАСТРОЕН ❌',
            hasCallbackUrl: !!callbackUrl,
            requestPayload: {
              ...requestPayload,
              prompt: prompt ? `"${prompt.substring(0, 150)}${prompt.length > 150 ? '...' : ''}"` : null,
            },
            requestSize: JSON.stringify(requestPayload).length,
            timestamp: new Date().toISOString(),
            source: 'generateVeo3Video.inngest.kieai.request'
          })

          // ✅ СОХРАНЯЕМ ЗАДАЧУ В БД ДЛЯ CALLBACK ОБРАБОТКИ
          let taskTrackingId: string | null = null
          try {
            const { data: taskRecord, error: taskError } = await supabase
              .from('video_tasks')
              .insert({
                telegram_id: telegram_id,
                bot_name: bot_name,
                prompt: prompt,
                model: model,
                status: 'processing',
                provider: 'kie.ai',
                project_id: project.id, // ✅ Связываем с проектом
                created_at: new Date().toISOString(),
                duration: duration,
                aspect_ratio: aspectRatio,
                estimated_cost: duration * 0.05, // $0.05/сек для veo3_fast
              })
              .select('id')
              .single()

            if (taskError) {
              logger.warn('⚠️ Failed to save task to database', {
                error: taskError.message,
                telegram_id,
                model,
              })
            } else {
              taskTrackingId = taskRecord?.id?.toString() || null
              logger.info('✅ Task saved to database', {
                taskId: taskTrackingId,
                telegram_id,
                bot_name,
                model,
              })
            }
          } catch (dbError) {
            logger.error('❌ Database save error', {
              error: dbError,
              telegram_id,
              model,
            })
          }

          // ✅ ASYNC ГЕНЕРАЦИЯ ЧЕРЕЗ KIE.AI (НЕ ЖДЕМ РЕЗУЛЬТАТ!)
          const result = await kieAiService.generateVideo(requestPayload)

          // ✅ ОБНОВЛЯЕМ ЗАДАЧУ С TASK_ID ОТ KIE.AI
          if (result.taskId && taskTrackingId) {
            try {
              const { error: updateError } = await supabase
                .from('video_tasks')
                .update({ 
                  task_id: result.taskId,
                  external_task_id: result.taskId, // Дублируем для поиска
                })
                .eq('id', taskTrackingId)

              if (updateError) {
                logger.warn('⚠️ Failed to update task with Kie.ai task_id', {
                  error: updateError.message,
                  taskTrackingId,
                  kieaiTaskId: result.taskId,
                })
              } else {
                logger.info('✅ Task updated with Kie.ai task_id', {
                  taskTrackingId,
                  kieaiTaskId: result.taskId,
                  telegram_id,
                  bot_name,
                })
              }
            } catch (updateError) {
              logger.error('❌ Database update error', {
                error: updateError,
                taskTrackingId,
                kieaiTaskId: result.taskId,
              })
            }
          }

          // ✅ ЕСЛИ CALLBACK ИСПОЛЬЗУЕТСЯ - ЗАВЕРШАЕМ ФУНКЦИЮ СРАЗУ!
          if (result.callbackUrl) {
            logger.info('🔗 ASYNC MODE: Task submitted to Kie.ai with callback', {
              taskId: result.taskId,
              callbackUrl: result.callbackUrl,
              telegram_id,
              bot_name,
              taskTrackingId,
            })

            // Уведомляем пользователя что задача принята  
            const bot = botData.bot
            if (bot && telegram_id) {
              await bot.telegram.sendMessage(
                telegram_id,
                is_ru 
                  ? '🎬 Генерация видео запущена! Результат придет через несколько минут...'
                  : '🎬 Video generation started! Result will be delivered in a few minutes...'
              )
            }

            // ✅ ВОЗВРАЩАЕМ УСПЕХ БЕЗ ОЖИДАНИЯ РЕЗУЛЬТАТА!
            return {
              success: true,
              taskId: result.taskId,
              message: 'Video generation submitted to Kie.ai with callback',
              provider: 'kie.ai',
              model,
              async: true,
              callbackUrl: result.callbackUrl,
            }
          }

          // ✅ СТАРЫЙ SYNC РЕЖИМ (если нет callback URL)
          logger.info({
            message: '✅ Video generated via Kie.ai (SYNC)',
            videoUrl: result.videoUrl,
            cost: result.cost,
            processingTime: result.processingTime,
            taskId: result.taskId,
            taskTrackingId,
          })

          return {
            videoUrl: result.videoUrl,
            cost: result.cost,
            provider: 'kie.ai',
            model,
            processingTime: result.processingTime,
          }
        } catch (kieError: any) {
          logger.warn({
            message: '⚠️ Kie.ai generation failed, falling back to Vertex AI',
            error: kieError.message,
            errorCode: kieError.response?.status,
            step: 'fallback-to-vertex',
            telegram_id,
            model,
          })

          // Сообщаем пользователю о переходе на fallback
          try {
            const bot = botData.bot
            if (bot && telegram_id) {
              await bot.telegram.sendMessage(
                telegram_id,
                is_ru
                  ? '⚠️ Основная система недоступна. Используем резервную (может быть медленнее)...'
                  : '⚠️ Primary system unavailable. Using backup system (may be slower)...'
              )
            }
          } catch (notifyError) {
            logger.warn(
              'Failed to notify user about fallback:',
              notifyError.message
            )
          }

          // Fallback на Vertex AI
          const fallbackVideoUrl = await processVideoGeneration(
            model === 'veo3_fast' ? 'veo-3-fast' : 'veo-3',
            aspectRatio,
            prompt,
            imageUrl,
            duration
          )

          // Приблизительная стоимость Vertex AI (дороже Kie.ai)
          const vertexCost = duration * 0.4 // $0.40/сек для Vertex AI

          logger.info({
            message: '✅ Video generated via Vertex AI (fallback)',
            videoUrl: fallbackVideoUrl,
            estimatedCost: vertexCost,
          })

          return {
            videoUrl: fallbackVideoUrl,
            cost: vertexCost,
            provider: 'vertex-ai',
            model: model === 'veo3_fast' ? 'veo-3-fast' : 'veo-3',
            processingTime: null,
          }
        }
      })

      // ⚡ ASYNC РЕЖИМ: баланс и сохранение происходят в webhook callback!

      // Шаг 4: Уведомление о начале генерации 
      await step.run('notify-generation-started', async () => {
        logger.info({
          message: '📤 Sending generation started notification',
          telegram_id,
          taskId: generationResult.taskId,
          step: 'notify-generation-started',
        })

        // Отправляем уведомление о начале генерации
          const asyncMessage = is_ru
            ? `⏳ **Генерация видео начата!**\n\n` +
              `📱 **Формат:** ${aspectRatio}\n` +
              `⏱️ **Длительность:** ${duration}с\n` +
              `🤖 **Модель:** ${generationResult.model}\n` +
              `🔗 **Провайдер:** ${generationResult.provider}\n` +
              `📋 **ID задачи:** ${generationResult.taskId}\n\n` +
              `🔔 **Видео будет доставлено автоматически после завершения генерации**\n\n` +
              `✨ Создается с помощью VEO3 AI`
            : `⏳ **Video Generation Started!**\n\n` +
              `📱 **Format:** ${aspectRatio}\n` +
              `⏱️ **Duration:** ${duration}s\n` +
              `🤖 **Model:** ${generationResult.model}\n` +
              `🔗 **Provider:** ${generationResult.provider}\n` +
              `📋 **Task ID:** ${generationResult.taskId}\n\n` +
              `🔔 **Video will be delivered automatically after generation completes**\n\n` +
              `✨ Generating with VEO3 AI`

          await bot.telegram.sendMessage(telegram_id, asyncMessage, {
            parse_mode: 'Markdown',
          })

          logger.info({
            message: '✅ Generation started notification sent',
            taskId: generationResult.taskId,
            telegram_id,
          })
      })

      // ⚡ Функция завершена! Дальше webhook обработает результат

      logger.info({
        message: '✅ VEO3 video generation request sent successfully',
        telegram_id,
        taskId: generationResult.taskId,
        provider: generationResult.provider,
        asyncMode: true,
      })

      return {
        success: true,
        taskId: generationResult.taskId,
        provider: generationResult.provider,
        model: generationResult.model,
        aspectRatio,
        duration,
        asyncMode: true,
        message: 'Generation started, video will be delivered via callback'
      }
    } catch (error: any) {
      // Категоризируем ошибки для лучшей диагностики
      const errorType = categorizeError(error)

      logger.error({
        message: '❌ VEO3 video generation failed',
        error: error.message,
        errorType: errorType.type,
        telegram_id: event.data.telegram_id,
        bot_name: event.data.bot_name,
        model: event.data.model || 'veo3_fast',
        stack: error.stack,
        httpStatus: error.response?.status,
        responseData: error.response?.data,
      })

      // Отправляем детальное сообщение об ошибке пользователю
      try {
        const bot = (await getBotByName(event.data.bot_name)) as { bot: any }
        if (bot?.bot) {
          const userMessage = getUserFriendlyErrorMessage(
            error,
            event.data.is_ru
          )
          await errorMessage(
            bot.bot,
            event.data.telegram_id,
            event.data.is_ru,
            userMessage
          )

          // Отправляем админское уведомление для критических ошибок
          if (errorType.critical) {
            await errorMessageAdmin(
              bot.bot,
              `🚨 Critical video generation error\n` +
                `User: ${event.data.telegram_id}\n` +
                `Bot: ${event.data.bot_name}\n` +
                `Error: ${error.message}\n` +
                `Type: ${errorType.type}`
            )
          }
        }
      } catch (botError: any) {
        logger.error({
          message: '❌ Failed to send error message to user',
          error: botError.message,
          originalError: error.message,
        })
      }

      throw error
    }
  }
)
