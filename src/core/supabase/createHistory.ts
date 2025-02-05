import { supabase } from '@/core/supabase'

export async function createHistory({
  roll,
  report,
  telegram_id,
  username,
  language_code,
  is_finished,
  loka,
  previous_loka,
  direction,
  consecutive_sixes,
  position_before_three_sixes,
}: {
  roll: number
  report: string
  telegram_id: string
  username: string
  language_code: string
  is_finished: boolean
  loka: number
  previous_loka: number
  direction: string
  consecutive_sixes: number
  position_before_three_sixes: number
}): Promise<string> {
  console.log('CASE: updateHistory')

  const { data, error } = await supabase.from('game').insert({
    telegram_id,
    username,
    language_code,
    report,
    is_finished,
    roll,
    loka,
    previous_loka,
    direction,
    consecutive_sixes,
    position_before_three_sixes,
  })

  console.log(data, 'CreateHistory data')

  if (error) {
    throw new Error(error.message)
  }

  return data
}
