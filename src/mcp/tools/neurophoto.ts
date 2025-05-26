import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { mcpConfig } from '../config.js'
import { supabase } from '../../core/supabase/index.js'

interface CreateNeuroPhotoArgs {
  prompt: string
  gender: 'male' | 'female'
  telegram_id: string
}

/**
 * Получает последнюю успешную модель пользователя из базы данных (ТОЛЬКО Replicate)
 */
async function getLatestUserModel(telegramId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('model_trainings')
      .select('model_url')
      .eq('telegram_id', telegramId.toString())
      .eq('status', 'SUCCESS')
      .or('api.is.null,api.eq.replicate')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      console.error('Ошибка при получении модели пользователя:', error)
      return null
    }

    return data.model_url
  } catch (error) {
    console.error('Ошибка при получении модели пользователя:', error)
    return null
  }
}

/**
 * Простое логирование для MCP инструментов
 */
const toolLogger = {
  info: (message: string, data?: any) => {
    console.error(
      `[MCP TOOL] ${message}`,
      data ? JSON.stringify(data, null, 2) : ''
    )
  },
  error: (message: string, data?: any) => {
    console.error(
      `[MCP TOOL ERROR] ${message}`,
      data ? JSON.stringify(data, null, 2) : ''
    )
  },
}

/**
 * Инструмент для создания нейрофото через MCP
 * Интегрируется с реальным API эндпоинтом /api/generate/neuro-photo
 */
export async function createNeuroPhoto(
  args: CreateNeuroPhotoArgs
): Promise<CallToolResult> {
  try {
    toolLogger.info('🎨 MCP: Создание нейрофото:', {
      description: 'MCP tool: creating neurophoto',
      prompt: args.prompt,
      gender: args.gender,
      telegram_id: args.telegram_id,
    })

    // Получаем реальный model_url пользователя из базы данных (ТОЛЬКО Replicate)
    const model_url = await getLatestUserModel(args.telegram_id)

    if (!model_url) {
      const errorResponse = {
        success: false,
        error: 'У пользователя нет обученных моделей Replicate',
        message:
          'Для создания нейрофото необходимо сначала обучить модель через Replicate',
        parameters: {
          prompt: args.prompt,
          gender: args.gender,
          telegram_id: args.telegram_id,
        },
        troubleshooting: {
          solution: 'Обучите модель через команду /train в Telegram боте',
          check_status: 'Убедитесь, что обучение модели завершено успешно',
          note: 'MCP инструмент работает только с Replicate моделями (нейрофото 1)',
        },
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorResponse, null, 2),
          },
        ],
      }
    }

    // Подготавливаем данные для Replicate API (нейрофото 1)
    const requestBody = {
      prompt: args.prompt,
      model_url: model_url,
      num_images: mcpConfig.defaultNumImages,
      telegram_id: args.telegram_id,
      username: `mcp_user_${args.telegram_id}`,
      is_ru: mcpConfig.defaultLanguage,
      bot_name: mcpConfig.defaultBotName,
    }

    const apiEndpoint = `${mcpConfig.serverUrl}/generate/neuro-photo`

    toolLogger.info('🌐 MCP: Отправка запроса к Replicate API:', {
      description: 'MCP tool: sending API request to Replicate',
      url: apiEndpoint,
      body: requestBody,
    })

    // Выполняем HTTP запрос к Replicate API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const apiResponse = await response.json()

    toolLogger.info('✅ MCP: API ответ получен:', {
      description: 'MCP tool: API response received',
      telegram_id: args.telegram_id,
      response: apiResponse,
    })

    // Формируем ответ для Replicate API
    const successResponse = {
      success: apiResponse.success || true,
      message:
        apiResponse.message || 'Нейрофото поставлено в очередь на генерацию',
      api_type: 'replicate',
      images: apiResponse.images || [],
      count: apiResponse.count || 0,
      estimated_time: apiResponse.images?.length > 0 ? 'Готово!' : '2-3 минуты',
      note:
        apiResponse.images?.length > 0
          ? 'Изображения готовы! Ссылки выше.'
          : 'Результат будет отправлен в Telegram бот. Проверьте ваши сообщения.',
      parameters: {
        prompt: args.prompt,
        gender: args.gender,
        telegram_id: args.telegram_id,
        num_images: mcpConfig.defaultNumImages,
        is_ru: mcpConfig.defaultLanguage,
        bot_name: mcpConfig.defaultBotName,
      },
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(successResponse, null, 2),
        },
      ],
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    toolLogger.error('❌ MCP: Ошибка создания нейрофото:', {
      description: 'MCP tool: neurophoto creation error',
      telegram_id: args.telegram_id,
      error: errorMessage,
      error_details: error,
    })

    // Формируем ответ об ошибке
    const errorResponse = {
      success: false,
      error: errorMessage,
      message: 'Произошла ошибка при создании нейрофото',
      parameters: {
        prompt: args.prompt,
        gender: args.gender,
        telegram_id: args.telegram_id,
      },
      troubleshooting: {
        check_server:
          'Убедитесь, что ai-server запущен на ' + mcpConfig.serverUrl,
        check_balance: 'Проверьте баланс пользователя в Telegram боте',
        check_telegram_id:
          'Убедитесь, что telegram_id корректен и пользователь существует',
      },
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(errorResponse, null, 2),
        },
      ],
    }
  }
}
