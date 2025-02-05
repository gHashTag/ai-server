import { supabase } from '.'

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
  isRu: boolean
): Promise<GameStep> {
  if (!telegram_id) {
    throw new Error('user_id is undefined or invalid')
  }

  console.log('Fetching last step for telegram_id:', telegram_id)

  const { data: userExists, error: userExistsError } = await supabase
    .from('game')
    .select('*')
    .eq('telegram_id', telegram_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  console.log('userExists', userExists)

  if (userExistsError) {
    console.log(userExistsError, 'userExistsError')
    if (!userExists) {
      const lastStep = {
        loka: 68,
        direction: isRu ? 'Стоп 🛑' : 'Stop 🛑',
        consecutive_sixes: 0,
        position_before_three_sixes: 0,
        is_finished: true,
      }
      await supabase.from('game').insert({
        telegram_id,
        ...lastStep,
      })
      return lastStep
    }
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

  console.log('Last step data:', lastStepData)

  if (!lastStepData || lastStepData.length === 0) {
    return {
      loka: 68,
      direction: isRu ? 'Стоп 🛑' : 'Stop 🛑',
      consecutive_sixes: 0,
      position_before_three_sixes: 0,
      is_finished: true,
    }
  }

  return lastStepData[0]
}
