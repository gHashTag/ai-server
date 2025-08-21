#!/usr/bin/env node

// Устанавливаем NODE_ENV в production для тестирования
process.env.NODE_ENV = 'production'

// Устанавливаем переменные из production конфигурации
process.env.ORIGIN = 'https://ai-server-u14194.vm.elestio.app'
process.env.NGROK_URL = 'https://8b3cdc98ffacc1.lhr.life'

// Добавляем обязательные переменные для работы конфигурации
process.env.SUPABASE_URL = 'https://yuukfqcsdhkyxegfwlcb.supabase.co'
process.env.SUPABASE_SERVICE_KEY = 'test_key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_role_key'
process.env.SECRET_KEY = 'test_secret'
process.env.SECRET_API_KEY = 'test_api_secret'
process.env.SYNC_LABS_API_KEY = 'test_sync_labs'
process.env.NEXT_PUBLIC_MANAGEMENT_TOKEN = 'test_management_token'
process.env.NEXRENDER_PORT = '4001'
process.env.AERENDER_PATH = '/test/path'

// Добавляем токены ботов
process.env.BOT_TOKEN_1 = 'test_token_1'
process.env.BOT_TOKEN_2 = 'test_token_2'
process.env.BOT_TOKEN_3 = 'test_token_3'
process.env.BOT_TOKEN_4 = 'test_token_4'
process.env.BOT_TOKEN_5 = 'test_token_5'
process.env.BOT_TOKEN_6 = 'test_token_6'
process.env.BOT_TOKEN_7 = 'test_token_7'
process.env.BOT_TOKEN_8 = 'test_token_8'
process.env.BOT_TOKEN_TEST_1 = 'test_token_test_1'
process.env.BOT_TOKEN_TEST_2 = 'test_token_test_2'

console.log('🔍 Проверка конфигурации API_URL...')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('ORIGIN:', process.env.ORIGIN)
console.log('NGROK_URL:', process.env.NGROK_URL)

// Импортируем конфигурацию
const { API_URL, isDev } = require('../dist/config/index.js')

console.log('\n📊 Результаты:')
console.log('isDev:', isDev)
console.log('API_URL:', API_URL)
console.log('Expected webhook URL:', `${API_URL}/webhooks/replicate`)

console.log('\n✅ Проверка завершена!')
