import { supabase } from '.'

export const getPrompt = async (prompt_id: string) => {
  const { data, error } = await supabase
    .from('prompts_history')
    .select('*')
    .eq('prompt_id', prompt_id)
    .single()

  if (error || !data) {
    console.error('Ошибка при получении промпта по prompt_id:', error)
    return null
  }

  return data
}
