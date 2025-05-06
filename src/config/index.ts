import { MyContext } from '@/interfaces'
import { config as dotenvConfig } from 'dotenv'
import { Telegraf } from 'telegraf'

dotenvConfig({ path: `.env.${process.env.NODE_ENV || 'development'}.local` })

export const isDev = process.env.NODE_ENV === 'development'

if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is not set')
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is not set')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
}

if (!process.env.SECRET_KEY) {
  throw new Error('SECRET_KEY is not set')
}

if (!process.env.SECRET_API_KEY) {
  throw new Error('SECRET_API_KEY is not set')
}

if (!process.env.SYNC_LABS_API_KEY) {
  throw new Error('SYNC_LABS_API_KEY is not set')
}

if (!process.env.NEXT_PUBLIC_MANAGEMENT_TOKEN) {
  throw new Error('NEXT_PUBLIC_MANAGEMENT_TOKEN is not set')
}

// export const BOT_TOKEN = isDev
//   ? process.env.TELEGRAM_BOT_TOKEN_DEV
//   : process.env.TELEGRAM_BOT_TOKEN_PROD

export const CREDENTIALS = process.env.CREDENTIALS === 'true'
if (isDev && !process.env.NGROK_URL) {
  throw new Error('NGROK_URL is not set')
}
export const {
  NODE_ENV,
  PORT,
  SECRET_KEY,
  SECRET_API_KEY,
  LOG_FORMAT,
  LOG_DIR,
  ORIGIN,
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SYNC_LABS_API_KEY,
  MERCHANT_LOGIN,
  PASSWORD2,
  RESULT_URL2,
  NEXT_PUBLIC_MANAGEMENT_TOKEN,
} = process.env

export const API_URL = isDev ? process.env.NGROK_URL : ORIGIN

export const WEBHOOK_URL = `${API_URL}/webhooks/synclabs-video`

if (!process.env.BOT_TOKEN_1) throw new Error('BOT_TOKEN_1 is not set')
if (!process.env.BOT_TOKEN_2) throw new Error('BOT_TOKEN_2 is not set')
if (!process.env.BOT_TOKEN_3) throw new Error('BOT_TOKEN_3 is not set')
if (!process.env.BOT_TOKEN_4) throw new Error('BOT_TOKEN_4 is not set')
if (!process.env.BOT_TOKEN_5) throw new Error('BOT_TOKEN_5 is not set')
if (!process.env.BOT_TOKEN_6) throw new Error('BOT_TOKEN_6 is not set')
if (!process.env.BOT_TOKEN_7) throw new Error('BOT_TOKEN_7 is not set')
if (!process.env.BOT_TOKEN_8) throw new Error('BOT_TOKEN_8 is not set')

if (!process.env.BOT_TOKEN_TEST_1)
  throw new Error('BOT_TOKEN_TEST_1 is not set')
if (!process.env.BOT_TOKEN_TEST_2)
  throw new Error('BOT_TOKEN_TEST_2 is not set')

const BOT_TOKENS_PROD = [
  process.env.BOT_TOKEN_1,
  process.env.BOT_TOKEN_2,
  process.env.BOT_TOKEN_3,
  process.env.BOT_TOKEN_4,
  process.env.BOT_TOKEN_5,
  process.env.BOT_TOKEN_6,
  process.env.BOT_TOKEN_7,
  process.env.BOT_TOKEN_8,
]
const BOT_TOKENS_TEST = [
  process.env.BOT_TOKEN_TEST_1,
  process.env.BOT_TOKEN_TEST_2,
]

export const BOT_NAMES = {
  ['neuro_blogger_bot']: process.env.BOT_TOKEN_1,
  ['MetaMuse_Manifest_bot']: process.env.BOT_TOKEN_2,
  ['ZavaraBot']: process.env.BOT_TOKEN_3,
  ['LeeSolarbot']: process.env.BOT_TOKEN_4,
  ['NeuroLenaAssistant_bot']: process.env.BOT_TOKEN_5,
  ['NeurostylistShtogrina_bot']: process.env.BOT_TOKEN_6,
  ['Gaia_Kamskaia_bot']: process.env.BOT_TOKEN_7,
  ['ai_koshey_bot']: process.env.BOT_TOKEN_TEST_1,
  ['clip_maker_neuro_bot']: process.env.BOT_TOKEN_TEST_2,
  ['Kaya_easy_art_bot']: process.env.BOT_TOKEN_TEST_3,
}

export const AVATARS_GROUP_ID = {
  ['neuro_blogger_bot']: '@neuro_blogger_group',
  ['MetaMuse_Manifest_bot']: '@MetaMuse_AI_Influencer',
  ['ZavaraBot']: '@NeuroLuna',
  ['LeeSolarbot']: '@SolarNeuroBlogger1',
  ['NeuroLenaAssistant_bot']: '@neuroLenka',
  ['NeurostylistShtogrina_bot']: '@neirostylist',
  ['Gaia_Kamskaia_bot']: '@neuromeets',
  ['ai_koshey_bot']: '@ai_koshey',
}

export const ADMIN_GROUP_ID = '@neuro_blogger_pulse'

export const BOT_TOKENS =
  NODE_ENV === 'production' ? BOT_TOKENS_PROD : BOT_TOKENS_TEST

export const DEFAULT_BOT_TOKEN = process.env.BOT_TOKEN_1
export const defaultBot = new Telegraf<MyContext>(DEFAULT_BOT_TOKEN)

export const PULSE_BOT_TOKEN = process.env.BOT_TOKEN_1

export const pulseBot = new Telegraf<MyContext>(PULSE_BOT_TOKEN)

export const DEFAULT_BOT_NAME = 'neuro_blogger_bot'

export function getBotNameByToken(token: string): { bot_name: string } {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const entry = Object.entries(BOT_NAMES).find(([_, value]) => value === token)
  if (!entry) {
    return { bot_name: DEFAULT_BOT_NAME }
  }

  const [bot_name] = entry
  return { bot_name }
}

export function getTokenByBotName(botName: string): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const entry = Object.entries(BOT_NAMES).find(([name, _]) => name === botName)
  if (!entry) {
    console.warn(`Bot name ${botName} not found.`)
    return undefined
  }

  const [, token] = entry
  return token
}

export function createBotByName(
  botName: string
): { bot: Telegraf<MyContext>; groupId: string } | undefined {
  const token = getTokenByBotName(botName)
  if (!token) {
    console.error(`Token for bot name ${botName} not found.`)
    return undefined
  }
  const groupId = AVATARS_GROUP_ID[botName]
  return {
    bot: new Telegraf<MyContext>(token),
    groupId,
  }
}

if (!process.env.NEXRENDER_PORT) {
  throw new Error('NEXRENDER_PORT is not set')
}
export const NEXRENDER_PORT = process.env.NEXRENDER_PORT

export const CONFIG = {
  server: {
    port: process.env.NEXRENDER_PORT,
    secret: process.env.NEXRENDER_SECRET,
    baseUrl: `http://localhost:${process.env.NEXRENDER_PORT}`,
  },
  paths: {
    base: process.cwd(),
    templates: 'template',
    output: 'output',
  },
  render: {
    retries: 3,
    timeout: 2000,
    interval: 5000,
  },
}

if (!process.env.AERENDER_PATH) {
  throw new Error('AERENDER_PATH is not set')
}
export const AERENDER_PATH = process.env.AERENDER_PATH

export const INNGEST_WEBHOOK_URL = process.env.INNGEST_WEBHOOK_URL

export interface SupabaseConfig {
  url: string
  key: string
}

export interface AppConfig {
  supabase: SupabaseConfig
}

export const appConfig: AppConfig = {
  supabase: {
    url: process.env.SUPABASE_URL || 'https://yuukfqcsdhkyxegfwlcb.supabase.co',
    key: process.env.SUPABASE_KEY || '',
  },
}
