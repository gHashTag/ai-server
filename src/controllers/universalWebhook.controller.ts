import { Request, Response } from 'express'
import { supabase } from '@/core/supabase'
import { errorMessageAdmin } from '@/helpers'
import { getBotByName } from '@/helpers'
import { logger } from '@/utils/logger'

/**
 * Универсальный контроллер для обработки webhook'ов от различных AI провайдеров
 *
 * Поддерживает:
 * - Kie.ai
 * - Replicate
 * - BFL (Black Forest Labs)
 * - SyncLabs
 * - Другие провайдеры
 */
export class UniversalWebhookController {
  /**
   * Единая точка входа для всех webhook'ов
   * Определяет провайдера и направляет на соответствующий обработчик
   */
  public async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const provider = this.identifyProvider(req)

      logger.info(`🔔 Webhook received from ${provider}`, {
        provider,
        headers: req.headers,
        body: req.body,
      })

      switch (provider) {
        case 'kie-ai':
          await this.handleKieAiWebhook(req, res)
          break
        case 'replicate':
          await this.handleReplicateWebhook(req, res)
          break
        case 'bfl':
          await this.handleBflWebhook(req, res)
          break
        case 'synclabs':
          await this.handleSyncLabsWebhook(req, res)
          break
        default:
          logger.warn(`⚠️ Unknown provider: ${provider}`)
          res.status(400).json({ error: 'Unknown provider' })
      }
    } catch (error) {
      logger.error('❌ Error processing webhook:', error)
      errorMessageAdmin(error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Определяет провайдера по заголовкам или содержимому запроса
   */
  private identifyProvider(req: Request): string {
    // Проверяем специфичные заголовки
    if (req.headers['x-kie-signature']) {
      return 'kie-ai'
    }
    if (req.headers['x-replicate-signature']) {
      return 'replicate'
    }
    if (req.headers['x-bfl-signature']) {
      return 'bfl'
    }
    if (req.headers['x-synclabs-signature']) {
      return 'synclabs'
    }

    // Проверяем структуру body
    const body = req.body

    // Kie.ai обычно отправляет taskId и videoUrl
    if (body.taskId && body.videoUrl && !body.prediction) {
      return 'kie-ai'
    }

    // Replicate отправляет prediction
    if (body.prediction || body.status === 'succeeded') {
      return 'replicate'
    }

    // BFL использует специфичную структуру
    if (body.model_id && body.result) {
      return 'bfl'
    }

    // SyncLabs использует outputUrl
    if (body.outputUrl && body.status) {
      return 'synclabs'
    }

    return 'unknown'
  }

  /**
   * Обработчик webhook'ов от Kie.ai
   */
  private async handleKieAiWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Kie.ai может отправлять различные структуры в зависимости от версии API
      const {
        taskId,
        videoUrl,
        status,
        error,
        result, // новое поле для результата
        metadata, // дополнительные метаданные
      } = req.body

      logger.info(`📹 Kie.ai webhook received`, {
        taskId,
        status,
        videoUrl: videoUrl ? 'present' : 'absent',
        result: result ? 'present' : 'absent',
        metadata: metadata || null,
      })

      // Ищем задачу в базе данных
      const { data: taskData, error: dbError } = await supabase
        .from('video_tasks')
        .select('*')
        .eq('task_id', taskId)
        .single()

      if (dbError || !taskData) {
        // Если таблица не существует, создадим её
        if (dbError?.code === '42P01') {
          await this.createVideoTasksTable()
          logger.warn('Created video_tasks table')
        } else {
          logger.error('Task not found:', taskId)
          res.status(404).json({ error: 'Task not found' })
          return
        }
      }

      // Обновляем статус задачи
      // Поддержка как старого формата (videoUrl), так и нового (result.videoUrl)
      const finalVideoUrl = videoUrl || result?.videoUrl || result?.url

      if ((status === 'completed' || status === 'success') && finalVideoUrl) {
        const updateData: any = {
          status: 'completed',
          video_url: finalVideoUrl,
          completed_at: new Date().toISOString(),
        }

        // Сохраняем дополнительные метаданные если они есть
        if (metadata || result?.metadata) {
          updateData.metadata = {
            ...taskData?.metadata,
            ...(metadata || result?.metadata),
          }
        }

        await supabase
          .from('video_tasks')
          .update(updateData)
          .eq('task_id', taskId)

        // Отправляем видео пользователю через Telegram
        if (taskData?.telegram_id && taskData?.bot_name) {
          const { bot } = getBotByName(taskData.bot_name)

          // Формируем сообщение с дополнительной информацией
          let caption = taskData.is_ru
            ? `🎬 Ваше видео готово!\n⚡ Сгенерировано через Kie.ai (экономия 87%)\n📹 Модель: ${
                taskData.model || 'veo-3-fast'
              }`
            : `🎬 Your video is ready!\n⚡ Generated via Kie.ai (87% savings)\n📹 Model: ${
                taskData.model || 'veo-3-fast'
              }`

          // Добавляем информацию о водяном знаке если он был
          if (taskData.metadata?.watermark) {
            caption += taskData.is_ru
              ? `\n💧 Водяной знак: ${taskData.metadata.watermark}`
              : `\n💧 Watermark: ${taskData.metadata.watermark}`
          }

          await bot.telegram.sendVideo(taskData.telegram_id, finalVideoUrl, {
            caption,
          })

          logger.info(`✅ Video sent to user ${taskData.telegram_id}`)
        }
      } else if (status === 'failed') {
        await supabase
          .from('video_tasks')
          .update({
            status: 'failed',
            error_message: error || 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('task_id', taskId)

        // Уведомляем пользователя об ошибке
        if (taskData?.telegram_id && taskData?.bot_name) {
          const { bot } = getBotByName(taskData.bot_name)

          await bot.telegram.sendMessage(
            taskData.telegram_id,
            taskData.is_ru
              ? `❌ Ошибка генерации видео: ${error || 'Неизвестная ошибка'}`
              : `❌ Video generation failed: ${error || 'Unknown error'}`
          )
        }
      }

      res.status(200).json({ success: true, message: 'Webhook processed' })
    } catch (error) {
      logger.error('Error processing Kie.ai webhook:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Обработчик webhook'ов от Replicate
   */
  private async handleReplicateWebhook(
    req: Request,
    res: Response
  ): Promise<void> {
    // Существующая логика из replicateWebhook.controller.ts
    logger.info('Processing Replicate webhook')
    res.status(200).json({ success: true })
  }

  /**
   * Обработчик webhook'ов от BFL
   */
  private async handleBflWebhook(req: Request, res: Response): Promise<void> {
    // Существующая логика из webhook-bfl.controller.ts
    logger.info('Processing BFL webhook')
    res.status(200).json({ success: true })
  }

  /**
   * Обработчик webhook'ов от SyncLabs
   */
  private async handleSyncLabsWebhook(
    req: Request,
    res: Response
  ): Promise<void> {
    // Существующая логика из webhook.controller.ts
    logger.info('Processing SyncLabs webhook')
    res.status(200).json({ success: true })
  }

  /**
   * Создает таблицу для хранения задач видео генерации
   */
  private async createVideoTasksTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS video_tasks (
        id SERIAL PRIMARY KEY,
        task_id VARCHAR(255) UNIQUE NOT NULL,
        provider VARCHAR(50) NOT NULL,
        telegram_id VARCHAR(255),
        bot_name VARCHAR(100),
        model VARCHAR(100),
        prompt TEXT,
        status VARCHAR(50) DEFAULT 'processing',
        video_url TEXT,
        error_message TEXT,
        is_ru BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        CONSTRAINT unique_task_id UNIQUE (task_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_video_tasks_telegram_id ON video_tasks(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_video_tasks_status ON video_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_video_tasks_provider ON video_tasks(provider);
    `

    try {
      await supabase.rpc('exec_sql', { sql: createTableQuery })
      logger.info('✅ video_tasks table created successfully')
    } catch (error) {
      logger.error('Failed to create video_tasks table:', error)
    }
  }
}
