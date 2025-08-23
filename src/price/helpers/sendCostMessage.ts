import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'

export const sendCostMessage = async (
  telegram_id: number,
  cost: number,
  isRu: boolean,
  bot: Telegraf<MyContext>
) => {
  // Защитная проверка бота
  if (!bot || !bot.telegram) {
    console.error('❌ Bot instance is invalid in sendCostMessage')
    throw new Error('Bot instance is required')
  }

  await bot.telegram.sendMessage(
    telegram_id,
    isRu ? `Стоимость: ${cost.toFixed(2)} ⭐️` : `Cost: ${cost.toFixed(2)} ⭐️`
  )
  return
}
