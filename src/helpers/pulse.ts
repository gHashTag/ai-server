import { pulseBot } from '@/config'

export const pulse = async (
  image: string,
  prompt: string,
  command: string,
  telegram_id: string,
  username: string,
  is_ru: boolean
) => {
  try {
    if (process.env.NODE_ENV === 'development') return

    const truncatedPrompt = prompt.length > 800 ? prompt.slice(0, 800) : prompt
    const caption = is_ru
      ? `@${
          username || 'Пользователь без username'
        } Telegram ID: ${telegram_id} сгенерировал изображение с промптом: ${truncatedPrompt} \n\n Команда: ${command}`
      : `@${
          username || 'User without username'
        } Telegram ID: ${telegram_id} generated an image with a prompt: ${truncatedPrompt} \n\n Command: ${command}`

    // if image starts with data:image/, get only base64
    let imageToSend = image
    if (image.startsWith('data:image/')) {
      imageToSend = image.split(',')[1]
    }

    // convert base64 to buffer
    const imageBuffer = Buffer.from(imageToSend, 'base64')

    const chatId = '@neuro_blogger_pulse'

    // send image as buffer
    await pulseBot.telegram.sendPhoto(
      chatId,
      { source: imageBuffer },
      { caption }
    )
  } catch (error) {
    console.error('Error sending pulse:', error)
    throw new Error('Error sending pulse')
  }
}
