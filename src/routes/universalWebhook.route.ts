import { Router } from 'express';
import { UniversalWebhookController } from '@/controllers/universalWebhook.controller';
import { Routes } from '@/interfaces/routes.interface';
import { logger } from '@/utils/logger';

export class UniversalWebhookRoute implements Routes {
  public path = '/webhook';
  public router: Router;
  public controller = new UniversalWebhookController();

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Единый endpoint для всех провайдеров
    this.router.post(
      `${this.path}/universal`,
      (req, res, next) => {
        logger.info('🔔 Universal webhook endpoint hit', {
          method: req.method,
          url: req.url,
          headers: req.headers,
          ip: req.ip
        });
        next();
      },
      this.controller.handleWebhook.bind(this.controller)
    );
    
    // Специфичные endpoints для обратной совместимости
    this.router.post(
      `${this.path}/kie-ai`,
      (req, res, next) => {
        // Добавляем заголовок для идентификации
        req.headers['x-kie-signature'] = 'true';
        next();
      },
      this.controller.handleWebhook.bind(this.controller)
    );
    
    this.router.post(
      `${this.path}/replicate`,
      (req, res, next) => {
        req.headers['x-replicate-signature'] = 'true';
        next();
      },
      this.controller.handleWebhook.bind(this.controller)
    );
    
    this.router.post(
      `${this.path}/bfl`,
      (req, res, next) => {
        req.headers['x-bfl-signature'] = 'true';
        next();
      },
      this.controller.handleWebhook.bind(this.controller)
    );
    
    this.router.post(
      `${this.path}/synclabs`,
      (req, res, next) => {
        req.headers['x-synclabs-signature'] = 'true';
        next();
      },
      this.controller.handleWebhook.bind(this.controller)
    );
    
    // Для тестирования webhook'ов
    this.router.get(
      `${this.path}/test`,
      (req, res) => {
        res.status(200).json({
          message: 'Webhook endpoints are working',
          endpoints: [
            `${this.path}/universal - Universal webhook for all providers`,
            `${this.path}/kie-ai - Kie.ai specific webhook`,
            `${this.path}/replicate - Replicate specific webhook`,
            `${this.path}/bfl - BFL specific webhook`,
            `${this.path}/synclabs - SyncLabs specific webhook`
          ]
        });
      }
    );
  }
}
