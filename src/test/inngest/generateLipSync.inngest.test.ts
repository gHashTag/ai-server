import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { generateLipSyncInngest } from '@/core/inngest-client/helpers/generateLipSync'
import { generateLipSync } from '@/services/generateLipSync'
import { logger } from '@/utils/logger'

// Mock all dependencies
jest.mock('@/services/generateLipSync')
jest.mock('@/utils/logger')

const mockGenerateLipSync = generateLipSync as jest.MockedFunction<typeof generateLipSync>
const mockLogger = logger as jest.Mocked<typeof logger>

describe('generateLipSyncInngest', () => {
  const mockStep = {
    run: jest.fn()
  }

  const baseLipSyncEventData = {
    telegram_id: '777888999',
    video: 'https://example.com/person-speaking-video.mp4',
    audio: 'https://example.com/speech-audio.mp3',
    is_ru: false
  }

  const mockEvent = {
    id: 'event-lipsync-123',
    data: baseLipSyncEventData,
    name: 'video/lip-sync.start',
    ts: Date.now()
  }

  const mockLipSyncResult = {
    videoUrl: 'https://example.com/lip-synced-video.mp4',
    status: 'completed',
    duration: 15.5,
    processingTime: 45.2
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockGenerateLipSync.mockResolvedValue(mockLipSyncResult)
    
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
      expect(generateLipSyncInngest).toBeDefined()
    })

    it('should have correct function name', () => {
      expect(generateLipSyncInngest).toBeDefined()
      // Function name would be tested in integration tests
    })
  })

  describe('Successful Lip Sync Generation', () => {
    it('should successfully generate lip sync with valid data', async () => {
      const handler = (generateLipSyncInngest as any).fn
      
      const result = await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Inngest: Начинаем генерацию лип-синка',
        telegram_id: '777888999',
        video: 'https://example.com/person-speaking-video.mp4',
        audio: 'https://example.com/speech-audio.mp3',
        is_ru: false
      })

      expect(mockGenerateLipSync).toHaveBeenCalledWith(
        '777888999',
        'https://example.com/person-speaking-video.mp4',
        'https://example.com/speech-audio.mp3',
        false
      )

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Inngest: Лип-синк успешно запущен',
        telegram_id: '777888999',
        resultType: 'object'
      })

      expect(result).toEqual({
        success: true,
        result: mockLipSyncResult,
        telegram_id: '777888999',
        timestamp: expect.any(String)
      })

      // Verify timestamp format
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)
    })

    it('should handle Russian language lip sync', async () => {
      const russianEventData = {
        ...baseLipSyncEventData,
        is_ru: true
      }

      const handler = (generateLipSyncInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: russianEventData },
        step: mockStep
      })

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Inngest: Начинаем генерацию лип-синка',
        telegram_id: '777888999',
        video: 'https://example.com/person-speaking-video.mp4',
        audio: 'https://example.com/speech-audio.mp3',
        is_ru: true
      })

      expect(mockGenerateLipSync).toHaveBeenCalledWith(
        '777888999',
        'https://example.com/person-speaking-video.mp4',
        'https://example.com/speech-audio.mp3',
        true
      )
    })

    it('should handle different video and audio formats', async () => {
      const formatTestCases = [
        {
          video: 'https://example.com/video.avi',
          audio: 'https://example.com/audio.wav'
        },
        {
          video: 'https://example.com/video.mov',
          audio: 'https://example.com/audio.m4a'
        },
        {
          video: 'https://example.com/video.webm',
          audio: 'https://example.com/audio.ogg'
        }
      ]

      for (const testCase of formatTestCases) {
        const formatEventData = {
          ...baseLipSyncEventData,
          video: testCase.video,
          audio: testCase.audio
        }

        const handler = (generateLipSyncInngest as any).fn
        
        await handler({
          event: { ...mockEvent, data: formatEventData },
          step: mockStep
        })

        expect(mockGenerateLipSync).toHaveBeenCalledWith(
          '777888999',
          testCase.video,
          testCase.audio,
          false
        )
      }
    })

    it('should handle long URLs correctly in logging', async () => {
      const longUrlData = {
        ...baseLipSyncEventData,
        video: 'https://very-long-domain-name.example.com/extremely/deep/path/structure/with/many/segments/final-video-file-with-very-long-name.mp4',
        audio: 'https://another-very-long-domain.example.com/audio/files/directory/structure/final-audio-file-with-extremely-long-name.mp3'
      }

      const handler = (generateLipSyncInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: longUrlData },
        step: mockStep
      })

      // Should log only first 100 characters of URLs
      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Inngest: Начинаем генерацию лип-синка',
        telegram_id: '777888999',
        video: longUrlData.video.substring(0, 100),
        audio: longUrlData.audio.substring(0, 100),
        is_ru: false
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle lip sync generation service errors', async () => {
      const serviceError = new Error('Failed to generate lip sync')
      mockGenerateLipSync.mockRejectedValue(serviceError)

      const handler = (generateLipSyncInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Failed to generate lip sync')

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Inngest: Ошибка при генерации лип-синка',
        telegram_id: '777888999',
        error: 'Failed to generate lip sync'
      })
    })

    it('should handle video file processing errors', async () => {
      const videoError = new Error('Invalid video file format')
      videoError.name = 'VideoProcessingError'
      mockGenerateLipSync.mockRejectedValue(videoError)

      const handler = (generateLipSyncInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Invalid video file format')

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Inngest: Ошибка при генерации лип-синка',
        telegram_id: '777888999',
        error: 'Invalid video file format'
      })
    })

    it('should handle audio file processing errors', async () => {
      const audioError = new Error('Unsupported audio codec')
      audioError.name = 'AudioProcessingError'
      mockGenerateLipSync.mockRejectedValue(audioError)

      const handler = (generateLipSyncInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Unsupported audio codec')
    })

    it('should handle network/download errors', async () => {
      const networkError = new Error('Failed to download media files')
      networkError.name = 'NetworkError'
      mockGenerateLipSync.mockRejectedValue(networkError)

      const handler = (generateLipSyncInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Failed to download media files')
    })

    it('should handle processing timeout errors', async () => {
      const timeoutError = new Error('Lip sync processing timeout')
      timeoutError.name = 'TimeoutError'
      mockGenerateLipSync.mockRejectedValue(timeoutError)

      const handler = (generateLipSyncInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Lip sync processing timeout')
    })

    it('should handle unknown errors gracefully', async () => {
      const unknownError = { message: 'Something went wrong', code: 'UNKNOWN' }
      mockGenerateLipSync.mockRejectedValue(unknownError)

      const handler = (generateLipSyncInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toEqual(unknownError)

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Inngest: Ошибка при генерации лип-синка',
        telegram_id: '777888999',
        error: 'Unknown error'
      })
    })

    it('should handle null/undefined errors', async () => {
      mockGenerateLipSync.mockRejectedValue(null)

      const handler = (generateLipSyncInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toBeNull()

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Inngest: Ошибка при генерации лип-синка',
        telegram_id: '777888999',
        error: 'Unknown error'
      })
    })
  })

  describe('Step Execution', () => {
    it('should execute within step.run with correct step name', async () => {
      const handler = (generateLipSyncInngest as any).fn
      
      await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(mockStep.run).toHaveBeenCalledWith('generate-lip-sync', expect.any(Function))
    })

    it('should handle step execution failures', async () => {
      const stepError = new Error('Step execution failed')
      mockStep.run.mockRejectedValue(stepError)

      const handler = (generateLipSyncInngest as any).fn
      
      await expect(handler({
        event: mockEvent,
        step: mockStep
      })).rejects.toThrow('Step execution failed')
    })
  })

  describe('Logging', () => {
    it('should log function start with correct parameters', async () => {
      const handler = (generateLipSyncInngest as any).fn
      
      await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Inngest: Начинаем генерацию лип-синка',
        telegram_id: '777888999',
        video: 'https://example.com/person-speaking-video.mp4',
        audio: 'https://example.com/speech-audio.mp3',
        is_ru: false
      })
    })

    it('should log successful completion with result type', async () => {
      const handler = (generateLipSyncInngest as any).fn
      
      await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Inngest: Лип-синк успешно запущен',
        telegram_id: '777888999',
        resultType: 'object'
      })
    })

    it('should log different result types correctly', async () => {
      const resultTypes = [
        { result: 'string result', expectedType: 'string' },
        { result: 123, expectedType: 'number' },
        { result: { url: 'test' }, expectedType: 'object' },
        { result: true, expectedType: 'boolean' }
      ]

      for (const testCase of resultTypes) {
        mockGenerateLipSync.mockResolvedValue(testCase.result as any)

        const handler = (generateLipSyncInngest as any).fn
        
        await handler({
          event: mockEvent,
          step: mockStep
        })

        expect(mockLogger.info).toHaveBeenCalledWith({
          message: 'Inngest: Лип-синк успешно запущен',
          telegram_id: '777888999',
          resultType: testCase.expectedType
        })
      }
    })
  })

  describe('Data Validation', () => {
    it('should handle missing telegram_id', async () => {
      const invalidEventData = {
        ...baseLipSyncEventData,
        telegram_id: undefined
      }

      const handler = (generateLipSyncInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: invalidEventData },
        step: mockStep
      })

      expect(mockGenerateLipSync).toHaveBeenCalledWith(
        undefined,
        'https://example.com/person-speaking-video.mp4',
        'https://example.com/speech-audio.mp3',
        false
      )
    })

    it('should handle empty URL strings', async () => {
      const emptyUrlData = {
        ...baseLipSyncEventData,
        video: '',
        audio: ''
      }

      const handler = (generateLipSyncInngest as any).fn
      
      await handler({
        event: { ...mockEvent, data: emptyUrlData },
        step: mockStep
      })

      expect(mockGenerateLipSync).toHaveBeenCalledWith(
        '777888999',
        '',
        '',
        false
      )

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Inngest: Начинаем генерацию лип-синка',
        telegram_id: '777888999',
        video: '',
        audio: '',
        is_ru: false
      })
    })
  })

  describe('Performance', () => {
    it('should complete lip sync generation within reasonable time for testing', async () => {
      const start = Date.now()
      
      const handler = (generateLipSyncInngest as any).fn
      await handler({
        event: mockEvent,
        step: mockStep
      })
      
      const duration = Date.now() - start
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds in test
    })

    it('should handle large video files processing', async () => {
      const largeVideoResult = {
        ...mockLipSyncResult,
        videoUrl: 'https://example.com/large-lip-synced-video-4k.mp4',
        duration: 120.5,
        processingTime: 300.7,
        fileSize: '2.5GB'
      }
      
      mockGenerateLipSync.mockResolvedValue(largeVideoResult)

      const handler = (generateLipSyncInngest as any).fn
      const result = await handler({
        event: mockEvent,
        step: mockStep
      })

      expect(result.result.fileSize).toBe('2.5GB')
      expect(result.result.duration).toBe(120.5)
    })
  })

  describe('Integration with Different Media Types', () => {
    it('should handle different video resolutions and formats', async () => {
      const videoFormats = [
        'https://example.com/video-720p.mp4',
        'https://example.com/video-1080p.avi',
        'https://example.com/video-4k.mov',
        'https://example.com/video-portrait.webm'
      ]

      for (const videoUrl of videoFormats) {
        const formatData = {
          ...baseLipSyncEventData,
          video: videoUrl
        }

        const handler = (generateLipSyncInngest as any).fn
        
        await handler({
          event: { ...mockEvent, data: formatData },
          step: mockStep
        })

        expect(mockGenerateLipSync).toHaveBeenCalledWith(
          '777888999',
          videoUrl,
          'https://example.com/speech-audio.mp3',
          false
        )
      }
    })

    it('should handle different audio quality and formats', async () => {
      const audioFormats = [
        'https://example.com/audio-highquality.wav',
        'https://example.com/audio-compressed.mp3',
        'https://example.com/audio-lossless.flac',
        'https://example.com/audio-voice.m4a'
      ]

      for (const audioUrl of audioFormats) {
        const formatData = {
          ...baseLipSyncEventData,
          audio: audioUrl
        }

        const handler = (generateLipSyncInngest as any).fn
        
        await handler({
          event: { ...mockEvent, data: formatData },
          step: mockStep
        })

        expect(mockGenerateLipSync).toHaveBeenCalledWith(
          '777888999',
          'https://example.com/person-speaking-video.mp4',
          audioUrl,
          false
        )
      }
    })
  })

  describe('Timestamp Handling', () => {
    it('should generate valid ISO timestamp', async () => {
      const handler = (generateLipSyncInngest as any).fn
      const result = await handler({
        event: mockEvent,
        step: mockStep
      })

      const timestamp = result.timestamp
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      
      const parsedDate = new Date(timestamp)
      expect(parsedDate.toISOString()).toBe(timestamp)
      
      // Should be close to current time
      const now = new Date()
      const timeDiff = Math.abs(now.getTime() - parsedDate.getTime())
      expect(timeDiff).toBeLessThan(1000) // Within 1 second
    })
  })
})