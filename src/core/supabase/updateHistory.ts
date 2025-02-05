import { supabase } from '@/core/supabase'

export async function updateHistory({
  telegram_id,
  report,
  ai_response,
}: {
  telegram_id: string
  report: string
  ai_response: string
}): Promise<string> {
  console.log('CASE: updateHistory')

  const { data, error } = await supabase
    .from('game')
    .update({
      report,
      ai_response,
    })
    .eq('telegram_id', telegram_id)
    .order('created_at', { ascending: false })
    .limit(1)

  console.log(data, 'data')

  if (error) {
    throw new Error(error.message)
  }

  return data
}
