// Jest setup для переменных окружения
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_KEY = 'test-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-role-key'
process.env.SECRET_KEY = 'test-secret'
process.env.SECRET_API_KEY = 'test-api-secret'
process.env.SYNC_LABS_API_KEY = 'test-sync-labs'
process.env.NEXT_PUBLIC_MANAGEMENT_TOKEN = 'test-management'
process.env.API_URL = 'http://localhost:4000'
process.env.ORIGIN = 'http://localhost:4000'
process.env.PORT = '4000'
process.env.LOG_DIR = '/tmp/test-logs'
process.env.LOG_LEVEL = 'info'
process.env.LOG_FORMAT = 'combined'

// Bot tokens for tests
for (let i = 1; i <= 10; i++) {
  process.env[`BOT_TOKEN_${i}`] = `test-bot-token-${i}`
}
process.env.BOT_TOKEN_TEST_1 = 'test-bot-1'
process.env.BOT_TOKEN_TEST_2 = 'test-bot-2'

// Inngest test config
process.env.INNGEST_SIGNING_KEY = 'test-signing-key'
process.env.INNGEST_EVENT_KEY = 'test-event-key'
process.env.INNGEST_WEBHOOK_URL = 'http://localhost:4000/api/inngest'

// Nexrender test config
process.env.NEXRENDER_PORT = '4001'
process.env.NEXRENDER_SECRET = 'test-secret'
process.env.AERENDER_PATH = '/usr/local/bin/aerender'

console.log('✅ Jest test environment variables loaded')
