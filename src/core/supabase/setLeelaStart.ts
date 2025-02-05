import { supabase } from '@/core/supabase'

export const setLeelaStart = async (
  telegram_id: string,
  is_leela_start: boolean
) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ is_leela_start: is_leela_start })
      .eq('telegram_id', telegram_id)
    if (error) {
      console.error('Ошибка при установке is_leela_start:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('Ошибка при установке is_leela_start:', error)
    return false
  }
}
