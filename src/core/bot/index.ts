import { BOT_NAMES } from '@/config'
import { config } from 'dotenv'
import { pulseBot } from '@/config'
import { logger } from '@utils/logger'

import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` })

export const bots = Object.values(BOT_NAMES).map(
  token => new Telegraf<MyContext>(token)
)

// Импортируем DEFAULT_BOT_NAME для fallback
import { DEFAULT_BOT_NAME } from '@/config'

export function getBotByName(bot_name: string): {
  bot?: Telegraf<MyContext>
  error?: string | null
} {
  logger.info('🔎 getBotByName запрошен для:', {
    description: 'getBotByName requested for',
    bot_name,
  })

  // Проверяем наличие бота в конфигурации
  let token = BOT_NAMES[bot_name]
  let actualBotName = bot_name

  if (!token) {
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

    if (!token) {
      logger.error('❌ Даже fallback бот недоступен в конфигурации', {
        description: 'Even fallback bot not available in configuration',
        fallback_bot_name: DEFAULT_BOT_NAME,
        availableBots: Object.keys(BOT_NAMES),
      })
      return { error: 'Bot not found in configuration' }
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
