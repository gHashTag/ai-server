/**
 * 🔗 Kie.ai Callback Controller
 * Обработка асинхронных уведомлений от Kie.ai API о завершении генерации видео
 */

import { Request, Response } from 'express'
import { logger } from '@/utils/logger'
import { supabase } from '@/core/supabase'
import { getBotByName } from '@/core/bot'

/**
 * Интерфейс для callback данных от Kie.ai
 */
interface KieAiCallbackData {
  taskId: string
  status: 'completed' | 'failed' | 'processing'
  videoUrl?: string
  error?: string
  progress?: number
  duration?: number
  cost?: number
  metadata?: {
    model?: string
    aspectRatio?: string
    prompt?: string
  }
}

/**
 * Обработчик callback уведомлений от Kie.ai
 */
export const handleKieAiCallback = async (req: Request, res: Response) => {
  const startTime = Date.now()

  try {
    logger.info('📞 Received Kie.ai callback', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query,
    })

    // Валидируем входящие данные
    const callbackData: KieAiCallbackData = req.body

    if (!callbackData.taskId) {
      logger.error('❌ Invalid callback: missing taskId', {
        body: req.body,
      })
      return res.status(400).json({
        success: false,
        error: 'Missing taskId in callback data',
      })
    }

    if (!['completed', 'failed', 'processing'].includes(callbackData.status)) {
      logger.error('❌ Invalid callback: invalid status', {
        taskId: callbackData.taskId,
        status: callbackData.status,
      })
      return res.status(400).json({
        success: false,
        error: 'Invalid status in callback data',
      })
    }

    logger.info('✅ Callback data validated', {
      taskId: callbackData.taskId,
      status: callbackData.status,
      hasVideoUrl: !!callbackData.videoUrl,
      hasError: !!callbackData.error,
      progress: callbackData.progress,
    })

    // Находим задачу в базе данных
    const { data: taskRecord, error: taskError } = await supabase
      .from('video_tasks')
      .select('*')
      .eq('task_id', callbackData.taskId)
      .single()

    if (taskError || !taskRecord) {
      logger.warn('⚠️ Task not found in database', {
        taskId: callbackData.taskId,
        error: taskError?.message,
      })

      // Все равно возвращаем success, чтобы Kie.ai не повторял callback
      return res.status(200).json({
        success: true,
        message: 'Task not found in database, but callback acknowledged',
      })
    }

    logger.info('📋 Task found in database', {
      taskId: callbackData.taskId,
      currentStatus: taskRecord.status,
      telegramId: taskRecord.telegram_id,
      botName: taskRecord.bot_name,
    })

    // Обновляем статус задачи в базе данных
    const updateData: any = {
      status: callbackData.status,
      completed_at:
        callbackData.status === 'completed' || callbackData.status === 'failed'
          ? new Date().toISOString()
          : null,
    }

    if (callbackData.videoUrl) {
      updateData.video_url = callbackData.videoUrl
    }

    if (callbackData.error) {
      updateData.error_message = callbackData.error
    }

    // Обновляем metadata с данными callback
    const existingMetadata = taskRecord.metadata || {}
    updateData.metadata = {
      ...existingMetadata,
      callbackReceived: true,
      callbackTimestamp: new Date().toISOString(),
      progress: callbackData.progress,
      cost: callbackData.cost,
      duration: callbackData.duration,
      ...callbackData.metadata,
    }

    const { error: updateError } = await supabase
      .from('video_tasks')
      .update(updateData)
      .eq('task_id', callbackData.taskId)

    if (updateError) {
      logger.error('❌ Failed to update task in database', {
        taskId: callbackData.taskId,
        error: updateError.message,
      })
    } else {
      logger.info('✅ Task updated in database', {
        taskId: callbackData.taskId,
        status: callbackData.status,
        updatedFields: Object.keys(updateData),
      })
    }

    // Если генерация завершена, отправляем результат пользователю
    if (
      callbackData.status === 'completed' &&
      callbackData.videoUrl &&
      taskRecord.telegram_id
    ) {
      await sendVideoToUser(taskRecord, callbackData)
    } else if (callbackData.status === 'failed' && taskRecord.telegram_id) {
      await sendErrorToUser(taskRecord, callbackData)
    }

    const processingTime = Date.now() - startTime
    logger.info('🏁 Callback processed successfully', {
      taskId: callbackData.taskId,
      status: callbackData.status,
      processingTimeMs: processingTime,
    })

    // Возвращаем успешный ответ для Kie.ai
    res.status(200).json({
      success: true,
      message: 'Callback processed successfully',
      taskId: callbackData.taskId,
      status: callbackData.status,
    })
  } catch (error: any) {
    const processingTime = Date.now() - startTime

    logger.error('💥 Callback processing failed', {
      error: error.message,
      stack: error.stack,
      processingTimeMs: processingTime,
      body: req.body,
    })

    // Возвращаем ошибку, чтобы Kie.ai знал о проблеме
    res.status(500).json({
      success: false,
      error: 'Internal server error processing callback',
    })
  }
}

/**
 * Отправка готового видео пользователю
 */
async function sendVideoToUser(
  taskRecord: any,
  callbackData: KieAiCallbackData
) {
  try {
    logger.info('📤 Sending completed video to user', {
      taskId: callbackData.taskId,
      telegramId: taskRecord.telegram_id,
      botName: taskRecord.bot_name,
      videoUrl: callbackData.videoUrl,
    })

    // Получаем экземпляр бота
    const botData = getBotByName(taskRecord.bot_name || 'neuro_blogger_bot')
    if (!botData.bot) {
      logger.error('❌ Bot not found for video delivery', {
        taskId: callbackData.taskId,
        botName: taskRecord.bot_name,
        error: botData.error,
      })
      return
    }

    const bot = botData.bot
    const isRu = taskRecord.is_ru !== false // по умолчанию русский

    // Формируем сообщение о готовом видео
    const successMessage = isRu
      ? `🎬 **Видео готово!**\n\n` +
        `📱 **Формат:** ${taskRecord.metadata?.aspectRatio || 'N/A'}\n` +
        `⏱️ **Длительность:** ${
          callbackData.duration || taskRecord.metadata?.duration || 'N/A'
        }с\n` +
        `🤖 **Модель:** ${taskRecord.model || 'N/A'}\n` +
        `🔗 **Провайдер:** Kie.ai\n\n` +
        `✨ Создано с помощью VEO3 AI`
      : `🎬 **Video Ready!**\n\n` +
        `📱 **Format:** ${taskRecord.metadata?.aspectRatio || 'N/A'}\n` +
        `⏱️ **Duration:** ${
          callbackData.duration || taskRecord.metadata?.duration || 'N/A'
        }s\n` +
        `🤖 **Model:** ${taskRecord.model || 'N/A'}\n` +
        `🔗 **Provider:** Kie.ai\n\n` +
        `✨ Generated with VEO3 AI`

    // Отправляем видео
    try {
      await bot.telegram.sendVideo(
        taskRecord.telegram_id,
        callbackData.videoUrl!,
        {
          caption: successMessage,
          parse_mode: 'Markdown',
        }
      )

      logger.info('✅ Video sent to user successfully', {
        taskId: callbackData.taskId,
        telegramId: taskRecord.telegram_id,
        videoUrl: callbackData.videoUrl,
      })
    } catch (videoError: any) {
      // Если видео не отправилось, отправляем ссылку
      logger.warn('⚠️ Failed to send video file, sending URL instead', {
        taskId: callbackData.taskId,
        error: videoError.message,
      })

      await bot.telegram.sendMessage(
        taskRecord.telegram_id,
        `${successMessage}\n\n📎 **Скачать видео:** ${callbackData.videoUrl}`,
        { parse_mode: 'Markdown' }
      )

      logger.info('✅ Video URL sent to user', {
        taskId: callbackData.taskId,
        telegramId: taskRecord.telegram_id,
      })
    }
  } catch (error: any) {
    logger.error('❌ Failed to send video to user', {
      taskId: callbackData.taskId,
      telegramId: taskRecord.telegram_id,
      error: error.message,
    })
  }
}

/**
 * Отправка ошибки пользователю
 */
async function sendErrorToUser(
  taskRecord: any,
  callbackData: KieAiCallbackData
) {
  try {
    logger.info('📤 Sending error message to user', {
      taskId: callbackData.taskId,
      telegramId: taskRecord.telegram_id,
      error: callbackData.error,
    })

    // Получаем экземпляр бота
    const botData = getBotByName(taskRecord.bot_name || 'neuro_blogger_bot')
    if (!botData.bot) {
      logger.error('❌ Bot not found for error delivery', {
        taskId: callbackData.taskId,
        botName: taskRecord.bot_name,
        error: botData.error,
      })
      return
    }

    const bot = botData.bot
    const isRu = taskRecord.is_ru !== false

    // Формируем сообщение об ошибке
    const errorMessage = isRu
      ? `❌ **Не удалось создать видео**\n\n` +
        `🔸 Причина: ${callbackData.error || 'Неизвестная ошибка'}\n` +
        `🔸 ID задачи: ${callbackData.taskId}\n\n` +
        `💡 Попробуйте еще раз или обратитесь к администратору.`
      : `❌ **Failed to create video**\n\n` +
        `🔸 Reason: ${callbackData.error || 'Unknown error'}\n` +
        `🔸 Task ID: ${callbackData.taskId}\n\n` +
        `💡 Please try again or contact administrator.`

    await bot.telegram.sendMessage(taskRecord.telegram_id, errorMessage, {
      parse_mode: 'Markdown',
    })

    logger.info('✅ Error message sent to user', {
      taskId: callbackData.taskId,
      telegramId: taskRecord.telegram_id,
    })
  } catch (error: any) {
    logger.error('❌ Failed to send error message to user', {
      taskId: callbackData.taskId,
      telegramId: taskRecord.telegram_id,
      error: error.message,
    })
  }
}

/**
 * Health check для callback endpoint
 */
export const callbackHealthCheck = (req: Request, res: Response) => {
  logger.info('💚 Kie.ai callback endpoint health check', {
    timestamp: new Date().toISOString(),
    ip: req.ip,
  })

  res.status(200).json({
    status: 'healthy',
    service: 'kie-ai-callback',
    timestamp: new Date().toISOString(),
  })
}
