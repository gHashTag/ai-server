import { Request, Response } from 'express'
import { updatePrompt, getTaskData } from '@/core/supabase/'
import { pulseNeuroImageV2, saveFileLocally } from '@/helpers'
import { API_URL } from '@/config'
import { getBotByName } from '@/core/bot'
import { errorMessageAdmin } from '@/helpers'
import fs from 'fs'
import path from 'path'

const processedTasks = new Set<string>()

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

      // Получаем бота
      const taskData = await getTaskData(task_id)
      if (!taskData) {
        throw new Error(`Task data not found for task_id: ${task_id}`)
      }
      const { bot_name } = taskData
      console.log('🛰 Bot name:', bot_name)
      const { bot } = getBotByName(bot_name)

      if (status === 'SUCCESS') {
        if (!result?.sample) {
          throw new Error('Invalid result: sample is missing')
        }

        processedTasks.add(task_id)

        // Сохраняем фотографию на сервере
        const { telegram_id, username, bot_name, language_code, prompt } =
          await updatePrompt(task_id, result.sample)
        const is_ru = language_code === 'ru'
        const { bot } = getBotByName(bot_name)

        const imageLocalPath = await saveFileLocally(
          telegram_id,
          result.sample,
          'neuro-photo-v2',
          '.jpeg'
        )

        // Генерируем URL для доступа к изображению
        const imageUrl = `${API_URL}/uploads/${telegram_id}/neuro-photo-v2/${path.basename(
          imageLocalPath
        )}`

        // Сохраняем URL в базу данных
        await updatePrompt(task_id, imageUrl, 'SUCCESS')

        console.log('Sending image:', imageUrl)

        // Отправляем изображение пользователю
        await bot.telegram.sendPhoto(
          telegram_id,
          {
            source: fs.createReadStream(imageLocalPath),
          },
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

        // Отправляем изображение в pulse
        await pulseNeuroImageV2(
          imageUrl,
          prompt,
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
      } else if (
        status === 'Content Moderated' ||
        status === 'GENERATED CONTENT MODERATED'
      ) {
        const { telegram_id, language_code } = await updatePrompt(
          task_id,
          result.sample
        )
        const is_ru = language_code === 'ru'

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
        const { telegram_id } = await updatePrompt(task_id, result.sample)
        await bot.telegram.sendMessage(telegram_id, `🚫 ${status}`)
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
