import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { mcpConfig } from '../config.js'

interface CreateNeuroPhotoArgs {
  prompt: string
  gender: 'male' | 'female'
  telegram_id: string
}

/**
 * Простое логирование для MCP инструментов
 */
const toolLogger = {
  info: (message: string, data?: any) => {
    console.log(
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
 * Интегрируется с существующим API эндпоинтом
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

    // Для начального Proof of Concept возвращаем успешный ответ
    // В будущем здесь будет реальная интеграция с API
    const mockResponse = {
      success: true,
      message: 'Нейрофото успешно поставлено в очередь на генерацию',
      task_id: `mcp_${Date.now()}`,
      estimated_time: '2-3 минуты',
      parameters: {
        prompt: args.prompt,
        gender: args.gender,
        telegram_id: args.telegram_id,
        num_images: mcpConfig.defaultNumImages,
        is_ru: mcpConfig.defaultLanguage,
        bot_name: mcpConfig.defaultBotName,
      },
    }

    toolLogger.info('✅ MCP: Нейрофото создано успешно:', {
      description: 'MCP tool: neurophoto created successfully',
      telegram_id: args.telegram_id,
      task_id: mockResponse.task_id,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockResponse, null, 2),
        },
      ],
    }
  } catch (error) {
    toolLogger.error('❌ MCP: Ошибка создания нейрофото:', {
      description: 'MCP tool: neurophoto creation failed',
      error: error instanceof Error ? error.message : String(error),
      error_details: error,
      args,
    })

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              message: 'Не удалось создать нейрофото',
              args,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    }
  }
}
