import { supabase } from '.'
import { startNewGame } from './startNewGame'

export const DIRECTION_OPTIONS = [
  'snake 🐍',
  'arrow 🏹',
  'step 🚶🏼',
  'win 🕉',
  'stop 🛑',
]

export interface GameStep {
  loka: number
  previous_loka?: number
  is_finished: boolean
  direction: (typeof DIRECTION_OPTIONS)[number]
  consecutive_sixes: number
  position_before_three_sixes: number
}

export async function getLastStep(
  telegram_id: string,
  username: string,
  isRu: boolean
): Promise<GameStep> {
  if (!telegram_id) {
    throw new Error('user_id is undefined or invalid')
  }

  console.log('🔍 Получение последнего шага для telegram_id:', telegram_id)

  const { data: userExists, error: userExistsError } = await supabase
    .from('game')
    .select('*')
    .eq('telegram_id', telegram_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  console.log('userExists', userExists)

  if (userExistsError || !userExists) {
    console.log('⚠️ Ошибка или пользователь не найден, начинаем новую игру')
    return await startNewGame(telegram_id, username, isRu)
  }

  const { data: lastStepData, error: lastStepError } = await supabase
    .from('game')
    .select('*')
    .eq('telegram_id', telegram_id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (lastStepError) {
    throw new Error(lastStepError.message)
  }

  console.log('📊 Данные последнего шага:', lastStepData)

  if (!lastStepData || lastStepData.length === 0) {
    return await startNewGame(telegram_id, username, isRu)
  }

  return lastStepData[0]
}
