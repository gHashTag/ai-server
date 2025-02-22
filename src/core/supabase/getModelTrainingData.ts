import { supabase } from '@/core/supabase'

export async function getModelTrainingData(finetuneId: string) {
  try {
    const { data, error } = await supabase
      .from('model_trainings')
      .select('telegram_id, users(bot_name, language_code)')
      .eq('finetune_id', finetuneId)
      .single()
    console.log('getModelTrainingData', data)

    if (error || !data) {
      console.error('Ошибка при получении данных о тренировке:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Ошибка при получении данных о тренировке:', error)
    return null
  }
}
