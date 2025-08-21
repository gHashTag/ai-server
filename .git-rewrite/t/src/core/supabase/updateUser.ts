import { supabase } from '@/core/supabase'

interface UserData {
  user_id: string
  username: string
  first_name: string
  last_name: string
  is_bot: boolean
  language_code: string
  photo_url: string
}
export async function updateUser(userData: UserData) {
  try {
    const {
      user_id,
      username,
      first_name,
      last_name,
      is_bot,
      language_code,
      photo_url,
    } = userData

    // Выполнение запроса на обновление данных пользователя в Supabase
    const { data, error } = await supabase
      .from('users')
      .update({
        username: username,
        first_name: first_name,
        last_name: last_name,
        is_bot: is_bot,
        language_code: language_code,
        photo_url: photo_url,
      })
      .eq('user_id', user_id)

    if (error) {
      console.error('Error updating user:', error)
      throw error
    }

    console.log('User updated:', data)
    return data
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
}
