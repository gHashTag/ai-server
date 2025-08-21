import { jest, describe, it, beforeEach, expect } from '@jest/globals'

// Create a mockable config object
const mockConfig = {
  isDev: false,
  defaultBot: {
    telegram: {
      sendMessage: (jest.fn() as any).mockResolvedValue({ message_id: 1 })
    }
  }
}

// Mock the config module before importing
jest.mock('@/config', () => mockConfig)

import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'

describe('errorMessageAdmin helper - Detailed Tests', () => {
  let mockSendMessage: any

  beforeEach(() => {
    mockSendMessage = mockConfig.defaultBot.telegram.sendMessage
    jest.clearAllMocks()
  })

  describe('Production environment (isDev = false)', () => {
    beforeEach(() => {
      mockConfig.isDev = false
    })

    it('should send admin notification in production', async () => {
      const error = new Error('Database connection failed')
      
      errorMessageAdmin(error)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: Database connection failed'
      )
      expect(mockSendMessage).toHaveBeenCalledTimes(1)
    })

    it('should handle complex error messages', async () => {
      const error = new Error('Failed to process payment: Stripe webhook validation failed')
      
      errorMessageAdmin(error)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: Failed to process payment: Stripe webhook validation failed'
      )
    })

    it('should handle empty error messages', async () => {
      const error = new Error('')
      
      errorMessageAdmin(error)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: '
      )
    })

    it('should handle different error types', async () => {
      const typeError = new TypeError('Cannot read property of null')
      const referenceError = new ReferenceError('Variable not defined')
      const syntaxError = new SyntaxError('Unexpected token')
      
      errorMessageAdmin(typeError)
      errorMessageAdmin(referenceError)
      errorMessageAdmin(syntaxError)

      expect(mockSendMessage).toHaveBeenCalledTimes(3)
      
      expect(mockSendMessage).toHaveBeenNthCalledWith(
        1,
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: Cannot read property of null'
      )
      
      expect(mockSendMessage).toHaveBeenNthCalledWith(
        2,
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: Variable not defined'
      )
      
      expect(mockSendMessage).toHaveBeenNthCalledWith(
        3,
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: Unexpected token'
      )
    })

    it('should handle errors with stack traces', async () => {
      const error = new Error('Runtime error')
      error.stack = 'Error: Runtime error\n    at Object.<anonymous> (/app/src/index.js:10:5)'
      
      errorMessageAdmin(error)

      // Only message is sent, not the stack trace
      expect(mockSendMessage).toHaveBeenCalledWith(
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: Runtime error'
      )
    })

    it('should handle custom errors with additional properties', async () => {
      const error = new Error('API request failed') as any
      error.statusCode = 500
      error.endpoint = '/api/users'
      error.method = 'POST'
      
      errorMessageAdmin(error)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: API request failed'
      )
    })
  })

  describe('Development environment (isDev = true)', () => {
    beforeEach(() => {
      mockConfig.isDev = true
    })

    it('should NOT send admin notification in development', async () => {
      const error = new Error('Development test error')
      
      errorMessageAdmin(error)

      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should not send notifications for any error in development', async () => {
      const error1 = new Error('Error 1')
      const error2 = new TypeError('Error 2')
      const error3 = new ReferenceError('Error 3')
      
      errorMessageAdmin(error1)
      errorMessageAdmin(error2)
      errorMessageAdmin(error3)

      expect(mockSendMessage).not.toHaveBeenCalled()
    })
  })

  describe('Special message formatting', () => {
    beforeEach(() => {
      mockConfig.isDev = false
    })

    it('should handle messages with newlines', async () => {
      const error = new Error('Multi-line\nerror\nmessage')
      
      errorMessageAdmin(error)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: Multi-line\nerror\nmessage'
      )
    })

    it('should handle messages with special characters', async () => {
      const error = new Error('Error with @mentions and #hashtags and *markdown*')
      
      errorMessageAdmin(error)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: Error with @mentions and #hashtags and *markdown*'
      )
    })

    it('should handle messages with emoji', async () => {
      const error = new Error('Failed to deploy 🚀 application')
      
      errorMessageAdmin(error)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: Failed to deploy 🚀 application'
      )
    })

    it('should handle very long error messages', async () => {
      const longMessage = 'Very long error message: ' + 'A'.repeat(3000)
      const error = new Error(longMessage)
      
      errorMessageAdmin(error)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '@neuro_coder_privat',
        `❌ Произошла ошибка.\n\nОшибка: ${longMessage}`
      )
    })
  })

  describe('Edge cases', () => {
    beforeEach(() => {
      mockConfig.isDev = false
    })

    it('should handle null error message', async () => {
      const error = new Error()
      error.message = null as any
      
      errorMessageAdmin(error)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: null'
      )
    })

    it('should handle undefined error message', async () => {
      const error = new Error()
      error.message = undefined as any
      
      errorMessageAdmin(error)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: undefined'
      )
    })

    it('should handle error with only whitespace message', async () => {
      const error = new Error('   \n\t   ')
      
      errorMessageAdmin(error)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка:    \n\t   '
      )
    })
  })

  describe('Multiple calls', () => {
    beforeEach(() => {
      mockConfig.isDev = false
    })

    it('should handle multiple consecutive error notifications', async () => {
      const error1 = new Error('First error')
      const error2 = new Error('Second error')
      const error3 = new Error('Third error')
      
      errorMessageAdmin(error1)
      errorMessageAdmin(error2)
      errorMessageAdmin(error3)

      expect(mockSendMessage).toHaveBeenCalledTimes(3)
      expect(mockSendMessage).toHaveBeenNthCalledWith(
        1,
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: First error'
      )
      expect(mockSendMessage).toHaveBeenNthCalledWith(
        2,
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: Second error'
      )
      expect(mockSendMessage).toHaveBeenNthCalledWith(
        3,
        '@neuro_coder_privat',
        '❌ Произошла ошибка.\n\nОшибка: Third error'
      )
    })
  })

  describe('Admin channel targeting', () => {
    beforeEach(() => {
      mockConfig.isDev = false
    })

    it('should always send to @neuro_coder_privat channel', async () => {
      const error = new Error('Channel targeting test')
      
      errorMessageAdmin(error)

      expect(mockSendMessage).toHaveBeenCalledWith(
        '@neuro_coder_privat',
        expect.any(String)
      )
    })

    it('should use correct channel format with @ symbol', async () => {
      const error = new Error('Format test')
      
      errorMessageAdmin(error)

      const firstArg = mockSendMessage.mock.calls[0][0]
      expect(firstArg).toBe('@neuro_coder_privat')
    })
  })
})