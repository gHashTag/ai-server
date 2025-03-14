import { Router, RequestHandler } from 'express'
import { validateReplicateSignature } from '../middlewares/replicateWebhook.middleware'
import { ReplicateWebhookController } from '../controllers/replicateWebhook.controller'
import { inngest } from '@/core/inngest-client/clients'

export class ReplicateWebhookRoute {
  public router: Router = Router()
  private controller = new ReplicateWebhookController()

  constructor() {
    this.router.post(
      '/webhooks/replicate',
      // validateReplicateSignature, // 🔐 Проверка подписи
      this.inngestMiddleware, // Добавляем middleware для интеграции с Inngest
      this.controller.handleWebhook // 🚀 Основной обработчик
    )
  }

  // Новый middleware для преобразования вебхука в событие Inngest
  private inngestMiddleware: RequestHandler = async (req, res, next) => {
    try {
      await inngest.send({
        name: 'replicate/webhook',
        data: {
          payload: req.body,
          headers: req.headers,
        },
      })
      next() // Продолжаем цепочку обработки
    } catch (error) {
      console.error('🚨 Inngest Event Error:', error)
      res.status(500).json({ error: 'Event processing failed' })
    }
  }
}
