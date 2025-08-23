import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'

export const sendCurrentBalanceMessage = async (
  telegram_id: number,
  isRu: boolean,
  currentBalance: number,
  bot: Telegraf<MyContext>
) => {
  // Защитная проверка бота
  if (!bot || !bot.telegram) {
    console.error('❌ Bot instance is invalid in sendCurrentBalanceMessage')
    throw new Error('Bot instance is required')
  }

  await bot.telegram.sendMessage(
    telegram_id,
    isRu
      ? `Ваш баланс: ${currentBalance.toFixed(2)} ⭐️`
      : `Your current balance: ${currentBalance.toFixed(2)} ⭐️`
  )
  return
}
