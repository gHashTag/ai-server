import { Service } from 'typedi'
import axios, { AxiosInstance } from 'axios'
import { logger } from '@/utils/logger'

export interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  nodes: any[]
  connections: any
  settings?: any
}

export interface N8nExecution {
  id: string
  workflowId: string
  status: 'new' | 'running' | 'success' | 'error' | 'canceled' | 'waiting'
  startedAt: Date
  finishedAt?: Date
  data?: any
}

@Service()
export class N8nService {
  private n8nClient: AxiosInstance
  private readonly baseURL: string
  private readonly auth: { username: string; password: string }

  constructor() {
    this.baseURL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678'
    this.auth = {
      username: process.env.N8N_BASIC_AUTH_USER || 'admin',
      password: process.env.N8N_BASIC_AUTH_PASSWORD || 'admin123',
    }

    this.n8nClient = axios.create({
      baseURL: this.baseURL,
      auth: this.auth,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Добавляем интерсепторы для логирования
    this.n8nClient.interceptors.request.use(
      config => {
        logger.debug('🔄 N8N API Request:', {
          method: config.method,
          url: config.url,
          data: config.data,
        })
        return config
      },
      error => {
        logger.error('❌ N8N API Request Error:', error)
        return Promise.reject(error)
      }
    )

    this.n8nClient.interceptors.response.use(
      response => {
        logger.debug('✅ N8N API Response:', {
          status: response.status,
          data: response.data,
        })
        return response
      },
      error => {
        logger.error('❌ N8N API Response Error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        })
        return Promise.reject(error)
      }
    )
  }

  /**
   * Обработка данных из N8N webhook'а
   */
  public async processWebhookData(
    workflowId: string,
    executionId: string,
    data: any
  ): Promise<any> {
    logger.info('🔄 Processing N8N webhook data:', { workflowId, executionId })

    // Здесь можно добавить логику обработки данных из разных workflow'ов
    switch (workflowId) {
      case 'instagram-analysis':
        return this.processInstagramAnalysisData(data)
      case 'content-generation':
        return this.processContentGenerationData(data)
      case 'system-monitoring':
        return this.processSystemMonitoringData(data)
      default:
        logger.warn('⚠️ Unknown workflow ID:', workflowId)
        return { processed: true, data }
    }
  }

  /**
   * Запуск workflow'а по webhook'у
   */
  public async triggerWorkflow(
    workflowName: string,
    data: any
  ): Promise<string> {
    try {
      const webhookUrl = `${this.baseURL}/webhook/${workflowName}`

      const response = await axios.post(webhookUrl, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      logger.info('✅ Workflow triggered successfully:', {
        workflowName,
        executionId: response.data.executionId,
      })

      return response.data.executionId || 'unknown'
    } catch (error) {
      logger.error('❌ Error triggering workflow:', error)
      throw error
    }
  }

  /**
   * Получение статуса выполнения workflow'а
   */
  public async getExecutionStatus(executionId: string): Promise<N8nExecution> {
    try {
      const response = await this.n8nClient.get(
        `/api/v1/executions/${executionId}`
      )

      return {
        id: response.data.id,
        workflowId: response.data.workflowId,
        status: response.data.finished
          ? 'success'
          : response.data.stoppedAt
          ? 'error'
          : 'running',
        startedAt: new Date(response.data.startedAt),
        finishedAt: response.data.finishedAt
          ? new Date(response.data.finishedAt)
          : undefined,
        data: response.data.data,
      }
    } catch (error) {
      logger.error('❌ Error getting execution status:', error)
      throw error
    }
  }

  /**
   * Получение списка workflow'ов
   */
  public async getWorkflows(): Promise<N8nWorkflow[]> {
    try {
      const response = await this.n8nClient.get('/api/v1/workflows')

      return response.data.data.map((workflow: any) => ({
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
        nodes: workflow.nodes || [],
        connections: workflow.connections || {},
        settings: workflow.settings,
      }))
    } catch (error) {
      logger.error('❌ Error getting workflows:', error)
      throw error
    }
  }

  /**
   * Создание нового workflow'а
   */
  public async createWorkflow(
    workflowData: Partial<N8nWorkflow>
  ): Promise<N8nWorkflow> {
    try {
      const response = await this.n8nClient.post(
        '/api/v1/workflows',
        workflowData
      )

      logger.info('✅ Workflow created:', {
        id: response.data.id,
        name: response.data.name,
      })

      return response.data
    } catch (error) {
      logger.error('❌ Error creating workflow:', error)
      throw error
    }
  }

  /**
   * Активация/деактивация workflow'а
   */
  public async toggleWorkflow(
    workflowId: string,
    active: boolean
  ): Promise<boolean> {
    try {
      const response = await this.n8nClient.patch(
        `/api/v1/workflows/${workflowId}`,
        {
          active,
        }
      )

      logger.info(`✅ Workflow ${active ? 'activated' : 'deactivated'}:`, {
        workflowId,
      })

      return response.data.active
    } catch (error) {
      logger.error('❌ Error toggling workflow:', error)
      throw error
    }
  }

  /**
   * Проверка здоровья N8N интеграции
   */
  public async runHealthCheck(): Promise<any> {
    try {
      // Проверяем доступность N8N API
      const healthResponse = await this.n8nClient.get('/api/v1/workflows')

      // Получаем информацию о системе
      const systemInfo = {
        n8nVersion: '1.0.0', // Получить из API если доступно
        baseURL: this.baseURL,
        workflowsCount: healthResponse.data.data?.length || 0,
        timestamp: new Date().toISOString(),
      }

      logger.info('✅ N8N Health Check passed:', systemInfo)

      return {
        status: 'healthy',
        ...systemInfo,
      }
    } catch (error) {
      logger.error('❌ N8N Health Check failed:', error)
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Обработка данных анализа Instagram
   */
  private async processInstagramAnalysisData(data: any): Promise<any> {
    logger.info('📊 Processing Instagram analysis data')

    // Здесь можно добавить специфичную логику обработки
    // Например, сохранение в базу данных, отправка уведомлений и т.д.

    return {
      type: 'instagram_analysis',
      processed: true,
      summary: {
        profiles_analyzed: data.profiles?.length || 0,
        posts_processed: data.posts?.length || 0,
        insights_generated: data.insights?.length || 0,
      },
      data,
    }
  }

  /**
   * Обработка данных генерации контента
   */
  private async processContentGenerationData(data: any): Promise<any> {
    logger.info('🎨 Processing content generation data')

    return {
      type: 'content_generation',
      processed: true,
      summary: {
        images_generated: data.images?.length || 0,
        videos_generated: data.videos?.length || 0,
        texts_generated: data.texts?.length || 0,
      },
      data,
    }
  }

  /**
   * Обработка данных системного мониторинга
   */
  private async processSystemMonitoringData(data: any): Promise<any> {
    logger.info('🔍 Processing system monitoring data')

    return {
      type: 'system_monitoring',
      processed: true,
      summary: {
        services_checked: data.services?.length || 0,
        alerts_generated: data.alerts?.length || 0,
        health_status: data.overall_status || 'unknown',
      },
      data,
    }
  }
}
