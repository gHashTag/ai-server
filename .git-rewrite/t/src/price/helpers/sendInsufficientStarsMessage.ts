import { MyContext } from '@/interfaces'
import { Telegraf } from 'telegraf'

export const sendInsufficientStarsMessage = async (
  telegram_id: number,
  isRu: boolean,
  bot: Telegraf<MyContext>
) => {
  const message = isRu
    ? 'Недостаточно звезд для генерации изображения. Пополните баланс вызвав команду /buy.'
    : 'Insufficient stars for image generation. Top up your balance by calling the /buy command.'

  await bot.telegram.sendMessage(telegram_id, message)
}
