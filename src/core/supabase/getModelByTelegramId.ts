import { supabase } from '@/core/supabase'

export async function getModelByTelegramId(telegramId: string) {
  try {
    const { data, error } = await supabase
      .from('model_trainings')
      .select('model_name, model_url, status')
      .eq('telegram_id', telegramId)
      .single()

    console.log('getModelByTelegramId', data)

    if (error || !data) {
      console.error('Ошибка при получении модели по Telegram ID:', error)
      return null
    }

    return {
      model_name: data.model_name,
      model_url: data.model_url,
      status: data.status,
    }
  } catch (error) {
    console.error('Ошибка при получении модели по Telegram ID:', error)
    return null
  }
}
