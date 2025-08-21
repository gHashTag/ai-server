import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'

export const sendCurrentBalanceMessage = async (
  telegram_id: number,
  isRu: boolean,
  currentBalance: number,
  bot: Telegraf<MyContext>
) => {
  await bot.telegram.sendMessage(
    telegram_id,
    isRu
      ? `Ваш баланс: ${currentBalance.toFixed(2)} ⭐️`
      : `Your current balance: ${currentBalance.toFixed(2)} ⭐️`
  )
  return
}
