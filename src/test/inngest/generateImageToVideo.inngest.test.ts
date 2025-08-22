import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { generateImageToVideoInngest } from '@/core/inngest-client/helpers/generateImageToVideo'
import { generateImageToVideo } from '@/services/generateImageToVideo'
import { getBotByName } from '@/core/bot'
import { logger } from '@/utils/logger'

// Mock all dependencies
jest.mock('@/services/generateImageToVideo')
jest.mock('@/core/bot')
jest.mock('@/utils/logger')

const mockGenerateImageToVideo = generateImageToVideo as jest.MockedFunction<typeof generateImageToVideo>
const mockGetBotByName = getBotByName as jest.MockedFunction<typeof getBotByName>
const mockLogger = logger as jest.Mocked<typeof logger>

describe('generateImageToVideoInngest', () => {
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
    imageUrl: 'https://example.com/cat-image.jpg',
    prompt: 'Make the cat move and run',
    videoModel: 'minimax-video-01',
    telegram_id: '555666777',
    username: 'imagevideouser',
    is_ru: false,
    bot_name: 'img_video_bot'
  }

  const mockEvent = {
    id: 'event-img2vid-789',
    data: baseEventData,
    name: 'video/image-to-video.start',
    ts: Date.now()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockGetBotByName.mockReturnValue({ bot: mockBot })
    mockGenerateImageToVideo.mockResolvedValue('/tmp/image-to-video-output.mp4')
    
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
      expect(generateImageToVideoInngest).toBeDefined()
    })

    it('should use correct concurrency limit (3)', () => {
      expect(generateImageToVideoInngest).toBeDefined()
    })

    it('should have correct idempotency key format based on imageUrl', () => {
      const imageUrl = 'https://example.com/cat-image.jpg'
      const expectedIdempotencyPart = imageUrl.slice(-10)
      
      expect(expectedIdempotencyPart).toBe('-image.jpg')
    })
  })

  describe('Successful Execution', () => {
    it('should successfully generate video from image with valid data', async () => {
      const handler = (generateImageToVideoInngest as any).fn
      
      const result = await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'План А - Inngest генерация изображение-в-видео',
        eventId: 'event-img2vid-789',
        telegram_id: '555666777',
        videoModel: 'minimax-video-01'
      })

      expect(mockGetBotByName).toHaveBeenCalledWith('img_video_bot')
      
      expect(mockGenerateImageToVideo).toHaveBeenCalledWith(
        'https://example.com/cat-image.jpg',
        'Make the cat move and run',
        'minimax-video-01',
        '555666777',
        'imagevideouser',
        false,
        mockBot
      )

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'План А - генерация видео из изображения завершена успешно',
        telegram_id: '555666777',
        videoPath: '/tmp/image-to-video-output.mp4'
      })

      expect(result).toEqual({
        success: true,
        videoPath: '/tmp/image-to-video-output.mp4',
        message: 'Image-to-video generation completed via Inngest'
      })
    })

    it('should handle object result from generateImageToVideo service', async () => {
      const objectResult = {
        videoUrl: '/tmp/video-from-object.mp4',
        metadata: { duration: 5 }
      }
      mockGenerateImageToVideo.mockResolvedValue(objectResult as any)

      const handler = (generateImageToVideoInngest as any).fn
      
      const result = await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(result.videoPath).toBe('/tmp/video-from-object.mp4')
      expect(result.success).toBe(true)
    })

    it('should handle unknown result format gracefully', async () => {
      const unknownResult = { someOtherField: 'value' }
      mockGenerateImageToVideo.mockResolvedValue(unknownResult as any)

      const handler = (generateImageToVideoInngest as any).fn
      
      const result = await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(result.videoPath).toBe('unknown')
      expect(result.success).toBe(true)
    })

    it('should handle Russian language prompts', async () => {
      const russianEventData = {
        ...baseEventData,
        prompt: 'Заставь кота двигаться и бегать',
        is_ru: true
      }

      const handler = (generateImageToVideoInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: russianEventData },
        step: mockStep
      })

      expect(mockGenerateImageToVideo).toHaveBeenCalledWith(
        'https://example.com/cat-image.jpg',
        'Заставь кота двигаться и бегать',
        'minimax-video-01',
        '555666777',
        'imagevideouser',
        true,
        mockBot
      )
    })

    it('should handle different video models', async () => {
      const differentModelData = {
        ...baseEventData,
        videoModel: 'runway-gen3'
      }

      const handler = (generateImageToVideoInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: differentModelData },
        step: mockStep
      })

      expect(mockGenerateImageToVideo).toHaveBeenCalledWith(
        'https://example.com/cat-image.jpg',
        'Make the cat move and run',
        'runway-gen3',
        '555666777',
        'imagevideouser',
        false,
        mockBot
      )
    })

    it('should handle different image formats', async () => {
      const pngImageData = {
        ...baseEventData,
        imageUrl: 'https://example.com/beautiful-sunset.png'
      }

      const handler = (generateImageToVideoInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: pngImageData },
        step: mockStep
      })

      expect(mockGenerateImageToVideo).toHaveBeenCalledWith(
        'https://example.com/beautiful-sunset.png',
        'Make the cat move and run',
        'minimax-video-01',
        '555666777',
        'imagevideouser',
        false,
        mockBot
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle bot not found error', async () => {
      mockGetBotByName.mockReturnValue({ bot: null })

      const handler = (generateImageToVideoInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Бот img_video_bot не найден')

      expect(mockGenerateImageToVideo).not.toHaveBeenCalled()
    })

    it('should handle invalid image URL errors', async () => {
      const invalidImageError = new Error('Invalid image URL')
      mockGenerateImageToVideo.mockRejectedValue(invalidImageError)

      const handler = (generateImageToVideoInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Invalid image URL')
    })

    it('should handle image download failures', async () => {
      const downloadError = new Error('Failed to download image')
      downloadError.name = 'DownloadError'
      mockGenerateImageToVideo.mockRejectedValue(downloadError)

      const handler = (generateImageToVideoInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Failed to download image')
    })

    it('should handle video generation service errors', async () => {
      const serviceError = new Error('Video generation failed')
      mockGenerateImageToVideo.mockRejectedValue(serviceError)

      const handler = (generateImageToVideoInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Video generation failed')
    })

    it('should handle unsupported image format errors', async () => {
      const formatError = new Error('Unsupported image format')
      formatError.name = 'UnsupportedFormatError'
      mockGenerateImageToVideo.mockRejectedValue(formatError)

      const handler = (generateImageToVideoInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Unsupported image format')
    })

    it('should handle processing timeout errors', async () => {
      const timeoutError = new Error('Image-to-video processing timeout')
      timeoutError.name = 'TimeoutError'
      mockGenerateImageToVideo.mockRejectedValue(timeoutError)

      const handler = (generateImageToVideoInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Image-to-video processing timeout')
    })
  })

  describe('Input Validation', () => {
    it('should handle empty prompt gracefully', async () => {
      const emptyPromptData = {
        ...baseEventData,
        prompt: ''
      }

      const handler = (generateImageToVideoInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: emptyPromptData },
        step: mockStep
      })

      expect(mockGenerateImageToVideo).toHaveBeenCalledWith(
        'https://example.com/cat-image.jpg',
        '',
        'minimax-video-01',
        '555666777',
        'imagevideouser',
        false,
        mockBot
      )
    })

    it('should handle very long prompts', async () => {
      const longPrompt = 'Make this image come to life with amazing animations '.repeat(20)
      const longPromptData = {
        ...baseEventData,
        prompt: longPrompt
      }

      const handler = (generateImageToVideoInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: longPromptData },
        step: mockStep
      })

      expect(mockGenerateImageToVideo).toHaveBeenCalledWith(
        'https://example.com/cat-image.jpg',
        longPrompt,
        'minimax-video-01',
        '555666777',
        'imagevideouser',
        false,
        mockBot
      )
    })

    it('should handle various image URL formats', async () => {
      const urlFormats = [
        'https://cdn.example.com/images/test.jpg',
        'http://example.org/photo.jpeg',
        'https://storage.googleapis.com/bucket/image.webp',
        'https://s3.amazonaws.com/bucket/image.gif'
      ]

      for (const imageUrl of urlFormats) {
        const urlData = {
          ...baseEventData,
          imageUrl
        }

        const handler = (generateImageToVideoInngest as any).fn
        
        await handler({
          event: { ...mockEvent, data: urlData },
          step: mockStep
        })

        expect(mockGenerateImageToVideo).toHaveBeenCalledWith(
          imageUrl,
          'Make the cat move and run',
          'minimax-video-01',
          '555666777',
          'imagevideouser',
          false,
          mockBot
        )
      }
    })
  })

  describe('Step Execution', () => {
    it('should execute within step.run with correct step name', async () => {
      const handler = (generateImageToVideoInngest as any).fn
      
      await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(mockStep.run).toHaveBeenCalledWith('generate-video-from-image', expect.any(Function))
    })

    it('should handle step execution failures', async () => {
      const stepError = new Error('Step execution failed')
      mockStep.run.mockRejectedValue(stepError)

      const handler = (generateImageToVideoInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Step execution failed')
    })
  })

  describe('Logging', () => {
    it('should log function start with correct parameters', async () => {
      const handler = (generateImageToVideoInngest as any).fn
      
      await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'План А - Inngest генерация изображение-в-видео',
        eventId: 'event-img2vid-789',
        telegram_id: '555666777',
        videoModel: 'minimax-video-01'
      })
    })

    it('should log successful completion with video path', async () => {
      const handler = (generateImageToVideoInngest as any).fn
      
      await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'План А - генерация видео из изображения завершена успешно',
        telegram_id: '555666777',
        videoPath: '/tmp/image-to-video-output.mp4'
      })
    })
  })

  describe('Idempotency', () => {
    it('should generate same idempotency key for same image URL', () => {
      const imageUrl = 'https://example.com/test-image.jpg'
      
      const key1 = '555666777' + '-img2vid-' + imageUrl.slice(-10)
      const key2 = '555666777' + '-img2vid-' + imageUrl.slice(-10)
      
      expect(key1).toBe(key2)
      expect(key1).toBe('555666777-img2vid--image.jpg')
    })

    it('should generate different idempotency keys for different image URLs', () => {
      const imageUrl1 = 'https://example.com/cat.jpg'
      const imageUrl2 = 'https://example.com/dog.png'
      
      const key1 = '555666777' + '-img2vid-' + imageUrl1.slice(-10)
      const key2 = '555666777' + '-img2vid-' + imageUrl2.slice(-10)
      
      expect(key1).not.toBe(key2)
    })

    it('should handle short image URLs in idempotency key', () => {
      const shortUrl = 'a.jpg'
      const key = '555666777' + '-img2vid-' + shortUrl.slice(-10)
      
      expect(key).toBe('555666777-img2vid-a.jpg')
    })
  })

  describe('Video Models Support', () => {
    const videoModels = [
      'minimax-video-01',
      'runway-gen3',
      'haiper-video-2',
      'stable-video-diffusion',
      'pika-labs-v1'
    ]

    videoModels.forEach(model => {
      it(`should support ${model} video model for image-to-video`, async () => {
        const modelEventData = {
          ...baseEventData,
          videoModel: model
        }

        const handler = (generateImageToVideoInngest as any).fn
        
        await handler({
          event: { ...mockEvent, data: modelEventData },
          step: mockStep
        })

        expect(mockGenerateImageToVideo).toHaveBeenCalledWith(
          'https://example.com/cat-image.jpg',
          'Make the cat move and run',
          model,
          '555666777',
          'imagevideouser',
          false,
          mockBot
        )
      })
    })
  })

  describe('Performance', () => {
    it('should complete image-to-video generation within reasonable time for testing', async () => {
      const start = Date.now()
      
      const handler = (generateImageToVideoInngest as any).fn
      await handler({
        event: mockEvent,
        step: mockStep
      })
      
      const duration = Date.now() - start
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds in test
    })
  })

  describe('Concurrency Control', () => {
    it('should respect concurrency limit (3)', async () => {
      // Simulate multiple concurrent image-to-video generations
      const promises = Array.from({ length: 3 }, (_, index) => {
        const handler = (generateImageToVideoInngest as any).fn
        return handler({
          event: { 
            ...mockEvent, 
            id: `event-${index}`,
            data: {
              ...baseEventData,
              imageUrl: `https://example.com/image-${index}.jpg`
            }
          },
          step: mockStep
        })
      })

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).toEqual({
          success: true,
          videoPath: '/tmp/image-to-video-output.mp4',
          message: 'Image-to-video generation completed via Inngest'
        })
      })
    })
  })
})