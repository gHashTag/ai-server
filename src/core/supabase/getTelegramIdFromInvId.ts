import { supabase } from '.'

type User = {
  telegram_id: string
  language: string
  first_name?: string
  last_name?: string
  username?: string
  balance?: number
  bot_name?: string
}

export const getTelegramIdFromInvId = async (inv_id: string): Promise<User> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(
        `
        telegram_id,
        language,
        users (
          first_name,
          last_name,
          username,
          balance,
          language_code,
          bot_name
        )
      `
      )
      .eq('inv_id', inv_id)
      .single()

    if (error) {
      console.error('Ошибка получения данных:', error)
      throw error
    }

    // Проверяем, что данные пользователя существуют
    const { telegram_id, language, users } = data
    if (!users) {
      throw new Error('Данные пользователя не найдены')
    }

    //@ts-ignore
    const { first_name, last_name, username, balance, bot_name } = users

    return {
      telegram_id,
      language,
      first_name,
      last_name,
      username,
      balance,
      bot_name,
    }
  } catch (error) {
    console.error('Ошибка получения Telegram ID пользователя:', error)
    throw error
  }
}
