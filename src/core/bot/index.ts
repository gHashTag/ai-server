import { BOT_NAMES } from '@/config'
import { config } from 'dotenv'
import { pulseBot } from '@/config'
config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` })

// import { Telegraf } from 'telegraf'

// // Явно указываем тип Telegraf для переменной bot
// const bot: Telegraf = new Telegraf(BOT_TOKEN)

// export default bot

import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'

export const bots = Object.values(BOT_NAMES).map(
  token => new Telegraf<MyContext>(token)
)

export function getBotByName(bot_name: string): {
  bot?: Telegraf<MyContext>
  error?: string | null
} {
  console.log('CASE: getBotByName', bot_name)
  const token = BOT_NAMES[bot_name]
  console.log('token', token)
  if (!token) {
    return { error: 'Unauthorized' }
  }

  const bot = bots.find(bot => bot.telegram.token === token)
  console.log('CASE: getBotByName', bot)
  if (!bot) {
    return { error: 'Unauthorized' }
  }

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
