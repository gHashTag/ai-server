import { jest, describe, it, beforeEach, expect } from '@jest/globals'
import { generateTextToImage } from '@/services/generateTextToImage'

// Mock dependencies
jest.mock('@/core/supabase')
jest.mock('@/helpers')
jest.mock('replicate')

describe('generateTextToImage Service', () => {
  const mockBot = {
    telegram: {
      sendPhoto: (jest.fn() as any).mockResolvedValue({ message_id: 1 }),
      sendMessage: (jest.fn() as any).mockResolvedValue({ message_id: 1 })
    }
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should generate image with flux model', async () => {
    const result = await generateTextToImage(
      'A beautiful landscape',
      'black-forest-labs/flux-dev',
      1,
      '123456',
      'testuser',
      true,
      mockBot
    )

    expect(result).toBeDefined()
  })

  it('should generate image with stable-diffusion model', async () => {
    const result = await generateTextToImage(
      'A beautiful landscape',
      'black-forest-labs/flux-1.1-pro',
      2,
      '123456',
      'testuser',
      false,
      mockBot
    )

    expect(result).toBeDefined()
  })

  it('should handle multiple images', async () => {
    const result = await generateTextToImage(
      'A beautiful landscape',
      'black-forest-labs/flux-dev',
      3,
      '123456',
      'testuser',
      true,
      mockBot
    )

    expect(result).toBeDefined()
  })

  it('should handle different languages', async () => {
    // Test Russian
    await generateTextToImage(
      'Красивый пейзаж',
      'black-forest-labs/flux-dev',
      1,
      '123456',
      'testuser',
      true,
      mockBot
    )

    // Test English
    await generateTextToImage(
      'Beautiful landscape',
      'black-forest-labs/flux-dev',
      1,
      '123456',
      'testuser',
      false,
      mockBot
    )

    expect(mockBot.telegram.sendPhoto).toHaveBeenCalled()
  })
})