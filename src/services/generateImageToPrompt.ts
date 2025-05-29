import { processBalanceOperation } from '@/price/helpers'
import { huggingFaceReliable } from '@/core/huggingface/withCircuitBreaker'
import {
  getUserByTelegramId,
  updateUserLevelPlusOne,
  updateUserBalance,
} from '@/core/supabase'
import { errorMessage, errorMessageAdmin } from '@/helpers'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { ModeEnum } from '@/interfaces/modes'
import { calculateModeCost } from '@/price/helpers/modelsCost'
import { levels } from '@/helpers/levels'
import { PaymentType } from '@/interfaces/payments.interface'

export async function generateImageToPrompt(
  imageUrl: string,
  telegram_id: string,
  username: string,
  is_ru: boolean,
  bot: Telegraf<MyContext>,
  bot_name: string
): Promise<string> {
  console.log('generateImageToPrompt', imageUrl, telegram_id, username, is_ru)

  const userExists = await getUserByTelegramId(telegram_id)
  if (!userExists) {
    throw new Error(`User with ID ${telegram_id} does not exist.`)
  }

  const level = userExists.level
  if (level === 0) {
    await updateUserLevelPlusOne(telegram_id, level)
  }

  const costResult = calculateModeCost({
    mode: ModeEnum.ImageToPrompt,
  })
  const paymentAmount = costResult.stars

  const balanceCheck = await processBalanceOperation({
    telegram_id,
    paymentAmount,
    is_ru,
    bot_name,
  })

  if (!balanceCheck.success) {
    if (balanceCheck.error) {
      try {
        await bot.telegram.sendMessage(
          telegram_id.toString(),
          balanceCheck.error
        )
      } catch (notifyError) {
        console.error(
          'Failed to send balance error notification to user (ImageToPrompt)',
          { telegramId: telegram_id, error: notifyError }
        )
        errorMessageAdmin(notifyError as Error)
      }
    }
    throw new Error(
      balanceCheck.error ||
        (is_ru ? 'Ошибка проверки баланса' : 'Balance check failed')
    )
  }

  const initialBalance = balanceCheck.currentBalance

  try {
    // Используем защищенный HuggingFace API
    const captionFound = await huggingFaceReliable.generateImageCaption(
      {
        imageUrl,
        captionType: 'Descriptive',
        captionLength: 'long',
        extraOptions: [
          'Describe the image in detail, including colors, style, mood, and composition.',
        ],
      },
      'image-to-prompt'
    )

    if (!captionFound) {
      throw new Error('No caption found in response')
    }

    // Списываем средства после успешной генерации
    const newBalance = initialBalance - paymentAmount
    await updateUserBalance(
      telegram_id,
      paymentAmount,
      PaymentType.MONEY_OUTCOME,
      `Генерация описания изображения`,
      {
        stars: paymentAmount,
        payment_method: 'System',
        bot_name: bot_name,
        language: is_ru ? 'ru' : 'en',
        service_type: ModeEnum.ImageToPrompt,
        category: 'REAL',
        cost: paymentAmount / 1.5,
      }
    )

    console.log(
      `Balance updated after image to prompt. New balance: ${newBalance}`
    )

    const levelInfo = levels[level]
    const nextLevelInfo = levels[level + 1]

    const levelUpMessage = nextLevelInfo
      ? is_ru
        ? `\n\n🎯 Следующий уровень: ${nextLevelInfo.title_ru}`
        : `\n\n🎯 Next level: ${nextLevelInfo.title_en}`
      : is_ru
      ? '\n\n🏆 Вы достигли максимального уровня!'
      : '\n\n🏆 You have reached the maximum level!'

    const resultMessage = is_ru
      ? `✅ Описание изображения сгенерировано! Списано: ${paymentAmount} ⭐️. Ваш новый баланс: ${newBalance.toFixed(
          2
        )} ⭐️.${levelUpMessage}`
      : `✅ Image description generated! Deducted: ${paymentAmount} ⭐️. Your new balance: ${newBalance.toFixed(
          2
        )} ⭐️.${levelUpMessage}`

    await bot.telegram.sendMessage(telegram_id, resultMessage)

    return captionFound
  } catch (error) {
    console.error('Error during image to prompt generation:', error)
    errorMessage(error as Error, telegram_id.toString(), is_ru)
    errorMessageAdmin(error as Error)
    throw error
  }
}
