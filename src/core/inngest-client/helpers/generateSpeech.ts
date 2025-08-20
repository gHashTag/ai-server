import { inngest } from '@/core/inngest-client/clients'
import { generateSpeech } from '@/services/generateSpeech'
import { createVoiceAvatar } from '@/services/createVoiceAvatar'
import { getBotByName } from '@/core/bot'
import { logger } from '@/utils/logger'

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

// План А - Inngest обертка для существующего сервиса generateSpeech
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
      message: 'План А - Inngest генерация текст-в-речь',
      eventId: event.id,
      telegram_id: eventData.telegram_id,
      voice_id: eventData.voice_id,
    })

    return await step.run('generate-speech', async () => {
      const { bot } = getBotByName(eventData.bot_name)
      
      if (!bot) {
        throw new Error(`Бот ${eventData.bot_name} не найден`)
      }

      // Используем существующий сервис
      const result = await generateSpeech({
        text: eventData.text,
        voice_id: eventData.voice_id,
        telegram_id: eventData.telegram_id,
        is_ru: eventData.is_ru,
        bot,
      })

      logger.info({
        message: 'План А - генерация речи завершена успешно',
        telegram_id: eventData.telegram_id,
        audioUrl: result.audioUrl,
      })

      return {
        success: true,
        audioUrl: result.audioUrl,
        message: 'Speech generation completed via Inngest',
      }
    })
  }
)

// План А - Inngest обертка для существующего сервиса createVoiceAvatar
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
      message: 'План А - Inngest создание голосового аватара',
      eventId: event.id,
      telegram_id: eventData.telegram_id,
      fileUrl: eventData.fileUrl,
    })

    return await step.run('create-voice-avatar', async () => {
      const { bot } = getBotByName(eventData.bot_name)
      
      if (!bot) {
        throw new Error(`Бот ${eventData.bot_name} не найден`)
      }

      // Используем существующий сервис
      const result = await createVoiceAvatar(
        eventData.fileUrl,
        eventData.telegram_id,
        eventData.username,
        eventData.is_ru,
        bot
      )

      logger.info({
        message: 'План А - создание голосового аватара завершено успешно',
        telegram_id: eventData.telegram_id,
      })

      return {
        success: true,
        result,
        message: 'Voice avatar creation completed via Inngest',
      }
    })
  }
)