import { supabase } from '.'

export const getAspectRatio = async (telegram_id: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('aspect_ratio')
    .eq('telegram_id', telegram_id)
    .single()

  if (error || !data) {
    console.error('Ошибка при получении aspect_ratio для telegram_id:', error)
    return null
  }

  return data.aspect_ratio
}
