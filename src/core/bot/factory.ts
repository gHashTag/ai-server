import { Telegraf } from 'telegraf'
import type { MyContext } from '@/interfaces'
import { logger } from '@/utils/logger'
import { BOT_NAMES } from '@/config'

export class BotFactory {
  private static instances = new Map<string, Telegraf<MyContext>>()

  static getBot(name: string): Telegraf<MyContext> {
    if (!BotFactory.instances.has(name)) {
      const token = BOT_NAMES[name]

      if (!token) {
        logger.error(`🚨 Missing ${name} bot token`)
        throw new Error('Bot token required')
      }

      const bot = new Telegraf<MyContext>(token)
      bot.launch().catch(e => logger.error('💀 Bot launch failed', e))

      BotFactory.instances.set(name, bot)
      logger.info(`🤖 ${name} bot initialized`)
    }
    return BotFactory.instances.get(name)! as Telegraf<MyContext>
  }
}
