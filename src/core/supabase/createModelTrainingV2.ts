import { supabase } from '.'

export interface ModelTrainingV2 {
  finetune_id: string
  telegram_id: string
  model_name: string
  trigger_word: string
  zip_url: string
  model_url?: string
  replicate_training_id?: string
  status?: string
  error?: string
  steps?: number
  api: string
}

export const createModelTrainingV2 = async (training: ModelTrainingV2) => {
  const { error } = await supabase.from('model_trainings').insert(training)
  if (error)
    throw new Error(`Ошибка при создании записи о тренировке: ${error.message}`)
}
