import { openai } from '@ai-sdk/openai'
import { generateText, CoreMessage, LanguageModel } from 'ai'
import { logger } from '@/utils/logger'

/**
 * Конфигурация AI провайдеров
 */
interface AIProviderConfig {
  primaryProvider: 'openai' | 'anthropic' | 'google'
  fallbackProvider: 'openai' | 'anthropic' | 'google'
  maxRetries: number
  retryDelay: number
}

/**
 * Результат AI анализа
 */
interface AIAnalysisResult {
  success: boolean
  text: string
  provider: string
  tokensUsed?: number
  error?: string
}

/**
 * Управляет AI провайдерами с паттерном Plan A/Plan B
 */
export class AIProviderManager {
  private config: AIProviderConfig
  private models: Record<string, LanguageModel>

  constructor(config: Partial<AIProviderConfig> = {}) {
    this.config = {
      primaryProvider: 'openai',
      fallbackProvider: 'openai',
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    }

    this.models = {
      openai: openai('gpt-4o-mini'),
      // Можно добавить другие провайдеры при необходимости
      // anthropic: anthropic('claude-3-haiku-20240307'),
      // google: google('gemini-pro'),
    }

    logger.info({
      message: 'AI Provider Manager инициализирован',
      config: this.config,
    })
  }

  /**
   * Получение модели по провайдеру
   */
  private getModel(provider: string): LanguageModel {
    const model = this.models[provider]
    if (!model) {
      throw new Error(`Провайдер ${provider} не поддерживается`)
    }
    return model
  }

  /**
   * Выполнение AI анализа с автоматическим fallback
   */
  async analyzeWithAI(
    query: string,
    context: string = '',
    options: {
      maxTokens?: number
      temperature?: number
      systemPrompt?: string
    } = {}
  ): Promise<AIAnalysisResult> {
    const {
      maxTokens = 1000,
      temperature = 0.7,
      systemPrompt = 'Ты AI-ассистент, который анализирует данные и предоставляет детальные ответы на русском языке.',
    } = options

    const messages: CoreMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: context ? `Контекст: ${context}\n\nВопрос: ${query}` : query,
      },
    ]

    // Plan A - основной провайдер
    try {
      const result = await this.executeWithProvider(
        this.config.primaryProvider,
        messages,
        { maxTokens, temperature }
      )

      logger.info({
        message: 'AI Provider: Успешный анализ через основной провайдер',
        provider: this.config.primaryProvider,
        queryLength: query.length,
        responseLength: result.text.length,
      })

      return {
        ...result,
        provider: this.config.primaryProvider,
      }
    } catch (primaryError) {
      logger.warn({
        message: 'AI Provider: Ошибка основного провайдера, переключение на fallback',
        provider: this.config.primaryProvider,
        error: primaryError instanceof Error ? primaryError.message : 'Unknown error',
      })

      // Plan B - fallback провайдер
      try {
        const result = await this.executeWithProvider(
          this.config.fallbackProvider,
          messages,
          { maxTokens, temperature }
        )

        logger.info({
          message: 'AI Provider: Успешный анализ через fallback провайдер',
          provider: this.config.fallbackProvider,
          queryLength: query.length,
          responseLength: result.text.length,
        })

        return {
          ...result,
          provider: `${this.config.fallbackProvider} (fallback)`,
        }
      } catch (fallbackError) {
        logger.error({
          message: 'AI Provider: Ошибка fallback провайдера',
          provider: this.config.fallbackProvider,
          primaryError: primaryError instanceof Error ? primaryError.message : 'Unknown error',
          fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
        })

        return {
          success: false,
          text: 'Извините, все AI провайдеры недоступны в данный момент. Попробуйте позже.',
          provider: 'none',
          error: `Primary: ${primaryError instanceof Error ? primaryError.message : 'Unknown'}, Fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}`,
        }
      }
    }
  }

  /**
   * Выполнение запроса с конкретным провайдером
   */
  private async executeWithProvider(
    provider: string,
    messages: CoreMessage[],
    options: { maxTokens: number; temperature: number }
  ): Promise<{ success: boolean; text: string; tokensUsed?: number }> {
    const model = this.getModel(provider)
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await generateText({
          model,
          messages,
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        })

        return {
          success: true,
          text: result.text,
          tokensUsed: result.usage?.totalTokens,
        }
      } catch (error) {
        const isLastAttempt = attempt === this.config.maxRetries
        
        if (isLastAttempt) {
          throw error
        }

        logger.warn({
          message: 'AI Provider: Ретрай после ошибки',
          provider,
          attempt,
          maxRetries: this.config.maxRetries,
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        // Ждем перед повторной попыткой
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt))
      }
    }

    throw new Error('Максимальное количество попыток превышено')
  }

  /**
   * Проверка здоровья провайдеров
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const healthStatus: Record<string, boolean> = {}

    for (const [providerName, model] of Object.entries(this.models)) {
      try {
        await generateText({
          model,
          messages: [{ role: 'user', content: 'Тест' }],
          maxTokens: 10,
        })
        healthStatus[providerName] = true
      } catch (error) {
        healthStatus[providerName] = false
        logger.warn({
          message: 'AI Provider: Провайдер недоступен',
          provider: providerName,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    logger.info({
      message: 'AI Provider: Проверка здоровья завершена',
      healthStatus,
    })

    return healthStatus
  }

  /**
   * Получение статистики использования
   */
  getUsageStats(): {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageResponseTime: number
  } {
    // В реальной реализации здесь должна быть логика сбора статистики
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
    }
  }

  /**
   * Обновление конфигурации провайдеров
   */
  updateConfig(newConfig: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    logger.info({
      message: 'AI Provider: Конфигурация обновлена',
      newConfig: this.config,
    })
  }
}

/**
 * Глобальный экземпляр менеджера AI провайдеров
 */
export const aiProviderManager = new AIProviderManager({
  primaryProvider: 'openai',
  fallbackProvider: 'openai',
  maxRetries: 3,
  retryDelay: 1000,
})

/**
 * Анализ текста с использованием AI с автоматическим fallback
 */
export async function analyzeWithAI(
  query: string,
  context?: string,
  options?: {
    maxTokens?: number
    temperature?: number
    systemPrompt?: string
  }
): Promise<AIAnalysisResult> {
  return await aiProviderManager.analyzeWithAI(query, context, options)
}

/**
 * Специализированные AI анализаторы
 */
export class SpecializedAIAnalyzers {
  /**
   * Анализ промптов для улучшения
   */
  static async analyzePrompt(prompt: string): Promise<AIAnalysisResult> {
    return await aiProviderManager.analyzeWithAI(
      prompt,
      '',
      {
        systemPrompt: `Ты эксперт по анализу AI промптов. Проанализируй промпт и предложи улучшения:
        1. Структура и ясность
        2. Специфичность и детали
        3. Потенциальные проблемы
        4. Рекомендации по улучшению
        
        Отвечай на русском языке.`,
        maxTokens: 800,
        temperature: 0.3,
      }
    )
  }

  /**
   * Анализ результатов A/B тестирования
   */
  static async analyzeABTestResults(
    planAResults: Record<string, any>,
    planBResults: Record<string, any>
  ): Promise<AIAnalysisResult> {
    const context = `
    План A результаты: ${JSON.stringify(planAResults, null, 2)}
    План B результаты: ${JSON.stringify(planBResults, null, 2)}
    `

    return await aiProviderManager.analyzeWithAI(
      'Проанализируй результаты A/B тестирования и дай рекомендации по оптимизации',
      context,
      {
        systemPrompt: `Ты эксперт по анализу A/B тестирования. Проанализируй результаты и предоставь:
        1. Сравнение производительности планов
        2. Статистическую значимость
        3. Рекомендации по выбору лучшего плана
        4. Предложения по дальнейшему тестированию
        
        Отвечай на русском языке.`,
        maxTokens: 1200,
        temperature: 0.2,
      }
    )
  }

  /**
   * Анализ ошибок системы
   */
  static async analyzeSystemErrors(errors: string[]): Promise<AIAnalysisResult> {
    const context = `Ошибки системы:\n${errors.join('\n')}`

    return await aiProviderManager.analyzeWithAI(
      'Проанализируй системные ошибки и предложи решения',
      context,
      {
        systemPrompt: `Ты системный аналитик. Проанализируй ошибки и предоставь:
        1. Категоризацию ошибок
        2. Потенциальные причины
        3. Приоритетность исправления
        4. Конкретные шаги для решения
        
        Отвечай на русском языке.`,
        maxTokens: 1000,
        temperature: 0.1,
      }
    )
  }
}