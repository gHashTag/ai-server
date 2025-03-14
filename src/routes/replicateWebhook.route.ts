import { Router, RequestHandler } from 'express'
import { validateReplicateSignature } from '../middlewares/replicateWebhook.middleware'
import { ReplicateWebhookController } from '../controllers/replicateWebhook.controller'

import { logger } from '@utils/logger'

export class ReplicateWebhookRoute {
  public router: Router = Router()
  private controller = new ReplicateWebhookController()

  constructor() {
    this.router.post(
      '/webhooks/replicate',
      (req, res, next) => {
        logger.info('🔔 Входящий вебхук', {
          headers: req.headers,
          body: req.body,
        })
        next()
      },
      validateReplicateSignature,
      async (req, res, next) => {
        try {
          await this.controller.handleWebhook(req as any, res as any)
          logger.info('✅ Вебхук успешно обработан')
        } catch (error) {
          logger.error('❌ Ошибка обработки вебхука:', error)
          next(error)
        }
      }
    )
  }
}
