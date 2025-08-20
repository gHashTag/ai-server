import { PaymentService } from '@/services/payment.service'
import { incrementBalance } from '@/core/supabase'
import { sendPaymentNotification } from '@/price/helpers'
import { jest, describe, it, beforeEach, expect } from '@jest/globals'

jest.mock('@/price/helpers', () => ({
  sendPaymentNotification: jest.fn(),
}))

jest.mock('@/core/supabase', () => ({
  incrementBalance: jest.fn(),
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

  it('should process payment and increment balance for 1999', async () => {
    const OutSum = 1999
    const Email = 'test@example.com'

    await paymentService.processPayment(OutSum, Email)

    expect(incrementBalance).toHaveBeenCalledWith({
      telegram_id: '123456',
      amount: 1249,
    })

    expect(sendPaymentNotification).toHaveBeenCalledWith(
      1999,
      1249,
      '123456',
      'en',
      'testuser'
    )
  })

  it('should process payment and increment balance for 5000', async () => {
    const OutSum = 5000
    const Email = 'test@example.com'

    await paymentService.processPayment(OutSum, Email)

    expect(incrementBalance).toHaveBeenCalledWith({
      telegram_id: '123456',
      amount: 3040,
    })

    expect(sendPaymentNotification).toHaveBeenCalledWith(
      5000,
      3040,
      '123456',
      'en',
      'testuser'
    )
  })

  it('should process payment and increment balance for 10000', async () => {
    const OutSum = 10000
    const Email = 'test@example.com'

    await paymentService.processPayment(OutSum, Email)

    expect(incrementBalance).toHaveBeenCalledWith({
      telegram_id: '123456',
      amount: 6080,
    })

    expect(sendPaymentNotification).toHaveBeenCalledWith(
      10000,
      6080,
      '123456',
      'en',
      'testuser'
    )
  })

  it('should process payment and increment balance for 10', async () => {
    const OutSum = 10
    const Email = 'test@example.com'

    await paymentService.processPayment(OutSum, Email)

    expect(incrementBalance).toHaveBeenCalledWith({
      telegram_id: '123456',
      amount: 6,
    })

    expect(sendPaymentNotification).toHaveBeenCalledWith(
      10,
      6,
      '123456',
      'en',
      'testuser'
    )
  })

  it('should not process payment if OutSum is not valid', async () => {
    const OutSum = 3000 // Некорректное значение
    const Email = 'test@example.com'

    await paymentService.processPayment(OutSum, Email)

    expect(incrementBalance).not.toHaveBeenCalled()
    expect(sendPaymentNotification).not.toHaveBeenCalled()
  })
})
