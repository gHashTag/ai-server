import { Router } from 'express'
import { DartAIController } from '@controllers/dart-ai.controller'

const router = Router()
const dartAIController = new DartAIController()

/**
 * Dart AI Task Manager Integration Routes
 */

// Webhook endpoints
router.post('/webhooks/dart-ai/tasks', dartAIController.handleTaskWebhook)
router.post(
  '/webhooks/github/issues',
  dartAIController.handleGitHubIssueWebhook
)

// API endpoints
router.get('/api/dart-ai/status', dartAIController.getStatus)

// CRUD операции для задач
router.get('/api/dart-ai/tasks/:id', dartAIController.getTask)
router.post('/api/dart-ai/tasks', dartAIController.createTask)
router.put('/api/dart-ai/tasks/:id', dartAIController.updateTask)
router.delete('/api/dart-ai/tasks/:id', dartAIController.deleteTask)

// Синхронизация
router.post('/api/dart-ai/sync/github-issue', dartAIController.syncGitHubIssue)
router.post('/api/dart-ai/sync/task', dartAIController.syncDartAITask)
router.post(
  '/api/dart-ai/sync/bulk-issues',
  dartAIController.bulkSyncGitHubIssues
)

export default router
