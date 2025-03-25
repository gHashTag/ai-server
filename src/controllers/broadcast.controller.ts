import { Request, Response } from 'express'
import { inngest } from '@/core/inngest/clients'
import { logger } from '@utils/logger'
import { getBotByName } from '@/core/bot'
import { avatarService } from '@/services/avatar.service'

interface BroadcastRequest {
  imageUrl?: string
  videoFileId?: string
  textRu: string
  textEn: string
  botName?: string
  sender_telegram_id?: string
  contentType?: 'photo' | 'video' | 'post_link'
  postLink?: string
  botToken?: string
  test_mode?: boolean
  test_telegram_id?: string
}

export const broadcastController = {
  /**
   * Создает задачу на рассылку для всех пользователей через Inngest
   */
  sendBroadcast: async (req: Request, res: Response) => {
    try {
      const requestData = req.body as BroadcastRequest

      // Преобразуем параметры в формат, ожидаемый сервером
      const serverParams = {
        imageUrl:
          requestData.contentType === 'photo'
            ? requestData.imageUrl
            : undefined,
        videoFileId:
          requestData.contentType === 'video'
            ? requestData.videoFileId
            : undefined,
        textRu: requestData.textRu,
        textEn: requestData.textEn,
        bot_name: requestData.botName,
        sender_telegram_id: requestData.sender_telegram_id,
        contentType: requestData.contentType,
        postLink:
          requestData.contentType === 'post_link'
            ? requestData.postLink
            : undefined,
        test_mode: requestData.test_mode,
        test_telegram_id: requestData.test_telegram_id,
      }

      // Проверяем наличие обязательных параметров
      if (!serverParams.textRu || !serverParams.textEn) {
        return res.status(400).json({
          success: false,
          message: 'Текст сообщения отсутствует на одном из языков',
        })
      }

      // Проверяем корректность контента в зависимости от типа
      if (serverParams.contentType === 'photo' && !serverParams.imageUrl) {
        return res.status(400).json({
          success: false,
          message: 'URL изображения отсутствует для фото-рассылки',
        })
      }

      if (serverParams.contentType === 'video' && !serverParams.videoFileId) {
        return res.status(400).json({
          success: false,
          message: 'ID видео отсутствует для видео-рассылки',
        })
      }

      if (serverParams.contentType === 'post_link' && !serverParams.postLink) {
        return res.status(400).json({
          success: false,
          message: 'URL поста отсутствует для рассылки ссылки',
        })
      }

      // Создаем событие для рассылки
      await inngest.send({
        name: 'broadcast/send-message',
        data: serverParams,
      })

      return res.json({
        success: true,
        message: serverParams.test_mode
          ? 'Тестовая рассылка запущена'
          : serverParams.bot_name
          ? `Рассылка запущена для пользователей бота ${serverParams.bot_name}`
          : 'Рассылка запущена для всех пользователей',
      })
    } catch (error) {
      logger.error('❌ Ошибка при запуске рассылки:', {
        description: 'Error starting broadcast',
        error: error?.message || 'Unknown error',
      })

      return res.status(500).json({
        success: false,
        message: 'Ошибка при запуске рассылки',
        error: error?.message || 'Unknown error',
      })
    }
  },

  /**
   * Метод для отправки рассылки через Telegram-бот владельцем
   * (эту функцию нужно вызывать из обработчика команд Telegram)
   */
  sendBroadcastByOwner: async (
    telegram_id: string,
    bot_name: string,
    content: {
      imageUrl?: string
      textRu: string
      textEn: string
      contentType?: 'photo' | 'video' | 'post_link'
      postLink?: string
      videoFileId?: string
    },
    test_mode?: boolean
  ) => {
    try {
      const { imageUrl, textRu, textEn, contentType, postLink, videoFileId } =
        content

      // Проверяем, является ли пользователь владельцем бота
      const isOwner = await avatarService.isAvatarOwner(telegram_id, bot_name)
      if (!isOwner) {
        logger.warn('⚠️ Попытка неавторизованной рассылки из Telegram:', {
          description: 'Unauthorized broadcast attempt from Telegram',
          telegram_id,
          bot_name,
        })

        return {
          success: false,
          message: 'У вас нет прав для выполнения рассылки',
        }
      }

      // Вызываем Inngest-функцию для асинхронной рассылки
      await inngest.send({
        name: 'broadcast/send-message',
        data: {
          imageUrl,
          textRu,
          textEn,
          bot_name,
          sender_telegram_id: telegram_id,
          test_mode: test_mode || false,
          contentType,
          postLink,
          videoFileId,
          parse_mode: contentType === 'post_link' ? 'HTML' : 'Markdown',
        },
      })

      // Генерируем уникальный ID для события
      const eventId = `broadcast_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 7)}`

      logger.info('✅ Задача рассылки из Telegram поставлена в очередь', {
        description: 'Broadcast task from Telegram queued',
        eventId,
        contentType: contentType || 'photo',
        bot_name,
        test_mode: test_mode || false,
      })

      return {
        success: true,
        message: test_mode
          ? 'Задача тестовой рассылки поставлена в очередь'
          : 'Задача рассылки поставлена в очередь и будет выполнена асинхронно',
        eventId,
      }
    } catch (error) {
      logger.error('❌ Ошибка при создании задачи рассылки из Telegram:', {
        description: 'Error while creating broadcast task from Telegram',
        error: error?.message || 'Unknown error',
        telegram_id,
        bot_name,
        test_mode: test_mode || false,
      })

      return {
        success: false,
        message: 'Произошла ошибка при создании задачи рассылки',
        error: error?.message || 'Unknown error',
      }
    }
  },

  // Диагностический метод для проверки доступности ботов
  checkBots: async (req: Request, res: Response) => {
    try {
      // Преобразуем параметр запроса в массив строк
      const botNamesParam = req.query.botNames
      let botNames: string[] = ['neuro_blogger_bot'] // Значение по умолчанию

      if (botNamesParam) {
        if (Array.isArray(botNamesParam)) {
          botNames = botNamesParam.map(name => String(name))
        } else {
          botNames = [String(botNamesParam)]
        }
      }

      const results: Record<
        string,
        { found: boolean; error: string | null; hasValidToken: boolean }
      > = {}

      for (const botName of botNames) {
        const result = getBotByName(botName)
        results[botName] = {
          found: !!result.bot,
          error: result.error || null,
          hasValidToken: !!result.bot?.telegram?.token,
        }
      }

      logger.info('🔍 Проверка доступности ботов', {
        description: 'Bot availability check',
        results,
      })

      res.status(200).json({
        success: true,
        results,
      })
    } catch (error) {
      logger.error('❌ Ошибка при проверке ботов:', {
        description: 'Error checking bots',
        error: error?.message || 'Unknown error',
      })

      res.status(500).json({
        success: false,
        message: 'Произошла ошибка при проверке ботов',
        error: error?.message || 'Unknown error',
      })
    }
  },

  /**
   * Проверяет, является ли пользователь владельцем бота
   */
  checkOwnerStatus: async (req: Request, res: Response) => {
    try {
      const { telegram_id, bot_name } = req.query

      if (!telegram_id) {
        return res.status(400).json({
          success: false,
          message: 'Telegram ID is required',
        })
      }

      const isOwner = await avatarService.isAvatarOwner(
        String(telegram_id),
        bot_name ? String(bot_name) : undefined
      )

      res.status(200).json({
        success: true,
        isOwner,
        telegram_id,
        bot_name: bot_name || 'any',
      })
    } catch (error) {
      logger.error('❌ Ошибка при проверке статуса владельца:', {
        description: 'Error checking owner status',
        error: error?.message || 'Unknown error',
      })

      res.status(500).json({
        success: false,
        message: 'Произошла ошибка при проверке статуса владельца',
        error: error?.message || 'Unknown error',
      })
    }
  },

  /**
   * Добавляет пользователя как владельца бота
   * Только для разработки и администраторов
   */
  addBotOwner: async (req: Request, res: Response) => {
    try {
      // Проверяем, что мы в режиме разработки или у пользователя есть права администратора
      if (process.env.NODE_ENV !== 'development') {
        // TODO: добавить проверку прав администратора
        return res.status(403).json({
          success: false,
          message: 'This endpoint is only available in development mode',
        })
      }

      const { telegram_id, bot_name, avatar_url, group } = req.body

      if (!telegram_id || !bot_name) {
        return res.status(400).json({
          success: false,
          message: 'telegram_id and bot_name are required',
        })
      }

      const result = await avatarService.addAvatarOwner(
        telegram_id,
        bot_name,
        avatar_url,
        group
      )

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to add bot owner',
          error: result.error,
        })
      }

      res.status(200).json({
        success: true,
        message: 'Bot owner added successfully',
        data: result.data,
      })
    } catch (error) {
      logger.error('❌ Ошибка при добавлении владельца бота:', {
        description: 'Error adding bot owner',
        error: error?.message || 'Unknown error',
      })

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error?.message || 'Unknown error',
      })
    }
  },
}
