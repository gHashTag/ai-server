import { config } from 'dotenv'
config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` })

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
if (!process.env.BOT_TOKEN_TEST_1)
  throw new Error('BOT_TOKEN_TEST_1 is not set')
if (!process.env.BOT_TOKEN_TEST_2)
  throw new Error('BOT_TOKEN_TEST_2 is not set')

const BOT_TOKENS_PROD = [process.env.BOT_TOKEN_1, process.env.BOT_TOKEN_2]
const BOT_TOKENS_TEST = [
  process.env.BOT_TOKEN_TEST_1,
  process.env.BOT_TOKEN_TEST_2,
]

export const BOT_TOKENS =
  NODE_ENV === 'production' ? BOT_TOKENS_PROD : BOT_TOKENS_TEST

export const DEFAULT_BOT_TOKEN = process.env.BOT_TOKEN_1
