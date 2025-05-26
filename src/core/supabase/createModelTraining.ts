import { supabase } from '@/core/supabase'
import { logger } from '@utils/logger'

// Интерфейс для данных тренировки
export interface TrainingData {
  telegram_id: string | number
  model_name: string
  trigger_word: string
  zip_url: string
  steps: string | number
  replicate_training_id?: string
  cancel_url?: string
  status?: string
  api?: string
  error?: string
  gender?: string
  bot_name?: string
}

/**
 * Сохраняет информацию о тренировке модели в базу данных
 */
export async function createModelTraining(trainingData: TrainingData) {
  logger.info({
    message: 'Сохраняем информацию о тренировке в базу данных',
    telegram_id: trainingData.telegram_id,
    model_name: trainingData.model_name,
    gender: trainingData.gender,
    bot_name: trainingData.bot_name,
    fullTrainingData: trainingData,
  })

  try {
    // Подготавливаем данные для вставки
    const insertData = {
      telegram_id: trainingData.telegram_id,
      model_name: trainingData.model_name,
      trigger_word: trainingData.trigger_word,
      zip_url: trainingData.zip_url,
      steps: Number(trainingData.steps),
      replicate_training_id: trainingData.replicate_training_id,
      status: trainingData.status || 'processing',
      api: trainingData.api || 'replicate',
      cancel_url: trainingData.cancel_url,
      error: trainingData.error,
      gender: trainingData.gender,
      bot_name: trainingData.bot_name,
    }

    logger.info({
      message: '🔍 Данные для вставки в БД',
      insertData,
      gender_value: insertData.gender,
      bot_name_value: insertData.bot_name,
    })

    // Создаем запись в таблице model_trainings
    const { data: dbTraining, error } = await supabase
      .from('model_trainings')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      logger.error({
        message: 'Ошибка при сохранении в БД',
        error: error.message,
        telegram_id: trainingData.telegram_id,
      })
      throw new Error(`Ошибка при сохранении в БД: ${error.message}`)
    }

    logger.info({
      message: 'Данные успешно сохранены в БД',
      dbRecordId: dbTraining.id,
      telegram_id: trainingData.telegram_id,
      model_name: trainingData.model_name,
    })

    return dbTraining
  } catch (error) {
    logger.error({
      message: 'Критическая ошибка при сохранении в БД',
      error: error.message,
      telegram_id: trainingData.telegram_id,
      model_name: trainingData.model_name,
    })

    throw error
  }
}

/**
 * Обновляет статус тренировки модели в базе данных
 */
export async function updateTrainingStatus(
  trainingId: string,
  updates: Partial<{
    status: string
    model_url: string
    error: string
    result: string
  }>
) {
  try {
    const { data, error } = await supabase
      .from('model_trainings')
      .update(updates)
      .eq('replicate_training_id', trainingId)
      .select()
      .single()

    if (error) {
      logger.error({
        message: 'Ошибка при обновлении статуса тренировки',
        error: error.message,
        trainingId,
      })
      return { success: false, error }
    }

    logger.info({
      message: 'Статус тренировки обновлен',
      trainingId,
      newStatus: updates.status,
      dbRecordId: data.id,
    })

    return { success: true, data }
  } catch (error) {
    logger.error({
      message: 'Критическая ошибка при обновлении статуса',
      error: error.message,
      trainingId,
    })

    return { success: false, error }
  }
}
