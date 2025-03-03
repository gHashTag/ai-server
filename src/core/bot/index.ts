// import { BOT_TOKEN } from '@/config'
import { config } from 'dotenv'
import { pulseBot } from '@/config'
config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` })

// import { Telegraf } from 'telegraf'

// // Явно указываем тип Telegraf для переменной bot
// const bot: Telegraf = new Telegraf(BOT_TOKEN)

// export default bot

import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'

export const BOT_NAMES = {
  ['neuro_blogger_bot']: process.env.BOT_TOKEN_1,
  ['MetaMuse_Manifest_bot']: process.env.BOT_TOKEN_2,
  ['ZavaraBot']: process.env.BOT_TOKEN_3,
  ['LeeSolarbot']: process.env.BOT_TOKEN_4,
  ['ai_koshey_bot']: process.env.BOT_TOKEN_TEST_1,
  ['clip_maker_neuro_bot']: process.env.BOT_TOKEN_TEST_2,
}

export const bots = Object.values(BOT_NAMES).map(
  token => new Telegraf<MyContext>(token)
)

export function getBotByName(bot_name: string) {
  console.log('CASE: getBotByName', bot_name)
  const token = BOT_NAMES[bot_name]
  if (!token) {
    return { error: 'Unauthorized' }
  }

  const bot = bots.find(bot => bot.telegram.token === token)
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
