import { supabase } from '@/core/supabase'
import { getBotByName } from '@/core/bot'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { getUserByTelegramId } from '@/core/supabase'
import { getTelegramIdFromFinetune } from '@/core/bfl'

export async function notifyTrainingSuccess(
  finetuneId: string,
  status: string,
  result: string
): Promise<void> {
  try {
    // Выполняем запрос с соединением таблиц для получения telegram_id и bot_name
    console.log(`finetuneId: ${finetuneId}`)

    const telegram_id = await getTelegramIdFromFinetune(finetuneId)
    console.log(`telegramId: ${telegram_id}`)
    const data = await getUserByTelegramId(telegram_id)

    const bot_name = data.users.bot_name
    console.log(`bot_name: ${bot_name}`)
    const language_code = data.users.language_code
    console.log(`language_code: ${language_code}`)
    // Обновляем статус тренировки в базе данных
    const { error: updateError } = await supabase
      .from('model_trainings')
      .update({ status, result, api: 'bfl' })
      .eq('finetune_id', finetuneId)

    if (updateError) {
      console.error('Ошибка при обновлении статуса тренировки:', updateError)
      return
    }

    // Получаем бота по имени
    const { bot } = getBotByName(bot_name) as { bot: Telegraf<MyContext> }

    // Отправляем сообщение об успешной тренировке
    await bot.telegram.sendMessage(
      telegram_id,
      language_code === 'ru'
        ? `🎉 Ваша модель успешно натренирована!`
        : `🎉 Your model has been trained successfully!`
    )
  } catch (error) {
    console.error(
      'Ошибка при отправке уведомления об успешной тренировке:',
      error
    )
  }
}
