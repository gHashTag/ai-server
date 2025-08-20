import { jest, describe, it, beforeEach, expect } from '@jest/globals'
import { generateSpeech } from '@/services/generateSpeech'

// Mock dependencies
jest.mock('@/core/supabase')
jest.mock('@/helpers')
jest.mock('elevenlabs')

describe('generateSpeech Service', () => {
  const mockBot = {
    telegram: {
      sendVoice: (jest.fn() as any).mockResolvedValue({ message_id: 1 }),
      sendMessage: (jest.fn() as any).mockResolvedValue({ message_id: 1 })
    }
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should generate speech from text', async () => {
    const result = await generateSpeech({
      text: 'Hello world',
      voice_id: 'voice_id_123',
      telegram_id: '123456',
      is_ru: true,
      bot: mockBot
    })

    expect(result).toBeDefined()
  })

  it('should handle Russian text', async () => {
    const result = await generateSpeech({
      text: 'Привет мир',
      voice_id: 'voice_id_123',
      telegram_id: '123456',
      is_ru: true,
      bot: mockBot
    })

    expect(result).toBeDefined()
  })

  it('should handle English text', async () => {
    const result = await generateSpeech({
      text: 'Hello world',
      voice_id: 'voice_id_123',
      telegram_id: '123456',
      is_ru: false,
      bot: mockBot
    })

    expect(result).toBeDefined()
  })

  it('should handle different voice IDs', async () => {
    const voices = ['voice_1', 'voice_2', 'voice_3']
    
    for (const voiceId of voices) {
      await generateSpeech({
        text: 'Test message',
        voice_id: voiceId,
        telegram_id: '123456',
        is_ru: true,
        bot: mockBot
      })
    }

    expect(mockBot.telegram.sendVoice).toHaveBeenCalled()
  })

  it('should handle long text', async () => {
    const longText = 'This is a very long text that should be processed correctly by the speech generation service. '.repeat(10)
    
    const result = await generateSpeech({
      text: longText,
      voice_id: 'voice_id_123',
      telegram_id: '123456',
      is_ru: false,
      bot: mockBot
    })

    expect(result).toBeDefined()
  })
})