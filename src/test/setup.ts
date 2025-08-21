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
process.env.BFL_API_KEY = 'test-bfl-key'
process.env.BFL_WEBHOOK_URL = 'https://test.webhook.url'

// Mock внешние модули
jest.mock('@supabase/supabase-js')
jest.mock('telegraf')
jest.mock('replicate', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    run: (jest.fn() as any).mockResolvedValue(['https://fake-image-url.jpg', 'https://fake-image-url2.jpg']),
    predictions: {
      create: (jest.fn() as any).mockResolvedValue({
        id: 'test-prediction-id',
        status: 'succeeded',
        output: ['https://fake-image-url.jpg']
      })
    }
  }))
}))
jest.mock('elevenlabs', () => ({
  ElevenLabs: jest.fn().mockImplementation(() => ({
    generate: (jest.fn() as any).mockResolvedValue({
      pipe: (jest.fn() as any).mockImplementation((stream: any) => {
        setTimeout(() => stream.emit('finish'), 100)
        return stream
      })
    })
  }))
}))
jest.mock('openai')
jest.mock('inngest')
jest.mock('axios', () => {
  const mockAxios = {
    get: (jest.fn() as any).mockResolvedValue({
      data: Buffer.from('fake image data'),
      headers: { 'content-type': 'image/jpeg' }
    }),
    post: (jest.fn() as any).mockResolvedValue({
      data: { success: true },
      status: 200
    }),
    put: (jest.fn() as any).mockResolvedValue({
      data: { success: true },
      status: 200
    })
  }
  
  return {
    __esModule: true,
    default: mockAxios,
    isAxiosError: jest.fn().mockReturnValue(false)
  }
})
jest.mock('fs', () => require('./__mocks__/fs'))

// Mock core modules
jest.mock('@/core/supabase', () => ({
  incrementBalance: (jest.fn() as any).mockResolvedValue(true),
  setPayments: (jest.fn() as any).mockResolvedValue(true),
  getTelegramIdFromInvId: (jest.fn() as any).mockResolvedValue({
    telegram_id: '123456',
    language: 'en',
    username: 'testuser',
    bot_name: 'test_bot'
  }),
  updateUserSubscription: (jest.fn() as any).mockResolvedValue(true),
  createUser: (jest.fn() as any).mockResolvedValue({ user_id: 'test-user-id' }),
  getUser: (jest.fn() as any).mockResolvedValue({ telegram_id: '123456', balance: 1000 }),
  getUserByTelegramId: (jest.fn() as any).mockResolvedValue({
    telegram_id: '123456',
    balance: 1000,
    level: 5,
    username: 'testuser'
  }),
  getAspectRatio: (jest.fn() as any).mockResolvedValue('1:1'),
  savePrompt: (jest.fn() as any).mockResolvedValue('test-prompt-id'),
  updateUserLevelPlusOne: (jest.fn() as any).mockResolvedValue(true),
  supabase: {
    from: (jest.fn() as any).mockReturnValue({
      select: (jest.fn() as any).mockImplementation((columns) => {
        // For broadcast service (no chaining)
        if (columns === 'telegram_id, bot_name') {
          return Promise.resolve({
            data: [
              { telegram_id: 123456, bot_name: 'test_bot' },
              { telegram_id: 789012, bot_name: 'another_bot' }
            ],
            error: null
          })
        }
        // For other services that need chaining (like getAspectRatio)
        return {
          eq: (jest.fn() as any).mockReturnValue({
            eq: (jest.fn() as any).mockReturnValue({
              eq: (jest.fn() as any).mockReturnValue({
                eq: (jest.fn() as any).mockReturnValue({
                  maybeSingle: (jest.fn() as any).mockResolvedValue({
                    data: { prompt_id: 'test-prompt-id' },
                    error: null
                  })
                })
              })
            }),
            single: (jest.fn() as any).mockResolvedValue({
              data: { aspect_ratio: '1:1' },
              error: null
            })
          })
        }
      }),
      insert: (jest.fn() as any).mockReturnValue({
        select: (jest.fn() as any).mockResolvedValue({
          data: [{ prompt_id: 'test-prompt-id' }],
          error: null
        })
      })
    })
  }
}))

// Mock elevenlabs client
jest.mock('@/core/elevenlabs', () => ({
  __esModule: true,
  default: {
    generate: (jest.fn() as any).mockResolvedValue({
      pipe: (jest.fn() as any).mockImplementation((stream: any) => {
        setTimeout(() => stream.emit('finish'), 100)
        return stream
      })
    })
  }
}))

// Mock helpers
jest.mock('@/price/helpers', () => ({
  sendPaymentNotification: (jest.fn() as any).mockResolvedValue(true),
  sendBalanceMessage: jest.fn(),
  processBalanceOperation: (jest.fn() as any).mockResolvedValue({
    success: true,
    newBalance: 1000
  }),
  processBalanceVideoOperation: (jest.fn() as any).mockResolvedValue({
    newBalance: 1000,
    paymentAmount: 50
  })
}))


jest.mock('@/helpers', () => ({
  errorMessage: jest.fn(),
  downloadFile: (jest.fn() as any).mockResolvedValue(Buffer.from('fake image data')),
  processApiResponse: (jest.fn() as any).mockResolvedValue(['https://fake-image-url.jpg']),
  pulse: (jest.fn() as any).mockResolvedValue(true),
  pulseNeuroImageV2: (jest.fn() as any).mockResolvedValue(true),
  saveFileLocally: (jest.fn() as any).mockResolvedValue('/fake/local/path/image.jpg'),
  sendBalanceMessage: jest.fn(),
  fetchImage: (jest.fn() as any).mockResolvedValue(Buffer.from('fake image data')),
  deleteFile: (jest.fn() as any).mockResolvedValue(true),
  retry: (jest.fn() as any).mockImplementation(async (fn) => await fn()),
  transliterate: (jest.fn() as any).mockImplementation((text) => text),
  getVideoMetadata: (jest.fn() as any).mockResolvedValue({ duration: 10, fps: 30 }),
  optimizeForTelegram: (jest.fn() as any).mockResolvedValue('/fake/optimized/path.mp4')
}))

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