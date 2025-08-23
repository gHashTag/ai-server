import { MyContext } from '@/interfaces'
import { Telegraf } from 'telegraf'

export const sendInsufficientStarsMessage = async (
  telegram_id: number,
  isRu: boolean,
  bot: Telegraf<MyContext>
) => {
  // Защитная проверка бота
  if (!bot || !bot.telegram) {
    console.error('❌ Bot instance is invalid in sendInsufficientStarsMessage')
    throw new Error('Bot instance is required')
  }

  const message = isRu
    ? 'Недостаточно звезд для генерации изображения. Пополните баланс вызвав команду /buy.'
    : 'Insufficient stars for image generation. Top up your balance by calling the /buy command.'

  await bot.telegram.sendMessage(telegram_id, message)
}
