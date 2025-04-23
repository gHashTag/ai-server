import { InngestTestEngine } from '@inngest/test'
import { processPayment } from './paymentProcessing'

describe('processPayment function', () => {
  const t = new InngestTestEngine({
    function: processPayment,
  })

  test('processes payment correctly', async () => {
    const { result } = await t.execute({
      events: [{
        name: 'payment/process-ai-server',
        data: {
          IncSum: '500',
          inv_id: 'test123',
          telegram_id: '123456',
          bot_name: 'neuro_blogger_bot',
          language_code: 'ru'
        }
      }],
      steps: [
        {
          id: 'check-subscription-plan',
          handler() {
            return { stars: 0, subscription: '' }
          }
        },
        {
          id: 'check-payment-option',
          handler() {
            return { stars: 217 }
          }
        },
        {
          id: 'get-user-info',
          handler() {
            return {
              telegram_id: '123456',
              username: 'testuser',
              language_code: 'ru',
              bot_name: 'neuro_blogger_bot'
            }
          }
        },
        {
          id: 'get-bot-config',
          handler() {
            return {
              groupId: '@neuro_blogger_group'
            }
          }
        },
        {
          id: 'update-user-balance',
          handler() {
            return { success: true }
          }
        },
        {
          id: 'send-notification',
          handler() {
            return { success: true }
          }
        }
      ]
    })

    expect(result).toBeDefined()
  })
}) 