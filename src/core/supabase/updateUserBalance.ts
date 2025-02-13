import { supabase } from '.'

export const updateUserBalance = async (
  telegram_id: string,
  newBalance: number
): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .update({ balance: newBalance })
    .eq('telegram_id', telegram_id)

  if (error) {
    console.error('Ошибка при обновлении баланса:', error)
    throw new Error('Не удалось обновить баланс пользователя')
  }
}
