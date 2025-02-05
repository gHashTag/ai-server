import bot from '@/core/bot'
import { supabase } from '@/core/supabase'
import { createVoiceElevenLabs } from '@/core/supabase/ai'
import { errorMessage, errorMessageAdmin } from '@/helpers'

export async function createVoiceAvatar(
  fileUrl: string,
  telegram_id: number,
  username: string,
  isRu: boolean
): Promise<{ voiceId: string }> {
  try {
    console.log('createVoiceAvatar', { fileUrl, telegram_id, username, isRu })
    await bot.telegram.sendMessage(
      telegram_id,
      isRu ? '⏳ Создаю голосовой аватар...' : '⏳ Creating voice avatar...'
    )

    const voiceId = await createVoiceElevenLabs({
      fileUrl,
      username,
    })

    console.log('Received voiceId:', voiceId)

    if (!voiceId) {
      console.error('Ошибка при создании голоса: voiceId не получен')
      throw new Error('Ошибка при создании голоса')
    }

    // Сохранение voiceId в таблицу users
    const { error } = await supabase
      .from('users')
      .update({ voice_id_elevenlabs: voiceId })
      .eq('username', username)

    if (error) {
      console.error('Ошибка при сохранении voiceId в базу данных:', error)
      throw new Error('Ошибка при сохранении данных')
    }

    await bot.telegram.sendMessage(
      telegram_id,
      isRu
        ? '🎤 Голос для аватара успешно создан. \n Используйте 🎙️ Текст в голос в меню, чтобы проверить'
        : '🎤 Voice for avatar successfully created! \n Use the 🎙️ Text to speech in the menu to check'
    )

    return { voiceId }
  } catch (error) {
    console.error('Error in createVoiceAvatar:', error)
    errorMessage(error as Error, telegram_id.toString(), isRu)
    errorMessageAdmin(error as Error)
    throw error
  }
}
