import { jest, describe, it, beforeEach, expect } from '@jest/globals'
import { generateImageToVideo } from '@/services/generateImageToVideo'

// Mock dependencies
jest.mock('@/core/supabase')
jest.mock('@/helpers')
jest.mock('replicate')
jest.mock('axios')

describe('generateImageToVideo Service', () => {
  const mockBot = {
    telegram: {
      sendVideo: (jest.fn() as any).mockResolvedValue({ message_id: 1 }),
      sendMessage: (jest.fn() as any).mockResolvedValue({ message_id: 1 })
    }
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should generate video from image with minimax model', async () => {
    const result = await generateImageToVideo(
      'https://example.com/image.jpg',
      'dancing person',
      'minimax',
      '123456',
      'testuser',
      true,
      mockBot
    )

    expect(result).toBeDefined()
  })

  it('should generate video from image with haiper-video-2 model', async () => {
    const result = await generateImageToVideo(
      'https://example.com/image.jpg',
      'walking in the park',
      'haiper-video-2',
      '123456',
      'testuser',
      false,
      mockBot
    )

    expect(result).toBeDefined()
  })

  it('should handle Russian prompts', async () => {
    const result = await generateImageToVideo(
      'https://example.com/image.jpg',
      'танцующий человек',
      'ray-v2',
      '123456',
      'testuser',
      true,
      mockBot
    )

    expect(result).toBeDefined()
  })

  it('should handle English prompts', async () => {
    const result = await generateImageToVideo(
      'https://example.com/image.jpg',
      'person dancing gracefully',
      'kling-v1.6-pro',
      '123456',
      'testuser',
      false,
      mockBot
    )

    expect(result).toBeDefined()
  })

  it('should handle multiple calls', async () => {
    const testCases = [1, 2, 3]
    
    for (const testCase of testCases) {
      await generateImageToVideo(
        'https://example.com/image.jpg',
        'test motion',
        'wan-image-to-video',
        '123456',
        'testuser',
        true,
        mockBot
      )
    }

    expect(mockBot.telegram.sendVideo).toHaveBeenCalled()
  })

  it('should handle long prompts', async () => {
    const longPrompt = 'A very detailed and long prompt describing complex motion that should be handled correctly by the video generation service. '.repeat(5)
    
    const result = await generateImageToVideo(
      'https://example.com/image.jpg',
      longPrompt,
      'haiper-video-2',
      '123456',
      'testuser',
      false,
      mockBot
    )

    expect(result).toBeDefined()
  })

  it('should handle different image URLs', async () => {
    const imageUrls = [
      'https://example.com/image1.jpg',
      'https://test.com/photo.png',
      'https://storage.googleapis.com/bucket/image.jpeg'
    ]
    
    for (const imageUrl of imageUrls) {
      await generateImageToVideo(
        imageUrl,
        'test motion',
        'minimax',
        '123456',
        'testuser',
        true,
        mockBot
      )
    }

    expect(mockBot.telegram.sendVideo).toHaveBeenCalled()
  })
})