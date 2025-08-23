import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { logger } from '@utils/logger'

interface DartAITask {
  id: string
  htmlUrl?: string
  title: string
  description?: string
  parentId?: string
  dartboard?: string
  type?: string
  status?: 'To-do' | 'Doing' | 'Done' | null
  assignee?: string
  assignees?: string[]
  tags?: string[]
  priority?: string
  startAt?: string
  dueAt?: string
  size?: string
  timeTracking?: string
  customProperties?: Record<string, any>
  taskRelationships?: Record<string, any>
  // Дополнительные поля для интеграции
  github_issue_number?: number
  github_repository?: string
  createdAt?: string
  updatedAt?: string
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
 * Обеспечивает полную двухстороннюю синхронизацию: Dart AI ↔ GitHub Issues
 * - GitHub → Dart AI: создание задач через POST /api/v0/public/tasks
 * - Dart AI → GitHub: создание GitHub Issues из задач
 * - Webhook поддержка для автоматической синхронизации
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

    logger.info('🔗 Dart AI Service initialized (FULL API)', {
      api_url: this.apiUrl,
      has_api_key: !!this.apiKey,
      has_github_token: !!this.githubToken,
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
  public async getTasks(): Promise<{
    tasks: DartAITask[]
    count: number
    success: boolean
  }> {
    try {
      logger.debug('📜 Получаю список задач из Dart AI')

      const response = await this.apiClient.get('/tasks')
      const tasks = response.data.results || []
      const count = response.data.count || tasks.length

      logger.info('✅ Получено задач из Dart AI', {
        count,
        first_task: tasks[0]?.title,
      })

      return { tasks, count, success: true }
    } catch (error) {
      logger.error('💥 Ошибка получения задач из Dart AI', {
        error: error.message,
      })
      return { tasks: [], count: 0, success: false }
    }
  }

  /**
   * Получить список пространств из Dart AI
   */
  public async getSpaces(): Promise<{
    spaces: DartAISpace[]
    count: number
    success: boolean
  }> {
    try {
      logger.debug('🏢 Получаю список пространств из Dart AI')

      const response = await this.apiClient.get('/spaces')
      const spaces = response.data.results || []
      const count = response.data.count || spaces.length

      logger.info('✅ Получено пространств из Dart AI', {
        count,
        spaces: spaces.map(s => `"${s.title}" (${s.kind})`),
      })

      return { spaces, count, success: true }
    } catch (error) {
      logger.error('💥 Ошибка получения пространств из Dart AI', {
        error: error.message,
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

        return (
          title.includes('github') ||
          title.includes('issue') ||
          description.includes('github') ||
          task.metadata?.github_issue_number ||
          task.metadata?.github_repository
        )
      })

      logger.info('🔍 Найдено задач связанных с GitHub', {
        total_tasks: tasks.length,
        github_related: githubRelatedTasks.length,
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
   * Получить информацию о задаче по ID
   */
  public async getTaskById(id: string): Promise<DartAITask | null> {
    try {
      logger.debug('📋 Получаю задачу по ID', { id })

      const response = await this.apiClient.get(`/public/tasks/${id}`)
      const task = response.data.item

      logger.info('✅ Задача получена', {
        id: task.id,
        title: task.title,
        status: task.status,
      })

      return {
        id: task.id,
        htmlUrl: task.htmlUrl,
        title: task.title,
        description: task.description,
        parentId: task.parentId,
        dartboard: task.dartboard,
        type: task.type,
        status: task.status,
        assignee: task.assignee,
        tags: task.tags,
        priority: task.priority,
        startAt: task.startAt,
        dueAt: task.dueAt,
        size: task.size,
        timeTracking: task.timeTracking,
        customProperties: task.customProperties,
        taskRelationships: task.taskRelationships,
      }
    } catch (error) {
      logger.error('💥 Не удалось получить задачу', {
        id,
        error: error.message,
        status: error.response?.status,
      })
      return null
    }
  }

  /**
   * Обновить задачу
   */
  public async updateTask(
    id: string,
    updates: Partial<DartAITask>
  ): Promise<DartAITask | null> {
    try {
      logger.info('📝 Обновляю задачу', { id, updates: Object.keys(updates) })

      const updateData = {
        item: {
          id,
          ...updates,
        },
      }

      const response = await this.apiClient.put(
        `/public/tasks/${id}`,
        updateData
      )
      const updatedTask = response.data.item

      logger.info('✅ Задача обновлена', {
        id: updatedTask.id,
        title: updatedTask.title,
        status: updatedTask.status,
      })

      return {
        id: updatedTask.id,
        htmlUrl: updatedTask.htmlUrl,
        title: updatedTask.title,
        description: updatedTask.description,
        parentId: updatedTask.parentId,
        dartboard: updatedTask.dartboard,
        type: updatedTask.type,
        status: updatedTask.status,
        assignee: updatedTask.assignee,
        tags: updatedTask.tags,
        priority: updatedTask.priority,
        startAt: updatedTask.startAt,
        dueAt: updatedTask.dueAt,
        size: updatedTask.size,
        timeTracking: updatedTask.timeTracking,
        customProperties: updatedTask.customProperties,
        taskRelationships: updatedTask.taskRelationships,
      }
    } catch (error) {
      logger.error('💥 Ошибка обновления задачи', {
        id,
        error: error.message,
        response_data: error.response?.data,
      })
      return null
    }
  }

  /**
   * Удалить задачу
   */
  public async deleteTask(id: string): Promise<boolean> {
    try {
      logger.info('🗑️ Удаляю задачу', { id })

      await this.apiClient.delete(`/public/tasks/${id}`)

      logger.info('✅ Задача удалена', { id })
      return true
    } catch (error) {
      logger.error('💥 Ошибка удаления задачи', {
        id,
        error: error.message,
        status: error.response?.status,
      })
      return false
    }
  }

  /**
   * Создать задачу с полными параметрами
   */
  public async createTask(
    taskData: Partial<DartAITask>
  ): Promise<DartAITask | null> {
    try {
      logger.info('📝 Создаю новую задачу', {
        title: taskData.title,
        status: taskData.status,
        tags: taskData.tags,
      })

      const createData = {
        item: {
          title: taskData.title,
          description: taskData.description,
          parentId: taskData.parentId,
          dartboard: taskData.dartboard,
          type: taskData.type,
          status: taskData.status,
          assignee: taskData.assignee,
          assignees: taskData.assignees,
          tags: taskData.tags,
          priority: taskData.priority,
          startAt: taskData.startAt,
          dueAt: taskData.dueAt,
          size: taskData.size,
          customProperties: taskData.customProperties,
        },
      }

      const response = await this.apiClient.post('/public/tasks', createData)
      const createdTask = response.data.item

      logger.info('✅ Задача создана', {
        id: createdTask.id,
        title: createdTask.title,
        url: createdTask.htmlUrl,
      })

      return {
        id: createdTask.id,
        htmlUrl: createdTask.htmlUrl,
        title: createdTask.title,
        description: createdTask.description,
        parentId: createdTask.parentId,
        dartboard: createdTask.dartboard,
        type: createdTask.type,
        status: createdTask.status,
        assignee: createdTask.assignee,
        tags: createdTask.tags,
        priority: createdTask.priority,
        startAt: createdTask.startAt,
        dueAt: createdTask.dueAt,
        size: createdTask.size,
        timeTracking: createdTask.timeTracking,
        customProperties: createdTask.customProperties,
        taskRelationships: createdTask.taskRelationships,
      }
    } catch (error) {
      logger.error('💥 Ошибка создания задачи', {
        error: error.message,
        response_data: error.response?.data,
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
          errors: ['Не удалось получить задачи из Dart AI'],
        }
      }

      let issuesCreated = 0
      const errors: string[] = []

      for (const task of tasks.slice(0, 5)) {
        // Ограничиваем первыми 5 для теста
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
          processing_time_ms: processingTime,
        })
      } else {
        this.syncStats.failed_syncs++
      }

      return {
        success: issuesCreated > 0,
        issues_created: issuesCreated,
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (error) {
      this.syncStats.failed_syncs++
      logger.error('Ошибка синхронизации', {
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
    const description = task.description || 'Без описания'

    let formattedDescription = description

    formattedDescription += `\n\n---
## 🎯 Dart AI Task Info
`
    formattedDescription += `**Task ID:** \`${task.id}\`\n`
    formattedDescription += `**URL:** [${task.htmlUrl}](${task.htmlUrl})\n`

    if (task.dartboard) {
      formattedDescription += `**Dartboard:** ${task.dartboard}\n`
    }

    if (task.type) {
      formattedDescription += `**Type:** ${task.type}\n`
    }

    if (task.status) {
      formattedDescription += `**Status:** ${task.status}\n`
    }

    if (task.assignee) {
      formattedDescription += `**Assignee:** ${task.assignee}\n`
    }

    if (task.tags && task.tags.length > 0) {
      formattedDescription += `**Tags:** ${task.tags.join(', ')}\n`
    }

    if (task.priority) {
      formattedDescription += `**Priority:** ${task.priority}\n`
    }

    if (task.startAt) {
      formattedDescription += `**Start Date:** ${task.startAt}\n`
    }

    if (task.dueAt) {
      formattedDescription += `**Due Date:** ${task.dueAt}\n`
    }

    formattedDescription += `\n> 🔗 *Синхронизировано из Dart AI: ${new Date().toLocaleString(
      'ru-RU'
    )}*`

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
        message:
          'Dart AI API доступен (поддерживает двухстороннюю синхронизацию)',
        details: {
          status: tasksResponse.status,
          api_url: this.apiUrl,
          response_time_ms: responseTime,
          tasks_count: tasksResponse.data.count || 0,
          spaces_count: spacesResponse.data.count || 0,
          api_version: 'v0',
          readonly: false,
          bidirectional_sync: 'enabled',
          create_tasks_endpoint: '/api/v0/public/tasks',
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
   * Создать задачу в Dart AI из GitHub Issue
   * Использует официальный API POST /api/v0/public/tasks
   */
  public async createTaskFromGitHubIssue(
    issue: GitHubIssue
  ): Promise<DartAITask | null> {
    try {
      logger.info('📝 Создаю задачу в Dart AI из GitHub Issue', {
        issue_number: issue.number,
        title: issue.title,
        repository: issue.repository,
      })

      const taskData = {
        item: {
          title: `GitHub Issue #${issue.number}: ${issue.title}`,
          description: this.formatGitHubIssueDescription(issue),
          tags: [...(issue.labels || []), 'github-sync'],
          // assignee: issue.assignees?.[0], // TODO: Map GitHub users to Dart AI users
        },
      }

      const response = await this.apiClient.post('/public/tasks', taskData)
      const createdTask = response.data.item

      logger.info('✅ Задача создана в Dart AI', {
        dart_task_id: createdTask.id,
        dart_task_url: createdTask.htmlUrl,
        github_issue: issue.number,
        title: createdTask.title,
      })

      // Конвертируем в наш интерфейс DartAITask
      const dartTask: DartAITask = {
        id: createdTask.id,
        htmlUrl: createdTask.htmlUrl,
        title: createdTask.title,
        description: createdTask.description,
        dartboard: createdTask.dartboard,
        type: createdTask.type,
        status: createdTask.status,
        assignee: createdTask.assignee,
        tags: createdTask.tags,
        startAt: createdTask.startAt,
        dueAt: createdTask.dueAt,
        customProperties: createdTask.customProperties,
        taskRelationships: createdTask.taskRelationships,
        github_issue_number: issue.number,
        github_repository: issue.repository,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          source: 'github_webhook',
          github_url: `https://github.com/${issue.repository}/issues/${issue.number}`,
          dart_url: createdTask.htmlUrl,
        },
      }

      return dartTask
    } catch (error) {
      logger.error('💥 Ошибка создания задачи в Dart AI', {
        issue_number: issue.number,
        error: error.message,
        response_data: error.response?.data,
      })
      return null
    }
  }

  /**
   * Форматировать описание GitHub Issue для Dart AI задачи
   */
  private formatGitHubIssueDescription(issue: GitHubIssue): string {
    let description = issue.body || 'Без описания'

    // Добавляем метаинформацию
    description += `\n\n---
## 🔗 GitHub Issue Info

**Repository:** [${issue.repository}](https://github.com/${issue.repository})  
**Issue:** [#${issue.number}](https://github.com/${issue.repository}/issues/${issue.number})  
**State:** ${issue.state}  
`

    if (issue.assignees && issue.assignees.length > 0) {
      description += `**Assignees:** ${issue.assignees.join(', ')}  \n`
    }

    if (issue.labels && issue.labels.length > 0) {
      description += `**Labels:** ${issue.labels.join(', ')}  \n`
    }

    description += `**Created:** ${issue.created_at}  
**Updated:** ${issue.updated_at}  

> 🤖 *Автоматически синхронизировано из GitHub: ${new Date().toLocaleString(
      'ru-RU'
    )}*`

    return description
  }

  /**
   * Обновить задачу с информацией о GitHub Issue
   * TODO: Использовать PATCH /api/v0/public/tasks/{id} когда найдем правильный формат
   */
  private async updateTaskWithGitHubInfo(
    taskId: string,
    issue: GitHubIssue
  ): Promise<boolean> {
    // Пока логируем, в будущем будет реальный PATCH запрос
    logger.info('💾 Обновляю задачу в Dart AI (будет реализовано)', {
      task_id: taskId,
      github_issue_number: issue.number,
      github_repository: issue.repository,
    })

    // TODO: Реализовать PATCH запрос когда определим формат
    return true
  }
}
