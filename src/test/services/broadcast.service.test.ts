import { jest, describe, it, beforeEach, expect } from '@jest/globals'
import { broadcastService } from '@/services/broadcast.service'

// Mock dependencies
jest.mock('@/core/supabase')
jest.mock('@/core/bot')

// Import mocked supabase
import { supabase } from '@/core/supabase'
import { getBotByName } from '@/core/bot'

describe('broadcastService', () => {
  const mockBot = {
    telegram: {
      sendPhoto: (jest.fn() as any).mockResolvedValue({ message_id: 1 })
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock supabase response
    ;(supabase.from as any).mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue({
        data: [
          { telegram_id: 123456, bot_name: 'test_bot' },
          { telegram_id: 789012, bot_name: 'another_bot' }
        ],
        error: null
      })
    })

    // Mock getBotByName
    ;(getBotByName as any).mockReturnValue({ bot: mockBot })
  })

  it('should send image and text to all users', async () => {
    const imageUrl = 'https://example.com/image.jpg'
    const text = 'Test broadcast message'

    await broadcastService.sendToAllUsers(imageUrl, text)

    expect(supabase.from).toHaveBeenCalledWith('users')
    expect(mockBot.telegram.sendPhoto).toHaveBeenCalledTimes(2)
    expect(mockBot.telegram.sendPhoto).toHaveBeenCalledWith(
      '123456',
      imageUrl,
      { caption: text, parse_mode: "Markdown" }
    )
    expect(mockBot.telegram.sendPhoto).toHaveBeenCalledWith(
      '789012',
      imageUrl,
      { caption: text, parse_mode: "Markdown" }
    )
  })

  it('should handle users without telegram_id', async () => {
    // Mock supabase response with some users having null telegram_id
    ;(supabase.from as any).mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue({
        data: [
          { telegram_id: 123456, bot_name: 'test_bot' },
          { telegram_id: null, bot_name: 'invalid_bot' },
          { telegram_id: 789012, bot_name: 'another_bot' }
        ],
        error: null
      })
    })

    const imageUrl = 'https://example.com/image.jpg'
    const text = 'Test broadcast message'

    await broadcastService.sendToAllUsers(imageUrl, text)

    // Should only send to users with valid telegram_id
    expect(mockBot.telegram.sendPhoto).toHaveBeenCalledTimes(2)
  })

  it('should handle users without bot_name', async () => {
    // Mock supabase response with some users having null bot_name
    ;(supabase.from as any).mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue({
        data: [
          { telegram_id: 123456, bot_name: 'test_bot' },
          { telegram_id: 555555, bot_name: null },
          { telegram_id: 789012, bot_name: 'another_bot' }
        ],
        error: null
      })
    })

    const imageUrl = 'https://example.com/image.jpg'
    const text = 'Test broadcast message'

    await broadcastService.sendToAllUsers(imageUrl, text)

    // Should only send to users with valid bot_name
    expect(mockBot.telegram.sendPhoto).toHaveBeenCalledTimes(2)
  })

  it('should throw error when supabase query fails', async () => {
    // Mock supabase error
    ;(supabase.from as any).mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })
    })

    const imageUrl = 'https://example.com/image.jpg'
    const text = 'Test broadcast message'

    await expect(broadcastService.sendToAllUsers(imageUrl, text))
      .rejects.toThrow('Error fetching users: Database connection failed')
  })

  it('should handle empty user list', async () => {
    // Mock supabase response with empty user list
    ;(supabase.from as any).mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue({
        data: [],
        error: null
      })
    })

    const imageUrl = 'https://example.com/image.jpg'
    const text = 'Test broadcast message'

    await broadcastService.sendToAllUsers(imageUrl, text)

    expect(mockBot.telegram.sendPhoto).not.toHaveBeenCalled()
  })
})