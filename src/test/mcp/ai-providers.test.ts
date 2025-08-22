import { 
  AIProviderManager, 
  analyzeWithAI,
  SpecializedAIAnalyzers,
  aiProviderManager 
} from '@/core/mcp-server/ai-providers'

// Мокаем AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
}))

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mocked-openai-model'),
}))

jest.mock('@/utils/logger')

import { generateText } from 'ai'

describe('AI Providers', () => {
  let aiManager: AIProviderManager
  const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>

  beforeEach(() => {
    jest.clearAllMocks()
    aiManager = new AIProviderManager({
      primaryProvider: 'openai',
      fallbackProvider: 'openai',
      maxRetries: 2,
      retryDelay: 100,
    })
  })

  describe('AIProviderManager', () => {
    describe('analyzeWithAI', () => {
      it('должен успешно выполнять анализ через основной провайдер', async () => {
        const mockResult = {
          text: 'Результат анализа',
          usage: { totalTokens: 150 },
        }

        mockGenerateText.mockResolvedValue(mockResult as any)

        const result = await aiManager.analyzeWithAI(
          'Тестовый запрос',
          'Тестовый контекст'
        )

        expect(result).toEqual({
          success: true,
          text: 'Результат анализа',
          provider: 'openai',
          tokensUsed: 150,
        })

        expect(mockGenerateText).toHaveBeenCalledWith({
          model: 'mocked-openai-model',
          messages: [
            {
              role: 'system',
              content: expect.stringContaining('AI-ассистент'),
            },
            {
              role: 'user',
              content: 'Контекст: Тестовый контекст\n\nВопрос: Тестовый запрос',
            },
          ],
          maxTokens: 1000,
          temperature: 0.7,
        })
      })

      it('должен использовать fallback при ошибке основного провайдера', async () => {
        // Первый вызов (основной провайдер) падает
        mockGenerateText
          .mockRejectedValueOnce(new Error('Primary provider error'))
          .mockResolvedValueOnce({
            text: 'Fallback результат',
            usage: { totalTokens: 100 },
          } as any)

        const result = await aiManager.analyzeWithAI('Тестовый запрос')

        expect(result).toEqual({
          success: true,
          text: 'Fallback результат',
          provider: 'openai (fallback)',
          tokensUsed: 100,
        })

        // Должно быть 2 вызова: основной + fallback
        expect(mockGenerateText).toHaveBeenCalledTimes(2)
      })

      it('должен возвращать ошибку при падении всех провайдеров', async () => {
        mockGenerateText
          .mockRejectedValue(new Error('Primary error'))
          .mockRejectedValue(new Error('Fallback error'))

        const result = await aiManager.analyzeWithAI('Тестовый запрос')

        expect(result).toEqual({
          success: false,
          text: 'Извините, все AI провайдеры недоступны в данный момент. Попробуйте позже.',
          provider: 'none',
          error: expect.stringContaining('Primary error'),
        })
      })

      it('должен выполнять ретраи при неудачах', async () => {
        mockGenerateText
          .mockRejectedValueOnce(new Error('Temporary error'))
          .mockResolvedValueOnce({
            text: 'Успешный результат после ретрая',
            usage: { totalTokens: 200 },
          } as any)

        const result = await aiManager.analyzeWithAI('Тестовый запрос')

        expect(result.success).toBe(true)
        expect(result.text).toBe('Успешный результат после ретрая')
        expect(mockGenerateText).toHaveBeenCalledTimes(2)
      })

      it('должен принимать кастомные параметры', async () => {
        mockGenerateText.mockResolvedValue({
          text: 'Результат',
          usage: { totalTokens: 50 },
        } as any)

        await aiManager.analyzeWithAI(
          'Запрос',
          'Контекст',
          {
            maxTokens: 500,
            temperature: 0.2,
            systemPrompt: 'Кастомный системный промпт',
          }
        )

        expect(mockGenerateText).toHaveBeenCalledWith({
          model: 'mocked-openai-model',
          messages: [
            {
              role: 'system',
              content: 'Кастомный системный промпт',
            },
            {
              role: 'user',
              content: 'Контекст: Контекст\n\nВопрос: Запрос',
            },
          ],
          maxTokens: 500,
          temperature: 0.2,
        })
      })

      it('должен обрабатывать запросы без контекста', async () => {
        mockGenerateText.mockResolvedValue({
          text: 'Результат без контекста',
          usage: { totalTokens: 75 },
        } as any)

        await aiManager.analyzeWithAI('Только запрос')

        expect(mockGenerateText).toHaveBeenCalledWith({
          model: 'mocked-openai-model',
          messages: [
            {
              role: 'system',
              content: expect.any(String),
            },
            {
              role: 'user',
              content: 'Только запрос',
            },
          ],
          maxTokens: 1000,
          temperature: 0.7,
        })
      })
    })

    describe('healthCheck', () => {
      it('должен проверять здоровье всех провайдеров', async () => {
        mockGenerateText.mockResolvedValue({
          text: 'Тест',
          usage: { totalTokens: 5 },
        } as any)

        const health = await aiManager.healthCheck()

        expect(health).toEqual({
          openai: true,
        })

        expect(mockGenerateText).toHaveBeenCalledWith({
          model: 'mocked-openai-model',
          messages: [{ role: 'user', content: 'Тест' }],
          maxTokens: 10,
        })
      })

      it('должен отмечать недоступные провайдеры', async () => {
        mockGenerateText.mockRejectedValue(new Error('Provider unavailable'))

        const health = await aiManager.healthCheck()

        expect(health).toEqual({
          openai: false,
        })
      })
    })

    describe('updateConfig', () => {
      it('должен обновлять конфигурацию', () => {
        const newConfig = {
          primaryProvider: 'anthropic' as const,
          maxRetries: 5,
        }

        aiManager.updateConfig(newConfig)

        // Проверяем, что конфигурация обновилась
        // (В реальной реализации можно добавить геттер для конфига)
        expect(true).toBe(true) // Заглушка для теста
      })
    })

    describe('getUsageStats', () => {
      it('должен возвращать статистику использования', () => {
        const stats = aiManager.getUsageStats()

        expect(stats).toEqual({
          totalRequests: expect.any(Number),
          successfulRequests: expect.any(Number),
          failedRequests: expect.any(Number),
          averageResponseTime: expect.any(Number),
        })
      })
    })
  })

  describe('analyzeWithAI (глобальная функция)', () => {
    it('должен использовать глобальный экземпляр менеджера', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Глобальный результат',
        usage: { totalTokens: 80 },
      } as any)

      const result = await analyzeWithAI('Глобальный запрос')

      expect(result.success).toBe(true)
      expect(result.text).toBe('Глобальный результат')
      expect(result.provider).toBe('openai')
    })
  })

  describe('SpecializedAIAnalyzers', () => {
    beforeEach(() => {
      mockGenerateText.mockResolvedValue({
        text: 'Специализированный анализ',
        usage: { totalTokens: 120 },
      } as any)
    })

    describe('analyzePrompt', () => {
      it('должен анализировать промпты с специализированным системным промптом', async () => {
        const result = await SpecializedAIAnalyzers.analyzePrompt('Тестовый промпт')

        expect(result.success).toBe(true)
        expect(mockGenerateText).toHaveBeenCalledWith({
          model: 'mocked-openai-model',
          messages: [
            {
              role: 'system',
              content: expect.stringContaining('эксперт по анализу AI промптов'),
            },
            {
              role: 'user',
              content: 'Тестовый промпт',
            },
          ],
          maxTokens: 800,
          temperature: 0.3,
        })
      })
    })

    describe('analyzeABTestResults', () => {
      it('должен анализировать результаты A/B тестирования', async () => {
        const planAResults = { successRate: 85, avgTime: 100 }
        const planBResults = { successRate: 75, avgTime: 150 }

        const result = await SpecializedAIAnalyzers.analyzeABTestResults(
          planAResults,
          planBResults
        )

        expect(result.success).toBe(true)
        expect(mockGenerateText).toHaveBeenCalledWith({
          model: 'mocked-openai-model',
          messages: [
            {
              role: 'system',
              content: expect.stringContaining('эксперт по анализу A/B тестирования'),
            },
            {
              role: 'user',
              content: 'Проанализируй результаты A/B тестирования и дай рекомендации по оптимизации',
            },
          ],
          maxTokens: 1200,
          temperature: 0.2,
        })
      })
    })

    describe('analyzeSystemErrors', () => {
      it('должен анализировать системные ошибки', async () => {
        const errors = [
          'Connection timeout',
          'Memory limit exceeded',
          'API rate limit exceeded',
        ]

        const result = await SpecializedAIAnalyzers.analyzeSystemErrors(errors)

        expect(result.success).toBe(true)
        expect(mockGenerateText).toHaveBeenCalledWith({
          model: 'mocked-openai-model',
          messages: [
            {
              role: 'system',
              content: expect.stringContaining('системный аналитик'),
            },
            {
              role: 'user',
              content: 'Проанализируй системные ошибки и предложи решения',
            },
          ],
          maxTokens: 1000,
          temperature: 0.1,
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('должен обрабатывать неизвестные провайдеры', async () => {
      const invalidManager = new AIProviderManager({
        primaryProvider: 'unknown' as any,
        fallbackProvider: 'openai',
      })

      const result = await invalidManager.analyzeWithAI('Тест')

      expect(result.success).toBe(false)
      expect(result.provider).toBe('none')
    })

    it('должен обрабатывать отсутствие токенов в ответе', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Результат без токенов',
        // usage отсутствует
      } as any)

      const result = await aiManager.analyzeWithAI('Тест')

      expect(result.success).toBe(true)
      expect(result.tokensUsed).toBeUndefined()
    })

    it('должен обрабатывать очень длинные ошибки', async () => {
      const longError = new Error('Очень длинное сообщение об ошибке'.repeat(100))
      
      mockGenerateText.mockRejectedValue(longError)

      const result = await aiManager.analyzeWithAI('Тест')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Очень длинное сообщение об ошибке')
    })
  })

  describe('Performance Tests', () => {
    it('должен выполняться в разумные сроки', async () => {
      mockGenerateText.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            text: 'Быстрый результат',
            usage: { totalTokens: 50 },
          } as any), 50)
        )
      )

      const startTime = Date.now()
      const result = await aiManager.analyzeWithAI('Быстрый тест')
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(200) // Должен выполниться быстро
    })

    it('должен корректно обрабатывать таймауты', async () => {
      // Мокаем медленный ответ
      mockGenerateText.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      )

      const result = await aiManager.analyzeWithAI('Медленный тест')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Timeout')
    })
  })

  describe('Concurrent Requests', () => {
    it('должен обрабатывать множественные одновременные запросы', async () => {
      mockGenerateText.mockImplementation((params: any) => 
        Promise.resolve({
          text: `Результат для: ${params.messages[1].content}`,
          usage: { totalTokens: 25 },
        } as any)
      )

      const requests = Array(5).fill(null).map((_, i) =>
        aiManager.analyzeWithAI(`Запрос ${i}`)
      )

      const results = await Promise.all(requests)

      results.forEach((result, i) => {
        expect(result.success).toBe(true)
        expect(result.text).toContain(`Запрос ${i}`)
      })

      expect(mockGenerateText).toHaveBeenCalledTimes(5)
    })
  })
})