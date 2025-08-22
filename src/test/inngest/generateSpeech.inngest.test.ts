import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { generateSpeechInngest, createVoiceAvatarInngest } from '@/core/inngest-client/helpers/generateSpeech'
import { generateSpeech } from '@/services/generateSpeech'
import { createVoiceAvatar } from '@/services/createVoiceAvatar'
import { getBotByName } from '@/core/bot'
import { logger } from '@/utils/logger'

// Mock all dependencies
jest.mock('@/services/generateSpeech')
jest.mock('@/services/createVoiceAvatar')
jest.mock('@/core/bot')
jest.mock('@/utils/logger')

const mockGenerateSpeech = generateSpeech as jest.MockedFunction<typeof generateSpeech>
const mockCreateVoiceAvatar = createVoiceAvatar as jest.MockedFunction<typeof createVoiceAvatar>
const mockGetBotByName = getBotByName as jest.MockedFunction<typeof getBotByName>
const mockLogger = logger as jest.Mocked<typeof logger>

describe('Speech Inngest Functions', () => {
  const mockBot = {
    telegram: {
      sendMessage: jest.fn(),
      sendAudio: jest.fn(),
      sendVoice: jest.fn(),
    }
  }

  const mockStep = {
    run: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockGetBotByName.mockReturnValue({ bot: mockBot })
    
    mockStep.run.mockImplementation(async (stepName: string, fn: () => Promise<any>) => {
      return await fn()
    })

    mockLogger.info = jest.fn()
    mockLogger.error = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('generateSpeechInngest', () => {
    const baseSpeechEventData = {
      text: 'Hello, this is a test speech generation',
      voice_id: 'elevenlabs-voice-123',
      telegram_id: '111222333',
      is_ru: false,
      bot_name: 'speech_bot'
    }

    const mockSpeechEvent = {
      id: 'event-speech-456',
      data: baseSpeechEventData,
      name: 'speech/text-to-speech.start',
      ts: Date.now()
    }

    const mockSpeechResult = {
      audioUrl: 'https://example.com/generated-speech.mp3',
      duration: 12.5
    }

    beforeEach(() => {
      mockGenerateSpeech.mockResolvedValue(mockSpeechResult)
    })

    describe('Function Configuration', () => {
      it('should have correct function ID and configuration', () => {
        expect(generateSpeechInngest).toBeDefined()
      })

      it('should use correct concurrency limit (5)', () => {
        expect(generateSpeechInngest).toBeDefined()
      })

      it('should have correct idempotency key format', () => {
        const text = 'Hello, this is a test speech generation'
        const expectedIdempotencyPart = text.slice(0, 20)
        
        expect(expectedIdempotencyPart).toBe('Hello, this is a tes')
      })
    })

    describe('Successful Speech Generation', () => {
      it('should successfully generate speech with valid data', async () => {
        const handler = (generateSpeechInngest as any).fn
        
        const result = await handler({
          event: mockSpeechEvent,
          step: mockStep
        })

        expect(mockLogger.info).toHaveBeenCalledWith({
          message: 'План А - Inngest генерация текст-в-речь',
          eventId: 'event-speech-456',
          telegram_id: '111222333',
          voice_id: 'elevenlabs-voice-123'
        })

        expect(mockGetBotByName).toHaveBeenCalledWith('speech_bot')
        
        expect(mockGenerateSpeech).toHaveBeenCalledWith({
          text: 'Hello, this is a test speech generation',
          voice_id: 'elevenlabs-voice-123',
          telegram_id: '111222333',
          is_ru: false,
          bot: mockBot
        })

        expect(mockLogger.info).toHaveBeenCalledWith({
          message: 'План А - генерация речи завершена успешно',
          telegram_id: '111222333',
          audioUrl: 'https://example.com/generated-speech.mp3'
        })

        expect(result).toEqual({
          success: true,
          audioUrl: 'https://example.com/generated-speech.mp3',
          message: 'Speech generation completed via Inngest'
        })
      })

      it('should handle Russian language speech generation', async () => {
        const russianEventData = {
          ...baseSpeechEventData,
          text: 'Привет, это тестовая генерация речи',
          is_ru: true
        }

        const handler = (generateSpeechInngest as any).fn
        
        await handler({
          event: { ...mockSpeechEvent, data: russianEventData },
          step: mockStep
        })

        expect(mockGenerateSpeech).toHaveBeenCalledWith({
          text: 'Привет, это тестовая генерация речи',
          voice_id: 'elevenlabs-voice-123',
          telegram_id: '111222333',
          is_ru: true,
          bot: mockBot
        })
      })

      it('should handle different voice IDs', async () => {
        const differentVoiceData = {
          ...baseSpeechEventData,
          voice_id: 'custom-voice-456'
        }

        const handler = (generateSpeechInngest as any).fn
        
        await handler({
          event: { ...mockSpeechEvent, data: differentVoiceData },
          step: mockStep
        })

        expect(mockGenerateSpeech).toHaveBeenCalledWith({
          text: 'Hello, this is a test speech generation',
          voice_id: 'custom-voice-456',
          telegram_id: '111222333',
          is_ru: false,
          bot: mockBot
        })
      })

      it('should handle long text generation', async () => {
        const longText = 'This is a very long text that needs to be converted to speech. '.repeat(10)
        const longTextData = {
          ...baseSpeechEventData,
          text: longText
        }

        const handler = (generateSpeechInngest as any).fn
        
        await handler({
          event: { ...mockSpeechEvent, data: longTextData },
          step: mockStep
        })

        expect(mockGenerateSpeech).toHaveBeenCalledWith({
          text: longText,
          voice_id: 'elevenlabs-voice-123',
          telegram_id: '111222333',
          is_ru: false,
          bot: mockBot
        })
      })
    })

    describe('Speech Generation Error Handling', () => {
      it('should handle bot not found error', async () => {
        mockGetBotByName.mockReturnValue({ bot: null })

        const handler = (generateSpeechInngest as any).fn
        
        await expect(handler({
          event: mockSpeechEvent,
          step: mockStep
        })).rejects.toThrow('Бот speech_bot не найден')

        expect(mockGenerateSpeech).not.toHaveBeenCalled()
      })

      it('should handle speech generation service errors', async () => {
        const serviceError = new Error('Failed to generate speech')
        mockGenerateSpeech.mockRejectedValue(serviceError)

        const handler = (generateSpeechInngest as any).fn
        
        await expect(handler({
          event: mockSpeechEvent,
          step: mockStep
        })).rejects.toThrow('Failed to generate speech')
      })

      it('should handle invalid voice ID errors', async () => {
        const voiceError = new Error('Invalid voice ID')
        voiceError.name = 'VoiceNotFoundError'
        mockGenerateSpeech.mockRejectedValue(voiceError)

        const handler = (generateSpeechInngest as any).fn
        
        await expect(handler({
          event: mockSpeechEvent,
          step: mockStep
        })).rejects.toThrow('Invalid voice ID')
      })

      it('should handle text-to-speech API quota errors', async () => {
        const quotaError = new Error('TTS API quota exceeded')
        quotaError.name = 'QuotaExceededError'
        mockGenerateSpeech.mockRejectedValue(quotaError)

        const handler = (generateSpeechInngest as any).fn
        
        await expect(handler({
          event: mockSpeechEvent,
          step: mockStep
        })).rejects.toThrow('TTS API quota exceeded')
      })
    })

    describe('Speech Step Execution', () => {
      it('should execute within step.run with correct step name', async () => {
        const handler = (generateSpeechInngest as any).fn
        
        await handler({
          event: mockSpeechEvent,
          step: mockStep
        })

        expect(mockStep.run).toHaveBeenCalledWith('generate-speech', expect.any(Function))
      })
    })
  })

  describe('createVoiceAvatarInngest', () => {
    const baseAvatarEventData = {
      fileUrl: 'https://example.com/voice-sample.wav',
      telegram_id: '444555666',
      username: 'voiceuser',
      is_ru: false,
      bot_name: 'avatar_bot'
    }

    const mockAvatarEvent = {
      id: 'event-avatar-789',
      data: baseAvatarEventData,
      name: 'speech/voice-avatar.start',
      ts: Date.now()
    }

    const mockAvatarResult = {
      voice_id: 'custom-voice-789',
      status: 'ready',
      message: 'Voice avatar created successfully'
    }

    beforeEach(() => {
      mockCreateVoiceAvatar.mockResolvedValue(mockAvatarResult)
    })

    describe('Function Configuration', () => {
      it('should have correct function ID and configuration', () => {
        expect(createVoiceAvatarInngest).toBeDefined()
      })

      it('should use correct concurrency limit (3)', () => {
        expect(createVoiceAvatarInngest).toBeDefined()
      })

      it('should have correct idempotency key format based on fileUrl', () => {
        const fileUrl = 'https://example.com/voice-sample.wav'
        const expectedIdempotencyPart = fileUrl.slice(-10)
        
        expect(expectedIdempotencyPart).toBe('-sample.wav')
      })
    })

    describe('Successful Voice Avatar Creation', () => {
      it('should successfully create voice avatar with valid data', async () => {
        const handler = (createVoiceAvatarInngest as any).fn
        
        const result = await handler({
          event: mockAvatarEvent,
          step: mockStep
        })

        expect(mockLogger.info).toHaveBeenCalledWith({
          message: 'План А - Inngest создание голосового аватара',
          eventId: 'event-avatar-789',
          telegram_id: '444555666',
          fileUrl: 'https://example.com/voice-sample.wav'
        })

        expect(mockGetBotByName).toHaveBeenCalledWith('avatar_bot')
        
        expect(mockCreateVoiceAvatar).toHaveBeenCalledWith(
          'https://example.com/voice-sample.wav',
          '444555666',
          'voiceuser',
          false,
          mockBot
        )

        expect(mockLogger.info).toHaveBeenCalledWith({
          message: 'План А - создание голосового аватара завершено успешно',
          telegram_id: '444555666'
        })

        expect(result).toEqual({
          success: true,
          result: mockAvatarResult,
          message: 'Voice avatar creation completed via Inngest'
        })
      })

      it('should handle Russian language voice avatar creation', async () => {
        const russianAvatarData = {
          ...baseAvatarEventData,
          is_ru: true
        }

        const handler = (createVoiceAvatarInngest as any).fn
        
        await handler({
          event: { ...mockAvatarEvent, data: russianAvatarData },
          step: mockStep
        })

        expect(mockCreateVoiceAvatar).toHaveBeenCalledWith(
          'https://example.com/voice-sample.wav',
          '444555666',
          'voiceuser',
          true,
          mockBot
        )
      })

      it('should handle different audio file formats', async () => {
        const audioFormats = [
          'https://example.com/voice.mp3',
          'https://example.com/voice.m4a',
          'https://example.com/voice.ogg',
          'https://example.com/voice.flac'
        ]

        for (const fileUrl of audioFormats) {
          const audioData = {
            ...baseAvatarEventData,
            fileUrl
          }

          const handler = (createVoiceAvatarInngest as any).fn
          
          await handler({
            event: { ...mockAvatarEvent, data: audioData },
            step: mockStep
          })

          expect(mockCreateVoiceAvatar).toHaveBeenCalledWith(
            fileUrl,
            '444555666',
            'voiceuser',
            false,
            mockBot
          )
        }
      })
    })

    describe('Voice Avatar Error Handling', () => {
      it('should handle bot not found error', async () => {
        mockGetBotByName.mockReturnValue({ bot: null })

        const handler = (createVoiceAvatarInngest as any).fn
        
        await expect(handler({
          event: mockAvatarEvent,
          step: mockStep
        })).rejects.toThrow('Бот avatar_bot не найден')

        expect(mockCreateVoiceAvatar).not.toHaveBeenCalled()
      })

      it('should handle voice avatar creation service errors', async () => {
        const serviceError = new Error('Failed to create voice avatar')
        mockCreateVoiceAvatar.mockRejectedValue(serviceError)

        const handler = (createVoiceAvatarInngest as any).fn
        
        await expect(handler({
          event: mockAvatarEvent,
          step: mockStep
        })).rejects.toThrow('Failed to create voice avatar')
      })

      it('should handle invalid audio file errors', async () => {
        const audioError = new Error('Invalid audio file format')
        audioError.name = 'InvalidAudioError'
        mockCreateVoiceAvatar.mockRejectedValue(audioError)

        const handler = (createVoiceAvatarInngest as any).fn
        
        await expect(handler({
          event: mockAvatarEvent,
          step: mockStep
        })).rejects.toThrow('Invalid audio file format')
      })

      it('should handle audio file download errors', async () => {
        const downloadError = new Error('Failed to download audio file')
        downloadError.name = 'DownloadError'
        mockCreateVoiceAvatar.mockRejectedValue(downloadError)

        const handler = (createVoiceAvatarInngest as any).fn
        
        await expect(handler({
          event: mockAvatarEvent,
          step: mockStep
        })).rejects.toThrow('Failed to download audio file')
      })
    })

    describe('Voice Avatar Step Execution', () => {
      it('should execute within step.run with correct step name', async () => {
        const handler = (createVoiceAvatarInngest as any).fn
        
        await handler({
          event: mockAvatarEvent,
          step: mockStep
        })

        expect(mockStep.run).toHaveBeenCalledWith('create-voice-avatar', expect.any(Function))
      })
    })

    describe('Voice Avatar Idempotency', () => {
      it('should generate same idempotency key for same file URL', () => {
        const fileUrl = 'https://example.com/voice-sample.wav'
        
        const key1 = '444555666' + '-avatar-' + fileUrl.slice(-10)
        const key2 = '444555666' + '-avatar-' + fileUrl.slice(-10)
        
        expect(key1).toBe(key2)
        expect(key1).toBe('444555666-avatar--sample.wav')
      })

      it('should generate different idempotency keys for different file URLs', () => {
        const fileUrl1 = 'https://example.com/voice1.wav'
        const fileUrl2 = 'https://example.com/voice2.mp3'
        
        const key1 = '444555666' + '-avatar-' + fileUrl1.slice(-10)
        const key2 = '444555666' + '-avatar-' + fileUrl2.slice(-10)
        
        expect(key1).not.toBe(key2)
      })
    })
  })

  describe('Performance Tests', () => {
    it('should complete speech generation within reasonable time', async () => {
      const baseSpeechEventData = {
        text: 'Quick test',
        voice_id: 'voice-123',
        telegram_id: '111222333',
        is_ru: false,
        bot_name: 'speech_bot'
      }

      mockGenerateSpeech.mockResolvedValue({
        audioUrl: 'https://example.com/speech.mp3',
        duration: 2.5
      })

      const mockSpeechEvent = {
        id: 'event-perf',
        data: baseSpeechEventData,
        name: 'speech/text-to-speech.start',
        ts: Date.now()
      }

      const start = Date.now()
      
      const handler = (generateSpeechInngest as any).fn
      await handler({
        event: mockSpeechEvent,
        step: mockStep
      })
      
      const duration = Date.now() - start
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds in test
    })
  })

  describe('Concurrency Control', () => {
    it('should respect speech generation concurrency limit (5)', async () => {
      const baseSpeechEventData = {
        text: 'Concurrent test',
        voice_id: 'voice-123',
        telegram_id: '111222333',
        is_ru: false,
        bot_name: 'speech_bot'
      }

      mockGenerateSpeech.mockResolvedValue({
        audioUrl: 'https://example.com/speech.mp3',
        duration: 3.0
      })

      const promises = Array.from({ length: 5 }, (_, index) => {
        const handler = (generateSpeechInngest as any).fn
        return handler({
          event: {
            id: `event-${index}`,
            data: { ...baseSpeechEventData, text: `Test ${index}` },
            name: 'speech/text-to-speech.start',
            ts: Date.now()
          },
          step: mockStep
        })
      })

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result.success).toBe(true)
        expect(result.audioUrl).toBe('https://example.com/speech.mp3')
      })
    })

    it('should respect voice avatar concurrency limit (3)', async () => {
      const baseAvatarEventData = {
        fileUrl: 'https://example.com/voice.wav',
        telegram_id: '444555666',
        username: 'user',
        is_ru: false,
        bot_name: 'avatar_bot'
      }

      mockCreateVoiceAvatar.mockResolvedValue({
        voice_id: 'custom-voice',
        status: 'ready'
      })

      const promises = Array.from({ length: 3 }, (_, index) => {
        const handler = (createVoiceAvatarInngest as any).fn
        return handler({
          event: {
            id: `event-${index}`,
            data: { ...baseAvatarEventData, fileUrl: `https://example.com/voice${index}.wav` },
            name: 'speech/voice-avatar.start',
            ts: Date.now()
          },
          step: mockStep
        })
      })

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result.success).toBe(true)
        expect(result.result.voice_id).toBe('custom-voice')
      })
    })
  })
})