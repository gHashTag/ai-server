import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { logger } from '@utils/logger'

interface DartAITask {
  id: string
  title: string
  description?: string
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  project_id?: string
  assignee?: string
  github_issue_number?: number
  github_repository?: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

interface GitHubIssue {
  number: number
  title: string
  body?: string
  state: 'open' | 'closed'
  repository: string
  assignees: string[]
  labels: string[]
  created_at: string
  updated_at: string
}

interface SyncResult {
  success: boolean
  tasks_created?: number
  tasks_updated?: number
  issues_created?: number
  issues_updated?: number
  errors?: string[]
}

/**
 * Dart AI Task Manager Integration Service
 * Обеспечивает двухстороннюю синхронизацию между GitHub Issues и Dart AI задачами
 */
export class DartAIService {
  private readonly apiClient: AxiosInstance
  private readonly apiUrl: string
  private readonly apiKey: string
  private readonly githubToken: string
  private readonly syncStats = {
    total_syncs: 0,
    successful_syncs: 0,
    failed_syncs: 0,
    last_sync: null as string | null,
  }

  constructor() {
    this.apiUrl = process.env.DART_AI_API_URL || 'https://api.dartai.com'
    this.apiKey = process.env.DART_AI_API_KEY || ''
    this.githubToken = process.env.GITHUB_TOKEN || ''

    if (!this.apiKey) {
      logger.warn(
        '⚠️ DART_AI_API_KEY не установлен - интеграция будет недоступна'
      )
    }

    if (!this.githubToken) {
      logger.warn(
        '⚠️ GITHUB_TOKEN не установлен - синхронизация с GitHub будет ограничена'
      )
    }

    this.apiClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Server-DartAI-Integration/1.0.0',
      },
    })

    this.setupInterceptors()
  }

  /**
   * Настройка interceptors для логирования и обработки ошибок
   */
  private setupInterceptors(): void {
    this.apiClient.interceptors.request.use(
      config => {
        logger.debug('📡 Dart AI API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
        })
        return config
      },
      error => {
        logger.error('💥 Dart AI API Request Error', { error: error.message })
        return Promise.reject(error)
      }
    )

    this.apiClient.interceptors.response.use(
      response => {
        logger.debug('✅ Dart AI API Response', {
          status: response.status,
          url: response.config.url,
        })
        return response
      },
      error => {
        logger.error('💥 Dart AI API Response Error', {
          status: error.response?.status,
          url: error.config?.url,
          error: error.response?.data || error.message,
        })
        return Promise.reject(error)
      }
    )
  }

  /**
   * Создать задачу в Dart AI из GitHub Issue
   */
  public async createTaskFromGitHubIssue(
    issue: GitHubIssue
  ): Promise<DartAITask | null> {
    try {
      logger.info('📝 Создаю задачу в Dart AI из GitHub Issue', {
        issue_number: issue.number,
        repository: issue.repository,
        title: issue.title,
      })

      const taskData = {
        title: issue.title,
        description: this.formatIssueDescription(issue),
        status: issue.state === 'open' ? 'open' : 'completed',
        metadata: {
          source: 'github',
          github_issue_number: issue.number,
          github_repository: issue.repository,
          github_labels: issue.labels,
          sync_source: 'github_to_dartai',
        },
      }

      const response = await this.apiClient.post('/tasks', taskData)
      const task: DartAITask = response.data

      logger.info('✅ Задача создана в Dart AI', {
        task_id: task.id,
        github_issue: issue.number,
      })

      return task
    } catch (error) {
      logger.error('💥 Ошибка создания задачи в Dart AI', {
        issue_number: issue.number,
        error: error.message,
      })
      return null
    }
  }

  /**
   * Создать GitHub Issue из задачи Dart AI
   */
  public async createGitHubIssueFromTask(
    task: DartAITask,
    repository: string
  ): Promise<GitHubIssue | null> {
    if (!this.githubToken) {
      logger.warn('GitHub токен недоступен - пропускаю создание Issue')
      return null
    }

    try {
      logger.info('📝 Создаю GitHub Issue из задачи Dart AI', {
        task_id: task.id,
        repository,
        title: task.title,
      })

      const issueData = {
        title: task.title,
        body: this.formatTaskDescription(task),
        labels: ['dart-ai-sync'],
      }

      const response = await axios.post(
        `https://api.github.com/repos/${repository}/issues`,
        issueData,
        {
          headers: {
            Authorization: `Bearer ${this.githubToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const issue: GitHubIssue = {
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

      logger.info('✅ GitHub Issue создан', {
        issue_number: issue.number,
        task_id: task.id,
      })

      // Обновляем задачу в Dart AI с информацией о GitHub Issue
      await this.updateTaskWithGitHubInfo(task.id, issue)

      return issue
    } catch (error) {
      logger.error('💥 Ошибка создания GitHub Issue', {
        task_id: task.id,
        repository,
        error: error.message,
      })
      return null
    }
  }

  /**
   * Синхронизировать GitHub Issue в Dart AI
   */
  public async syncGitHubIssueToTask(issue: GitHubIssue): Promise<SyncResult> {
    const startTime = Date.now()
    this.syncStats.total_syncs++

    try {
      // Найти существующую задачу по GitHub Issue
      const existingTask = await this.findTaskByGitHubIssue(
        issue.number,
        issue.repository
      )

      if (existingTask) {
        // Обновить существующую задачу
        const updatedTask = await this.updateTaskFromGitHubIssue(
          existingTask.id,
          issue
        )

        if (updatedTask) {
          this.syncStats.successful_syncs++
          const processingTime = Date.now() - startTime

          logger.info(
            '🔄 GitHub Issue синхронизирован с существующей задачей',
            {
              issue_number: issue.number,
              task_id: existingTask.id,
              processing_time_ms: processingTime,
            }
          )

          return {
            success: true,
            tasks_updated: 1,
            issues_created: 0,
          }
        }
      } else {
        // Создать новую задачу
        const newTask = await this.createTaskFromGitHubIssue(issue)

        if (newTask) {
          this.syncStats.successful_syncs++
          const processingTime = Date.now() - startTime

          logger.info('📝 Новая задача создана из GitHub Issue', {
            issue_number: issue.number,
            task_id: newTask.id,
            processing_time_ms: processingTime,
          })

          return {
            success: true,
            tasks_created: 1,
            issues_created: 0,
          }
        }
      }

      this.syncStats.failed_syncs++
      return {
        success: false,
        errors: ['Failed to sync GitHub Issue to Dart AI task'],
      }
    } catch (error) {
      this.syncStats.failed_syncs++
      logger.error('💥 Ошибка синхронизации GitHub Issue', {
        issue_number: issue.number,
        error: error.message,
      })

      return {
        success: false,
        errors: [error.message],
      }
    } finally {
      this.syncStats.last_sync = new Date().toISOString()
    }
  }

  /**
   * Синхронизировать задачу Dart AI в GitHub Issue
   */
  public async syncTaskToGitHubIssue(
    task: DartAITask,
    repository: string
  ): Promise<SyncResult> {
    const startTime = Date.now()
    this.syncStats.total_syncs++

    try {
      // Проверить, есть ли уже связанный GitHub Issue
      const existingIssueNumber = task.github_issue_number

      if (existingIssueNumber) {
        // Обновить существующий Issue
        const updated = await this.updateGitHubIssueFromTask(
          existingIssueNumber,
          repository,
          task
        )

        if (updated) {
          this.syncStats.successful_syncs++
          const processingTime = Date.now() - startTime

          logger.info(
            '🔄 Задача синхронизирована с существующим GitHub Issue',
            {
              task_id: task.id,
              issue_number: existingIssueNumber,
              processing_time_ms: processingTime,
            }
          )

          return {
            success: true,
            issues_updated: 1,
            tasks_created: 0,
          }
        }
      } else {
        // Создать новый GitHub Issue
        const newIssue = await this.createGitHubIssueFromTask(task, repository)

        if (newIssue) {
          this.syncStats.successful_syncs++
          const processingTime = Date.now() - startTime

          logger.info('📝 Новый GitHub Issue создан из задачи', {
            task_id: task.id,
            issue_number: newIssue.number,
            processing_time_ms: processingTime,
          })

          return {
            success: true,
            issues_created: 1,
            tasks_updated: 1, // Задача обновлена с информацией о Issue
          }
        }
      }

      this.syncStats.failed_syncs++
      return {
        success: false,
        errors: ['Failed to sync Dart AI task to GitHub Issue'],
      }
    } catch (error) {
      this.syncStats.failed_syncs++
      logger.error('💥 Ошибка синхронизации задачи в GitHub', {
        task_id: task.id,
        error: error.message,
      })

      return {
        success: false,
        errors: [error.message],
      }
    } finally {
      this.syncStats.last_sync = new Date().toISOString()
    }
  }

  /**
   * Найти задачу в Dart AI по GitHub Issue
   */
  private async findTaskByGitHubIssue(
    issueNumber: number,
    repository: string
  ): Promise<DartAITask | null> {
    try {
      const response = await this.apiClient.get('/tasks', {
        params: {
          'metadata.github_issue_number': issueNumber,
          'metadata.github_repository': repository,
        },
      })

      const tasks = response.data.tasks || response.data
      return tasks.length > 0 ? tasks[0] : null
    } catch (error) {
      logger.warn('Не удалось найти задачу по GitHub Issue', {
        issue_number: issueNumber,
        repository,
        error: error.message,
      })
      return null
    }
  }

  /**
   * Обновить задачу в Dart AI из GitHub Issue
   */
  private async updateTaskFromGitHubIssue(
    taskId: string,
    issue: GitHubIssue
  ): Promise<DartAITask | null> {
    try {
      const updateData = {
        title: issue.title,
        description: this.formatIssueDescription(issue),
        status: issue.state === 'open' ? 'open' : 'completed',
        metadata: {
          github_issue_number: issue.number,
          github_repository: issue.repository,
          github_labels: issue.labels,
          last_github_sync: new Date().toISOString(),
        },
      }

      const response = await this.apiClient.patch(
        `/tasks/${taskId}`,
        updateData
      )
      return response.data
    } catch (error) {
      logger.error('Ошибка обновления задачи', {
        task_id: taskId,
        error: error.message,
      })
      return null
    }
  }

  /**
   * Обновить GitHub Issue из задачи Dart AI
   */
  private async updateGitHubIssueFromTask(
    issueNumber: number,
    repository: string,
    task: DartAITask
  ): Promise<boolean> {
    if (!this.githubToken) {
      return false
    }

    try {
      const updateData = {
        title: task.title,
        body: this.formatTaskDescription(task),
        state: task.status === 'completed' ? 'closed' : 'open',
      }

      await axios.patch(
        `https://api.github.com/repos/${repository}/issues/${issueNumber}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${this.githubToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      return true
    } catch (error) {
      logger.error('Ошибка обновления GitHub Issue', {
        issue_number: issueNumber,
        repository,
        error: error.message,
      })
      return false
    }
  }

  /**
   * Обновить задачу с информацией о GitHub Issue
   */
  private async updateTaskWithGitHubInfo(
    taskId: string,
    issue: GitHubIssue
  ): Promise<void> {
    try {
      await this.apiClient.patch(`/tasks/${taskId}`, {
        github_issue_number: issue.number,
        github_repository: issue.repository,
        metadata: {
          github_issue_url: `https://github.com/${issue.repository}/issues/${issue.number}`,
          sync_created_at: new Date().toISOString(),
        },
      })
    } catch (error) {
      logger.warn('Не удалось обновить задачу с GitHub информацией', {
        task_id: taskId,
        error: error.message,
      })
    }
  }

  /**
   * Форматировать описание Issue для задачи
   */
  private formatIssueDescription(issue: GitHubIssue): string {
    let description = issue.body || 'Без описания'

    description += `\n\n---\n**GitHub Issue:** [#${issue.number}](https://github.com/${issue.repository}/issues/${issue.number})`
    description += `\n**Репозиторий:** ${issue.repository}`

    if (issue.labels.length > 0) {
      description += `\n**Метки:** ${issue.labels.join(', ')}`
    }

    if (issue.assignees.length > 0) {
      description += `\n**Исполнители:** ${issue.assignees.join(', ')}`
    }

    description += `\n\n*Синхронизировано из GitHub: ${new Date().toLocaleString(
      'ru-RU'
    )}*`

    return description
  }

  /**
   * Форматировать описание задачи для GitHub Issue
   */
  private formatTaskDescription(task: DartAITask): string {
    let description = task.description || 'Без описания'

    description += `\n\n---\n**Dart AI Task ID:** \`${task.id}\``
    description += `\n**Статус:** ${task.status}`

    if (task.assignee) {
      description += `\n**Исполнитель:** ${task.assignee}`
    }

    description += `\n\n*Синхронизировано из Dart AI: ${new Date().toLocaleString(
      'ru-RU'
    )}*`

    return description
  }

  /**
   * Получить статистику синхронизации
   */
  public getSyncStats(): any {
    return {
      ...this.syncStats,
      api_configured: !!this.apiKey,
      github_configured: !!this.githubToken,
      api_url: this.apiUrl,
    }
  }

  /**
   * Проверить подключение к Dart AI API
   */
  public async healthCheck(): Promise<{
    success: boolean
    message: string
    details?: any
  }> {
    try {
      const response = await this.apiClient.get('/health')

      return {
        success: true,
        message: 'Dart AI API доступен',
        details: {
          status: response.status,
          api_url: this.apiUrl,
          response_time: Date.now(),
        },
      }
    } catch (error) {
      return {
        success: false,
        message: 'Dart AI API недоступен',
        details: {
          error: error.message,
          api_url: this.apiUrl,
          api_configured: !!this.apiKey,
        },
      }
    }
  }
}
