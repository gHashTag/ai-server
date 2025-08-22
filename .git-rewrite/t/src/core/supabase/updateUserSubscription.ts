import { supabase } from '.'

export const updateUserSubscription = async (
  telegram_id: string,
  subscription: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ subscription })
      .eq('telegram_id', telegram_id)

    if (error) {
      console.error('Ошибка при обновлении подписки пользователя:', error)
      throw new Error('Не удалось обновить подписку пользователя')
    }
  } catch (error) {
    console.error('Ошибка при обновлении подписки пользователя:', error)
    throw new Error('Не удалось обновить подписку пользователя')
  }
}
