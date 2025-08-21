import { pulseBot } from '@/config'
import fs from 'fs'

export const pulse = async (
  image: string,
  prompt: string,
  command: string,
  telegram_id: string,
  username: string,
  is_ru: boolean,
  bot_name?: string
) => {
  try {
    if (process.env.NODE_ENV === 'development') return

    // Проверяем права бота в канале
    try {
      await pulseBot.telegram.getChatMember(
        '@neuro_blogger_pulse',
        pulseBot.botInfo?.id ?? 0
      )
    } catch (error) {
      console.error('Bot does not have access to channel:', error)
      return // Молча возвращаемся если нет прав, чтобы не блокировать основной процесс
    }

    const truncatedPrompt = prompt.length > 800 ? prompt.slice(0, 800) : prompt
    const caption = is_ru
      ? `@${
          username || 'Пользователь без username'
        } Telegram ID: ${telegram_id} сгенерировал изображение с промптом: ${truncatedPrompt} \n\n Команда: ${command} \n\n Bot: @${bot_name}`
      : `@${
          username || 'User without username'
        } Telegram ID: ${telegram_id} generated an image with a prompt: ${truncatedPrompt} \n\n Command: ${command} \n\n Bot: @${bot_name}`

    const chatId = '@neuro_blogger_pulse'

    // Проверяем существование файла
    if (!fs.existsSync(image)) {
      console.error('Image file does not exist:', image)
      return // Молча возвращаемся если файла нет
    }

    // send image as buffer
    await pulseBot.telegram.sendPhoto(
      chatId,
      { source: fs.createReadStream(image) },
      { caption }
    )
  } catch (error: any) {
    console.error('Error sending pulse:', {
      error: error.message,
      stack: error.stack,
      botId: pulseBot.botInfo?.id,
      chatId: '@neuro_blogger_pulse',
      imageExists: fs.existsSync(image),
    })

    // Молча возвращаемся чтобы не блокировать основной процесс
    return
  }
}
