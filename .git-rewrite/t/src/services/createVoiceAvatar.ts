import { supabase } from '@/core/supabase'
import { createVoiceElevenLabs } from '@/core/supabase/ai'
import { errorMessage, errorMessageAdmin } from '@/helpers'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import {
  getUserByTelegramId,
  updateUserLevelPlusOne,
  updateUserBalance,
} from '@/core/supabase'
import { processBalanceOperation } from '@/price/helpers'
import { modeCosts, getCostValue } from '@/price/helpers/modelsCost'
import { ModeEnum } from '@/interfaces/modes'
import { PaymentType } from '@/interfaces/payments.interface'

export async function createVoiceAvatar(
  fileUrl: string,
  telegram_id: string,
  username: string,
  isRu: boolean,
  bot: Telegraf<MyContext>
): Promise<{ voiceId: string }> {
  try {
    const userExists = await getUserByTelegramId(telegram_id)
    if (!userExists) {
      throw new Error(`User with ID ${telegram_id} does not exist.`)
    }
    const level = userExists.level
    if (level === 6) {
      await updateUserLevelPlusOne(telegram_id, level)
    }

    const cost = getCostValue(modeCosts[ModeEnum.Voice])
    console.log(`Cost for ${ModeEnum.Voice}: ${cost} stars`)

    const balanceCheck = await processBalanceOperation({
      telegram_id,
      paymentAmount: cost,
      is_ru: isRu,
      bot_name: bot.botInfo?.username || 'unknown_bot',
    })

    if (!balanceCheck.success) {
      if (balanceCheck.error) {
        try {
          await bot.telegram.sendMessage(
            telegram_id.toString(),
            balanceCheck.error
          )
        } catch (notifyError) {
          console.error('Failed to send balance error notification to user', {
            telegramId: telegram_id,
            error: notifyError,
          })
          errorMessageAdmin(notifyError as Error)
        }
      }
      throw new Error(
        balanceCheck.error ||
          (isRu ? 'Ошибка проверки баланса' : 'Balance check failed')
      )
    }
    const initialBalance = balanceCheck.currentBalance
    console.log(
      `Balance check successful for ${telegram_id}. Initial balance: ${initialBalance}, cost: ${cost}`
    )

    console.log('createVoiceAvatar', { fileUrl, telegram_id, username, isRu })
    await bot.telegram.sendMessage(
      telegram_id,
      isRu
        ? `⏳ Создаю голосовой аватар... (Стоимость: ${cost} ⭐)`
        : `⏳ Creating voice avatar... (Cost: ${cost} ⭐)`
    )

    const voiceId = await createVoiceElevenLabs({
      fileUrl,
      username,
    })

    console.log('Received voiceId:', voiceId)

    if (!voiceId) {
      console.error('Ошибка при создании голоса: voiceId не получен')
      throw new Error('Ошибка при создании голоса')
    }

    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ voice_id_elevenlabs: voiceId })
      .eq('username', username)

    if (userUpdateError) {
      console.error(
        'Ошибка при сохранении voiceId в базу данных:',
        userUpdateError
      )
      throw new Error('Ошибка при сохранении данных')
    }
    console.log(`Successfully saved voiceId ${voiceId} for user ${username}`)

    try {
      const updateSuccess = await updateUserBalance(
        telegram_id,
        cost,
        PaymentType.MONEY_OUTCOME,
        `Создание голосового аватара (ElevenLabs)`,
        {
          stars: cost,
          payment_method: 'Internal',
          service_type: ModeEnum.Voice,
          bot_name: bot.botInfo?.username || 'unknown_bot',
          language: isRu ? 'ru' : 'en',
        }
      )

      if (!updateSuccess) {
        console.error(
          `Failed to update balance for ${telegram_id} after voice creation, but voice was created.`
        )
        errorMessageAdmin(
          new Error(
            `Balance update failed for ${telegram_id} (cost: ${cost}) after voice creation.`
          )
        )
      } else {
        console.log(
          `Successfully charged ${cost} stars from ${telegram_id} for voice creation. New balance approx: ${
            initialBalance - cost
          }`
        )
      }
    } catch (balanceError) {
      console.error(
        `Error during balance update for ${telegram_id} after voice creation:`,
        balanceError
      )
      errorMessageAdmin(balanceError as Error)
    }

    await bot.telegram.sendMessage(
      telegram_id,
      isRu
        ? `🎤 Голос для аватара успешно создан! (Списано ${cost} ⭐) \n Используйте 🎙️ Текст в голос в меню, чтобы проверить`
        : `🎤 Voice for avatar successfully created! (Charged ${cost} ⭐) \n Use the 🎙️ Text to speech in the menu to check`
    )

    return { voiceId }
  } catch (error) {
    console.error('Error in createVoiceAvatar:', error)
    errorMessage(error as Error, telegram_id.toString(), isRu)
    errorMessageAdmin(error as Error)
    throw error
  }
}
