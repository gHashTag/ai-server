import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '@utils/logger';

/**
 * GitHub Webhook Security Middleware
 * Валидирует подписи GitHub webhook'ов для безопасности
 */
export class GitHubWebhookMiddleware {
  private readonly webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'default-webhook-secret';
    
    if (this.webhookSecret === 'default-webhook-secret') {
      logger.warn('⚠️ GITHUB_WEBHOOK_SECRET не установлен - используется значение по умолчанию');
    }
  }

  /**
   * Middleware для валидации GitHub webhook подписи
   */
  public validateSignature = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const githubEvent = req.headers['x-github-event'] as string;
      const delivery = req.headers['x-github-delivery'] as string;

      // Логируем входящий webhook
      logger.info('📨 GitHub webhook received', {
        event: githubEvent,
        delivery: delivery,
        user_agent: req.headers['user-agent'],
        content_type: req.headers['content-type']
      });

      // Проверяем наличие подписи
      if (!signature) {
        logger.error('❌ Missing GitHub webhook signature', { 
          delivery,
          event: githubEvent,
          ip: req.ip 
        });
        
        res.status(401).json({
          success: false,
          error: 'Missing X-Hub-Signature-256 header',
          delivery_id: delivery
        });
        return;
      }

      // Проверяем наличие GitHub event
      if (!githubEvent) {
        logger.error('❌ Missing GitHub event type', { 
          delivery,
          signature: signature ? 'present' : 'missing',
          ip: req.ip 
        });
        
        res.status(400).json({
          success: false,
          error: 'Missing X-GitHub-Event header',
          delivery_id: delivery
        });
        return;
      }

      // Получаем raw body для валидации
      let rawBody = '';
      if (req.body && typeof req.body === 'object') {
        rawBody = JSON.stringify(req.body);
      } else if (typeof req.body === 'string') {
        rawBody = req.body;
      } else {
        logger.error('❌ Invalid request body format', { 
          delivery,
          body_type: typeof req.body 
        });
        
        res.status(400).json({
          success: false,
          error: 'Invalid request body format',
          delivery_id: delivery
        });
        return;
      }

      // Валидируем подпись
      const isValid = this.verifySignature(rawBody, signature);

      if (!isValid) {
        logger.error('🚨 Invalid GitHub webhook signature', {
          delivery,
          event: githubEvent,
          signature_provided: signature ? 'yes' : 'no',
          body_length: rawBody.length,
          ip: req.ip,
          user_agent: req.headers['user-agent']
        });

        res.status(403).json({
          success: false,
          error: 'Invalid webhook signature',
          delivery_id: delivery,
          event: githubEvent
        });
        return;
      }

      // Логируем успешную валидацию
      logger.info('✅ GitHub webhook signature validated', {
        event: githubEvent,
        delivery: delivery,
        body_size: rawBody.length
      });

      // Добавляем метаданные в request для использования в контроллере
      req.github_webhook = {
        event: githubEvent,
        delivery: delivery,
        signature: signature,
        validated_at: new Date().toISOString()
      };

      next();

    } catch (error) {
      logger.error('💥 GitHub webhook middleware error', {
        error: error.message,
        stack: error.stack,
        delivery: req.headers['x-github-delivery'],
        event: req.headers['x-github-event']
      });

      res.status(500).json({
        success: false,
        error: 'Webhook processing error',
        message: error.message,
        delivery_id: req.headers['x-github-delivery']
      });
    }
  };

  /**
   * Валидация подписи HMAC-SHA256
   */
  private verifySignature(payload: string, signature: string): boolean {
    try {
      if (!signature || !signature.startsWith('sha256=')) {
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const actualSignature = signature.replace('sha256=', '');

      // Используем timing-safe сравнение для защиты от timing атак
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(actualSignature, 'hex')
      );

    } catch (error) {
      logger.error('💥 Signature verification error', { error: error.message });
      return false;
    }
  }

  /**
   * Rate limiting middleware для webhook'ов
   */
  public rateLimiter = (req: Request, res: Response, next: NextFunction): void => {
    const delivery = req.headers['x-github-delivery'] as string;
    const clientIP = req.ip;
    const event = req.headers['x-github-event'] as string;

    // Простая защита от спама - максимум 100 webhook'ов в минуту
    const key = `github_webhook_${clientIP}`;
    const now = Date.now();
    
    // В production лучше использовать Redis для rate limiting
    // Здесь упрощенная реализация для демо
    if (!global.webhookRateLimit) {
      global.webhookRateLimit = {};
    }

    if (!global.webhookRateLimit[key]) {
      global.webhookRateLimit[key] = { count: 0, resetTime: now + 60000 };
    }

    const limit = global.webhookRateLimit[key];

    // Сбросить счетчик если прошла минута
    if (now > limit.resetTime) {
      limit.count = 0;
      limit.resetTime = now + 60000;
    }

    // Проверить лимит
    if (limit.count >= 100) {
      logger.warn('🚨 GitHub webhook rate limit exceeded', {
        ip: clientIP,
        delivery,
        event,
        count: limit.count
      });

      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many webhook requests',
        retry_after: Math.ceil((limit.resetTime - now) / 1000)
      });
      return;
    }

    limit.count++;
    next();
  };

  /**
   * Content-Type валидация для GitHub webhook'ов
   */
  public validateContentType = (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];
    const delivery = req.headers['x-github-delivery'] as string;

    if (!contentType || !contentType.includes('application/json')) {
      logger.error('❌ Invalid content-type for GitHub webhook', {
        content_type: contentType,
        delivery,
        expected: 'application/json'
      });

      res.status(415).json({
        success: false,
        error: 'Invalid content-type',
        expected: 'application/json',
        received: contentType,
        delivery_id: delivery
      });
      return;
    }

    next();
  };

  /**
   * Логирование webhook статистики
   */
  public logWebhookStats = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // Перехватываем завершение response для логирования
    const originalSend = res.send;
    res.send = function(data) {
      const processingTime = Date.now() - startTime;
      const event = req.headers['x-github-event'] as string;
      const delivery = req.headers['x-github-delivery'] as string;

      logger.info('📊 GitHub webhook processed', {
        event,
        delivery,
        status_code: res.statusCode,
        processing_time_ms: processingTime,
        response_size: data ? data.length : 0,
        success: res.statusCode < 400
      });

      return originalSend.call(this, data);
    };

    next();
  };
}

// Экспортируем instance middleware
export const githubWebhookMiddleware = new GitHubWebhookMiddleware();

// Расширяем Request типы для TypeScript
declare global {
  namespace Express {
    interface Request {
      github_webhook?: {
        event: string;
        delivery: string;
        signature: string;
        validated_at: string;
      };
    }
  }

  var webhookRateLimit: {
    [key: string]: {
      count: number;
      resetTime: number;
    };
  };
}