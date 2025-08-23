import { Router } from 'express'
import { Routes } from '@interfaces/routes.interface'
import { GitHubWebhookController } from '@controllers/github-webhook.controller'
import { githubWebhookMiddleware } from '@middlewares/github-webhook.middleware'

/**
 * GitHub Webhook Routes
 * Маршруты для автоматического исправления PR через GitHub webhook'и
 */
export class GitHubWebhookRoute implements Routes {
  public path = '/webhooks/github'
  public router = Router()
  private githubWebhookController = new GitHubWebhookController()

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes(): void {
    /**
     * POST /webhooks/github/pr-issues
     * Основной endpoint для GitHub webhook'ов про проблемы в PR
     *
     * Обрабатывает события:
     * - pull_request (opened, synchronize, reopened)
     * - check_suite (completed with failures)
     * - check_run (individual check failures)
     * - pull_request_review (changes_requested)
     */
    this.router.post(
      '/pr-issues',
      githubWebhookMiddleware.logWebhookStats,
      githubWebhookMiddleware.validateContentType,
      githubWebhookMiddleware.rateLimiter,
      githubWebhookMiddleware.validateSignature,
      this.githubWebhookController.handlePRIssues
    )

    /**
     * GET /webhooks/github/status
     * Получить статус GitHub webhook системы
     *
     * Возвращает:
     * - Статус конфигурации (токены, секреты)
     * - Статистику обработки webhook'ов
     * - Информацию о последней активности
     */
    this.router.get('/status', this.githubWebhookController.getStatus)

    /**
     * POST /webhooks/github/analyze/:pr_number
     * Ручной запуск анализа и исправления PR
     *
     * Параметры:
     * - pr_number: номер PR для анализа
     *
     * Body:
     * - repository: репозиторий (опционально, по умолчанию gHashTag/ai-server)
     */
    this.router.post(
      '/analyze/:pr_number',
      this.githubWebhookController.manualAnalyzePR
    )

    /**
     * GET /webhooks/github/health
     * Health check для GitHub webhook системы
     */
    this.router.get('/health', (req, res) => {
      res.json({
        success: true,
        status: 'healthy',
        service: 'GitHub Webhook Auto-fixer',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          'POST /webhooks/github/pr-issues':
            'Main webhook endpoint for PR issues',
          'GET /webhooks/github/status': 'System status and statistics',
          'POST /webhooks/github/analyze/:pr_number': 'Manual PR analysis',
          'GET /webhooks/github/health': 'Health check endpoint',
        },
        features: [
          '🤖 Automatic PR issue detection',
          '🔧 Claude Code integration for fixes',
          '🔒 Secure GitHub signature validation',
          '📊 Rate limiting and monitoring',
          '⚡ Real-time webhook processing',
        ],
      })
    })

    /**
     * POST /webhooks/github/test
     * Тестовый endpoint для отладки (только в development)
     */
    if (process.env.NODE_ENV === 'development') {
      this.router.post('/test', (req, res) => {
        const { body, headers } = req

        console.log('🧪 GitHub webhook test received:', {
          headers: {
            'x-github-event': headers['x-github-event'],
            'x-github-delivery': headers['x-github-delivery'],
            'x-hub-signature-256': headers['x-hub-signature-256']
              ? 'present'
              : 'missing',
          },
          body: body ? Object.keys(body) : 'no body',
          timestamp: new Date().toISOString(),
        })

        res.json({
          success: true,
          message: 'Test webhook received successfully',
          received_at: new Date().toISOString(),
          headers: {
            event: headers['x-github-event'],
            delivery: headers['x-github-delivery'],
            signature_present: !!headers['x-hub-signature-256'],
          },
          body_keys: body ? Object.keys(body) : [],
        })
      })
    }
  }
}
