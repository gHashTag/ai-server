import { supabase } from '.'
import { logger } from '@utils/logger'
// Определяем тип для обновлений и экспортируем его
export type UpdateLatestModelTrainingQuick = {
  status?: string
  error?: string
  model_url?: string
  replicate_training_id?: string
}

export const updateLatestModelTrainingQuick = async (
  updates: UpdateLatestModelTrainingQuick,
  api: string
) => {
  try {
    // Обновляем последнюю запись
    const { error: updateError } = await supabase
      .from('model_trainings')
      .update({ ...updates, api })
      .eq('replicate_training_id', updates.replicate_training_id)

    if (updateError) {
      throw new Error(
        `Ошибка при обновлении последней записи о тренировке: ${updateError.message}`
      )
    }
    return 'success'
  } catch (error) {
    logger.error({
      message: 'Ошибка при обновлении последней записи о тренировке',
      error: error.message,
    })
  }
}
