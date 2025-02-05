import { createWriteStream } from 'fs'
import path from 'path'
import os from 'os'
import elevenLabsClient from '@/core/elevenlabs'
import bot from '@/core/bot'
import { InputFile } from 'telegraf/typings/core/types/typegram'
import {
  processBalanceOperation,
  sendBalanceMessage,
  speechGenerationCost,
} from '@/price/helpers'
import { errorMessageAdmin, errorMessage } from '@/helpers'

export const generateSpeech = async ({
  text,
  voice_id,
  telegram_id,
  is_ru,
}: {
  text: string
  voice_id: string
  telegram_id: number
  is_ru: boolean
}): Promise<{ audioUrl: string }> => {
  // Проверка баланса для всех изображений
  const balanceCheck = await processBalanceOperation({
    telegram_id,
    paymentAmount: speechGenerationCost,
    is_ru,
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

      const audioStream = await elevenLabsClient.generate({
        voice: voice_id,
        model_id: 'eleven_turbo_v2_5',
        text,
      })

      const audioUrl = path.join(os.tmpdir(), `audio_${Date.now()}.mp3`)
      const writeStream = createWriteStream(audioUrl)

      audioStream.pipe(writeStream)

      writeStream.on('finish', () => {
        const audio = { source: audioUrl }
        bot.telegram.sendAudio(telegram_id, audio as InputFile, {
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
        sendBalanceMessage(
          telegram_id,
          balanceCheck.newBalance,
          speechGenerationCost,
          is_ru
        )
        resolve({ audioUrl })
      })

      writeStream.on('error', error => {
        console.error('Error writing audio file:', error)
        reject(error)
      })
    } catch (error: any) {
      errorMessage(error as Error, telegram_id.toString(), is_ru)
      errorMessageAdmin(error as Error)
      console.error('Error in createAudioFileFromText:', {
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
      })
      reject(error)
    }
  })
}
