/**
 * Wrapper функции для обеспечения обратной совместимости
 * между оригинальными функциями и их V2 версиями
 *
 * Этот файл содержит wrapper'ы, которые позволяют существующему коду
 * использовать новые V2 функции без изменения API
 */

import { logger } from '@/utils/logger'
import { getUserDataV2, type UserField } from './getUserDataV2'
import { updateUserVoiceV2 } from './updateUserVoiceV2'
import { updateUserSubscriptionV2 } from './updateUserSubscriptionV2'
import { SubscriptionType } from '@/interfaces/subscription.interface'

// === WRAPPER FOR getUserData ===

/**
 * Wrapper для getUserData - обеспечивает обратную совместимость
 * Использует getUserDataV2 под капотом
 */
export const getUserDataWrapper = async (telegram_id: string) => {
  try {
    logger.info('🔄 Wrapper: getUserData → getUserDataV2', {
      telegram_id,
      wrapper_type: 'getUserData',
    })

    const result = await getUserDataV2({
      telegram_id,
      fields: [
        'username',
        'first_name',
        'last_name',
        'company',
        'position',
        'designation',
      ] as UserField[],
    })

    if (!result) {
      throw new Error(
        `Ошибка при получении данных пользователя: пользователь не найден`
      )
    }

    // Возвращаем в том же формате, что и оригинальная функция
    return {
      username: result.username,
      first_name: result.first_name,
      last_name: result.last_name,
      company: result.company,
      position: result.position,
      designation: result.designation,
    }
  } catch (error) {
    logger.error('❌ Ошибка в getUserDataWrapper:', {
      error: error instanceof Error ? error.message : String(error),
      telegram_id,
    })
    throw error
  }
}

// === WRAPPER FOR updateUserVoice ===

/**
 * Wrapper для updateUserVoice - обеспечивает обратную совместимость
 * Использует updateUserVoiceV2 под капотом
 */
export const updateUserVoiceWrapper = async (
  telegram_id: string,
  voice_id_elevenlabs: string
): Promise<void> => {
  try {
    logger.info('🔄 Wrapper: updateUserVoice → updateUserVoiceV2', {
      telegram_id,
      voice_id_elevenlabs,
      wrapper_type: 'updateUserVoice',
    })

    const result = await updateUserVoiceV2({
      telegram_id,
      voice_id_elevenlabs,
    })

    if (!result.success) {
      throw new Error(
        result.error_message || 'Ошибка обновления голосовых настроек'
      )
    }

    logger.info('✅ Wrapper: updateUserVoice успешно выполнен', {
      telegram_id,
      voice_id_elevenlabs,
    })
  } catch (error) {
    logger.error('❌ Ошибка в updateUserVoiceWrapper:', {
      error: error instanceof Error ? error.message : String(error),
      telegram_id,
      voice_id_elevenlabs,
    })
    throw error
  }
}

// === WRAPPER FOR updateUserSubscription ===

/**
 * Wrapper для updateUserSubscription - обеспечивает обратную совместимость
 * Использует updateUserSubscriptionV2 под капотом
 */
export const updateUserSubscriptionWrapper = async (
  telegram_id: string,
  subscription: string
): Promise<void> => {
  try {
    logger.info(
      '🔄 Wrapper: updateUserSubscription → updateUserSubscriptionV2',
      {
        telegram_id,
        subscription,
        wrapper_type: 'updateUserSubscription',
      }
    )

    // Валидируем что subscription является валидным SubscriptionType
    if (
      !Object.values(SubscriptionType).includes(
        subscription as SubscriptionType
      )
    ) {
      throw new Error(`Недопустимый тип подписки: ${subscription}`)
    }

    const result = await updateUserSubscriptionV2({
      telegram_id,
      subscription_type: subscription as SubscriptionType,
    })

    if (!result.success) {
      throw new Error(result.error_message || 'Ошибка обновления подписки')
    }

    logger.info('✅ Wrapper: updateUserSubscription успешно выполнен', {
      telegram_id,
      subscription,
    })
  } catch (error) {
    logger.error('❌ Ошибка в updateUserSubscriptionWrapper:', {
      error: error instanceof Error ? error.message : String(error),
      telegram_id,
      subscription,
    })
    throw error
  }
}

// === UTILITY FUNCTIONS ===

/**
 * Получает статистику использования wrapper'ов
 */
export const getWrapperStats = () => {
  return {
    available_wrappers: [
      'getUserDataWrapper',
      'updateUserVoiceWrapper',
      'updateUserSubscriptionWrapper',
    ],
    description: 'Wrapper функции для обратной совместимости V1 → V2',
    migration_status: 'Готовы к использованию',
  }
}
