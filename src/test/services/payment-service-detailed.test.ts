import { jest, describe, it, beforeEach, expect } from '@jest/globals'

// Mock all dependencies first
jest.mock('@/core/supabase')
jest.mock('@/price/helpers') 
jest.mock('@/config')
jest.mock('@/helpers/errorMessageAdmin')
jest.mock('@/helpers')

// Import after mocking
import { PaymentService } from '@/services/payment.service'

describe('PaymentService - Detailed Tests', () => {
  let paymentService: PaymentService
  let mockIncrementBalance: any
  let mockSendPaymentNotification: any
  let mockSetPayments: any
  let mockGetTelegramIdFromInvId: any
  let mockCreateBotByName: any
  let mockUpdateUserSubscription: any
  let mockErrorMessage: any
  let mockErrorMessageAdmin: any

  beforeEach(() => {
    // Get references to mocked functions
    const { incrementBalance, setPayments, getTelegramIdFromInvId, updateUserSubscription } = require('@/core/supabase')
    const { sendPaymentNotification } = require('@/price/helpers')
    const { createBotByName } = require('@/config')
    const { errorMessageAdmin } = require('@/helpers/errorMessageAdmin')
    const { errorMessage } = require('@/helpers')

    mockIncrementBalance = incrementBalance
    mockSendPaymentNotification = sendPaymentNotification
    mockSetPayments = setPayments
    mockGetTelegramIdFromInvId = getTelegramIdFromInvId
    mockCreateBotByName = createBotByName
    mockUpdateUserSubscription = updateUserSubscription
    mockErrorMessage = errorMessage
    mockErrorMessageAdmin = errorMessageAdmin

    // Set up default mocks
    mockGetTelegramIdFromInvId.mockResolvedValue({
      telegram_id: 123456,
      username: 'testuser', 
      language: 'en',
      bot_name: 'test_bot'
    })

    mockCreateBotByName.mockReturnValue({
      bot: { telegram: { sendMessage: jest.fn() } },
      groupId: 'test-group'
    })

    mockIncrementBalance.mockResolvedValue(true)
    mockSendPaymentNotification.mockResolvedValue(true)
    mockSetPayments.mockResolvedValue(true)
    mockUpdateUserSubscription.mockResolvedValue(true)

    paymentService = new PaymentService()
    jest.clearAllMocks()
  })

  describe('Payment Options Processing', () => {
    it('should process standard payment option of 500 rubles', async () => {
      await paymentService.processPayment(500, 'test-inv-id')

      expect(mockIncrementBalance).toHaveBeenCalledWith({
        telegram_id: '123456',
        amount: 217
      })
      
      expect(mockSendPaymentNotification).toHaveBeenCalledWith({
        amount: '500',
        stars: 217,
        telegramId: '123456',
        language: 'en',
        username: 'testuser',
        groupId: 'test-group',
        bot: expect.any(Object)
      })
    })

    it('should process standard payment option of 1000 rubles', async () => {
      await paymentService.processPayment(1000, 'test-inv-id')

      expect(mockIncrementBalance).toHaveBeenCalledWith({
        telegram_id: '123456',
        amount: 434
      })
    })

    it('should process standard payment option of 10000 rubles', async () => {
      await paymentService.processPayment(10000, 'test-inv-id')

      expect(mockIncrementBalance).toHaveBeenCalledWith({
        telegram_id: '123456',
        amount: 4347
      })
    })
  })

  describe('Subscription Plans Processing', () => {
    it('should process NeuroPhoto subscription (1110 rubles)', async () => {
      await paymentService.processPayment(1110, 'test-inv-id')

      expect(mockIncrementBalance).toHaveBeenCalledWith({
        telegram_id: '123456',
        amount: 476
      })
      
      expect(mockUpdateUserSubscription).toHaveBeenCalledWith(123456, 'neurophoto')
    })

    it('should process NeuroBase subscription (2999 rubles)', async () => {
      await paymentService.processPayment(2999, 'test-inv-id')

      expect(mockIncrementBalance).toHaveBeenCalledWith({
        telegram_id: '123456',
        amount: 1303
      })
      
      expect(mockUpdateUserSubscription).toHaveBeenCalledWith(123456, 'neurobase')
    })

    it('should process NeuroBlogger subscription (75000 rubles)', async () => {
      await paymentService.processPayment(75000, 'test-inv-id')

      expect(mockIncrementBalance).toHaveBeenCalledWith({
        telegram_id: '123456',
        amount: 32608
      })
      
      expect(mockUpdateUserSubscription).toHaveBeenCalledWith(123456, 'neuroblogger')
    })
  })

  describe('Edge Cases', () => {
    it('should handle unknown payment amount', async () => {
      await paymentService.processPayment(999999, 'test-inv-id')

      // Should not call any payment processing functions for unknown amounts
      expect(mockIncrementBalance).not.toHaveBeenCalled()
      expect(mockSendPaymentNotification).not.toHaveBeenCalled()
      expect(mockSetPayments).not.toHaveBeenCalled()
      expect(mockUpdateUserSubscription).not.toHaveBeenCalled()
    })

    it('should handle zero payment amount', async () => {
      await paymentService.processPayment(0, 'test-inv-id')

      expect(mockIncrementBalance).not.toHaveBeenCalled()
    })

    it('should handle negative payment amount', async () => {
      await paymentService.processPayment(-100, 'test-inv-id')

      expect(mockIncrementBalance).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle getTelegramIdFromInvId error during processing', async () => {
      const error = new Error('Invalid inv_id')
      mockGetTelegramIdFromInvId.mockRejectedValueOnce(error)

      await expect(paymentService.processPayment(500, 'invalid-inv-id')).rejects.toThrow('Invalid inv_id')

      expect(mockErrorMessageAdmin).toHaveBeenCalledWith(error)
    })

    it('should handle incrementBalance error', async () => {
      const error = new Error('Database connection failed')
      mockIncrementBalance.mockRejectedValueOnce(error)

      await expect(paymentService.processPayment(500, 'test-inv-id')).rejects.toThrow('Database connection failed')

      expect(mockErrorMessage).toHaveBeenCalled()
      expect(mockErrorMessageAdmin).toHaveBeenCalledWith(error)
    })

    it('should handle sendPaymentNotification error', async () => {
      const error = new Error('Notification service failed')
      mockSendPaymentNotification.mockRejectedValueOnce(error)

      await expect(paymentService.processPayment(500, 'test-inv-id')).rejects.toThrow('Notification service failed')
    })

    it('should handle error in catch block with valid inv_id', async () => {
      const error = new Error('Service error')
      mockIncrementBalance.mockRejectedValueOnce(error)

      // Mock getTelegramIdFromInvId for error handling
      mockGetTelegramIdFromInvId.mockResolvedValueOnce({
        telegram_id: 123456,
        language: 'ru'
      })

      await expect(paymentService.processPayment(500, 'test-inv-id')).rejects.toThrow('Service error')

      expect(mockErrorMessage).toHaveBeenCalledWith(error, 123456, false)
      expect(mockErrorMessageAdmin).toHaveBeenCalledWith(error)
    })
  })

  describe('Payment Recording', () => {
    it('should record payment details correctly', async () => {
      await paymentService.processPayment(2000, 'test-inv-id')

      expect(mockSetPayments).toHaveBeenCalledWith({
        inv_id: 'test-inv-id',
        telegram_id: 123456,
        roundedIncSum: 2000,
        stars: 869,
        currency: 'RUB',
        payment_method: 'Robokassa',
        bot_name: 'test_bot'
      })
    })
  })

  describe('Different Languages', () => {
    it('should handle Russian language user', async () => {
      mockGetTelegramIdFromInvId.mockResolvedValue({
        telegram_id: 123456,
        username: 'testuser',
        language: 'ru',
        bot_name: 'test_bot'
      })

      await paymentService.processPayment(500, 'test-inv-id')

      expect(mockSendPaymentNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'ru'
        })
      )
    })
  })

  describe('Bot Integration', () => {
    it('should use correct bot based on bot_name', async () => {
      mockGetTelegramIdFromInvId.mockResolvedValue({
        telegram_id: 123456,
        username: 'testuser',
        language: 'en',
        bot_name: 'special_bot'
      })

      await paymentService.processPayment(500, 'test-inv-id')

      expect(mockCreateBotByName).toHaveBeenCalledWith('special_bot')
    })
  })
})