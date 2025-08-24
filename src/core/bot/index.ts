import { BOT_NAMES, BOT_TOKENS } from '@/config'
import { config } from 'dotenv'
import { pulseBot } from '@/config'
import { logger } from '@utils/logger'

import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` })

export const bots = BOT_TOKENS.map(token => new Telegraf<MyContext>(token))

// Mock bot для тестирования без реальных токенов
function createMockBot() {
  logger.info('🧪 Создаем mock bot для тестирования')
  return {
    telegram: {
      sendMessage: async (chatId: string, message: string, options?: any) => {
        logger.info('📨 Mock bot sendMessage:', {
          chatId,
          message: message.substring(0, 100),
          options,
        })
        return { message_id: Date.now(), chat: { id: chatId }, text: message }
      },
      sendPhoto: async (chatId: string, photo: any, options?: any) => {
        logger.info('📷 Mock bot sendPhoto:', {
          chatId,
          photo: 'mock_photo',
          options,
        })
        return {
          message_id: Date.now(),
          chat: { id: chatId },
          photo: [{ file_id: 'mock_file_id' }],
        }
      },
      sendVideo: async (chatId: string, video: any, options?: any) => {
        logger.info('🎥 Mock bot sendVideo:', {
          chatId,
          video: 'mock_video',
          options,
        })
        return {
          message_id: Date.now(),
          chat: { id: chatId },
          video: { file_id: 'mock_video_id' },
        }
      },
      sendDocument: async (chatId: string, document: any, options?: any) => {
        logger.info('📎 Mock bot sendDocument:', {
          chatId,
          document: 'mock_document',
          options,
        })
        return {
          message_id: Date.now(),
          chat: { id: chatId },
          document: { file_id: 'mock_doc_id' },
        }
      },
      getChatMember: async (chatId: string, userId: number) => {
        logger.info('👤 Mock bot getChatMember:', { chatId, userId })
        return { user: { id: userId }, status: 'member' }
      },
      token: 'mock_token',
    },
    api: {
      getMe: async () => {
        logger.info('🤖 Mock bot getMe')
        return {
          id: 123456789,
          is_bot: true,
          first_name: 'Mock Bot',
          username: 'mock_bot',
        }
      },
    },
  }
}

// Импортируем DEFAULT_BOT_NAME для fallback
import { DEFAULT_BOT_NAME } from '@/config'

export function getBotByName(bot_name: string): {
  bot?: Telegraf<MyContext>
  error?: string | null
} {
  logger.info('🔎 getBotByName запрошен для:', {
    description: 'getBotByName requested for',
    bot_name,
    bot_name_type: typeof bot_name,
    is_null: bot_name === null,
    is_undefined: bot_name === undefined,
  })

  // Проверка на null/undefined bot_name
  if (!bot_name || bot_name === 'null' || bot_name === 'undefined') {
    logger.warn('⚠️ bot_name is null/undefined, using default bot', {
      received_bot_name: bot_name,
      fallback_bot_name: DEFAULT_BOT_NAME,
    })
    bot_name = DEFAULT_BOT_NAME
  }

  // Проверяем наличие бота в конфигурации
  let token = BOT_NAMES[bot_name]
  let actualBotName = bot_name

  if (!token || token.includes('placeholder')) {
    logger.warn(
      '⚠️ Токен бота не найден в конфигурации, используем fallback:',
      {
        description: 'Bot token not found in configuration, using fallback',
        requested_bot_name: bot_name,
        fallback_bot_name: DEFAULT_BOT_NAME,
        availableBots: Object.keys(BOT_NAMES),
      }
    )

    // Используем fallback на DEFAULT_BOT_NAME
    token = BOT_NAMES[DEFAULT_BOT_NAME]
    actualBotName = DEFAULT_BOT_NAME

    if (!token || token.includes('placeholder')) {
      logger.error('❌ Даже fallback бот недоступен в конфигурации', {
        description: 'Even fallback bot not available in configuration',
        fallback_bot_name: DEFAULT_BOT_NAME,
        availableBots: Object.keys(BOT_NAMES),
        tokenIsPlaceholder: token ? token.includes('placeholder') : false,
      })

      // В тестовом режиме возвращаем mock bot вместо ошибки
      if (
        process.env.NODE_ENV === 'development' &&
        process.env.USE_MOCK_BOT === 'true'
      ) {
        logger.info('🧪 Возвращаем mock bot для тестирования')
        return { bot: createMockBot() }
      }

      return { error: 'Valid bot token not found in configuration' }
    }
  }

  logger.info('🔑 Токен бота получен из конфигурации', {
    description: 'Bot token retrieved from configuration',
    requested_bot_name: bot_name,
    actual_bot_name: actualBotName,
    tokenLength: token.length,
  })

  // Ищем экземпляр бота в массиве
  const bot = bots.find(bot => bot.telegram.token === token)

  if (!bot) {
    logger.error('❌ Экземпляр бота не найден', {
      description: 'Bot instance not found',
      requested_bot_name: bot_name,
      actual_bot_name: actualBotName,
      availableBots: bots.map(bot => ({
        token: bot.telegram.token.substring(0, 5) + '...',
        hasBot: !!bot,
      })),
    })
    return { error: 'Bot instance not found' }
  }

  // Проверка наличия необходимых методов
  if (!bot.telegram || typeof bot.telegram.sendPhoto !== 'function') {
    logger.error(
      '❌ Экземпляр бота найден, но отсутствуют необходимые методы',
      {
        description: 'Bot instance found but missing required methods',
        requested_bot_name: bot_name,
        actual_bot_name: actualBotName,
        hasTelegram: !!bot.telegram,
        methods: bot.telegram ? Object.keys(bot.telegram) : [],
      }
    )
    return { error: 'Bot instance is invalid' }
  }

  logger.info('✅ Бот успешно получен', {
    description: 'Bot successfully retrieved',
    requested_bot_name: bot_name,
    actual_bot_name: actualBotName,
    hasTelegram: !!bot.telegram,
    methodsCount: bot.telegram ? Object.keys(bot.telegram).length : 0,
  })

  return { bot }
}

export const supportRequest = async (title: string, data: any) => {
  try {
    await pulseBot.telegram.sendMessage(
      process.env.SUPPORT_CHAT_ID,
      `🚀 ${title}\n\n${JSON.stringify(data)}`
    )
  } catch (error) {
    throw new Error(`Error supportRequest: ${JSON.stringify(error)}`)
  }
}
