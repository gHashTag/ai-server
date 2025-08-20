import { jest, beforeAll, afterAll, afterEach } from '@jest/globals'

// Базовые настройки для тестов
process.env.NODE_ENV = 'test'
process.env.USE_INNGEST = 'false'
process.env.FALLBACK_MODE = 'true'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.REPLICATE_API_TOKEN = 'test-replicate-token'
process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key'
process.env.API_URL = 'http://localhost:3000'

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