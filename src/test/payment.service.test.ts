import { PaymentService } from '@/services/payment.service'
import { incrementBalance } from '@/core/supabase'
import { sendPaymentNotification } from '@/price/helpers'
import { jest, describe, it, beforeEach, expect } from '@jest/globals'

jest.mock('@/price/helpers', () => ({
  sendPaymentNotification: jest.fn(),
}))

jest.mock('@/config', () => ({
  createBotByName: jest.fn().mockReturnValue({
    bot: { telegram: { sendMessage: jest.fn() } },
    groupId: '123',
  }),
}))

jest.mock('@/helpers/errorMessageAdmin', () => ({
  errorMessageAdmin: jest.fn(),
}))

jest.mock('@/helpers', () => ({
  errorMessage: jest.fn(),
}))

jest.mock('@/core/supabase', () => ({
  incrementBalance: jest.fn(),
  getTelegramIdFromInvId: jest.fn().mockResolvedValue({
    telegram_id: '123456',
    username: 'testuser',
    language: 'en',
    bot_name: 'test_bot',
  }),
  setPayments: jest.fn(),
  updateUserSubscription: jest.fn(),
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: (jest.fn() as any).mockResolvedValue({
      data: {
        telegram_id: '123456',
        username: 'testuser',
        balance: 1000,
        language: 'en',
      },
    }),
  },
}))

describe('PaymentService', () => {
  let paymentService: PaymentService

  beforeEach(() => {
    paymentService = new PaymentService()
    jest.clearAllMocks() // Очистка всех моков перед каждым тестом
  })

  it('should process payment and increment balance for 1000', async () => {
    const OutSum = 1000
    const inv_id = 'test@example.com'

    await paymentService.processPayment(OutSum, inv_id)

    expect(incrementBalance).toHaveBeenCalledWith({
      telegram_id: '123456',
      amount: 434,
    })

    expect(sendPaymentNotification).toHaveBeenCalledWith({
      amount: '1000',
      stars: 434,
      telegramId: '123456',
      language: 'en',
      username: 'testuser',
      groupId: '123',
      bot: { telegram: { sendMessage: expect.any(Function) } },
    })
  })

  it('should process payment and increment balance for 5000', async () => {
    const OutSum = 5000
    const inv_id = 'test@example.com'

    await paymentService.processPayment(OutSum, inv_id)

    expect(incrementBalance).toHaveBeenCalledWith({
      telegram_id: '123456',
      amount: 2173,
    })

    expect(sendPaymentNotification).toHaveBeenCalledWith({
      amount: '5000',
      stars: 2173,
      telegramId: '123456',
      language: 'en',
      username: 'testuser',
      groupId: '123',
      bot: { telegram: { sendMessage: expect.any(Function) } },
    })
  })

  it('should process payment and increment balance for 10000', async () => {
    const OutSum = 10000
    const inv_id = 'test@example.com'

    await paymentService.processPayment(OutSum, inv_id)

    expect(incrementBalance).toHaveBeenCalledWith({
      telegram_id: '123456',
      amount: 4347,
    })

    expect(sendPaymentNotification).toHaveBeenCalledWith({
      amount: '10000',
      stars: 4347,
      telegramId: '123456',
      language: 'en',
      username: 'testuser',
      groupId: '123',
      bot: { telegram: { sendMessage: expect.any(Function) } },
    })
  })

  it('should process payment and increment balance for 10', async () => {
    const OutSum = 10
    const inv_id = 'test@example.com'

    await paymentService.processPayment(OutSum, inv_id)

    expect(incrementBalance).toHaveBeenCalledWith({
      telegram_id: '123456',
      amount: 6,
    })

    expect(sendPaymentNotification).toHaveBeenCalledWith({
      amount: '10',
      stars: 6,
      telegramId: '123456',
      language: 'en',
      username: 'testuser',
      groupId: '123',
      bot: { telegram: { sendMessage: expect.any(Function) } },
    })
  })

  it('should not process payment if OutSum is not valid', async () => {
    const OutSum = 3000 // Некорректное значение
    const inv_id = 'test@example.com'

    await paymentService.processPayment(OutSum, inv_id)

    expect(incrementBalance).not.toHaveBeenCalled()
    expect(sendPaymentNotification).not.toHaveBeenCalled()
  })
})
