import { Request, Response } from 'express'
import { updatePrompt } from '@/core/supabase/'
import { pulse } from '@/helpers/pulse'
import { processApiResponse } from '@/helpers/processApiResponse'
import { getBotByName } from '@/core/bot'
import { errorMessageAdmin } from '@/helpers'

export class WebhookBFLNeurophotoController {
  public async handleWebhookNeurophoto(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { task_id, status, result } = req.body
      const imageUrl = await processApiResponse(result.sample)

      const { telegram_id, username, bot_name, language_code } =
        await updatePrompt(task_id, result.sample)
      const is_ru = language_code === 'ru'
      const { bot } = getBotByName(bot_name)
      if (status === 'SUCCESS') {
        console.log('Webhook received:', req.body)

        console.log('Sending image:', imageUrl)

        // Отправляем URL напрямую, без преобразования в буфер
        await bot.telegram.sendPhoto(telegram_id, imageUrl)

        // Отправляем в pulse
        const pulseImage = imageUrl
        console.log('pulseImage', pulseImage)

        await pulse(
          pulseImage,
          result.prompt,
          'neurophoto',
          telegram_id,
          username,
          is_ru
        )

        await bot.telegram.sendMessage(
          telegram_id,
          is_ru ? `📸 Нейрофото готово!` : `📸 Neurophoto is ready!`,
          {
            reply_markup: {
              keyboard: [
                [
                  { text: '1️⃣' },
                  { text: '2️⃣' },
                  { text: '3️⃣' },
                  { text: '4️⃣' },
                ],
                [
                  { text: is_ru ? '⬆️ Улучшить промпт' : '⬆️ Improve prompt' },
                  { text: is_ru ? '📐 Изменить размер' : '📐 Change size' },
                ],
                [{ text: is_ru ? '🏠 Главное меню' : '🏠 Main menu' }],
              ],
              resize_keyboard: true,
              one_time_keyboard: false,
            },
          }
        )

        res.status(200).json({ message: 'Webhook processed successfully' })
      } else if (status === 'Content Moderated') {
        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? `🚫 Содержимое отклонено модерацией. Попробуйте другой промпт или еще раз.`
            : `🚫 Content rejected by moderation. Try another prompt or try again.`
        )
        res.status(200).json({ message: 'Webhook processed successfully' })
      } else {
        errorMessageAdmin(
          new Error(`🚫 Webhook received: ${JSON.stringify(req.body)}`)
        )
        res.status(200).json({ message: 'Webhook processed successfully' })
      }
    } catch (error) {
      console.error('Error processing webhook:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
