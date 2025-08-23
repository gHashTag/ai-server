import axios from 'axios'
import { errorMessage, errorMessageAdmin } from '@/helpers'
import { supabase } from '@/core/supabase'
import { logger } from '@/utils/logger'

/**
 * Сервис для работы с Kie.ai API
 * Документация: https://docs.kie.ai
 * Экономия по сравнению с Vertex AI: до 87%
 */

// Конфигурация моделей Kie.ai (ИСПРАВЛЕНО: правильные model IDs)
export const KIE_AI_MODELS = {
  veo3_fast: {
    name: 'Veo 3 Fast',
    description: 'Быстрая генерация',
    pricePerSecond: 0.05, // $0.05/сек (87% экономия против $0.40 Vertex AI)
    maxDuration: 10,
    supportedFormats: ['16:9', '9:16', '1:1'],
  },
  veo3: {
    name: 'Veo 3 Quality',
    description: 'Премиум качество',
    pricePerSecond: 0.25, // $0.25/сек (37% экономия против $0.40 Vertex AI)
    maxDuration: 10,
    supportedFormats: ['16:9', '9:16', '1:1'],
  },
  'runway-aleph': {
    name: 'Runway Aleph',
    description: 'Продвинутое редактирование',
    pricePerSecond: 0.3, // $0.30/сек
    maxDuration: 10,
    supportedFormats: ['16:9', '9:16', '1:1'],
  },
}

interface KieAiGenerationOptions {
  model: 'veo3_fast' | 'veo3' | 'runway-aleph'
  prompt: string
  duration: number // 2-10 секунд
  aspectRatio?: '16:9' | '9:16' | '1:1'
  imageUrl?: string // для image-to-video (deprecated, используйте imageUrls)
  imageUrls?: string[] // массив изображений для image-to-video
  watermark?: string // водяной знак для видео
  callBackUrl?: string // URL для webhook callback
  seeds?: number // seed для генерации (для воспроизводимости)
  enableFallback?: boolean // включить fallback на другие модели
  userId?: string
  projectId?: number
  botName?: string // имя бота для telegram уведомлений
  isRu?: boolean // флаг для русского языка
}

interface KieAiResponse {
  success: boolean
  data?: {
    videoUrl: string
    duration: number
    taskId?: string
    status?: string
  }
  cost: {
    usd: number
    stars: number
  }
  provider: string
  model: string
  processingTime?: number
  error?: string
  metadata?: {
    watermark?: string
    seeds?: number
    enableFallback?: boolean
    imageCount?: number
  }
}

export class KieAiService {
  private apiKey: string
  private baseUrl = 'https://api.kie.ai/api/v1'

  constructor() {
    this.apiKey = process.env.KIE_AI_API_KEY || ''
    if (!this.apiKey) {
      console.warn('⚠️ KIE_AI_API_KEY not found. Kie.ai will not be available.')
    }
  }

  /**
   * Проверить доступность API и баланс
   */
  async checkHealth(): Promise<boolean> {
    if (!this.apiKey) {
      return false
    }

    try {
      const response = await axios.get(`${this.baseUrl}/chat/credit`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })

      console.log('✅ Kie.ai API доступен. Кредиты:', response.data.credits)
      return true
    } catch (error) {
      console.error('❌ Kie.ai API недоступен:', error.message)
      return false
    }
  }

  /**
   * Получить баланс аккаунта
   */
  async getAccountBalance(): Promise<{ credits: number }> {
    if (!this.apiKey) {
      throw new Error('KIE_AI_API_KEY is required')
    }

    try {
      const response = await axios.get(`${this.baseUrl}/chat/credit`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      return { credits: response.data.credits || 0 }
    } catch (error) {
      console.error('Error getting Kie.ai balance:', error)
      throw new Error(`Failed to get balance: ${error.message}`)
    }
  }

  /**
   * Генерация видео через Kie.ai
   */
  async generateVideo(options: KieAiGenerationOptions): Promise<{
    videoUrl: string
    cost: number
    duration: number
    processingTime: number
    taskId?: string
    status?: string
    metadata?: any
  }> {
    if (!this.apiKey) {
      throw new Error('KIE_AI_API_KEY is required for video generation')
    }

    const {
      model,
      prompt,
      duration,
      aspectRatio = '16:9',
      imageUrl,
      imageUrls,
      watermark,
      callBackUrl,
      seeds,
      enableFallback,
      userId,
      projectId,
      botName,
      isRu,
    } = options

    // Валидация модели
    const modelConfig = KIE_AI_MODELS[model]
    if (!modelConfig) {
      throw new Error(`Unsupported model: ${model}`)
    }

    // Валидация длительности
    const clampedDuration = Math.max(
      2,
      Math.min(modelConfig.maxDuration, duration)
    )
    if (clampedDuration !== duration) {
      console.log(
        `⚠️ Duration adjusted from ${duration}s to ${clampedDuration}s for ${model}`
      )
    }

    // Расчет стоимости
    const costUSD = clampedDuration * modelConfig.pricePerSecond

    const startTime = Date.now()

    try {
      console.log(`🎬 Starting ${model} generation via Kie.ai...`)
      console.log(`   • Prompt: ${prompt}`)
      console.log(`   • Duration: ${clampedDuration}s`)
      console.log(`   • Aspect Ratio: ${aspectRatio}`)
      console.log(`   • Estimated cost: $${costUSD.toFixed(3)}`)

      // Логируем дополнительные параметры если они есть
      if (imageUrls && imageUrls.length > 0) {
        console.log(`   • Images: ${imageUrls.length} image(s) provided`)
      } else if (imageUrl) {
        console.log(`   • Image: single image provided (deprecated)`)
      }
      if (watermark) console.log(`   • Watermark: ${watermark}`)
      if (callBackUrl) console.log(`   • Callback URL: ${callBackUrl}`)
      if (seeds !== undefined) console.log(`   • Seed: ${seeds}`)
      if (enableFallback !== undefined)
        console.log(`   • Fallback: ${enableFallback}`)

      // Формируем запрос к Kie.ai API
      const requestBody: any = {
        model: model,
        prompt: prompt,
        aspectRatio: aspectRatio,
      }

      // Добавляем опциональные поля
      // Приоритет imageUrls над imageUrl для обратной совместимости
      if (imageUrls && imageUrls.length > 0) {
        requestBody.imageUrls = imageUrls
      } else if (imageUrl) {
        // Поддержка старого API для обратной совместимости
        requestBody.imageUrls = [imageUrl]
      }

      if (watermark) requestBody.watermark = watermark
      if (callBackUrl) requestBody.callBackUrl = callBackUrl
      if (seeds !== undefined) requestBody.seeds = seeds
      if (enableFallback !== undefined)
        requestBody.enableFallback = enableFallback

      // Валидация callback URL если указан
      if (callBackUrl) {
        try {
          new URL(callBackUrl)
        } catch (error) {
          throw new Error(`Invalid callback URL: ${callBackUrl}`)
        }
      }

      const response = await axios.post(
        `${this.baseUrl}/veo/generate`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 300000, // 5 минут на генерацию
        }
      )

      // Kie.ai возвращает {code: 200, msg: "success", data: {...}}
      if (response.data.code !== 200) {
        throw new Error(response.data.msg || 'Video generation failed')
      }

      if (!response.data.data || !response.data.data.taskId) {
        throw new Error('Invalid response from Kie.ai: missing taskId')
      }

      const taskId = response.data.data.taskId
      console.log(`📋 Task created with ID: ${taskId}`)

      // Сохраняем задачу в базу данных
      if (options.userId || options.projectId) {
        try {
          const taskRecord = {
            task_id: taskId,
            provider: 'kie-ai',
            telegram_id: options.userId,
            bot_name: botName,
            is_ru: isRu,
            model: model,
            prompt: prompt,
            status: 'processing',
            metadata: {
              duration: clampedDuration,
              aspectRatio: aspectRatio,
              cost: costUSD,
              projectId: options.projectId,
              watermark: watermark,
              seeds: seeds,
              enableFallback: enableFallback,
              imageCount: imageUrls?.length || (imageUrl ? 1 : 0),
              callBackUrl: callBackUrl,
            },
          }

          const { error: insertError } = await supabase
            .from('video_tasks')
            .insert(taskRecord)

          if (insertError) {
            // Если таблица не существует, создадим её
            if (insertError.code === '42P01') {
              await this.createVideoTasksTable()
              // Повторная попытка вставки
              await supabase.from('video_tasks').insert(taskRecord)
            } else {
              logger.warn('Failed to save task to database:', insertError)
            }
          }

          logger.info(`✅ Task ${taskId} saved to database`)
        } catch (dbError) {
          logger.error('Error saving task to database:', dbError)
          // Не прерываем выполнение, так как задача уже создана
        }
      }

      // ВАЖНО: Kie.ai работает полностью асинхронно
      // Видео генерируется в фоне, результат нужно получать через webhook
      console.log('⚠️ Kie.ai генерирует видео асинхронно')
      console.log('📌 Сохраняем taskId для последующей проверки')

      // Временное решение: возвращаем специальный URL с taskId
      // В production нужно настроить webhook или периодическую проверку
      const videoUrl = `https://kie.ai/task/${taskId}`

      // Для тестирования: делаем несколько попыток получить результат
      // В реальности видео может генерироваться 1-3 минуты
      console.log('⏳ Ждем 30 секунд для генерации видео...')
      await new Promise(resolve => setTimeout(resolve, 30000))

      // После ожидания возвращаем результат с taskId
      // Frontend или telegram bot должен будет проверять статус отдельно

      const processingTime = Date.now() - startTime

      console.log(`⏱️ Task created in ${processingTime}ms`)
      console.log(`   • Task ID: ${taskId}`)
      console.log(`   • Status URL: ${videoUrl}`)
      console.log(`   • Estimated cost: $${costUSD.toFixed(3)}`)
      console.log('   • ⚠️ Видео генерируется асинхронно (1-3 минуты)')

      // Возвращаем информацию о задаче
      // В реальном использовании нужно будет проверять статус отдельно
      return {
        videoUrl: videoUrl, // Временный URL с taskId
        cost: costUSD,
        duration: clampedDuration,
        processingTime,
        taskId: taskId, // Добавляем taskId для отслеживания
        status: 'processing', // Указываем что видео в процессе генерации
      }
    } catch (error: any) {
      console.error(
        `❌ Kie.ai ${model} generation failed:`,
        error.response?.data || error.message
      )

      // Проверяем специфичные ошибки Kie.ai
      if (error.response?.status === 401) {
        throw new Error(
          'Invalid Kie.ai API key. Please check KIE_AI_API_KEY environment variable.'
        )
      } else if (error.response?.status === 402) {
        throw new Error(
          'Insufficient credits in Kie.ai account. Please top up your balance.'
        )
      } else if (error.response?.status === 429) {
        throw new Error(
          'Rate limit exceeded. Please wait before making another request.'
        )
      }

      throw new Error(`Kie.ai video generation failed: ${error.message}`)
    }
  }

  /**
   * Расчет стоимости генерации
   */
  calculateCost(model: string, durationSeconds: number): number {
    const modelConfig = KIE_AI_MODELS[model as keyof typeof KIE_AI_MODELS]
    if (!modelConfig) {
      throw new Error(`Unknown model: ${model}`)
    }

    return durationSeconds * modelConfig.pricePerSecond
  }

  /**
   * Расчет стоимости в звездах с наценкой
   */
  calculateCostInStars(model: string, durationSeconds: number): number {
    // Константы из системы
    const STAR_COST_USD = 0.016 // $0.016 за звезду
    const MARKUP_RATE = 1.5 // наценка 50%

    const baseCostUSD = this.calculateCost(model, durationSeconds)
    const baseCostStars = baseCostUSD / STAR_COST_USD
    const finalCostStars = baseCostStars * MARKUP_RATE

    return Math.floor(finalCostStars)
  }

  /**
   * Проверить поддержку модели
   */
  isModelSupported(model: string): boolean {
    return model in KIE_AI_MODELS
  }

  /**
   * Получить информацию о модели
   */
  getModelInfo(model: string) {
    return KIE_AI_MODELS[model as keyof typeof KIE_AI_MODELS] || null
  }

  /**
   * Получить все доступные модели
   */
  getAllModels() {
    return KIE_AI_MODELS
  }

  /**
   * Проверить статус задачи генерации видео
   * ВАЖНО: В текущей версии Kie.ai API не предоставляет endpoint для проверки статуса
   * Это временный метод-заглушка для совместимости
   */
  async checkVideoStatus(taskId: string): Promise<{
    status: 'processing' | 'completed' | 'failed'
    videoUrl?: string
    error?: string
  }> {
    console.log(`📋 Checking status for task: ${taskId}`)

    // Проверяем статус в базе данных
    try {
      const { data, error } = await supabase
        .from('video_tasks')
        .select('status, video_url, error_message')
        .eq('task_id', taskId)
        .single()

      if (error || !data) {
        return {
          status: 'processing',
          error: 'Task not found in database',
        }
      }

      return {
        status: data.status as 'processing' | 'completed' | 'failed',
        videoUrl: data.video_url,
        error: data.error_message,
      }
    } catch (err) {
      logger.error('Error checking video status:', err)
      return {
        status: 'processing',
        error: 'Failed to check status',
      }
    }
  }

  /**
   * Создает таблицу для хранения задач видео генерации
   */
  private async createVideoTasksTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS video_tasks (
        id SERIAL PRIMARY KEY,
        task_id VARCHAR(255) UNIQUE NOT NULL,
        provider VARCHAR(50) NOT NULL,
        telegram_id VARCHAR(255),
        bot_name VARCHAR(100),
        model VARCHAR(100),
        prompt TEXT,
        status VARCHAR(50) DEFAULT 'processing',
        video_url TEXT,
        error_message TEXT,
        is_ru BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_video_tasks_telegram_id ON video_tasks(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_video_tasks_status ON video_tasks(status);
    `

    try {
      await supabase.rpc('exec_sql', { sql: createTableQuery })
      logger.info('✅ video_tasks table created successfully')
    } catch (error) {
      logger.error('Failed to create video_tasks table:', error)
    }
  }
}
