import { supabase } from '.'

export const updateUserBalance = async (
  telegram_id: string,
  newBalance: number,
  amount: number,
  type: 'income' | 'outcome',
  description?: string,
  options?: {
    stars?: number
    payment_method?: string
    bot_name?: string
    language?: string
  }
): Promise<void> => {
  try {
    // Обновляем баланс пользователя
    const { error: balanceError } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('telegram_id', telegram_id)

    if (balanceError) {
      throw new Error('Не удалось обновить баланс пользователя')
    }

    const invId = String(Math.floor(Math.random() * 1000000))
    const paymentId = Math.floor(Math.random() * 1000000)

    // Преобразуем stars в целое число
    const starsValue =
      options?.stars !== undefined
        ? Math.floor(options.stars)
        : Math.floor(Math.abs(amount))

    // Создаем запись о транзакции
    const { error: paymentError } = await supabase.from('payments').insert({
      telegram_id,
      inv_id: invId,
      payment_id: paymentId,
      currency: 'STARS',
      amount: Math.abs(amount),
      status: 'COMPLETED',
      stars: starsValue, // Гарантированно целое число
      type,
      description: description || `Balance ${type}`,
      payment_method: options?.payment_method || 'System',
      bot_name: options?.bot_name || 'neuro_blogger_bot',
      language: options?.language || 'ru',
      payment_date: new Date(),
    })

    if (paymentError) {
      console.error('Ошибка создания записи о транзакции:', paymentError)
      throw new Error('Не удалось создать запись о транзакции')
    }
  } catch (error) {
    console.error('Ошибка при обновлении баланса:', error)
    throw new Error('Не удалось обновить баланс пользователя')
  }
}
