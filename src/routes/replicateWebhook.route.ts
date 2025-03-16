import { Router } from 'express'

import { ReplicateWebhookController } from '../controllers/replicateWebhook.controller'

import { logger } from '@utils/logger'

export class ReplicateWebhookRoute {
  public router: Router = Router()
  private controller = new ReplicateWebhookController()

  constructor() {
    this.router.post(
      '/webhooks/replicate',
      (req, res, next) => {
        logger.info('🔔 Входящий вебхук')
        next()
      },
      async (req, res, next) => {
        try {
          logger.debug('🌀 Запуск контроллера', {
            bodyStatus: req.body.status,
            predictionId: req.body.id,
          })

          await this.controller.handleWebhook(req as any, res as any)

          if (!res.headersSent) {
            logger.warn('⚠️ Контроллер не отправил ответ')
            res.status(200).end()
          }
        } catch (error) {
          logger.error('⚡ Поймана ошибка в обработчике:', error)
          next(error)
        }
      }
    )
  }
}
