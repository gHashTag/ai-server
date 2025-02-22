import { supabase } from '.'

export const updatePrompt = async (
  task_id: number,
  mediaUrl: string
): Promise<{
  telegram_id: string
  username: string
  bot_name: string
  language_code: string
} | null> => {
  try {
    // Сначала получаем данные по prompt_id
    const { data: existingData, error: selectError } = await supabase
      .from('prompts_history')
      .select('telegram_id, users(bot_name, language_code, username)')
      .eq('task_id', task_id)
      .single()
    console.log('existingData', existingData)
    if (selectError || !existingData) {
      console.error('Ошибка при получении данных промпта:', selectError)
      return null
    }

    // Обновляем запись, если она существует
    const { error: updateError } = await supabase
      .from('prompts_history')
      .update({ media_url: mediaUrl })
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

    return {
      telegram_id,
      username,
      bot_name,
      language_code,
    }
  } catch (error) {
    console.error('Ошибка при обновлении промпта с изображением:', error)
    return null
  }
}
