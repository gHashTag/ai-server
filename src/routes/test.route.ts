import { Router } from 'express'
import { inngest } from '@/core/inngest/clients'

class TestRoute {
  public router = Router()

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post('/test-payment', async (req, res) => {
      try {
        await inngest.send({
          name: 'payment/process-ai-server',
          data: {
            IncSum: '500',
            inv_id: 'test123',
            telegram_id: '123456',
            bot_name: 'neuro_blogger_bot',
            language_code: 'ru'
          }
        })
        res.json({ message: 'Тестовый платеж отправлен' })
      } catch (error) {
        console.error('Ошибка при отправке тестового платежа:', error)
        res.status(500).json({ error: error.message })
      }
    })
  }
}

export default TestRoute 