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
  updateUserLevelPlusOne,
  updateUserBalance,
} from '@/core/supabase'
import { saveVideoUrlToSupabase } from '@/core/supabase/saveVideoUrlToSupabase'
import { processBalanceVideoOperation } from '@/price/helpers'
import { errorMessage, errorMessageAdmin } from '@/helpers'
import { logger } from '@/utils/logger'
import { PaymentType } from '@/interfaces/payments.interface'
import { ModeEnum } from '@/interfaces/modes'
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
    try {
      const {
        prompt,
        model = 'veo3_fast',
        aspectRatio = '9:16',
        duration = 3,
        telegram_id,
        username,
        is_ru,
        bot_name,
        imageUrl,
        style,
        cameraMovement,
      } = event.data as Veo3GenerationEventData

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

          // Генерируем через Kie.ai
          const result = await kieAiService.generateVideo({
            model,
            prompt,
            duration,
            aspectRatio,
            imageUrl,
            userId: telegram_id,
          })

          logger.info({
            message: '✅ Video generated via Kie.ai',
            videoUrl: result.videoUrl,
            cost: result.cost,
            processingTime: result.processingTime,
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
            step: 'fallback-to-vertex',
          })

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

      // Шаг 4: Обработка баланса пользователя
      await step.run('process-balance', async () => {
        logger.info({
          message: '💰 Processing user balance',
          cost: generationResult.cost,
          provider: generationResult.provider,
          step: 'process-balance',
        })

        // Расчет стоимости в звездах (с наценкой)
        const STAR_COST_USD = 0.016
        const MARKUP_RATE = 1.5
        const starsRequired = Math.ceil(
          (generationResult.cost * MARKUP_RATE) / STAR_COST_USD
        )

        await processBalanceVideoOperation({
          telegram_id,
          cost: starsRequired,
          paymentType: PaymentType.VEO3_VIDEO_GENERATION,
          mode: ModeEnum.TextToVideo,
          username,
          is_ru,
          bot,
        })
      })

      // Шаг 5: Сохранение видео в базу данных
      await step.run('save-video-url', async () => {
        logger.info({
          message: '💾 Saving video URL to database',
          videoUrl: generationResult.videoUrl,
          step: 'save-video-url',
        })

        await saveVideoUrlToSupabase(
          generationResult.videoUrl,
          telegram_id,
          prompt,
          'veo3_video_generation'
        )
      })

      // Шаг 6: Отправка результата пользователю
      await step.run('send-result', async () => {
        logger.info({
          message: '📤 Sending result to user',
          telegram_id,
          provider: generationResult.provider,
          step: 'send-result',
        })

        const successMessage = is_ru
          ? `🎬 **Видео готово!**\n\n` +
            `📱 **Формат:** ${aspectRatio}\n` +
            `⏱️ **Длительность:** ${duration}с\n` +
            `🤖 **Модель:** ${generationResult.model}\n` +
            `🔗 **Провайдер:** ${generationResult.provider}\n\n` +
            `✨ Создано с помощью VEO3 AI`
          : `🎬 **Video Ready!**\n\n` +
            `📱 **Format:** ${aspectRatio}\n` +
            `⏱️ **Duration:** ${duration}s\n` +
            `🤖 **Model:** ${generationResult.model}\n` +
            `🔗 **Provider:** ${generationResult.provider}\n\n` +
            `✨ Generated with VEO3 AI`

        // Отправляем видео файлом
        try {
          await bot.telegram.sendVideo(telegram_id, generationResult.videoUrl, {
            caption: successMessage,
            parse_mode: 'Markdown',
          })
        } catch (videoError: any) {
          // Если видео не отправилось, отправляем ссылку
          logger.warn({
            message: '⚠️ Failed to send video file, sending URL instead',
            error: videoError.message,
          })

          await bot.telegram.sendMessage(
            telegram_id,
            `${successMessage}\n\n📎 **Скачать видео:** ${generationResult.videoUrl}`,
            { parse_mode: 'Markdown' }
          )
        }
      })

      // Шаг 7: Повышение уровня пользователя
      await step.run('level-up', async () => {
        logger.info({
          message: '⭐ Processing user level up',
          telegram_id,
          step: 'level-up',
        })

        await updateUserLevelPlusOne(telegram_id)
      })

      logger.info({
        message: '✅ VEO3 video generation completed successfully',
        telegram_id,
        provider: generationResult.provider,
        cost: generationResult.cost,
        videoUrl: generationResult.videoUrl,
      })

      return {
        success: true,
        videoUrl: generationResult.videoUrl,
        provider: generationResult.provider,
        model: generationResult.model,
        aspectRatio,
        duration,
        cost: generationResult.cost,
        processingTime: generationResult.processingTime,
      }
    } catch (error: any) {
      logger.error({
        message: '❌ VEO3 video generation failed',
        error: error.message,
        telegram_id: event.data.telegram_id,
        stack: error.stack,
      })

      // Отправляем сообщение об ошибке пользователю
      try {
        const bot = (await getBotByName(event.data.bot_name)) as { bot: any }
        if (bot?.bot) {
          await errorMessage(
            bot.bot,
            event.data.telegram_id,
            event.data.is_ru,
            error.message
          )
        }
      } catch (botError: any) {
        logger.error({
          message: '❌ Failed to send error message to user',
          error: botError.message,
        })
      }

      throw error
    }
  }
)
