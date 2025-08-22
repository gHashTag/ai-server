import { supabase } from './'

export const updateTrainingWithCancelUrl = async (
  trainingId: string,
  cancelUrl: string
) => {
  try {
    const { data, error } = await supabase
      .from('model_trainings')
      .update({ cancel_url: cancelUrl })
      .eq('replicate_training_id', trainingId)

    if (error) throw error
    return data
  } catch (error) {
    console.error('🔥 Ошибка обновления URL отмены:', error)
    return null
  }
}
