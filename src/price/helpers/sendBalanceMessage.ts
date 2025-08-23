import { MyContext } from '@/interfaces'
import { Telegraf } from 'telegraf'

export const sendBalanceMessage = async (
  telegram_id: string,
  newBalance: number,
  cost: number,
  isRu: boolean,
  bot: Telegraf<MyContext>
) => {
  // Защитная проверка бота
  if (!bot || !bot.telegram) {
    console.error('❌ Bot instance is invalid in sendBalanceMessage');
    throw new Error('Bot instance is required');
  }

  await bot.telegram.sendMessage(
    telegram_id,
    isRu
      ? `Стоимость: ${cost.toFixed(2)} ⭐️\nВаш баланс: ${newBalance.toFixed(
          2
        )} ⭐️`
      : `Cost: ${cost.toFixed(2)} ⭐️\nYour balance: ${newBalance.toFixed(
          2
        )} ⭐️`
  )
}
