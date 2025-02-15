import { supabase } from './'

export async function startNewGame(telegram_id: string, isRu: boolean) {
  const initialStep = {
    loka: 68, // начальная позиция
    direction: isRu ? 'Старт 🚀' : 'Start 🚀',
    consecutive_sixes: 0,
    position_before_three_sixes: 0,
    is_finished: true,
  }

  const { data, error } = await supabase.from('game').insert({
    telegram_id,
    ...initialStep,
  })

  if (error) {
    console.error('Ошибка при создании новой игры:', error)
    throw new Error('Не удалось начать новую игру')
  }

  console.log('Новая игра успешно начата:', data)
  return data
}
