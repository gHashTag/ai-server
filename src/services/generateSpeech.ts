import { createWriteStream } from 'fs'
import path from 'path'
import os from 'os'
import { elevenLabsReliable } from '@/core/elevenlabs/withCircuitBreaker'

import { InputFile } from 'telegraf/typings/core/types/typegram'
import {
  getUserByTelegramId,
  updateUserLevelPlusOne,
  updateUserBalance,
} from '@/core/supabase'
import { errorMessageAdmin, errorMessage } from '@/helpers'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { calculateModeCost } from '@/price/helpers/modelsCost'
import { processBalanceOperation } from '@/price/helpers'
import { ModeEnum } from '@/interfaces/modes'
import { PaymentType } from '@/interfaces/payments.interface'

export const generateSpeech = async ({
  text,
  voice_id,
  telegram_id,
  is_ru,
  bot,
  bot_name,
}: {
  text: string
  voice_id: string
  telegram_id: string
  is_ru: boolean
  bot: Telegraf<MyContext>
  bot_name: string
}): Promise<{ audioUrl: string }> => {
  console.log('telegram_id', telegram_id)
  const userExists = await getUserByTelegramId(telegram_id)
  console.log('userExists', userExists)
  if (!userExists) {
    throw new Error(`User with ID ${telegram_id} does not exist.`)
  }
  const level = userExists.level
  if (level === 7) {
    await updateUserLevelPlusOne(telegram_id, level)
  }
  // Проверка баланса для всех изображений
  const balanceCheck = await processBalanceOperation({
    telegram_id,
    paymentAmount: calculateModeCost({ mode: ModeEnum.TextToSpeech }).stars,
    is_ru,
    bot_name,
  })
  if (!balanceCheck.success) {
    throw new Error(balanceCheck.error)
  }

  return new Promise<{ audioUrl: string }>(async (resolve, reject) => {
    try {
      // Проверяем наличие API ключа
      if (!process.env.ELEVENLABS_API_KEY) {
        throw new Error('ELEVENLABS_API_KEY отсутствует')
      }
      bot.telegram.sendMessage(
        telegram_id,
        is_ru ? '⏳ Генерация аудио...' : '⏳ Generating audio...'
      )
      // Логируем попытку генерации

      const audioStream = await elevenLabsReliable.generate(
        {
          voice: voice_id,
          model_id: 'eleven_turbo_v2_5',
          text,
        },
        'generate-speech'
      )

      const audioUrl = path.join(os.tmpdir(), `audio_${Date.now()}.mp3`)
      const writeStream = createWriteStream(audioUrl)

      audioStream.pipe(writeStream)

      writeStream.on('finish', async () => {
        const audio = { source: audioUrl }
        const paymentAmount = calculateModeCost({
          mode: ModeEnum.TextToSpeech,
        }).stars

        // Списываем средства
        try {
          await updateUserBalance(
            telegram_id,
            paymentAmount,
            PaymentType.MONEY_OUTCOME,
            `Синтез речи (ElevenLabs)`,
            {
              stars: paymentAmount,
              payment_method: 'System',
              service_type: ModeEnum.TextToSpeech,
              bot_name: bot_name,
              language: is_ru ? 'ru' : 'en',
              cost: paymentAmount / 1.5, // себестоимость
            }
          )

          const newBalance = balanceCheck.currentBalance - paymentAmount

          await bot.telegram.sendAudio(telegram_id, audio as InputFile, {
            reply_markup: {
              keyboard: [
                [
                  {
                    text: is_ru ? '🎙️ Текст в голос' : '🎙️ Текст в голос',
                  },
                  { text: is_ru ? '🏠 Главное меню' : '🏠 Main menu' },
                ],
              ],
            },
          })

          await bot.telegram.sendMessage(
            telegram_id,
            is_ru
              ? `✅ Аудио создано! Списано: ${paymentAmount} ⭐️. Баланс: ${newBalance.toFixed(
                  2
                )} ⭐️`
              : `✅ Audio created! Deducted: ${paymentAmount} ⭐️. Balance: ${newBalance.toFixed(
                  2
                )} ⭐️`
          )

          resolve({ audioUrl })
        } catch (balanceError) {
          console.error(
            'Error updating balance for text-to-speech:',
            balanceError
          )
          errorMessageAdmin(balanceError as Error)
          reject(balanceError)
        }
      })

      writeStream.on('error', error => {
        console.error('Error writing audio file:', error)
        errorMessage(error, telegram_id, is_ru)
        errorMessageAdmin(error)
        reject(error)
      })
    } catch (error) {
      console.error('Error in generateSpeech:', error)
      errorMessage(error as Error, telegram_id, is_ru)
      errorMessageAdmin(error as Error)
      reject(error)
    }
  })
}
