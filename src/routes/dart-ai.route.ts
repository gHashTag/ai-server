import { Router } from 'express'
import { DartAIController } from '@controllers/dart-ai.controller'

/**
 * Dart AI Task Manager Integration Routes
 */
export class DartAIRoute {
  public path = '/dart-ai'
  public router: Router = Router()
  private dartAIController = new DartAIController()

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    // Webhook endpoints
    this.router.post('/webhooks/dart-ai/tasks', this.dartAIController.handleTaskWebhook)
    this.router.post(
      '/webhooks/github/issues',
      this.dartAIController.handleGitHubIssueWebhook
    )

    // API endpoints
    this.router.get('/api/dart-ai/status', this.dartAIController.getStatus)

    // CRUD операции для задач
    this.router.get('/api/dart-ai/tasks/:id', this.dartAIController.getTask)
    this.router.post('/api/dart-ai/tasks', this.dartAIController.createTask)
    this.router.put('/api/dart-ai/tasks/:id', this.dartAIController.updateTask)
    this.router.delete('/api/dart-ai/tasks/:id', this.dartAIController.deleteTask)

    // Синхронизация
    this.router.post('/api/dart-ai/sync/github-issue', this.dartAIController.syncGitHubIssue)
    this.router.post('/api/dart-ai/sync/task', this.dartAIController.syncDartAITask)
    this.router.post(
      '/api/dart-ai/sync/bulk-issues',
      this.dartAIController.bulkSyncGitHubIssues
    )
  }
}
