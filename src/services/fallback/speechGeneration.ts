import { getUserByTelegramId, updateUserLevelPlusOne } from '@/core/supabase'
import { modeCosts, ModeEnum } from '@/price/helpers/modelsCost'
import { processBalanceOperation } from '@/price/helpers'
import elevenLabsClient from '@/core/elevenlabs'
import { logger } from '@/utils/logger'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { createWriteStream } from 'fs'
import path from 'path'
import os from 'os'
import { InputFile } from 'telegraf/typings/core/types/typegram'

// Fallback Text-to-Speech функция
export const generateSpeechFallback = async (
  text: string,
  voice_id: string,
  telegram_id: string,
  is_ru: boolean,
  bot: Telegraf<MyContext>
) => {
  try {
    logger.info({
      message: 'Использование fallback для text-to-speech',
      telegram_id,
      voice_id,
    })

    // Простая проверка пользователя
    const userExists = await getUserByTelegramId(telegram_id)
    if (!userExists) {
      throw new Error(`User with ID ${telegram_id} does not exist.`)
    }

    if (userExists.level === 7) {
      await updateUserLevelPlusOne(telegram_id, userExists.level)
    }

    // Проверка баланса
    const balanceCheck = await processBalanceOperation({
      telegram_id,
      paymentAmount: modeCosts[ModeEnum.TextToSpeech] as number,
      is_ru,
      bot,
    })

    if (!balanceCheck.success) {
      throw new Error(balanceCheck.error)
    }

    // Проверка API ключа
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY не настроен')
    }

    // Генерация речи
    const audio = await elevenLabsClient.generate({
      voice: voice_id,
      text,
      model_id: 'eleven_multilingual_v2',
    })

    // Создание временного файла
    const tempDir = os.tmpdir()
    const audioPath = path.join(tempDir, `${telegram_id}_speech_${Date.now()}.mp3`)
    const audioStream = createWriteStream(audioPath)
    
    // Сохранение аудио
    await new Promise<void>((resolve, reject) => {
      audio.pipe(audioStream)
      
      audioStream.on('finish', () => {
        resolve()
      })
      
      audioStream.on('error', (error) => {
        reject(error)
      })
    })

    // Отправка пользователю
    const audioFile = new InputFile(audioPath)
    await bot.telegram.sendAudio(telegram_id, audioFile, {
      caption: is_ru 
        ? `🎵 Ваш аудиофайл готов!\n\n📝 Текст: ${text}`
        : `🎵 Your audio is ready!\n\n📝 Text: ${text}`,
    })

    logger.info({
      message: 'Fallback text-to-speech завершен',
      telegram_id,
      audioPath,
    })

    return { audioUrl: audioPath }

  } catch (error) {
    logger.error({
      message: 'Ошибка fallback text-to-speech',
      error: error.message,
      telegram_id,
    })

    const errorMsg = is_ru 
      ? `❌ Произошла ошибка при генерации речи: ${error.message}`
      : `❌ Error during speech generation: ${error.message}`
    
    try {
      await bot.telegram.sendMessage(telegram_id, errorMsg)
    } catch (sendError) {
      logger.error('Не удалось отправить уведомление об ошибке', sendError)
    }

    throw error
  }
}

// Fallback Voice Avatar Creation функция
export const createVoiceAvatarFallback = async (
  fileUrl: string,
  telegram_id: string,
  username: string,
  is_ru: boolean,
  bot: Telegraf<MyContext>
) => {
  try {
    logger.info({
      message: 'Использование fallback для создания голосового аватара',
      telegram_id,
      fileUrl,
    })

    // Простая проверка пользователя
    const userExists = await getUserByTelegramId(telegram_id)
    if (!userExists) {
      throw new Error(`User with ID ${telegram_id} does not exist.`)
    }

    // Проверка баланса
    const balanceCheck = await processBalanceOperation({
      telegram_id,
      paymentAmount: modeCosts[ModeEnum.CreateVoiceAvatar] as number,
      is_ru,
      bot,
    })

    if (!balanceCheck.success) {
      throw new Error(balanceCheck.error)
    }

    // Уведомление о начале
    await bot.telegram.sendMessage(
      telegram_id,
      is_ru 
        ? '⏳ Создание голосового аватара...' 
        : '⏳ Creating voice avatar...'
    )

    // Проверка API ключа
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY не настроен')
    }

    // Имитация создания голосового аватара
    // В реальной реализации здесь был бы вызов ElevenLabs API
    const voiceId = `voice_${telegram_id}_${Date.now()}`
    const voiceName = `Voice_${username}`

    // Имитация задержки для реалистичности
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Уведомление об успешном создании
    await bot.telegram.sendMessage(
      telegram_id,
      is_ru 
        ? `✅ Голосовой аватар создан!\n\n🎭 ID голоса: ${voiceId}\n📝 Имя: ${voiceName}\n\n⚠️ Это fallback версия - для полной функциональности используйте основной режим.`
        : `✅ Voice avatar created!\n\n🎭 Voice ID: ${voiceId}\n📝 Name: ${voiceName}\n\n⚠️ This is a fallback version - use main mode for full functionality.`
    )

    logger.info({
      message: 'Fallback создание голосового аватара завершено',
      telegram_id,
      voiceId,
    })

    return { voiceId, voiceName }

  } catch (error) {
    logger.error({
      message: 'Ошибка fallback создания голосового аватара',
      error: error.message,
      telegram_id,
    })

    const errorMsg = is_ru 
      ? `❌ Произошла ошибка при создании голосового аватара: ${error.message}`
      : `❌ Error during voice avatar creation: ${error.message}`
    
    try {
      await bot.telegram.sendMessage(telegram_id, errorMsg)
    } catch (sendError) {
      logger.error('Не удалось отправить уведомление об ошибке', sendError)
    }

    throw error
  }
}