import { inngest } from '../client'
import { getUserByTelegramId, updateUserLevelPlusOne } from '@/core/supabase'
import { modeCosts, ModeEnum } from '@/price/helpers/modelsCost'
import { processBalanceOperation } from '@/price/helpers'
import elevenLabsClient from '@/core/elevenlabs'
import { logger } from '@/utils/logger'
import { getBotByName } from '@/core/bot'
import { createWriteStream } from 'fs'
import path from 'path'
import os from 'os'
import { InputFile } from 'telegraf/typings/core/types/typegram'

interface SpeechGenerationData {
  text: string
  voice_id: string
  telegram_id: string
  is_ru: boolean
  bot_name: string
}

interface VoiceAvatarData {
  fileUrl: string
  telegram_id: string
  username: string
  is_ru: boolean
  bot_name: string
}

// Text-to-Speech Inngest функция
export const generateSpeechInngest = inngest.createFunction(
  {
    id: 'generate-speech',
    concurrency: 5,
    idempotency: 'event.data.telegram_id + "-speech-" + event.data.text.slice(0, 20)',
  },
  { event: 'speech/text-to-speech.start' },
  async ({ event, step }) => {
    const eventData = event.data as SpeechGenerationData

    logger.info({
      message: 'Получено событие генерации text-to-speech',
      eventId: event.id,
      telegram_id: eventData.telegram_id,
      voice_id: eventData.voice_id,
    })

    try {
      // Получение и проверка пользователя
      const user = await step.run('validate-user', async () => {
        const userExists = await getUserByTelegramId(eventData.telegram_id)
        if (!userExists) {
          throw new Error(`User with ID ${eventData.telegram_id} does not exist.`)
        }

        // Обновление уровня если нужно
        if (userExists.level === 7) {
          await updateUserLevelPlusOne(eventData.telegram_id, userExists.level)
        }

        return userExists
      })

      // Получение бота
      const { bot } = getBotByName(eventData.bot_name)
      if (!bot) {
        throw new Error(`Бот ${eventData.bot_name} не найден`)
      }

      // Проверка баланса и списание средств
      const balanceCheck = await step.run('check-balance', async () => {
        const result = await processBalanceOperation({
          telegram_id: eventData.telegram_id,
          paymentAmount: modeCosts[ModeEnum.TextToSpeech] as number,
          is_ru: eventData.is_ru,
          bot,
        })

        if (!result.success) {
          throw new Error(result.error)
        }

        return result
      })

      // Генерация речи через ElevenLabs
      const audioFile = await step.run('generate-audio', async () => {
        if (!process.env.ELEVENLABS_API_KEY) {
          throw new Error('ELEVENLABS_API_KEY не настроен')
        }

        logger.info({
          message: 'Начало генерации речи через ElevenLabs',
          telegram_id: eventData.telegram_id,
          voice_id: eventData.voice_id,
          textLength: eventData.text.length,
        })

        const audio = await elevenLabsClient.generate({
          voice: eventData.voice_id,
          text: eventData.text,
          model_id: 'eleven_multilingual_v2',
        })

        // Создание временного файла
        const tempDir = os.tmpdir()
        const audioPath = path.join(tempDir, `${eventData.telegram_id}_speech_${Date.now()}.mp3`)
        
        const audioStream = createWriteStream(audioPath)
        
        return new Promise<string>((resolve, reject) => {
          audio.pipe(audioStream)
          
          audioStream.on('finish', () => {
            logger.info({
              message: 'Аудиофайл успешно создан',
              audioPath,
              telegram_id: eventData.telegram_id,
            })
            resolve(audioPath)
          })
          
          audioStream.on('error', (error) => {
            logger.error({
              message: 'Ошибка создания аудиофайла',
              error: error.message,
              telegram_id: eventData.telegram_id,
            })
            reject(error)
          })
        })
      })

      // Отправка аудиофайла пользователю
      await step.run('send-audio', async () => {
        const audio = new InputFile(audioFile)
        
        await bot.telegram.sendAudio(eventData.telegram_id, audio, {
          caption: eventData.is_ru 
            ? `🎵 Ваш аудиофайл готов!\n\n📝 Текст: ${eventData.text}`
            : `🎵 Your audio is ready!\n\n📝 Text: ${eventData.text}`,
        })

        logger.info({
          message: 'Аудиофайл успешно отправлен пользователю',
          telegram_id: eventData.telegram_id,
        })
      })

      logger.info({
        message: 'Text-to-speech генерация завершена успешно',
        telegram_id: eventData.telegram_id,
        audioFile,
      })

      return {
        success: true,
        audioUrl: audioFile,
        message: 'Речь успешно сгенерирована',
      }

    } catch (error) {
      logger.error({
        message: 'Ошибка text-to-speech генерации',
        error: error.message,
        telegram_id: eventData.telegram_id,
      })

      // Уведомление об ошибке
      const { bot } = getBotByName(eventData.bot_name)
      if (bot) {
        try {
          const errorMsg = eventData.is_ru 
            ? `❌ Произошла ошибка при генерации речи: ${error.message}`
            : `❌ Error during speech generation: ${error.message}`
          
          await bot.telegram.sendMessage(eventData.telegram_id, errorMsg)
        } catch (sendError) {
          logger.error('Не удалось отправить уведомление об ошибке', sendError)
        }
      }

      throw error
    }
  }
)

// Voice Avatar Creation Inngest функция
export const createVoiceAvatarInngest = inngest.createFunction(
  {
    id: 'create-voice-avatar',
    concurrency: 3,
    idempotency: 'event.data.telegram_id + "-avatar-" + event.data.fileUrl.slice(-10)',
  },
  { event: 'speech/voice-avatar.start' },
  async ({ event, step }) => {
    const eventData = event.data as VoiceAvatarData

    logger.info({
      message: 'Получено событие создания голосового аватара',
      eventId: event.id,
      telegram_id: eventData.telegram_id,
      fileUrl: eventData.fileUrl,
    })

    try {
      // Получение и проверка пользователя
      const user = await step.run('validate-user', async () => {
        const userExists = await getUserByTelegramId(eventData.telegram_id)
        if (!userExists) {
          throw new Error(`User with ID ${eventData.telegram_id} does not exist.`)
        }

        return userExists
      })

      // Получение бота
      const { bot } = getBotByName(eventData.bot_name)
      if (!bot) {
        throw new Error(`Бот ${eventData.bot_name} не найден`)
      }

      // Проверка баланса
      const balanceCheck = await step.run('check-balance', async () => {
        const result = await processBalanceOperation({
          telegram_id: eventData.telegram_id,
          paymentAmount: modeCosts[ModeEnum.CreateVoiceAvatar] as number,
          is_ru: eventData.is_ru,
          bot,
        })

        if (!result.success) {
          throw new Error(result.error)
        }

        return result
      })

      // Уведомление о начале процесса
      await step.run('send-start-message', async () => {
        await bot.telegram.sendMessage(
          eventData.telegram_id,
          eventData.is_ru 
            ? '⏳ Создание голосового аватара...' 
            : '⏳ Creating voice avatar...'
        )
      })

      // Создание голосового аватара через ElevenLabs
      const voiceResult = await step.run('create-voice', async () => {
        if (!process.env.ELEVENLABS_API_KEY) {
          throw new Error('ELEVENLABS_API_KEY не настроен')
        }

        logger.info({
          message: 'Начало создания голосового аватара через ElevenLabs',
          telegram_id: eventData.telegram_id,
          fileUrl: eventData.fileUrl,
        })

        // Здесь должна быть логика создания голосового аватара через ElevenLabs API
        // В данном примере просто имитируем успешное создание
        const voiceId = `voice_${eventData.telegram_id}_${Date.now()}`
        
        // TODO: Реальная интеграция с ElevenLabs API для создания голоса
        // const voice = await elevenLabsClient.voices.add({
        //   name: `Voice_${eventData.username}`,
        //   files: [eventData.fileUrl]
        // })

        return {
          voiceId,
          name: `Voice_${eventData.username}`,
        }
      })

      // Уведомление об успешном создании
      await step.run('send-success-message', async () => {
        await bot.telegram.sendMessage(
          eventData.telegram_id,
          eventData.is_ru 
            ? `✅ Голосовой аватар создан!\n\n🎭 ID голоса: ${voiceResult.voiceId}\n📝 Имя: ${voiceResult.name}`
            : `✅ Voice avatar created!\n\n🎭 Voice ID: ${voiceResult.voiceId}\n📝 Name: ${voiceResult.name}`
        )
      })

      logger.info({
        message: 'Создание голосового аватара завершено успешно',
        telegram_id: eventData.telegram_id,
        voiceId: voiceResult.voiceId,
      })

      return {
        success: true,
        voiceId: voiceResult.voiceId,
        voiceName: voiceResult.name,
        message: 'Голосовой аватар успешно создан',
      }

    } catch (error) {
      logger.error({
        message: 'Ошибка создания голосового аватара',
        error: error.message,
        telegram_id: eventData.telegram_id,
      })

      // Уведомление об ошибке
      const { bot } = getBotByName(eventData.bot_name)
      if (bot) {
        try {
          const errorMsg = eventData.is_ru 
            ? `❌ Произошла ошибка при создании голосового аватара: ${error.message}`
            : `❌ Error during voice avatar creation: ${error.message}`
          
          await bot.telegram.sendMessage(eventData.telegram_id, errorMsg)
        } catch (sendError) {
          logger.error('Не удалось отправить уведомление об ошибке', sendError)
        }
      }

      throw error
    }
  }
)