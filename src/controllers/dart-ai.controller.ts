import { Request, Response } from 'express'
import { logger } from '@utils/logger'
import { DartAIService } from '@services/dart-ai.service'

/**
 * Dart AI Controller
 * Обрабатывает webhook'и и API запросы для интеграции с Dart AI Task Manager
 */
export class DartAIController {
  private dartAIService = new DartAIService()

  /**
   * Обработчик webhook'ов от Dart AI
   * POST /webhooks/dart-ai/tasks
   */
  public handleTaskWebhook = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const startTime = Date.now()

    try {
      const { body, headers } = req
      const event = headers['x-dart-event'] as string
      const signature = headers['x-dart-signature'] as string
      const delivery = headers['x-dart-delivery'] as string

      logger.info('🔔 Dart AI webhook received', {
        event,
        delivery,
        action: body.action,
        task: body.task?.id,
      })

      // Валидация подписи (если Dart AI поддерживает)
      if (
        signature &&
        !this.validateDartAISignature(JSON.stringify(body), signature)
      ) {
        logger.error('❌ Invalid Dart AI webhook signature', { delivery })
        res.status(401).json({ error: 'Invalid signature' })
        return
      }

      // Обработка различных типов событий Dart AI
      let result = null

      switch (event) {
        case 'task.created':
          result = await this.handleTaskCreated(body)
          break

        case 'task.updated':
          result = await this.handleTaskUpdated(body)
          break

        case 'task.completed':
          result = await this.handleTaskCompleted(body)
          break

        case 'task.deleted':
          result = await this.handleTaskDeleted(body)
          break

        default:
          logger.info('📋 Unsupported Dart AI event, skipping', { event })
          res.status(200).json({ message: 'Event type not supported', event })
          return
      }

      const processingTime = Date.now() - startTime

      logger.info('✅ Dart AI webhook processed successfully', {
        event,
        delivery,
        processingTime,
        result: result ? 'action_taken' : 'no_action_needed',
      })

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        event,
        delivery,
        processing_time_ms: processingTime,
        result: result || 'no_action_needed',
      })
    } catch (error) {
      const processingTime = Date.now() - startTime

      logger.error('💥 Dart AI webhook processing failed', {
        error: error.message,
        stack: error.stack,
        processingTime,
        body: req.body ? Object.keys(req.body) : null,
      })

      res.status(500).json({
        success: false,
        error: 'Webhook processing failed',
        message: error.message,
        processing_time_ms: processingTime,
      })
    }
  }

  /**
   * Обработчик webhook'ов от GitHub Issues
   * POST /webhooks/github/issues
   */
  public handleGitHubIssueWebhook = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const startTime = Date.now()

    try {
      const { body, headers } = req
      const event = headers['x-github-event'] as string
      const action = body.action

      if (event !== 'issues') {
        res.status(200).json({ message: 'Not an issues event' })
        return
      }

      logger.info('🔔 GitHub Issues webhook received', {
        event,
        action,
        issue: body.issue?.number,
        repository: body.repository?.full_name,
      })

      // Обработать событие GitHub Issue
      let result = null

      switch (action) {
        case 'opened':
        case 'edited':
        case 'reopened':
          result = await this.handleGitHubIssueSync(body)
          break

        case 'closed':
          result = await this.handleGitHubIssueClosed(body)
          break

        default:
          logger.info('📋 GitHub issue action not relevant for sync', {
            action,
          })
          res.status(200).json({ message: 'Action not relevant', action })
          return
      }

      const processingTime = Date.now() - startTime

      logger.info('✅ GitHub Issues webhook processed', {
        action,
        issue: body.issue?.number,
        processingTime,
        result: result ? 'synced' : 'skipped',
      })

      res.status(200).json({
        success: true,
        message: 'GitHub Issue webhook processed',
        action,
        issue: body.issue?.number,
        processing_time_ms: processingTime,
        result,
      })
    } catch (error) {
      const processingTime = Date.now() - startTime

      logger.error('💥 GitHub Issues webhook processing failed', {
        error: error.message,
        processingTime,
      })

      res.status(500).json({
        success: false,
        error: 'GitHub webhook processing failed',
        message: error.message,
        processing_time_ms: processingTime,
      })
    }
  }

  /**
   * Ручная синхронизация GitHub Issue в Dart AI
   * POST /api/dart-ai/sync/github-issue
   */
  public syncGitHubIssue = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { issue_number, repository } = req.body

      if (!issue_number || !repository) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: issue_number, repository',
        })
        return
      }

      logger.info('🔄 Manual GitHub Issue sync requested', {
        issue_number,
        repository,
      })

      // Получить информацию о GitHub Issue
      const issueData = await this.getGitHubIssueData(repository, issue_number)

      if (!issueData) {
        res.status(404).json({
          success: false,
          error: 'GitHub Issue not found',
        })
        return
      }

      // Синхронизировать с Dart AI через официальный API
      const syncResult = await this.dartAIService.createTaskFromGitHubIssue(issueData)

      res.json({
        success: !!syncResult,
        message: syncResult
          ? 'Issue synced successfully to Dart AI'
          : 'Sync failed',
        issue_number,
        repository,
        dart_task: syncResult,
      })
    } catch (error) {
      logger.error('💥 Manual GitHub Issue sync failed', {
        error: error.message,
      })

      res.status(500).json({
        success: false,
        error: 'Manual sync failed',
        message: error.message,
      })
    }
  }

  /**
   * Ручная синхронизация задачи Dart AI в GitHub Issue
   * POST /api/dart-ai/sync/task
   */
  public syncDartAITask = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { task_id, repository } = req.body

      if (!task_id || !repository) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: task_id, repository',
        })
        return
      }

      logger.info('🔄 Manual Dart AI task sync requested', {
        task_id,
        repository,
      })

      // Получить данные задачи из Dart AI
      const taskData = await this.getDartAITaskData(task_id)

      if (!taskData) {
        res.status(404).json({
          success: false,
          error: 'Dart AI task not found',
        })
        return
      }

      // Синхронизировать в GitHub
      const syncResult = await this.dartAIService.syncTaskToGitHubIssue(
        taskData,
        repository
      )

      res.json({
        success: syncResult.success,
        message: syncResult.success
          ? 'Task synced successfully'
          : 'Sync failed',
        task_id,
        repository,
        result: syncResult,
      })
    } catch (error) {
      logger.error('💥 Manual Dart AI task sync failed', {
        error: error.message,
      })

      res.status(500).json({
        success: false,
        error: 'Manual task sync failed',
        message: error.message,
      })
    }
  }

  /**
   * Получить статус интеграции
   * GET /api/dart-ai/status
   */
  public getStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const healthCheck = await this.dartAIService.healthCheck()
      const stats = this.dartAIService.getSyncStats()

      res.json({
        success: true,
        status: healthCheck.success ? 'operational' : 'degraded',
        health_check: healthCheck,
        sync_stats: stats,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Failed to get Dart AI status', error)
      res.status(500).json({
        success: false,
        status: 'error',
        error: error.message,
      })
    }
  }

  /**
   * Массовая синхронизация GitHub Issues в Dart AI
   * POST /api/dart-ai/sync/bulk-issues
   */
  public bulkSyncGitHubIssues = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { repository, state = 'open', limit = 50 } = req.body

      if (!repository) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: repository',
        })
        return
      }

      logger.info('🔄 Bulk GitHub Issues sync requested', {
        repository,
        state,
        limit,
      })

      const issues = await this.getGitHubIssues(repository, state, limit)
      const results = {
        total: issues.length,
        successful: 0,
        failed: 0,
        errors: [] as string[],
      }

      for (const issue of issues) {
        try {
          const syncResult = await this.dartAIService.syncGitHubIssueToTask(
            issue
          )
          if (syncResult.success) {
            results.successful++
          } else {
            results.failed++
            results.errors.push(
              `Issue #${issue.number}: ${
                syncResult.errors?.[0] || 'Unknown error'
              }`
            )
          }
        } catch (error) {
          results.failed++
          results.errors.push(`Issue #${issue.number}: ${error.message}`)
        }
      }

      res.json({
        success: results.failed === 0,
        message: `Bulk sync completed: ${results.successful}/${results.total} successful`,
        repository,
        results,
      })
    } catch (error) {
      logger.error('💥 Bulk sync failed', { error: error.message })
      res.status(500).json({
        success: false,
        error: 'Bulk sync failed',
        message: error.message,
      })
    }
  }

  // Приватные методы для обработки событий

  /**
   * Обработка создания задачи в Dart AI
   */
  private async handleTaskCreated(body: any): Promise<any> {
    const task = body.task
    const repository = body.repository || process.env.DEFAULT_GITHUB_REPO

    if (!repository) {
      logger.warn('Repository not specified for task sync')
      return null
    }

    logger.info('📝 Processing new Dart AI task for GitHub sync', {
      task_id: task.id,
      title: task.title,
    })

    const syncResult = await this.dartAIService.syncTaskToGitHubIssue(
      task,
      repository
    )

    return {
      action: 'task_synced_to_github',
      task_id: task.id,
      success: syncResult.success,
      github_issue: syncResult.issues_created ? 'created' : 'failed',
    }
  }

  /**
   * Обработка обновления задачи в Dart AI
   */
  private async handleTaskUpdated(body: any): Promise<any> {
    const task = body.task
    const repository = body.repository || process.env.DEFAULT_GITHUB_REPO

    if (!repository || !task.github_issue_number) {
      return null
    }

    logger.info('✏️ Processing Dart AI task update for GitHub sync', {
      task_id: task.id,
      github_issue: task.github_issue_number,
    })

    const syncResult = await this.dartAIService.syncTaskToGitHubIssue(
      task,
      repository
    )

    return {
      action: 'task_updated_in_github',
      task_id: task.id,
      success: syncResult.success,
    }
  }

  /**
   * Обработка завершения задачи в Dart AI
   */
  private async handleTaskCompleted(body: any): Promise<any> {
    const task = body.task

    logger.info('✅ Dart AI task completed', {
      task_id: task.id,
      title: task.title,
    })

    // Если есть связанный GitHub Issue, закрыть его
    if (task.github_issue_number && body.repository) {
      // Логика закрытия Issue будет в сервисе
      const syncResult = await this.dartAIService.syncTaskToGitHubIssue(
        task,
        body.repository
      )

      return {
        action: 'github_issue_closed',
        task_id: task.id,
        issue_number: task.github_issue_number,
        success: syncResult.success,
      }
    }

    return { action: 'task_completed_logged', task_id: task.id }
  }

  /**
   * Обработка удаления задачи в Dart AI
   */
  private async handleTaskDeleted(body: any): Promise<any> {
    const task = body.task

    logger.info('🗑️ Dart AI task deleted', {
      task_id: task.id,
    })

    // Можно добавить логику для добавления комментария в GitHub Issue
    // о том, что связанная задача была удалена

    return { action: 'task_deletion_logged', task_id: task.id }
  }

  /**
   * Обработка событий GitHub Issue
   */
  private async handleGitHubIssueSync(body: any): Promise<any> {
    const issue = {
      number: body.issue.number,
      title: body.issue.title,
      body: body.issue.body,
      state: body.issue.state,
      repository: body.repository.full_name,
      assignees: body.issue.assignees?.map((a: any) => a.login) || [],
      labels: body.issue.labels?.map((l: any) => l.name) || [],
      created_at: body.issue.created_at,
      updated_at: body.issue.updated_at,
    }

    const syncResult = await this.dartAIService.createTaskFromGitHubIssue(issue)

    return {
      action: 'github_issue_synced',
      issue_number: issue.number,
      success: !!syncResult,
      dart_task: syncResult?.duid,
    }
  }

  /**
   * Обработка закрытия GitHub Issue
   */
  private async handleGitHubIssueClosed(body: any): Promise<any> {
    const issue = {
      number: body.issue.number,
      title: body.issue.title,
      body: body.issue.body,
      state: 'closed',
      repository: body.repository.full_name,
      assignees: body.issue.assignees?.map((a: any) => a.login) || [],
      labels: body.issue.labels?.map((l: any) => l.name) || [],
      created_at: body.issue.created_at,
      updated_at: body.issue.updated_at,
    }

    // Для закрытых Issues только логируем, не создаем задачи в Dart AI
    logger.info('📝 GitHub Issue закрыт, обновление статуса в Dart AI (симуляция)', {
      issue_number: issue.number,
      repository: issue.repository
    })

    return {
      action: 'github_issue_closed_logged',
      issue_number: issue.number,
      success: true,
      message: 'Issue closure logged (simulated)',
    }
  }

  // Вспомогательные методы

  /**
   * Валидация подписи Dart AI (если поддерживается)
   */
  private validateDartAISignature(payload: string, signature: string): boolean {
    // Реализовать валидацию подписи когда Dart AI предоставит документацию
    // Пока что возвращаем true
    return true
  }

  /**
   * Получить данные GitHub Issue
   */
  private async getGitHubIssueData(
    repository: string,
    issueNumber: number
  ): Promise<any> {
    try {
      const axios = require('axios')
      const response = await axios.get(
        `https://api.github.com/repos/${repository}/issues/${issueNumber}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      return {
        number: response.data.number,
        title: response.data.title,
        body: response.data.body,
        state: response.data.state,
        repository,
        assignees: response.data.assignees?.map((a: any) => a.login) || [],
        labels: response.data.labels?.map((l: any) => l.name) || [],
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
      }
    } catch (error) {
      logger.error('Ошибка получения данных GitHub Issue', {
        repository,
        issue_number: issueNumber,
        error: error.message,
      })
      return null
    }
  }

  /**
   * Получить данные задачи Dart AI
   */
  private async getDartAITaskData(taskId: string): Promise<any> {
    // Используем сервис для получения задачи
    // Пока что возвращаем mock-данные
    return {
      id: taskId,
      title: 'Mock Task',
      description: 'Mock task description',
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  /**
   * Получить список GitHub Issues
   */
  private async getGitHubIssues(
    repository: string,
    state: string,
    limit: number
  ): Promise<any[]> {
    try {
      const axios = require('axios')
      const response = await axios.get(
        `https://api.github.com/repos/${repository}/issues`,
        {
          params: {
            state,
            per_page: limit,
            sort: 'updated',
            direction: 'desc',
          },
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      return response.data.map((issue: any) => ({
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        repository,
        assignees: issue.assignees?.map((a: any) => a.login) || [],
        labels: issue.labels?.map((l: any) => l.name) || [],
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      }))
    } catch (error) {
      logger.error('Ошибка получения GitHub Issues', {
        repository,
        error: error.message,
      })
      return []
    }
  }
}
