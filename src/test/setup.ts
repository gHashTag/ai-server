import { jest, beforeAll, afterAll, afterEach } from '@jest/globals'

// Базовые настройки для тестов
process.env.NODE_ENV = 'test'
process.env.USE_INNGEST = 'false'
process.env.FALLBACK_MODE = 'true'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-key'
process.env.SUPABASE_SERVICE_KEY = 'test-service-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.SECRET_KEY = 'test-secret-key'
process.env.SECRET_API_KEY = 'test-secret-api-key'
process.env.SYNC_LABS_API_KEY = 'test-sync-labs-key'
process.env.NEXT_PUBLIC_MANAGEMENT_TOKEN = 'test-management-token'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.REPLICATE_API_TOKEN = 'test-replicate-token'
process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key'
process.env.API_URL = 'http://localhost:3000'
process.env.PORT = '3000'
process.env.BOT_TOKEN_1 = 'test-bot-token-1'
process.env.BOT_TOKEN_2 = 'test-bot-token-2'
process.env.BOT_TOKEN_3 = 'test-bot-token-3'
process.env.BOT_TOKEN_4 = 'test-bot-token-4'
process.env.BOT_TOKEN_5 = 'test-bot-token-5'
process.env.BOT_TOKEN_TEST_1 = 'test-bot-token-test-1'
process.env.BOT_TOKEN_TEST_2 = 'test-bot-token-test-2'
process.env.NEXRENDER_PORT = '4001'
process.env.AERENDER_PATH = '/Applications/Adobe After Effects 2025/aerender'

// Mock внешние модули
jest.mock('@supabase/supabase-js')
jest.mock('telegraf')
jest.mock('replicate')
jest.mock('elevenlabs')
jest.mock('openai')
jest.mock('inngest')
jest.mock('axios')
jest.mock('fs', () => require('./__mocks__/fs'))

// Глобальные моки для console
const originalConsoleError = console.error
const originalConsoleWarn = console.warn
const originalConsoleLog = console.log

beforeAll(() => {
  // Подавляем логи в тестах, если не нужны
  console.error = jest.fn()
  console.warn = jest.fn()
  console.log = jest.fn()
})

afterAll(() => {
  // Восстанавливаем оригинальные функции
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
  console.log = originalConsoleLog
})

// Очистка моков после каждого теста
afterEach(() => {
  jest.clearAllMocks()
})