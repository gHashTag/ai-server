import { jest, describe, it, beforeEach, expect } from '@jest/globals'
import { generateNeuroImage } from '@/services/generateNeuroImage'

// Mock dependencies
jest.mock('@/core/supabase')
jest.mock('@/helpers')
jest.mock('replicate')
jest.mock('axios')

describe('generateNeuroImage Service', () => {
  const mockBot = {
    telegram: {
      sendPhoto: (jest.fn() as any).mockResolvedValue({ message_id: 1 }),
      sendMessage: (jest.fn() as any).mockResolvedValue({ message_id: 1 })
    }
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should generate neuro image with prompt', async () => {
    const result = await generateNeuroImage(
      'A beautiful cyberpunk cityscape',
      'stable-diffusion/stable-diffusion',
      1,
      '123456',
      'testuser',
      true,
      mockBot
    )

    expect(result).toBeDefined()
    expect(result).toHaveProperty('prompt_id')
    expect(result).toHaveProperty('image')
  })

  it('should handle Russian prompts', async () => {
    const result = await generateNeuroImage(
      'Красивый киберпанк пейзаж города',
      'stable-diffusion/stable-diffusion',
      1,
      '123456',
      'testuser',
      true,
      mockBot
    )

    expect(result).toBeDefined()
    expect(result).toHaveProperty('prompt_id')
    expect(result).toHaveProperty('image')
  })

  it('should handle English prompts', async () => {
    const result = await generateNeuroImage(
      'Futuristic robot in a neon-lit alley',
      'flux/flux-dev',
      1,
      '123456',
      'testuser',
      false,
      mockBot
    )

    expect(result).toBeDefined()
    expect(result).toHaveProperty('prompt_id')
    expect(result).toHaveProperty('image')
  })

  it('should handle complex prompts', async () => {
    const complexPrompt = 'A highly detailed digital art piece featuring a cybernetic woman with glowing blue eyes, wearing futuristic armor, standing in a rain-soaked neon city street at night, with holographic advertisements floating in the background'
    
    const result = await generateNeuroImage(
      complexPrompt,
      'flux/flux-dev',
      1,
      '123456',
      'testuser',
      false,
      mockBot
    )

    expect(result).toBeDefined()
    expect(result).toHaveProperty('prompt_id')
    expect(result).toHaveProperty('image')
  })

  it('should handle different user IDs', async () => {
    const userIds = ['123456', '789012', '555555']
    
    for (const userId of userIds) {
      const result = await generateNeuroImage(
        'Test neuro image',
        'stable-diffusion/stable-diffusion',
        1,
        userId,
        `user_${userId}`,
        true,
        mockBot
      )
      
      expect(result).toBeDefined()
    }

    expect(mockBot.telegram.sendPhoto).toHaveBeenCalled()
  })

  it('should handle different languages', async () => {
    // Test multiple prompts in different languages
    const prompts = [
      { text: 'Cyberpunk warrior', is_ru: false },
      { text: 'Киберпанк воин', is_ru: true },
      { text: 'Futuristic landscape', is_ru: false },
      { text: 'Футуристический пейзаж', is_ru: true }
    ]
    
    for (const prompt of prompts) {
      const result = await generateNeuroImage(
        prompt.text,
        'stable-diffusion/stable-diffusion',
        1,
        '123456',
        'testuser',
        prompt.is_ru,
        mockBot
      )
      
      expect(result).toBeDefined()
      expect(result).toHaveProperty('prompt_id')
      expect(result).toHaveProperty('image')
    }
  })

  it('should handle short prompts', async () => {
    const result = await generateNeuroImage(
      'Cat',
      'stable-diffusion/stable-diffusion',
      1,
      '123456',
      'testuser',
      false,
      mockBot
    )

    expect(result).toBeDefined()
    expect(result).toHaveProperty('prompt_id')
    expect(result).toHaveProperty('image')
  })

  it('should handle very long prompts', async () => {
    const longPrompt = 'A very detailed and complex prompt that describes a futuristic scene with multiple elements and intricate details. '.repeat(10)
    
    const result = await generateNeuroImage(
      longPrompt,
      'flux/flux-dev',
      1,
      '123456',
      'testuser',
      false,
      mockBot
    )

    expect(result).toBeDefined()
    expect(result).toHaveProperty('prompt_id')
    expect(result).toHaveProperty('image')
  })
})