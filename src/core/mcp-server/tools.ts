import { inngest } from '@/core/inngest-client/clients'
import { logger } from '@/utils/logger'
import { abTestManager, measureExecution } from './ab-testing'

/**
 * Интерфейсы для всех MCP инструментов
 */
export interface McpToolResponse {
  content: Array<{
    type: 'text'
    text: string
  }>
}

/**
 * Определение всех доступных MCP инструментов
 */
export const MCP_TOOLS = [
  {
    name: 'generate_text_to_image',
    description: 'Генерация изображения из текста с использованием AI моделей (Flux, DALL-E и др.)',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Промпт для генерации изображения'
        },
        model: {
          type: 'string',
          description: 'Модель для генерации (flux-pro, dall-e-3, midjourney)',
          default: 'flux-pro'
        },
        telegram_id: {
          type: 'string',
          description: 'ID пользователя в Telegram'
        },
        username: {
          type: 'string',
          description: 'Имя пользователя',
          default: 'user'
        },
        bot_name: {
          type: 'string',
          description: 'Имя бота для обработки'
        }
      },
      required: ['prompt', 'telegram_id', 'bot_name']
    }
  },
  {
    name: 'generate_text_to_video',
    description: 'Генерация видео из текста с использованием современных AI моделей',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Промпт для генерации видео'
        },
        telegram_id: {
          type: 'string',
          description: 'ID пользователя в Telegram'
        },
        username: {
          type: 'string',
          description: 'Имя пользователя',
          default: 'user'
        },
        bot_name: {
          type: 'string',
          description: 'Имя бота для обработки'
        }
      },
      required: ['prompt', 'telegram_id', 'bot_name']
    }
  },
  {
    name: 'generate_image_to_video',
    description: 'Генерация видео из изображения (анимация статических изображений)',
    inputSchema: {
      type: 'object',
      properties: {
        image_url: {
          type: 'string',
          description: 'URL изображения для анимации'
        },
        prompt: {
          type: 'string',
          description: 'Промпт для описания анимации',
          default: ''
        },
        telegram_id: {
          type: 'string',
          description: 'ID пользователя в Telegram'
        },
        username: {
          type: 'string',
          description: 'Имя пользователя',
          default: 'user'
        },
        bot_name: {
          type: 'string',
          description: 'Имя бота для обработки'
        }
      },
      required: ['image_url', 'telegram_id', 'bot_name']
    }
  },
  {
    name: 'generate_speech',
    description: 'Генерация речи из текста с использованием ElevenLabs',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Текст для озвучивания'
        },
        voice_id: {
          type: 'string',
          description: 'ID голоса для генерации'
        },
        telegram_id: {
          type: 'string',
          description: 'ID пользователя в Telegram'
        },
        username: {
          type: 'string',
          description: 'Имя пользователя',
          default: 'user'
        },
        bot_name: {
          type: 'string',
          description: 'Имя бота для обработки'
        }
      },
      required: ['text', 'telegram_id', 'bot_name']
    }
  },
  {
    name: 'create_voice_avatar',
    description: 'Создание голосового аватара с клонированием голоса',
    inputSchema: {
      type: 'object',
      properties: {
        audio_file_url: {
          type: 'string',
          description: 'URL аудиофайла для клонирования голоса'
        },
        name: {
          type: 'string',
          description: 'Имя для голосового аватара'
        },
        telegram_id: {
          type: 'string',
          description: 'ID пользователя в Telegram'
        },
        username: {
          type: 'string',
          description: 'Имя пользователя',
          default: 'user'
        },
        bot_name: {
          type: 'string',
          description: 'Имя бота для обработки'
        }
      },
      required: ['audio_file_url', 'name', 'telegram_id', 'bot_name']
    }
  },
  {
    name: 'generate_neuro_image',
    description: 'Генерация персонализированного изображения с использованием обученной модели',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Промпт для генерации'
        },
        model_url: {
          type: 'string',
          description: 'URL обученной модели'
        },
        num_images: {
          type: 'number',
          description: 'Количество изображений для генерации',
          default: 1
        },
        telegram_id: {
          type: 'string',
          description: 'ID пользователя в Telegram'
        },
        username: {
          type: 'string',
          description: 'Имя пользователя',
          default: 'user'
        },
        bot_name: {
          type: 'string',
          description: 'Имя бота для обработки'
        }
      },
      required: ['prompt', 'model_url', 'telegram_id', 'bot_name']
    }
  },
  {
    name: 'generate_neuro_image_v2',
    description: 'Генерация персонализированного изображения v2 с улучшенными возможностями',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Промпт для генерации'
        },
        model_url: {
          type: 'string',
          description: 'URL обученной модели'
        },
        num_images: {
          type: 'number',
          description: 'Количество изображений для генерации',
          default: 1
        },
        telegram_id: {
          type: 'string',
          description: 'ID пользователя в Telegram'
        },
        username: {
          type: 'string',
          description: 'Имя пользователя',
          default: 'user'
        },
        bot_name: {
          type: 'string',
          description: 'Имя бота для обработки'
        }
      },
      required: ['prompt', 'model_url', 'telegram_id', 'bot_name']
    }
  },
  {
    name: 'generate_image_to_prompt',
    description: 'Генерация промпта из изображения (обратная инженерия промптов)',
    inputSchema: {
      type: 'object',
      properties: {
        image_url: {
          type: 'string',
          description: 'URL изображения для анализа'
        },
        telegram_id: {
          type: 'string',
          description: 'ID пользователя в Telegram'
        },
        username: {
          type: 'string',
          description: 'Имя пользователя',
          default: 'user'
        },
        bot_name: {
          type: 'string',
          description: 'Имя бота для обработки'
        }
      },
      required: ['image_url', 'telegram_id', 'bot_name']
    }
  },
  {
    name: 'generate_lip_sync',
    description: 'Генерация лип-синк видео (синхронизация губ с аудио)',
    inputSchema: {
      type: 'object',
      properties: {
        video_url: {
          type: 'string',
          description: 'URL видео для лип-синка'
        },
        audio_url: {
          type: 'string',
          description: 'URL аудио для синхронизации'
        },
        telegram_id: {
          type: 'string',
          description: 'ID пользователя в Telegram'
        },
        username: {
          type: 'string',
          description: 'Имя пользователя',
          default: 'user'
        },
        bot_name: {
          type: 'string',
          description: 'Имя бота для обработки'
        }
      },
      required: ['video_url', 'audio_url', 'telegram_id', 'bot_name']
    }
  },
  {
    name: 'generate_model_training',
    description: 'Запуск обучения персонализированной AI модели',
    inputSchema: {
      type: 'object',
      properties: {
        training_data_urls: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Массив URL изображений для обучения'
        },
        model_name: {
          type: 'string',
          description: 'Имя модели для обучения'
        },
        telegram_id: {
          type: 'string',
          description: 'ID пользователя в Telegram'
        },
        username: {
          type: 'string',
          description: 'Имя пользователя',
          default: 'user'
        },
        bot_name: {
          type: 'string',
          description: 'Имя бота для обработки'
        }
      },
      required: ['training_data_urls', 'model_name', 'telegram_id', 'bot_name']
    }
  },
  {
    name: 'generate_model_training_v2',
    description: 'Запуск обучения персонализированной AI модели v2 с улучшенными алгоритмами',
    inputSchema: {
      type: 'object',
      properties: {
        training_data_urls: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Массив URL изображений для обучения'
        },
        model_name: {
          type: 'string',
          description: 'Имя модели для обучения'
        },
        telegram_id: {
          type: 'string',
          description: 'ID пользователя в Telegram'
        },
        username: {
          type: 'string',
          description: 'Имя пользователя',
          default: 'user'
        },
        bot_name: {
          type: 'string',
          description: 'Имя бота для обработки'
        }
      },
      required: ['training_data_urls', 'model_name', 'telegram_id', 'bot_name']
    }
  }
] as const

/**
 * Класс для обработки инструментов MCP с паттерном Plan A/Plan B
 */
export class MCPToolHandler {
  private abTestPercentage: number
  private fallbackMode: boolean
  private useInngest: boolean

  constructor(config: {
    abTestPercentage?: number
    fallbackMode?: boolean
    useInngest?: boolean
  } = {}) {
    this.abTestPercentage = config.abTestPercentage ?? 50
    this.fallbackMode = config.fallbackMode ?? false
    this.useInngest = config.useInngest ?? true
  }

  /**
   * Определяет, какой план использовать для выполнения с использованием A/B тестирования
   */
  private shouldUsePlanA(userId?: string): boolean {
    if (this.fallbackMode) {
      return false // Принудительный Plan B
    }

    if (!this.useInngest) {
      return false // Inngest отключен
    }

    // Используем A/B тест менеджер для принятия решения
    const plan = abTestManager.decidePlan(userId)
    const usePlanA = plan === 'A'

    logger.info({
      message: 'MCP Tools: Выбор плана выполнения через A/B тестирование',
      plan: usePlanA ? 'A (Inngest)' : 'B (Direct)',
      userId,
      abTestConfig: {
        enabled: true,
        planAPercentage: this.abTestPercentage,
      },
    })

    return usePlanA
  }

  /**
   * План A - выполнение через Inngest очередь
   */
  private async executePlanA(toolName: string, eventName: string, data: Record<string, any>): Promise<McpToolResponse> {
    await inngest.send({
      name: eventName,
      data,
    })

    logger.info({
      message: 'MCP Tools: Задача отправлена в Inngest очередь',
      tool: toolName,
      event: eventName,
      userId: data.telegram_id,
    })

    return {
      content: [
        {
          type: 'text',
          text: `✅ ${toolName} запущен через Plan A (Inngest)\n` +
                `📋 Задача добавлена в очередь\n` +
                `👤 Пользователь: ${data.telegram_id}\n` +
                `⏱️ Статус: В обработке`,
        },
      ],
    }
  }

  /**
   * План B - прямое выполнение сервиса
   */
  private async executePlanB(toolName: string, serviceFunction: () => Promise<any>, data: Record<string, any>): Promise<McpToolResponse> {
    try {
      const result = await serviceFunction()

      logger.info({
        message: 'MCP Tools: Сервис выполнен напрямую',
        tool: toolName,
        userId: data.telegram_id,
        success: !!result,
      })

      return {
        content: [
          {
            type: 'text',
            text: `✅ ${toolName} выполнен через Plan B (Direct)\n` +
                  `📋 Результат: ${result ? 'Успешно' : 'Ошибка'}\n` +
                  `👤 Пользователь: ${data.telegram_id}\n` +
                  `⏱️ Статус: Завершено`,
          },
        ],
      }
    } catch (error) {
      logger.error({
        message: 'MCP Tools: Ошибка выполнения Plan B',
        tool: toolName,
        userId: data.telegram_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    }
  }

  /**
   * Универсальный обработчик инструментов с A/B тестированием
   */
  async handleTool(toolName: string, args: Record<string, any>): Promise<McpToolResponse> {
    // Подготовка данных для обеих планов
    const {
      telegram_id,
      username = 'user',
      bot_name,
      ...otherArgs
    } = args

    const commonData = {
      telegram_id,
      username,
      bot_name,
      is_ru: true,
      ...otherArgs,
    }

    // Определение плана с учетом user ID для консистентности
    const planA = this.shouldUsePlanA(telegram_id)
    const chosenPlan = planA ? 'A' : 'B'

    if (planA) {
      // Plan A - Inngest очередь с измерением производительности
      const eventMap: Record<string, string> = {
        'generate_text_to_image': 'image/text-to-image.start',
        'generate_text_to_video': 'video/text-to-video.start',
        'generate_image_to_video': 'video/image-to-video.start',
        'generate_speech': 'speech/text-to-speech.start',
        'create_voice_avatar': 'speech/voice-avatar.start',
        'generate_neuro_image': 'image/neuro-image.start',
        'generate_neuro_image_v2': 'image/neuro-image-v2.start',
        'generate_image_to_prompt': 'image/image-to-prompt.start',
        'generate_lip_sync': 'video/lip-sync.start',
        'generate_model_training': 'model/training.start',
        'generate_model_training_v2': 'model/training-v2.start',
      }

      const eventName = eventMap[toolName]
      if (!eventName) {
        throw new Error(`Неизвестный инструмент для Plan A: ${toolName}`)
      }

      return await measureExecution(
        'A',
        () => this.executePlanA(toolName, eventName, commonData),
        telegram_id,
        { toolName, args: Object.keys(args) }
      )
    } else {
      // Plan B - Прямые сервисы с измерением производительности
      return await measureExecution(
        'B',
        () => this.executePlanBForTool(toolName, commonData),
        telegram_id,
        { toolName, args: Object.keys(args) }
      )
    }
  }

  /**
   * Plan B выполнение для конкретных инструментов
   */
  private async executePlanBForTool(toolName: string, data: Record<string, any>): Promise<McpToolResponse> {
    const { getBotByName } = await import('@/core/bot')
    const { bot } = getBotByName(data.bot_name)
    
    if (!bot) {
      throw new Error(`Бот ${data.bot_name} не найден`)
    }

    switch (toolName) {
      case 'generate_text_to_image': {
        const { generateTextToImage } = await import('@/services/generateTextToImage')
        return await this.executePlanB(
          toolName,
          () => generateTextToImage(data.prompt, data.model || 'flux-pro', data.telegram_id, data.username, data.is_ru, bot),
          data
        )
      }

      case 'generate_text_to_video': {
        const { generateTextToVideo } = await import('@/services/generateTextToVideo')
        return await this.executePlanB(
          toolName,
          () => generateTextToVideo(data.prompt, data.telegram_id, data.username, data.is_ru, bot),
          data
        )
      }

      case 'generate_image_to_video': {
        const { generateImageToVideo } = await import('@/services/generateImageToVideo')
        return await this.executePlanB(
          toolName,
          () => generateImageToVideo(data.image_url, data.prompt || '', data.telegram_id, data.username, data.is_ru, bot),
          data
        )
      }

      case 'generate_speech': {
        const { generateSpeech } = await import('@/services/generateSpeech')
        return await this.executePlanB(
          toolName,
          () => generateSpeech(data.text, data.voice_id, data.telegram_id, data.username, data.is_ru, bot),
          data
        )
      }

      case 'create_voice_avatar': {
        const { createVoiceAvatar } = await import('@/services/createVoiceAvatar')
        return await this.executePlanB(
          toolName,
          () => createVoiceAvatar(data.audio_file_url, data.name, data.telegram_id, data.username, data.is_ru, bot),
          data
        )
      }

      case 'generate_neuro_image': {
        const { generateNeuroImage } = await import('@/services/generateNeuroImage')
        return await this.executePlanB(
          toolName,
          () => generateNeuroImage(data.prompt, data.model_url, data.num_images || 1, data.telegram_id, data.username, data.is_ru, bot),
          data
        )
      }

      case 'generate_neuro_image_v2': {
        const { generateNeuroImageV2 } = await import('@/services/generateNeuroImageV2')
        return await this.executePlanB(
          toolName,
          () => generateNeuroImageV2(data.prompt, data.model_url, data.num_images || 1, data.telegram_id, data.username, data.is_ru, bot),
          data
        )
      }

      case 'generate_image_to_prompt': {
        const { generateImageToPrompt } = await import('@/services/generateImageToPrompt')
        return await this.executePlanB(
          toolName,
          () => generateImageToPrompt(data.image_url, data.telegram_id, data.username, data.is_ru, bot),
          data
        )
      }

      case 'generate_lip_sync': {
        const { generateLipSync } = await import('@/services/generateLipSync')
        return await this.executePlanB(
          toolName,
          () => generateLipSync(data.video_url, data.audio_url, data.telegram_id, data.username, data.is_ru, bot),
          data
        )
      }

      case 'generate_model_training_v2': {
        const { generateModelTrainingV2 } = await import('@/services/generateModelTrainingV2')
        return await this.executePlanB(
          toolName,
          () => generateModelTrainingV2(data.training_data_urls, data.model_name, data.telegram_id, data.username, data.is_ru, bot),
          data
        )
      }

      default:
        throw new Error(`Неизвестный инструмент для Plan B: ${toolName}`)
    }
  }
}