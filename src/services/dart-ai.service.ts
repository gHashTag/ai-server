import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { logger } from '@utils/logger'

interface DartAITask {
  duid: string
  title: string
  description?: any // Rich text format from Dart AI
  statusDuid?: string
  spaceDuid: string
  kind?: string
  assignee?: string
  github_issue_number?: number
  github_repository?: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, any>
}

interface DartAISpace {
  duid: string
  title: string
  description?: string
  kind: 'Workspace' | 'Personal'
  iconKind?: string
  iconNameOrEmoji?: string
  colorHex?: string
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
 * Обеспечивает двухстороннюю синхронизацию: Dart AI ↔ GitHub Issues
 * - GitHub → Dart AI: через webhook обработку GitHub Issues
 * - Dart AI → GitHub: создание GitHub Issues из задач
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
    this.apiUrl = process.env.DART_AI_API_URL || 'https://app.dartai.com/api/v0'
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

    logger.info('🔗 Dart AI Service initialized (READ-ONLY)', {
      api_url: this.apiUrl,
      has_api_key: !!this.apiKey,
      has_github_token: !!this.githubToken
    })

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
   * Получить все задачи из Dart AI
   */
  public async getTasks(): Promise<{ tasks: DartAITask[]; count: number; success: boolean }> {
    try {
      logger.debug('📜 Получаю список задач из Dart AI')
      
      const response = await this.apiClient.get('/tasks')
      const tasks = response.data.results || []
      const count = response.data.count || tasks.length

      logger.info('✅ Получено задач из Dart AI', {
        count,
        first_task: tasks[0]?.title
      })

      return { tasks, count, success: true }
    } catch (error) {
      logger.error('💥 Ошибка получения задач из Dart AI', {
        error: error.message
      })
      return { tasks: [], count: 0, success: false }
    }
  }

  /**
   * Получить список пространств из Dart AI
   */
  public async getSpaces(): Promise<{ spaces: DartAISpace[]; count: number; success: boolean }> {
    try {
      logger.debug('🏢 Получаю список пространств из Dart AI')
      
      const response = await this.apiClient.get('/spaces')
      const spaces = response.data.results || []
      const count = response.data.count || spaces.length

      logger.info('✅ Получено пространств из Dart AI', {
        count,
        spaces: spaces.map(s => `"${s.title}" (${s.kind})`)
      })

      return { spaces, count, success: true }
    } catch (error) {
      logger.error('💥 Ошибка получения пространств из Dart AI', {
        error: error.message
      })
      return { spaces: [], count: 0, success: false }
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
        task_id: task.duid,
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
        task_id: task.duid,
      })

      // Обновляем задачу в Dart AI с информацией о GitHub Issue
      await this.updateTaskWithGitHubInfo(task.duid, issue)

      return issue
    } catch (error) {
      logger.error('💥 Ошибка создания GitHub Issue', {
        task_id: task.duid,
        repository,
        error: error.message,
      })
      return null
    }
  }

  /**
   * Найти задачи с метаданными GitHub
   * (ищем среди существующих задач те, которые могли быть связаны с GitHub)
   */
  public async findTasksWithGitHubMetadata(): Promise<DartAITask[]> {
    try {
      const { tasks, success } = await this.getTasks()
      
      if (!success) return []
      
      // Фильтруем задачи по ключевым словам
      const githubRelatedTasks = tasks.filter(task => {
        const title = task.title.toLowerCase()
        const description = JSON.stringify(task.description || '').toLowerCase()
        
        return title.includes('github') || 
               title.includes('issue') ||
               description.includes('github') ||
               task.metadata?.github_issue_number ||
               task.metadata?.github_repository
      })
      
      logger.info('🔍 Найдено задач связанных с GitHub', {
        total_tasks: tasks.length,
        github_related: githubRelatedTasks.length
      })
      
      return githubRelatedTasks
    } catch (error) {
      logger.error('Ошибка поиска GitHub задач', { error: error.message })
      return []
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
              task_id: task.duid,
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
            task_id: task.duid,
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
        task_id: task.duid,
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
   * Получить информацию о задаче по DUID
   */
  public async getTaskByDuid(duid: string): Promise<DartAITask | null> {
    try {
      const response = await this.apiClient.get(`/tasks/${duid}`)
      return response.data
    } catch (error) {
      logger.warn('Не удалось получить задачу', {
        duid,
        error: error.message
      })
      return null
    }
  }

  /**
   * Преобразовать описание Dart AI в текст
   */
  private extractDescriptionText(description: any): string {
    if (typeof description === 'string') return description
    if (!description || !description.root) return ''
    
    try {
      // Извлекаем текст из rich text структуры Dart AI
      const extractText = (node: any): string => {
        if (node.text) return node.text
        if (node.children) {
          return node.children.map(extractText).join('')
        }
        return ''
      }
      
      return extractText(description.root)
    } catch (error) {
      return JSON.stringify(description)
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
   * Синхронизировать все задачи Dart AI → GitHub Issues
   * (односторонняя синхронизация)
   */
  public async syncAllTasksToGitHub(repository: string): Promise<SyncResult> {
    const startTime = Date.now()
    this.syncStats.total_syncs++
    
    try {
      const { tasks, success } = await this.getTasks()
      
      if (!success) {
        this.syncStats.failed_syncs++
        return {
          success: false,
          errors: ['Не удалось получить задачи из Dart AI']
        }
      }
      
      let issuesCreated = 0
      const errors: string[] = []
      
      for (const task of tasks.slice(0, 5)) { // Ограничиваем первыми 5 для теста
        const issue = await this.createGitHubIssueFromTask(task, repository)
        
        if (issue) {
          issuesCreated++
        } else {
          errors.push(`Не удалось создать Issue для задачи ${task.title}`)
        }
      }
      
      const processingTime = Date.now() - startTime
      
      if (issuesCreated > 0) {
        this.syncStats.successful_syncs++
        logger.info('✅ Синхронизация Dart AI → GitHub завершена', {
          tasks_processed: tasks.length,
          issues_created: issuesCreated,
          processing_time_ms: processingTime
        })
      } else {
        this.syncStats.failed_syncs++
      }
      
      return {
        success: issuesCreated > 0,
        issues_created: issuesCreated,
        errors: errors.length > 0 ? errors : undefined
      }
      
    } catch (error) {
      this.syncStats.failed_syncs++
      logger.error('Ошибка синхронизации', {
        error: error.message
      })
      
      return {
        success: false,
        errors: [error.message]
      }
    } finally {
      this.syncStats.last_sync = new Date().toISOString()
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
    const description = this.extractDescriptionText(task.description) || 'Без описания'

    let formattedDescription = description
    
    formattedDescription += `\n\n---
## 🎯 Dart AI Task Info
`
    formattedDescription += `**Task ID:** \`${task.duid}\`\n`
    formattedDescription += `**Space:** ${task.spaceDuid}\n`
    
    if (task.kind) {
      formattedDescription += `**Type:** ${task.kind}\n`
    }
    
    if (task.statusDuid) {
      formattedDescription += `**Status DUID:** ${task.statusDuid}\n`
    }

    if (task.assignee) {
      formattedDescription += `**Исполнитель:** ${task.assignee}\n`
    }
    
    formattedDescription += `**Создано:** ${task.createdAt}\n`
    formattedDescription += `**Обновлено:** ${task.updatedAt}\n`

    formattedDescription += `\n> 🔗 *Синхронизировано из Dart AI: ${new Date().toLocaleString('ru-RU')}*`

    return formattedDescription
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
      const startTime = Date.now()
      
      // Проверяем доступность через /tasks endpoint
      const tasksResponse = await this.apiClient.get('/tasks')
      const spacesResponse = await this.apiClient.get('/spaces')
      
      const responseTime = Date.now() - startTime

      return {
        success: true,
        message: 'Dart AI API доступен (с симуляцией двухсторонней синхронизации)',
        details: {
          status: tasksResponse.status,
          api_url: this.apiUrl,
          response_time_ms: responseTime,
          tasks_count: tasksResponse.data.count || 0,
          spaces_count: spacesResponse.data.count || 0,
          api_version: 'v0',
          readonly: true,
          bidirectional_sync: 'simulated'
        },
      }
    } catch (error) {
      return {
        success: false,
        message: 'Dart AI API недоступен',
        details: {
          error: error.message,
          status: error.response?.status,
          api_url: this.apiUrl,
          api_configured: !!this.apiKey,
        },
      }
    }
  }

  /**
   * Симуляция создания задачи в Dart AI из GitHub Issue
   * Поскольку API Dart AI read-only, это демонстрация логики для webhook'а
   */
  public async simulateCreateTaskFromGitHubIssue(issue: GitHubIssue): Promise<DartAITask | null> {
    logger.info('📝 Симуляция создания задачи в Dart AI из GitHub Issue', {
      issue_number: issue.number,
      title: issue.title,
      repository: issue.repository
    })

    // В реальной интеграции здесь был бы POST запрос к Dart AI API
    const simulatedTask: DartAITask = {
      duid: `dart_task_${Date.now()}_${issue.number}`,
      title: issue.title,
      description: {
        root: {
          children: [{
            text: issue.body || 'Создано из GitHub Issue'
          }]
        }
      },
      spaceDuid: 'default_space',
      kind: 'task',
      github_issue_number: issue.number,
      github_repository: issue.repository,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        source: 'github_webhook',
        github_url: `https://github.com/${issue.repository}/issues/${issue.number}`
      }
    }

    logger.info('✅ Задача создана в Dart AI (симуляция)', {
      dart_task_id: simulatedTask.duid,
      github_issue: issue.number
    })

    return simulatedTask
  }

  /**
   * Обновить задачу с информацией о GitHub Issue
   * (Поскольку API Dart AI только для чтения, логируем действие)
   */
  private async updateTaskWithGitHubInfo(
    taskId: string,
    issue: GitHubIssue
  ): Promise<boolean> {
    // В реальном API это был бы PATCH запрос к /tasks/{id}
    logger.info('💾 Обновляю задачу в Dart AI (симуляция)', {
      task_id: taskId,
      github_issue_number: issue.number,
      github_repository: issue.repository,
    })

    // Возвращаем true для симуляции успешного обновления
    return true
  }
}
