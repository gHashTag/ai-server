// В файле, где находится generateImageToVideo на api-server

import { replicate } from '@/core/replicate'
// ... другие импорты ...
import { VIDEO_MODELS_CONFIG } from '@/config/models.config'
import { logger } from '@/utils/logger' // Добавляем логгер
import { downloadFile } from '@/helpers/downloadFile'
import {
  getUserByTelegramId,
  updateUserLevelPlusOne,
  updateUserBalance,
} from '@/core/supabase'
import { getBotByName } from '@/core/bot'
import { processBalanceVideoOperation } from '@/price/helpers'
import { saveVideoUrlToSupabase } from '@/core/supabase/saveVideoUrlToSupabase'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'
import { PaymentType } from '@/interfaces/payments.interface'
import { ModeEnum } from '@/interfaces/modes'

interface ReplicateResponse {
  id: string // ID может не возвращаться для replicate.run, но output точно есть
  output: string | string[] // Output может быть строкой или массивом строк
}

// Обновляем сигнатуру: добавляем опциональные параметры для морфинга
export const generateImageToVideo = async (
  // Оставляем старые параметры для обратной совместимости + добавляем новые
  imageUrl: string | null, // null для морфинга
  prompt: string | null, // null для морфинга
  videoModel: string,
  telegram_id: string,
  username: string,
  is_ru: boolean,
  bot_name: string,
  is_morphing = false, // Новый флаг, по умолчанию false
  imageAUrl: string | null = null, // Новый URL A для морфинга
  imageBUrl: string | null = null // Новый URL B для морфинга
): Promise<{ videoUrl?: string; prediction_id?: string } | string> => {
  // Тип возврата пока оставим
  try {
    // Логируем все полученные параметры
    logger.info('API Server: Start generateImageToVideo (Task)', {
      imageUrl: imageUrl ? 'present' : 'absent',
      prompt: prompt ? 'present' : 'absent',
      videoModel,
      telegram_id,
      username,
      is_ru,
      bot_name,
      is_morphing,
      imageAUrl: imageAUrl ? 'present' : 'absent',
      imageBUrl: imageBUrl ? 'present' : 'absent',
    })

    // --- Валидация параметров в зависимости от режима ---
    if (is_morphing) {
      if (!imageAUrl || !imageBUrl) {
        throw new Error(
          'Серверная ошибка: imageAUrl и imageBUrl обязательны для морфинга'
        )
      }
      // imageUrl и prompt не нужны
      logger.info('API Server (Task): Morphing mode detected', { telegram_id })
    } else {
      if (!imageUrl) {
        throw new Error(
          'Серверная ошибка: imageUrl обязателен для стандартного режима'
        )
      }
      if (!prompt) {
        throw new Error(
          'Серверная ошибка: prompt обязателен для стандартного режима'
        )
      }
      // imageAUrl и imageBUrl не нужны
      logger.info('API Server (Task): Standard mode detected', { telegram_id })
    }
    // Общая валидация
    if (!videoModel || !telegram_id || !username || !bot_name) {
      throw new Error(
        'Серверная ошибка: Отсутствуют общие обязательные параметры'
      )
    }

    // --- Логика получения пользователя и бота (остается) ---
    const userExists = await getUserByTelegramId(telegram_id)
    if (!userExists) {
      throw new Error(
        `Серверная ошибка: Пользователь ${telegram_id} не найден.`
      )
    }
    const level = userExists.level
    if (level === 8) {
      // Или какая тут логика проверки уровня? Оставляем как было.
      await updateUserLevelPlusOne(telegram_id, level)
      logger.info('API Server (Task): User level updated', {
        telegram_id,
        oldLevel: level,
      })
    }

    const { bot } = getBotByName(bot_name) // Получаем инстанс бота на сервере

    // --- Проверка и списание баланса (остается, т.к. бот не делал списание) ---
    // Важно: Эта операция должна быть атомарной или идемпотентной,
    // чтобы избежать двойного списания, если бот тоже пытается списать.
    // Либо убрать списание из бота.
    const balanceResult = await processBalanceVideoOperation({
      videoModel,
      telegram_id,
      is_ru,
      bot_name, // bot_name нужен для processBalanceVideoOperation? Если нет, убрать.
    })

    if (!balanceResult.success) {
      // Не отправляем сообщение пользователю, т.к. ответ 202 уже ушел
      // Просто логируем и выбрасываем ошибку
      logger.error('API Server (Task): Balance check failed', {
        telegram_id,
        error: balanceResult.error,
      })
      throw new Error(
        balanceResult.error || 'Серверная ошибка: Проверка баланса не удалась'
      )
    }
    const { newBalance, paymentAmount } = balanceResult
    logger.info('API Server (Task): Balance sufficient and deducted', {
      telegram_id,
      paymentAmount,
      newBalance,
    })

    // --- Удаляем отправку сообщения "Генерация видео..." ---
    // await bot.telegram.sendMessage(...)

    // --- Вызов Replicate (остается replicate.run) ---
    // Используем существующую вспомогательную функцию, если она есть, или вызываем напрямую
    const runModel = async (
      model: `${string}/${string}` | `${string}/${string}:${string}`,
      input: any
    ): Promise<ReplicateResponse> => {
      logger.info('API Server (Task): Calling replicate.run', {
        model,
        inputKeys: Object.keys(input),
        telegram_id,
      })
      const result = (await replicate.run(model, {
        // Используем replicate.run
        input,
        // Не указываем webhook
      })) as ReplicateResponse
      logger.info('API Server (Task): replicate.run finished', { telegram_id })
      return result
    }

    // --- Подготовка Input для Replicate ---
    const modelConfig = VIDEO_MODELS_CONFIG[videoModel]
    if (!modelConfig?.api?.model) {
      throw new Error(
        `🚫 Серверная ошибка: Неверная конфигурация модели ${videoModel}`
      )
    }

    let modelInput: any = {}
    const replicateModelId: string = modelConfig.api.model // Полный ID модели 'owner/model:version'

    if (is_morphing) {
      // --- Input для Морфинга ---
      modelInput = {
        ...modelConfig.api.input,
        // Параметры морфинга (проверь API Replicate!)
        image_a: imageAUrl, // Передаем URL
        image_b: imageBUrl, // Передаем URL
        prompt: '', // <--- ДОБАВЛЕНО: Пустой промпт для удовлетворения API
      }
      logger.info('API Server (Task): Prepared Replicate input for morphing', {
        telegram_id,
        inputKeys: Object.keys(modelInput),
      })
    } else {
      // --- Input для Стандартной Генерации (существующая логика) ---
      // Скачиваем исходное изображение
      if (!imageUrl || !prompt)
        throw new Error(
          'Missing imageUrl or prompt for standard mode internal check'
        ) // Доп. проверка
      const imageBuffer = await downloadFile(imageUrl)
      modelInput = {
        ...modelConfig.api.input,
        prompt,
        aspect_ratio: userExists.aspect_ratio, // Сохраняем aspect_ratio
        [modelConfig.imageKey]: imageBuffer, // Передаем буфер
      }
      logger.info('API Server (Task): Prepared Replicate input for standard', {
        telegram_id,
        inputKeys: Object.keys(modelInput),
      })
    }

    // --- Запуск модели Replicate ---
    const result = await runModel(replicateModelId as any, modelInput) // Вызываем replicate.run

    // --- Обработка результата (остается) ---
    // Убедимся, что обрабатываем и строку, и массив строк в output
    const videoUrl = Array.isArray(result?.output)
      ? result.output[0]
      : result?.output
    logger.info('API Server (Task): Received video URL from Replicate', {
      videoUrl: videoUrl ? 'present' : 'absent',
      telegram_id,
    })

    if (videoUrl) {
      // --- Логика сохранения и отправки (остается) ---
      const videoLocalPath = path.join(
        __dirname, // Убедись, что __dirname доступен, или используй другой способ определения пути
        '../uploads', // Путь к папке uploads на сервере
        telegram_id.toString(),
        'image-to-video',
        `${new Date().toISOString()}.mp4`
      )
      await mkdir(path.dirname(videoLocalPath), { recursive: true })

      const originalBuffer = await downloadFile(videoUrl as string)
      await writeFile(videoLocalPath, originalBuffer)
      await saveVideoUrlToSupabase(
        // Сохраняем в БД
        telegram_id,
        videoUrl as string,
        videoLocalPath,
        videoModel
      )
      logger.info('API Server (Task): Video saved locally and to DB', {
        telegram_id,
        videoLocalPath,
      })

      // Отправляем видео пользователю через инстанс бота
      await bot.telegram.sendVideo(telegram_id, { source: videoLocalPath })
      logger.info('API Server (Task): Video sent to user', { telegram_id })

      // Списываем средства после успешной генерации
      try {
        await updateUserBalance(
          telegram_id,
          paymentAmount,
          PaymentType.MONEY_OUTCOME,
          `Image-to-Video generation (${videoModel})`,
          {
            stars: paymentAmount,
            payment_method: 'Internal',
            service_type: ModeEnum.ImageToVideo,
            bot_name: bot_name,
            language: is_ru ? 'ru' : 'en',
            cost: paymentAmount / 1.5, // себестоимость
          }
        )
        logger.info(
          'API Server (Task): Balance updated successfully for Image-to-Video',
          { telegram_id }
        )
      } catch (balanceError) {
        logger.error(
          'API Server (Task): Error updating balance for image-to-video',
          { telegram_id, error: balanceError }
        )
        errorMessageAdmin(balanceError as Error)
      }

      // Отправляем сообщение об успехе и балансе
      await bot.telegram.sendMessage(
        telegram_id,
        is_ru
          ? `✅ Ваше видео готово!\n\nСписано: ${paymentAmount.toFixed(
              2 // Используем paymentAmount из balanceResult
            )} ⭐️\nВаш новый баланс: ${newBalance.toFixed(2)} ⭐️` // Используем newBalance из balanceResult
          : `✅ Your video is ready!\n\nDeducted: ${paymentAmount.toFixed(
              2
            )} ⭐️\nYour new balance: ${newBalance.toFixed(2)} ⭐️`
        // Убрал клавиатуру "Сгенерировать новое?", т.к. сцена завершена
      )
      logger.info('API Server (Task): Success message sent to user', {
        telegram_id,
      })

      // Отправляем видео в канал Pulse
      await bot.telegram.sendVideo(
        '@neuro_blogger_pulse', // Канал Pulse
        { source: videoLocalPath },
        {
          caption: (is_ru
            ? `${username} (ID: ${telegram_id}) ${
                is_morphing ? 'сморфил' : 'сгенерировал'
              } видео.\nМодель: ${videoModel}\nБот: @${bot.botInfo?.username}`
            : `${username} (ID: ${telegram_id}) generated a ${
                is_morphing ? 'morph' : 'standard'
              } video.\nModel: ${videoModel}\nBot: @${bot.botInfo?.username}`
          ).slice(0, 1000), // Укоротил сообщение для Pulse
        }
      )
      logger.info('API Server (Task): Video sent to Pulse channel', {
        telegram_id,
      })
    } else {
      logger.error(
        'API Server (Task): Video URL is missing in Replicate response',
        { telegram_id, result }
      )
      throw new Error(
        'Серверная ошибка: Не удалось получить URL видео от Replicate'
      )
    }

    // Возвращаем URL (хотя он уже отправлен). Может быть не нужно?
    return { videoUrl: videoUrl as string }
  } catch (error) {
    // Логируем ошибку фоновой задачи
    logger.error('API Server (Task): Error in generateImageToVideo task', {
      telegram_id,
      error,
    })
    errorMessageAdmin(error instanceof Error ? error : new Error(String(error)))

    // --- Не отправляем сообщение пользователю отсюда ---
    // const { bot } = getBotByName(bot_name); // Не нужно получать бота снова
    // bot.telegram.sendMessage(...)

    // Перевыбрасываем ошибку, чтобы ее мог поймать .catch в обработчике маршрута
    throw error
  }
}
