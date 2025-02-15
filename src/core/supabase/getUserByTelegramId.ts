import { supabase } from '.'

export async function getUserByTelegramId(telegram_id: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegram_id.toString())
      .single()
    console.log('data', data)
    if (error) {
      console.error('Error fetching user by Telegram ID:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Unexpected error fetching user by Telegram ID:', error)
    return null
  }
}
