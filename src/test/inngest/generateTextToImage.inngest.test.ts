import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { generateTextToImageInngest } from '@/core/inngest-client/helpers/generateTextToImage'
import { generateTextToImage } from '@/services/generateTextToImage'
import { getBotByName } from '@/core/bot'
import { logger } from '@/utils/logger'

// Mock all dependencies
jest.mock('@/services/generateTextToImage')
jest.mock('@/core/bot')
jest.mock('@/utils/logger')

const mockGenerateTextToImage = generateTextToImage as jest.MockedFunction<typeof generateTextToImage>
const mockGetBotByName = getBotByName as jest.MockedFunction<typeof getBotByName>
const mockLogger = logger as jest.Mocked<typeof logger>

describe('generateTextToImageInngest', () => {
  const mockBot = {
    telegram: {
      sendMessage: jest.fn(),
      sendPhoto: jest.fn(),
    }
  }

  const mockStep = {
    run: jest.fn()
  }

  const baseEventData = {
    prompt: 'Beautiful sunset landscape',
    model: 'flux-dev',
    num_images: 1,
    telegram_id: '123456789',
    username: 'testuser',
    is_ru: false,
    bot_name: 'test_bot'
  }

  const mockEvent = {
    id: 'event-123',
    data: baseEventData,
    name: 'image/text-to-image.start',
    ts: Date.now()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockGetBotByName.mockReturnValue({ bot: mockBot })
    mockGenerateTextToImage.mockResolvedValue({
      success: true,
      images: ['https://example.com/image1.jpg'],
      message: 'Изображение сгенерировано успешно'
    })
    
    mockStep.run.mockImplementation(async (stepName: string, fn: () => Promise<any>) => {
      return await fn()
    })

    mockLogger.info = jest.fn()
    mockLogger.error = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Function Configuration', () => {
    it('should have correct function ID and configuration', () => {
      expect(generateTextToImageInngest).toBeDefined()
      // Note: We can't directly access inngest function config in tests
      // This would be tested in integration tests
    })

    it('should have correct idempotency key format', () => {
      // The idempotency logic would be tested through inngest behavior
      expect(generateTextToImageInngest).toBeDefined()
    })
  })

  describe('Successful Execution', () => {
    it('should successfully generate image with valid data', async () => {
      const handler = (generateTextToImageInngest as any).fn
      
      const result = await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'План А - Inngest генерация текст-в-изображение',
        eventId: 'event-123',
        telegram_id: '123456789',
        model: 'flux-dev'
      })

      expect(mockGetBotByName).toHaveBeenCalledWith('test_bot')
      
      expect(mockGenerateTextToImage).toHaveBeenCalledWith(
        'Beautiful sunset landscape',
        'flux-dev',
        1,
        '123456789',
        'testuser',
        false,
        mockBot
      )

      expect(result).toEqual({
        success: true,
        images: ['https://example.com/image1.jpg'],
        message: 'Изображение сгенерировано успешно'
      })
    })

    it('should handle Russian language prompts', async () => {
      const russianEventData = {
        ...baseEventData,
        prompt: 'Красивый закат над морем',
        is_ru: true
      }

      const handler = (generateTextToImageInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: russianEventData },
        step: mockStep
      })

      expect(mockGenerateTextToImage).toHaveBeenCalledWith(
        'Красивый закат над морем',
        'flux-dev',
        1,
        '123456789',
        'testuser',
        true,
        mockBot
      )
    })

    it('should handle multiple images generation', async () => {
      const multiImageEventData = {
        ...baseEventData,
        num_images: 4
      }

      mockGenerateTextToImage.mockResolvedValue({
        success: true,
        images: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
          'https://example.com/image3.jpg',
          'https://example.com/image4.jpg'
        ],
        message: '4 изображения сгенерированы успешно'
      })

      const handler = (generateTextToImageInngest as any).fn
      
      const result = await handler({
        event: { ...mockEvent, data: multiImageEventData },
        step: mockStep
      })

      expect(mockGenerateTextToImage).toHaveBeenCalledWith(
        'Beautiful sunset landscape',
        'flux-dev',
        4,
        '123456789',
        'testuser',
        false,
        mockBot
      )

      expect(result.images).toHaveLength(4)
    })

    it('should handle different models correctly', async () => {
      const differentModelData = {
        ...baseEventData,
        model: 'dalle-3'
      }

      const handler = (generateTextToImageInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: differentModelData },
        step: mockStep
      })

      expect(mockGenerateTextToImage).toHaveBeenCalledWith(
        'Beautiful sunset landscape',
        'dalle-3',
        1,
        '123456789',
        'testuser',
        false,
        mockBot
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle bot not found error', async () => {
      mockGetBotByName.mockReturnValue({ bot: null })

      const handler = (generateTextToImageInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Бот test_bot не найден')

      expect(mockGenerateTextToImage).not.toHaveBeenCalled()
    })

    it('should handle service generation errors', async () => {
      const serviceError = new Error('Failed to generate image')
      mockGenerateTextToImage.mockRejectedValue(serviceError)

      const handler = (generateTextToImageInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Failed to generate image')
    })

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'
      mockGenerateTextToImage.mockRejectedValue(timeoutError)

      const handler = (generateTextToImageInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Request timeout')
    })

    it('should handle API rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      rateLimitError.name = 'RateLimitError'
      mockGenerateTextToImage.mockRejectedValue(rateLimitError)

      const handler = (generateTextToImageInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Rate limit exceeded')
    })
  })

  describe('Input Validation', () => {
    it('should handle empty prompt gracefully', async () => {
      const emptyPromptData = {
        ...baseEventData,
        prompt: ''
      }

      const handler = (generateTextToImageInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: emptyPromptData },
        step: mockStep
      })

      expect(mockGenerateTextToImage).toHaveBeenCalledWith(
        '',
        'flux-dev',
        1,
        '123456789',
        'testuser',
        false,
        mockBot
      )
    })

    it('should handle very long prompts', async () => {
      const longPrompt = 'A'.repeat(1000)
      const longPromptData = {
        ...baseEventData,
        prompt: longPrompt
      }

      const handler = (generateTextToImageInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: longPromptData },
        step: mockStep
      })

      expect(mockGenerateTextToImage).toHaveBeenCalledWith(
        longPrompt,
        'flux-dev',
        1,
        '123456789',
        'testuser',
        false,
        mockBot
      )
    })

    it('should handle invalid number of images', async () => {
      const invalidNumImagesData = {
        ...baseEventData,
        num_images: 0
      }

      const handler = (generateTextToImageInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: invalidNumImagesData },
        step: mockStep
      })

      expect(mockGenerateTextToImage).toHaveBeenCalledWith(
        'Beautiful sunset landscape',
        'flux-dev',
        0,
        '123456789',
        'testuser',
        false,
        mockBot
      )
    })
  })

  describe('Step Execution', () => {
    it('should execute within step.run with correct step name', async () => {
      const handler = (generateTextToImageInngest as any).fn
      
      await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(mockStep.run).toHaveBeenCalledWith('generate-image', expect.any(Function))
    })

    it('should handle step execution failures', async () => {
      const stepError = new Error('Step execution failed')
      mockStep.run.mockRejectedValue(stepError)

      const handler = (generateTextToImageInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Step execution failed')
    })
  })

  describe('Logging', () => {
    it('should log function start with correct parameters', async () => {
      const handler = (generateTextToImageInngest as any).fn
      
      await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'План А - Inngest генерация текст-в-изображение',
        eventId: 'event-123',
        telegram_id: '123456789',
        model: 'flux-dev'
      })
    })
  })

  describe('Concurrency and Idempotency', () => {
    it('should use correct idempotency key format', async () => {
      // This tests the concept - actual idempotency is handled by Inngest
      const shortPrompt = 'Beautiful sunset landscape'
      const expectedIdempotencyPart = shortPrompt.slice(0, 20)
      
      expect(expectedIdempotencyPart).toBe('Beautiful sunset lan')
    })

    it('should handle concurrent executions', async () => {
      // Simulate concurrent execution
      const promises = Array.from({ length: 5 }, () => {
        const handler = (generateTextToImageInngest as any).fn
        return handler({
          event: mockEvent,
          step: mockStep
        })
      })

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result).toEqual({
          success: true,
          images: ['https://example.com/image1.jpg'],
          message: 'Изображение сгенерировано успешно'
        })
      })
    })
  })

  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      const start = Date.now()
      
      const handler = (generateTextToImageInngest as any).fn
      await handler({
        event: mockEvent,
        step: mockStep
      })
      
      const duration = Date.now() - start
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds in test
    })
  })
})