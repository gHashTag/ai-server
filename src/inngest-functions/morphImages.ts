import { inngest } from '@/core/inngest/clients'
import { logger } from '@/utils/logger'
import { getUserBalance } from '@/core/supabase/getUserBalance'
import { getUserByTelegramId } from '@/core/supabase'
import { getBotByName } from '@/core/bot'
import { processSequentialMorphing } from '@/core/kling/pairwiseMorphing'
import { MorphingType } from '@/interfaces/morphing.interface'
import fs from 'fs'

// 🔧 НОВЫЙ ИНТЕРФЕЙС: Получаем готовые пути к файлам, не ZIP
interface MorphingJobData {
  telegram_id: string
  image_count: number
  morphing_type: 'seamless' | 'loop'
  model: string
  is_ru: boolean
  bot_name: string
  job_id: string
  // 🎯 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Массив путей к файлам вместо zip_file_path
  image_files: Array<{
    filename: string
    path: string
    order: number
  }>
  extraction_path: string // Путь для очистки после обработки
}

export const morphImages = inngest.createFunction(
  {
    id: 'morph-images',
    name: '🧬 Morph Images', // Добавляем emoji и название как у других функций
    retries: 3,
  },
  { event: 'morph/images.requested' },
  async ({ event, step }) => {
    const {
      telegram_id,
      morphing_type,
      model,
      is_ru,
      bot_name,
      job_id,
      image_files,
      extraction_path,
    } = event.data as MorphingJobData

    logger.info('🧬 Morphing job started:', {
      telegram_id,
      job_id,
      image_files_count: image_files.length,
      morphing_type,
      model,
    })

    // ШАГ 1: Проверка существования пользователя
    await step.run('check-user-exists', async () => {
      const user = await getUserByTelegramId(telegram_id)

      if (!user) {
        throw new Error(`User ${telegram_id} does not exist`)
      }

      logger.info('✅ User exists:', { telegram_id })
      return { exists: true, user }
    })

    // ШАГ 2: Проверка баланса пользователя
    await step.run('check-balance', async () => {
      const balance = await getUserBalance(telegram_id, bot_name)
      const requiredStars = 50 // Базовая стоимость морфинга

      if (balance < requiredStars) {
        throw new Error(`Insufficient balance: ${balance} < ${requiredStars}`)
      }

      logger.info('✅ Balance sufficient:', {
        telegram_id,
        balance,
        required: requiredStars,
      })
      return { balance, required: requiredStars }
    })

    // ШАГ 3: Уведомление о начале обработки (НЕ отправляем большие данные!)
    await step.run('notify-start', async () => {
      const { bot, error } = getBotByName(bot_name)
      if (error || !bot) {
        throw new Error(`Bot ${bot_name} not found: ${error}`)
      }

      const startMessage = is_ru
        ? `🧬 Начинаю морфинг ${image_files.length} изображений...\nJob ID: ${job_id}`
        : `🧬 Starting morphing of ${image_files.length} images...\nJob ID: ${job_id}`

      await bot.telegram.sendMessage(telegram_id, startMessage)

      logger.info('✅ Start notification sent:', { telegram_id, job_id })
      return { notified: true }
    })

    // ШАГ 4: 🚀 ПАРАЛЛЕЛЬНЫЙ МОРФИНГ С ОРКЕСТРАЦИЕЙ
    const morphingResult = await step.run(
      'execute-parallel-morphing',
      async () => {
        logger.info('🧬 Starting parallel morphing orchestration:', {
          telegram_id,
          job_id,
          image_files_count: image_files.length,
        })

        // Преобразуем пути файлов в формат ExtractedImage для существующей логики
        const extractedImages = image_files.map(file => ({
          filename: file.filename,
          originalName: file.filename,
          path: file.path,
          order: file.order,
        }))

        // Используем существующую логику последовательного морфинга
        // Приводим тип morphing_type к правильному enum
        const morphingTypeEnum =
          morphing_type === 'seamless'
            ? MorphingType.SEAMLESS
            : MorphingType.LOOP

        const result = await processSequentialMorphing(
          extractedImages,
          morphingTypeEnum,
          telegram_id
        )

        if (!result.success) {
          throw new Error(`Morphing failed: ${result.error}`)
        }

        logger.info('✅ Parallel morphing completed:', {
          telegram_id,
          job_id,
          video_url: result.video_url,
          processing_time: result.processing_time,
        })

        return {
          success: true,
          job_id: result.job_id,
          video_url: result.video_url,
          processing_time: result.processing_time,
        }
      }
    )

    // ШАГ 5: Очистка временных файлов
    await step.run('cleanup-temp-files', async () => {
      try {
        // Очищаем директорию с извлеченными изображениями
        if (fs.existsSync(extraction_path)) {
          await fs.promises.rm(extraction_path, {
            recursive: true,
            force: true,
          })
          logger.info('✅ Temporary extraction path cleaned:', {
            extraction_path,
          })
        }

        return { cleaned: true, path: extraction_path }
      } catch (error) {
        logger.error('⚠️ Failed to clean temporary files:', {
          extraction_path,
          error: error instanceof Error ? error.message : String(error),
        })
        // Не прерываем выполнение из-за ошибки очистки
        return { cleaned: false, error: String(error) }
      }
    })

    // Отправляем результат пользователю
    const deliverResult = await step.run('deliver-result', async () => {
      logger.info('📤 Отправляем морфинг видео пользователю:', {
        description: 'Delivering morphing video to user',
        telegram_id,
        video_url: morphingResult.video_url,
        bot_name,
      })

      const { bot, error } = getBotByName(bot_name)
      if (error || !bot) {
        throw new Error(`Bot ${bot_name} not found: ${error}`)
      }

      // 🎬 Рекламный текст с упоминанием бота
      const botMention =
        bot_name === 'clip_maker_neuro_bot'
          ? '@clip_maker_neuro_bot'
          : '@ai_koshey_bot'
      const advertisementText = `🧬 **Морфинг завершен!**\n\n✨ Создано с помощью ${botMention}\n🎯 Время обработки: ~5 минут\n💫 Качество: Full HD 1080p\n\n📥 **Скачать:** Отправлен как документ\n👀 **Просмотр:** Видео выше\n\n🚀 Создавай больше контента с нашими ботами!`

      try {
        // 📱 Отправляем как видео для просмотра (с превью)
        await bot.telegram.sendVideo(telegram_id, morphingResult.video_url, {
          caption: advertisementText,
          parse_mode: 'Markdown',
          width: 1920, // Full HD ширина
          height: 1080, // Full HD высота
          duration: 5, // 5 секунд
          supports_streaming: true, // Поддержка стриминга
        })

        // 📎 Отправляем как документ для скачивания
        const fileDownloadText = `📁 **Файл для скачивания**\n\n🎬 Морфинг видео в высоком качестве\n💾 Можно сохранить на устройство\n\n${botMention} - создаем будущее вместе!`
        await bot.telegram.sendDocument(telegram_id, morphingResult.video_url, {
          caption: fileDownloadText,
          parse_mode: 'Markdown',
        })

        logger.info('✅ Видео успешно доставлено пользователю:', {
          telegram_id,
          delivered_as: 'video_and_document',
          bot_name,
        })

        return { delivered: true, method: 'video_and_document' }
      } catch (deliveryError) {
        logger.error('❌ Ошибка доставки видео:', {
          telegram_id,
          error:
            deliveryError instanceof Error
              ? deliveryError.message
              : String(deliveryError),
        })

        // Фоллбэк: отправляем хотя бы ссылку
        await bot.telegram.sendMessage(
          telegram_id,
          `🎬 **Морфинг готов!**\n\n📎 **Скачать видео:** ${morphingResult.video_url}\n\n✨ Создано с помощью ${botMention}`,
          { parse_mode: 'Markdown' }
        )

        return { delivered: true, method: 'link_fallback' }
      }
    })

    // 🔧 ФИНАЛЬНЫЙ РЕЗУЛЬТАТ: Возвращаем только необходимые данные (БЕЗ больших объектов)
    const finalResult = {
      job_id,
      telegram_id,
      status: 'completed',
      morphing_result: {
        success: morphingResult.success,
        job_id: morphingResult.job_id,
        video_url: morphingResult.video_url,
        processing_time: morphingResult.processing_time,
      },
      delivery: deliverResult,
      processing_time: Date.now() - new Date(event.ts).getTime(),
    }

    logger.info('🎉 Morphing job completed successfully:', finalResult)
    return finalResult
  }
)
