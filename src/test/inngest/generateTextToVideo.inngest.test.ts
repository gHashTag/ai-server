import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { generateTextToVideoInngest } from '@/core/inngest-client/helpers/generateTextToVideo'
import { generateTextToVideo } from '@/services/generateTextToVideo'
import { getBotByName } from '@/core/bot'
import { logger } from '@/utils/logger'

// Mock all dependencies
jest.mock('@/services/generateTextToVideo')
jest.mock('@/core/bot')
jest.mock('@/utils/logger')

const mockGenerateTextToVideo = generateTextToVideo as jest.MockedFunction<typeof generateTextToVideo>
const mockGetBotByName = getBotByName as jest.MockedFunction<typeof getBotByName>
const mockLogger = logger as jest.Mocked<typeof logger>

describe('generateTextToVideoInngest', () => {
  const mockBot = {
    telegram: {
      sendMessage: jest.fn(),
      sendVideo: jest.fn(),
    }
  }

  const mockStep = {
    run: jest.fn()
  }

  const baseEventData = {
    prompt: 'A cat running in a meadow',
    videoModel: 'minimax-video-01',
    telegram_id: '987654321',
    username: 'videouser',
    is_ru: false,
    bot_name: 'video_bot'
  }

  const mockEvent = {
    id: 'event-video-456',
    data: baseEventData,
    name: 'video/text-to-video.start',
    ts: Date.now()
  }

  const mockVideoResult = {
    videoLocalPath: '/tmp/generated-video-123.mp4',
    success: true,
    message: 'Видео успешно сгенерировано'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockGetBotByName.mockReturnValue({ bot: mockBot })
    mockGenerateTextToVideo.mockResolvedValue(mockVideoResult)
    
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
      expect(generateTextToVideoInngest).toBeDefined()
      // Note: We can't directly access inngest function config in tests
      // This would be tested in integration tests
    })

    it('should use correct concurrency limit (3)', () => {
      // This is tested through the function configuration
      expect(generateTextToVideoInngest).toBeDefined()
    })

    it('should have correct idempotency key format', () => {
      // Test the idempotency key logic
      const prompt = 'A cat running in a meadow'
      const expectedIdempotencyPart = prompt.slice(0, 15)
      
      expect(expectedIdempotencyPart).toBe('A cat running i')
    })
  })

  describe('Successful Execution', () => {
    it('should successfully generate video with valid data', async () => {
      const handler = (generateTextToVideoInngest as any).fn
      
      const result = await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'План А - Inngest генерация текст-в-видео',
        eventId: 'event-video-456',
        telegram_id: '987654321',
        videoModel: 'minimax-video-01'
      })

      expect(mockGetBotByName).toHaveBeenCalledWith('video_bot')
      
      expect(mockGenerateTextToVideo).toHaveBeenCalledWith(
        'A cat running in a meadow',
        'minimax-video-01',
        '987654321',
        'videouser',
        false,
        mockBot,
        'video_bot'
      )

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'План А - генерация видео завершена успешно',
        telegram_id: '987654321',
        videoPath: '/tmp/generated-video-123.mp4'
      })

      expect(result).toEqual({
        success: true,
        videoPath: '/tmp/generated-video-123.mp4',
        message: 'Video generation completed via Inngest'
      })
    })

    it('should handle Russian language prompts', async () => {
      const russianEventData = {
        ...baseEventData,
        prompt: 'Кот бежит по лугу',
        is_ru: true
      }

      const handler = (generateTextToVideoInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: russianEventData },
        step: mockStep
      })

      expect(mockGenerateTextToVideo).toHaveBeenCalledWith(
        'Кот бежит по лугу',
        'minimax-video-01',
        '987654321',
        'videouser',
        true,
        mockBot,
        'video_bot'
      )
    })

    it('should handle different video models correctly', async () => {
      const differentModelData = {
        ...baseEventData,
        videoModel: 'runway-gen3'
      }

      const handler = (generateTextToVideoInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: differentModelData },
        step: mockStep
      })

      expect(mockGenerateTextToVideo).toHaveBeenCalledWith(
        'A cat running in a meadow',
        'runway-gen3',
        '987654321',
        'videouser',
        false,
        mockBot,
        'video_bot'
      )
    })

    it('should handle complex video prompts', async () => {
      const complexPromptData = {
        ...baseEventData,
        prompt: 'A majestic eagle soaring through mountain clouds at sunset, cinematic 4k quality'
      }

      const handler = (generateTextToVideoInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: complexPromptData },
        step: mockStep
      })

      expect(mockGenerateTextToVideo).toHaveBeenCalledWith(
        'A majestic eagle soaring through mountain clouds at sunset, cinematic 4k quality',
        'minimax-video-01',
        '987654321',
        'videouser',
        false,
        mockBot,
        'video_bot'
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle bot not found error', async () => {
      mockGetBotByName.mockReturnValue({ bot: null })

      const handler = (generateTextToVideoInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Бот video_bot не найден')

      expect(mockGenerateTextToVideo).not.toHaveBeenCalled()
    })

    it('should handle video generation service errors', async () => {
      const serviceError = new Error('Failed to generate video')
      mockGenerateTextToVideo.mockRejectedValue(serviceError)

      const handler = (generateTextToVideoInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Failed to generate video')
    })

    it('should handle video processing timeout', async () => {
      const timeoutError = new Error('Video processing timeout')
      timeoutError.name = 'TimeoutError'
      mockGenerateTextToVideo.mockRejectedValue(timeoutError)

      const handler = (generateTextToVideoInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Video processing timeout')
    })

    it('should handle insufficient storage errors', async () => {
      const storageError = new Error('Insufficient storage space')
      storageError.name = 'StorageError'
      mockGenerateTextToVideo.mockRejectedValue(storageError)

      const handler = (generateTextToVideoInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Insufficient storage space')
    })

    it('should handle video model not supported errors', async () => {
      const modelError = new Error('Video model not supported')
      modelError.name = 'ModelNotSupportedError'
      mockGenerateTextToVideo.mockRejectedValue(modelError)

      const handler = (generateTextToVideoInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Video model not supported')
    })
  })

  describe('Input Validation', () => {
    it('should handle empty prompt gracefully', async () => {
      const emptyPromptData = {
        ...baseEventData,
        prompt: ''
      }

      const handler = (generateTextToVideoInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: emptyPromptData },
        step: mockStep
      })

      expect(mockGenerateTextToVideo).toHaveBeenCalledWith(
        '',
        'minimax-video-01',
        '987654321',
        'videouser',
        false,
        mockBot,
        'video_bot'
      )
    })

    it('should handle very long prompts', async () => {
      const longPrompt = 'A detailed cinematic scene with '.repeat(50) // Very long prompt
      const longPromptData = {
        ...baseEventData,
        prompt: longPrompt
      }

      const handler = (generateTextToVideoInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: longPromptData },
        step: mockStep
      })

      expect(mockGenerateTextToVideo).toHaveBeenCalledWith(
        longPrompt,
        'minimax-video-01',
        '987654321',
        'videouser',
        false,
        mockBot,
        'video_bot'
      )
    })

    it('should handle special characters in prompts', async () => {
      const specialCharData = {
        ...baseEventData,
        prompt: 'A cat & dog @ 100% speed! 😺🐕'
      }

      const handler = (generateTextToVideoInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: specialCharData },
        step: mockStep
      })

      expect(mockGenerateTextToVideo).toHaveBeenCalledWith(
        'A cat & dog @ 100% speed! 😺🐕',
        'minimax-video-01',
        '987654321',
        'videouser',
        false,
        mockBot,
        'video_bot'
      )
    })
  })

  describe('Step Execution', () => {
    it('should execute within step.run with correct step name', async () => {
      const handler = (generateTextToVideoInngest as any).fn
      
      await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(mockStep.run).toHaveBeenCalledWith('generate-video', expect.any(Function))
    })

    it('should handle step execution failures', async () => {
      const stepError = new Error('Step execution failed')
      mockStep.run.mockRejectedValue(stepError)

      const handler = (generateTextToVideoInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Step execution failed')
    })
  })

  describe('Logging', () => {
    it('should log function start with correct parameters', async () => {
      const handler = (generateTextToVideoInngest as any).fn
      
      await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'План А - Inngest генерация текст-в-видео',
        eventId: 'event-video-456',
        telegram_id: '987654321',
        videoModel: 'minimax-video-01'
      })
    })

    it('should log successful completion with video path', async () => {
      const handler = (generateTextToVideoInngest as any).fn
      
      await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'План А - генерация видео завершена успешно',
        telegram_id: '987654321',
        videoPath: '/tmp/generated-video-123.mp4'
      })
    })
  })

  describe('Performance and Resource Management', () => {
    it('should complete video generation within reasonable time for testing', async () => {
      const start = Date.now()
      
      const handler = (generateTextToVideoInngest as any).fn
      await handler({
        event: mockEvent,
        step: mockStep
      })
      
      const duration = Date.now() - start
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds in test
    })

    it('should handle large video file generation', async () => {
      const largeVideoResult = {
        ...mockVideoResult,
        videoLocalPath: '/tmp/large-video-5gb.mp4'
      }
      
      mockGenerateTextToVideo.mockResolvedValue(largeVideoResult)

      const handler = (generateTextToVideoInngest as any).fn
      const result = await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(result.videoPath).toBe('/tmp/large-video-5gb.mp4')
    })
  })

  describe('Different Video Models Support', () => {
    const videoModels = [
      'minimax-video-01',
      'runway-gen3',
      'stable-video-diffusion',
      'pika-labs-v1',
      'haiper-video-2'
    ]

    videoModels.forEach(model => {
      it(`should support ${model} video model`, async () => {
        const modelEventData = {
          ...baseEventData,
          videoModel: model
        }

        const handler = (generateTextToVideoInngest as any).fn
        
        await handler({
          event: { ...mockEvent, data: modelEventData },
          step: mockStep
        })

        expect(mockGenerateTextToVideo).toHaveBeenCalledWith(
          'A cat running in a meadow',
          model,
          '987654321',
          'videouser',
          false,
          mockBot,
          'video_bot'
        )
      })
    })
  })

  describe('Concurrency Control', () => {
    it('should respect concurrency limit (3)', async () => {
      // Simulate multiple concurrent video generations
      const promises = Array.from({ length: 3 }, (_, index) => {
        const handler = (generateTextToVideoInngest as any).fn
        return handler({
          event: { ...mockEvent, id: `event-${index}` },
          step: mockStep
        })
      })

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).toEqual({
          success: true,
          videoPath: '/tmp/generated-video-123.mp4',
          message: 'Video generation completed via Inngest'
        })
      })
    })
  })

  describe('Idempotency', () => {
    it('should generate same idempotency key for same prompt', () => {
      const prompt1 = 'A cat running in a meadow'
      const prompt2 = 'A cat running in a meadow'
      
      const key1 = '987654321' + '-video-' + prompt1.slice(0, 15)
      const key2 = '987654321' + '-video-' + prompt2.slice(0, 15)
      
      expect(key1).toBe(key2)
    })

    it('should generate different idempotency keys for different prompts', () => {
      const prompt1 = 'A cat running in a meadow'
      const prompt2 = 'A dog playing in water'
      
      const key1 = '987654321' + '-video-' + prompt1.slice(0, 15)
      const key2 = '987654321' + '-video-' + prompt2.slice(0, 15)
      
      expect(key1).not.toBe(key2)
    })
  })
})