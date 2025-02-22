import { supabase } from '@/core/supabase'

export async function getFineTuneIdByTelegramId(telegramId: string) {
  try {
    const { data, error } = await supabase
      .from('model_trainings')
      .select('finetune_id')
      .eq('telegram_id', telegramId)
      .eq('status', 'SUCCESS')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      console.error('Ошибка при получении FineTune ID:', error)
      return null
    }
    return data.finetune_id
  } catch (error) {
    console.error('Ошибка при получении FineTune ID:', error)
    return null
  }
}
