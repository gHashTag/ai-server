import { inngest } from '../clients'
import { PaymentService } from '@/services/payment.service'
import { logger } from '@/utils/logger'

export const processPaymentInngest = inngest.createFunction(
  { 
    id: 'process-payment',
    name: 'Process Payment via Inngest',
    retries: 3
  },
  { event: 'payment/process.start' },
  async ({ event, step }) => {
    const { 
      invId, 
      telegramId, 
      botName, 
      amount, 
      isRu 
    } = event.data

    logger.info({
      message: 'Inngest: Начинаем обработку платежа',
      telegramId,
      invId,
      amount,
      botName
    })

    return await step.run('process-payment', async () => {
      try {
        const paymentService = new PaymentService()
        
        // PaymentService.processPayment принимает только roundedIncSum и inv_id
        const result = await paymentService.processPayment(
          amount, // roundedIncSum
          invId   // inv_id
        )

        logger.info({
          message: 'Inngest: Платеж успешно обработан',
          telegramId,
          invId,
          result
        })

        return result
      } catch (error) {
        logger.error({
          message: 'Inngest: Ошибка обработки платежа',
          telegramId,
          invId,
          error: error.message,
          stack: error.stack
        })
        
        throw error
      }
    })
  }
)