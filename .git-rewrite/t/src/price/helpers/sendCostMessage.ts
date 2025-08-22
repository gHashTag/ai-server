import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'

export const sendCostMessage = async (
  telegram_id: number,
  cost: number,
  isRu: boolean,
  bot: Telegraf<MyContext>
) => {
  await bot.telegram.sendMessage(
    telegram_id,
    isRu ? `Стоимость: ${cost.toFixed(2)} ⭐️` : `Cost: ${cost.toFixed(2)} ⭐️`
  )
  return
}
