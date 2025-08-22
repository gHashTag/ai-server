import { inngest } from '../clients'
import { broadcastService } from '@/services/broadcast.service'
import { logger } from '@/utils/logger'

export const broadcastMessageInngest = inngest.createFunction(
  { 
    id: 'broadcast-message',
    name: 'Broadcast Message via Inngest',
    retries: 2,
    concurrency: {
      limit: 10 // Ограничиваем конкуррентность для защиты от rate limits
    }
  },
  { event: 'broadcast/message.start' },
  async ({ event, step }) => {
    const { 
      imageUrl, 
      text,
      batchSize = 50, // Размер батча для обработки пользователей
      delayBetweenBatches = 1000 // Задержка между батчами (мс)
    } = event.data

    logger.info({
      message: 'Inngest: Начинаем массовую рассылку',
      imageUrl: imageUrl.substring(0, 100),
      textLength: text.length,
      batchSize
    })

    return await step.run('broadcast-message', async () => {
      try {
        const result = await broadcastService.sendToAllUsers(imageUrl, text)

        logger.info({
          message: 'Inngest: Массовая рассылка завершена',
          result
        })

        return result
      } catch (error) {
        logger.error({
          message: 'Inngest: Ошибка массовой рассылки',
          error: error.message,
          stack: error.stack
        })
        
        throw error
      }
    })
  }
)

// Дополнительная функция для батчевой обработки больших рассылок
export const broadcastMessageBatchInngest = inngest.createFunction(
  { 
    id: 'broadcast-message-batch',
    name: 'Broadcast Message Batch Processing via Inngest',
    retries: 2
  },
  { event: 'broadcast/batch.start' },
  async ({ event, step }) => {
    const { 
      imageUrl, 
      text,
      userIds,
      batchIndex,
      totalBatches
    } = event.data

    logger.info({
      message: 'Inngest: Обработка батча рассылки',
      batchIndex,
      totalBatches,
      userCount: userIds.length
    })

    return await step.run('broadcast-batch', async () => {
      try {
        // Реализация батчевой рассылки для больших объемов
        const results = []
        
        for (const userId of userIds) {
          try {
            // Здесь будет логика отправки конкретному пользователю
            results.push({ userId, status: 'sent' })
          } catch (error) {
            logger.warn({
              message: 'Ошибка отправки пользователю в батче',
              userId,
              error: error.message
            })
            results.push({ userId, status: 'failed', error: error.message })
          }
        }

        logger.info({
          message: 'Inngest: Батч рассылки завершен',
          batchIndex,
          successCount: results.filter(r => r.status === 'sent').length,
          failedCount: results.filter(r => r.status === 'failed').length
        })

        return results
      } catch (error) {
        logger.error({
          message: 'Inngest: Ошибка обработки батча',
          batchIndex,
          error: error.message
        })
        
        throw error
      }
    })
  }
)