import { jest, describe, it, beforeEach, expect } from '@jest/globals'

// Mock the config module before importing
jest.mock('@/config', () => ({
  defaultBot: {
    telegram: {
      sendMessage: (jest.fn() as any).mockResolvedValue({ message_id: 1 })
    }
  }
}))

import { errorMessage } from '@/helpers/errorMessage'

describe('errorMessage helper - Detailed Tests', () => {
  let mockSendMessage: any

  beforeEach(() => {
    const { defaultBot } = require('@/config')
    mockSendMessage = defaultBot.telegram.sendMessage
    jest.clearAllMocks()
  })

  describe('Russian messages', () => {
    it('should send Russian error message when isRu is true', async () => {
      const error = new Error('Test error message')
      const telegramId = '123456789'
      
      errorMessage(error, telegramId, true)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '123456789',
        '❌ Произошла ошибка.\n\nОшибка: Test error message'
      )
      expect(mockSendMessage).toHaveBeenCalledTimes(1)
    })

    it('should handle complex error messages in Russian', async () => {
      const error = new Error('Network timeout: Connection failed after 30 seconds')
      const telegramId = '987654321'
      
      errorMessage(error, telegramId, true)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '987654321',
        '❌ Произошла ошибка.\n\nОшибка: Network timeout: Connection failed after 30 seconds'
      )
    })
  })

  describe('English messages', () => {
    it('should send English error message when isRu is false', async () => {
      const error = new Error('Database connection failed')
      const telegramId = '555666777'
      
      errorMessage(error, telegramId, false)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '555666777',
        '❌ An error occurred.\n\nError: Database connection failed'
      )
      expect(mockSendMessage).toHaveBeenCalledTimes(1)
    })

    it('should handle empty error message in English', async () => {
      const error = new Error('')
      const telegramId = '111222333'
      
      errorMessage(error, telegramId, false)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '111222333',
        '❌ An error occurred.\n\nError: '
      )
    })
  })

  describe('Different error types', () => {
    it('should handle TypeError', async () => {
      const error = new TypeError('Cannot read property of undefined')
      const telegramId = '444555666'
      
      errorMessage(error, telegramId, true)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '444555666',
        '❌ Произошла ошибка.\n\nОшибка: Cannot read property of undefined'
      )
    })

    it('should handle ReferenceError', async () => {
      const error = new ReferenceError('Variable is not defined')
      const telegramId = '777888999'
      
      errorMessage(error, telegramId, false)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '777888999',
        '❌ An error occurred.\n\nError: Variable is not defined'
      )
    })

    it('should handle custom Error with additional properties', async () => {
      const error = new Error('Custom API error') as any
      error.statusCode = 404
      error.details = { endpoint: '/api/users' }
      
      const telegramId = '123123123'
      
      errorMessage(error, telegramId, true)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '123123123',
        '❌ Произошла ошибка.\n\nОшибка: Custom API error'
      )
    })
  })

  describe('Telegram ID variations', () => {
    it('should handle numeric telegram_id as string', async () => {
      const error = new Error('Test')
      const telegramId = '123456789'
      
      errorMessage(error, telegramId, true)

      expect(mockSendMessage).toHaveBeenCalledWith('123456789', expect.any(String))
    })

    it('should handle negative telegram_id', async () => {
      const error = new Error('Group chat error')
      const telegramId = '-987654321' // Group chat ID
      
      errorMessage(error, telegramId, false)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '-987654321',
        '❌ An error occurred.\n\nError: Group chat error'
      )
    })
  })

  describe('Special characters in messages', () => {
    it('should handle messages with special Telegram markdown characters', async () => {
      const error = new Error('Error with *bold* and _italic_ and `code`')
      const telegramId = '555111222'
      
      errorMessage(error, telegramId, false)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '555111222',
        '❌ An error occurred.\n\nError: Error with *bold* and _italic_ and `code`'
      )
    })

    it('should handle messages with newlines', async () => {
      const error = new Error('Line 1\nLine 2\nLine 3')
      const telegramId = '333444555'
      
      errorMessage(error, telegramId, true)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '333444555',
        '❌ Произошла ошибка.\n\nОшибка: Line 1\nLine 2\nLine 3'
      )
    })

    it('should handle messages with emoji', async () => {
      const error = new Error('Failed to process 🚀 deployment')
      const telegramId = '666777888'
      
      errorMessage(error, telegramId, false)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '666777888',
        '❌ An error occurred.\n\nError: Failed to process 🚀 deployment'
      )
    })
  })

  describe('Edge cases', () => {
    it('should handle very long error messages', async () => {
      const longMessage = 'A'.repeat(4000) // Very long error message
      const error = new Error(longMessage)
      const telegramId = '999000111'
      
      errorMessage(error, telegramId, true)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '999000111',
        `❌ Произошла ошибка.\n\nОшибка: ${longMessage}`
      )
    })

    it('should handle error with null message', async () => {
      const error = new Error()
      error.message = null as any
      const telegramId = '222333444'
      
      errorMessage(error, telegramId, false)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '222333444',
        '❌ An error occurred.\n\nError: null'
      )
    })
  })

  describe('Bot integration', () => {
    it('should call defaultBot.telegram.sendMessage exactly once', async () => {
      const error = new Error('Single call test')
      const telegramId = '111111111'
      
      errorMessage(error, telegramId, true)

      expect(mockSendMessage).toHaveBeenCalledTimes(1)
    })

    it('should work with consecutive calls', async () => {
      const error1 = new Error('First error')
      const error2 = new Error('Second error')
      const telegramId = '222222222'
      
      errorMessage(error1, telegramId, true)
      errorMessage(error2, telegramId, false)

      expect(mockSendMessage).toHaveBeenCalledTimes(2)
      expect(mockSendMessage).toHaveBeenNthCalledWith(
        1,
        '222222222',
        '❌ Произошла ошибка.\n\nОшибка: First error'
      )
      expect(mockSendMessage).toHaveBeenNthCalledWith(
        2,
        '222222222',
        '❌ An error occurred.\n\nError: Second error'
      )
    })
  })
})