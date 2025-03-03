import { supabase } from '.'

export const updatePrompt = async (
  task_id: number,
  mediaUrl: string,
  status?: string
): Promise<{
  telegram_id: string
  username: string
  bot_name: string
  language_code: string
  prompt: string
} | null> => {
  try {
    // Сначала получаем данные по task_id
    const { data: existingData, error: selectError } = await supabase
      .from('prompts_history')
      .select('telegram_id, prompt, users(bot_name, language_code, username)')
      .eq('task_id', task_id)
      .single()
    console.log('updatePrompt: existingData', existingData)

    if (selectError || !existingData) {
      console.error('Ошибка при получении данных промпта:', selectError)
      return null
    }

    // Обновляем запись, если она существует
    const { error: updateError } = await supabase
      .from('prompts_history')
      .update({ media_url: mediaUrl, status: status })
      .eq('task_id', task_id)

    if (updateError) {
      console.error(
        'Ошибка при обновлении промпта с изображением:',
        updateError
      )
      return null
    }

    const telegram_id = existingData.telegram_id
    // @ts-ignore
    const username = existingData.users.username
    // @ts-ignore
    const bot_name = existingData.users.bot_name
    // @ts-ignore
    const language_code = existingData.users.language_code

    const prompt = existingData.prompt

    return {
      telegram_id,
      username,
      bot_name,
      language_code,
      prompt,
    }
  } catch (error) {
    console.error('Ошибка при обновлении промпта с изображением:', error)
    return null
  }
}
