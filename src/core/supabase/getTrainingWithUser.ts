import { supabase } from '@/core/supabase'

export async function getTrainingWithUser(trainingId: string) {
  try {
    const { data, error } = await supabase
      .from('model_trainings')
      .select(
        `*,
        users (
          bot_name,
          telegram_id,
          language_code
        )
      `
      )
      .eq('replicate_training_id', trainingId)
      .single()

    if (error) {
      console.error('❌ Training fetch error:', error)
      return null
    }
    console.log('data', data)

    return data as {
      id: string
      model_name: string
      users: {
        bot_name: string
        telegram_id: number
        language_code: string
      } | null
    }
  } catch (error) {
    console.error('❌ Training fetch error:', error)
    return null
  }
}
