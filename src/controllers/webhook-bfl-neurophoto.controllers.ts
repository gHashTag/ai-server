import { Request, Response } from 'express'
import { updatePrompt } from '@/core/supabase/'
import { pulseNeuroImageV2 } from '@/helpers'

import { getBotByName } from '@/core/bot'
import { errorMessageAdmin } from '@/helpers'

const processedTasks = new Set()
export class WebhookBFLNeurophotoController {
  public async handleWebhookNeurophoto(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { task_id, status, result } = req.body
      console.log('🛰 Webhook received:', req.body)
      // Проверяем, был ли уже обработан этот task_id
      if (processedTasks.has(task_id)) {
        res
          .status(200)
          .json({ message: 'Webhook already processed for task_id:', task_id })
        return
      }

      if (status === 'SUCCESS') {
        if (!result?.sample) {
          throw new Error('Invalid result: sample is missing')
        }

        processedTasks.add(task_id)

        const imageUrl = result.sample

        const { telegram_id, username, bot_name, language_code } =
          await updatePrompt(task_id, imageUrl)
        const is_ru = language_code === 'ru'
        console.log('bot_name', bot_name)
        const { bot } = getBotByName(bot_name)

        console.log('Sending image:', imageUrl)

        // Отправляем URL напрямую, без преобразования в буфер
        await bot.telegram.sendPhoto(telegram_id, imageUrl)

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

        await pulseNeuroImageV2(
          imageUrl,
          result.prompt,
          'neurophoto V2',
          telegram_id,
          username,
          is_ru
        )

        res.status(200).json({ message: 'Webhook processed successfully' })
      } else if (status === 'processing') {
        res.status(200).json({
          message: 'Webhook processed successfully: processing',
        })
      } else if (status === 'Content Moderated') {
        const { telegram_id, bot_name, language_code } = await updatePrompt(
          task_id,
          result.sample
        )
        const is_ru = language_code === 'ru'
        const { bot } = getBotByName(bot_name)
        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? `🚫 Содержимое отклонено модерацией. Попробуйте другой промпт или еще раз.`
            : `🚫 Content rejected by moderation. Try another prompt or try again.`
        )
        res.status(200).json({ message: 'Webhook processed successfully' })
      } else if (status === 'GENERATED CONTENT MODERATED') {
        const { telegram_id, bot_name, language_code } = await updatePrompt(
          task_id,
          result.sample
        )
        const is_ru = language_code === 'ru'
        const { bot } = getBotByName(bot_name)
        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? `🚫 Содержимое отклонено модерацией. Попробуйте другой промпт или еще раз.`
            : `🚫 Content rejected by moderation. Try another prompt or try again.`,
          {
            reply_markup: {
              keyboard: [
                [{ text: is_ru ? '🏠 Главное меню' : '🏠 Main menu' }],
              ],
              resize_keyboard: true,
              one_time_keyboard: false,
            },
          }
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

setInterval(() => {
  if (processedTasks.size > 0) {
    processedTasks.clear()
    console.log('Cleared processedTasks')
  }
}, 24 * 60 * 60 * 1000)
