import { inngest } from '../clients'
import { createUserService, CreateUserT } from '@/services/user.service'
import { logger } from '@/utils/logger'

export const createUserInngest = inngest.createFunction(
  { 
    id: 'create-user',
    name: 'Create User via Inngest',
    retries: 3
  },
  { event: 'user/create.start' },
  async ({ event, step }) => {
    const userData: CreateUserT = event.data

    logger.info({
      message: 'Inngest: Начинаем создание пользователя',
      telegramId: userData.telegram_id,
      username: userData.username,
      botName: userData.bot_name
    })

    return await step.run('create-user', async () => {
      try {
        const result = await createUserService(userData)

        logger.info({
          message: 'Inngest: Пользователь успешно создан',
          telegramId: userData.telegram_id,
          username: userData.username,
          result
        })

        return result
      } catch (error) {
        logger.error({
          message: 'Inngest: Ошибка создания пользователя',
          telegramId: userData.telegram_id,
          username: userData.username,
          error: error.message,
          stack: error.stack
        })
        
        throw error
      }
    })
  }
)

// Функция для массового создания пользователей
export const createUsersBatchInngest = inngest.createFunction(
  { 
    id: 'create-users-batch',
    name: 'Create Users Batch via Inngest',
    retries: 2
  },
  { event: 'user/create-batch.start' },
  async ({ event, step }) => {
    const { users, batchIndex, totalBatches } = event.data

    logger.info({
      message: 'Inngest: Начинаем создание пользователей батчем',
      batchIndex,
      totalBatches,
      userCount: users.length
    })

    return await step.run('create-users-batch', async () => {
      try {
        const results = []
        
        for (const userData of users) {
          try {
            const result = await createUserService(userData)
            results.push({ 
              telegramId: userData.telegram_id, 
              status: 'created', 
              result 
            })
          } catch (error) {
            logger.warn({
              message: 'Ошибка создания пользователя в батче',
              telegramId: userData.telegram_id,
              error: error.message
            })
            results.push({ 
              telegramId: userData.telegram_id, 
              status: 'failed', 
              error: error.message 
            })
          }
        }

        logger.info({
          message: 'Inngest: Батч создания пользователей завершен',
          batchIndex,
          successCount: results.filter(r => r.status === 'created').length,
          failedCount: results.filter(r => r.status === 'failed').length
        })

        return results
      } catch (error) {
        logger.error({
          message: 'Inngest: Ошибка обработки батча пользователей',
          batchIndex,
          error: error.message
        })
        
        throw error
      }
    })
  }
)