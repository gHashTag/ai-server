import { supabase } from './'

export async function getPlanNumber(
  telegram_id: string
): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('game')
      .select('*')
      .eq('telegram_id', telegram_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Ошибка при получении последней записи игры:', error)
      return null
    }

    return data || null
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error)
    return null
  }
}
