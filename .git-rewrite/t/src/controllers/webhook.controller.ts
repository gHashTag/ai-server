import { Request, Response } from 'express'
import { supabase } from '@/core/supabase'
import { BOT_TOKENS } from '@/config'
import { errorMessageAdmin } from '@/helpers'
import { LipSyncResponse } from '@/services/generateLipSync'
import { updateResult } from '@/core/supabase'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'

const bots = BOT_TOKENS.map(token => new Telegraf<MyContext>(token))

export class WebhookController {
  public async handleSyncLabsWebhook(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { status, outputUrl, id } = req.body as LipSyncResponse
      console.log(req.body, 'req.body')

      const token = req.headers['authorization']?.split(' ')[1] // Извлечение токена из заголовков
      if (!token) {
        res.status(403).json({ message: 'Unauthorized' })
        return
      }
      // @ts-ignore
      const bot = bots.find(bot => bot.token === token)
      if (!bot) {
        res.status(403).json({ message: 'Unauthorized' })
        return
      }

      const { data, error } = await supabase
        .from('synclabs_videos')
        .select('*')
        .eq('video_id', id)

      const isRu = data[0].is_ru
      const telegramId = data[0].telegram_id

      let updateError: any

      switch (status) {
        case 'FAILED':
          ;({ error: updateError } = await updateResult(id, outputUrl, status))
          console.error(`Ошибка синхронизации видео с ID ${id}: ${updateError}`)
          bot.telegram.sendMessage(
            telegramId,
            `❌ Ошибка при синхронизации видео. Пожалуйста, попробуйте снова позже. Ошибка: ${error}`
          )
          res.status(200).json({ message: 'Ошибка обработана' })
          break

        case 'COMPLETED':
          ;({ error: updateError } = await updateResult(id, outputUrl, status))

          if (updateError) {
            console.error('Ошибка при обновлении статуса видео:', updateError)
            bot.telegram.sendMessage(
              data[0].telegram_id,
              isRu
                ? `Ошибка при обновлении статуса видео: ${updateError}`
                : `Error updating video status: ${updateError}`
            )
            res
              .status(500)
              .json({ error: 'Ошибка при обновлении статуса видео' })
          } else {
            bot.telegram.sendVideo(data[0].telegram_id, outputUrl, {
              caption: isRu
                ? '🎥 Ваш видеосинхронизация завершена'
                : '🎥 Your video synchronization is completed',
            })
            res.status(200).json({ message: 'Webhook processed successfully' })
          }
          break

        default:
          ;({ error: updateError } = await updateResult(id, outputUrl, status))
          bot.telegram.sendMessage(
            data[0].telegram_id,
            isRu
              ? `❌ Ваш видеосинхронизация не завершена, статус: ${status}`
              : `❌ Your video synchronization is not completed, status: ${status}`
          )
          res.status(200).json({ message: 'Webhook processed successfully' })
          break
      }
    } catch (error) {
      console.error('Ошибка обработки вебхука:', error)
      errorMessageAdmin(error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
