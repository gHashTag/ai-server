import { inngest } from '@/core/inngest/clients'
import { getBotByName } from '@/core/bot'
import {
  getUserByTelegramId,
  updateUserBalance,
  updateUserLevelPlusOne,
} from '@/core/supabase'
import { processBalanceOperation } from '@/price/helpers'
import { ModeEnum } from '@/interfaces/modes'
import { calculateModeCost } from '@/price/helpers/modelsCost'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'
import { logger } from '@/utils/logger'
import { PaymentType } from '@/interfaces/payments.interface'
import { slugify } from 'inngest'
import { generateMorphingVideo } from '@/services/generateMorphingVideo'
import type { ProcessedMorphRequest } from '@/interfaces/morphing.interface'
import { MorphingStatus } from '@/interfaces/morphing.interface'

export const morphImages = inngest.createFunction(
  {
    id: slugify('morph-images'),
    name: '🧬 Image Morphing',
    retries: 3,
  },
  { event: 'morph/images.requested' },
  async ({ event, step, runId }) => {
    logger.info({
      message: '🧬 Morphing initiated via Inngest',
      runId: runId,
      data: event.data,
    })

    const {
      telegram_id,
      image_count,
      morphing_type,
      model,
      is_ru,
      bot_name,
      zip_file_path,
    } = event.data

    // Проверяем существование пользователя в базе
    const userExists = await step.run('check-user-exists', async () => {
      logger.info({
        message: '🔍 Checking user existence',
        telegramId: telegram_id,
        step: 'check-user-exists',
      })

      const user = await getUserByTelegramId(telegram_id)
      if (!user) {
        logger.error({
          message: '❌ User not found',
          telegramId: telegram_id,
          step: 'check-user-exists',
        })
        throw new Error(`User with ID ${telegram_id} does not exist.`)
      }

      logger.info({
        message: '✅ User found',
        telegramId: telegram_id,
        userId: user.user_id,
        step: 'check-user-exists',
      })

      return user
    })

    // Увеличиваем уровень пользователя, если он на уровне 0
    if (userExists.level === 0) {
      await step.run('update-user-level', async () => {
        logger.info({
          message: '⬆️ Upgrading user level from 0 to 1',
          telegramId: telegram_id,
          currentLevel: userExists.level,
          step: 'update-user-level',
        })

        await updateUserLevelPlusOne(telegram_id, userExists.level)

        logger.info({
          message: '✅ User level updated successfully',
          telegramId: telegram_id,
          newLevel: 1,
          step: 'update-user-level',
        })
      })
    }

    // Бот будет получен внутри каждого step.run() где он нужен

    // Проверяем баланс и рассчитываем стоимость
    const { currentBalance, paymentAmount } = await step.run(
      'check-balance',
      async () => {
        logger.info({
          message: '💰 Checking user balance',
          telegramId: telegram_id,
          botName: bot_name,
          step: 'check-balance',
        })

        // Рассчитываем стоимость морфинга на основе количества изображений
        const paymentAmount = calculateModeCost({
          mode: ModeEnum.ImageMorphing,
          numImages: image_count,
        }).stars

        logger.info({
          message: '🧮 Calculated morphing cost',
          telegramId: telegram_id,
          paymentAmount: paymentAmount,
          imageCount: image_count,
          morphingType: morphing_type,
          step: 'check-balance',
        })

        const balanceCheck = await processBalanceOperation({
          telegram_id,
          paymentAmount,
          is_ru,
          bot_name,
        })

        if (!balanceCheck.success) {
          logger.error({
            message: '⚠️ Balance check failed or insufficient funds',
            telegramId: telegram_id,
            requiredAmount: paymentAmount,
            currentBalance: balanceCheck.currentBalance,
            error: balanceCheck.error,
            step: 'check-balance',
          })

          if (balanceCheck.error) {
            try {
              const { bot, error } = getBotByName(bot_name)
              if (bot && !error) {
                await bot.telegram.sendMessage(
                  telegram_id.toString(),
                  balanceCheck.error
                )
              } else {
                logger.error(
                  '❌ Failed to get bot for balance error notification:',
                  {
                    bot_name,
                    error,
                    telegram_id,
                  }
                )
              }
            } catch (notifyError) {
              logger.error(
                'Failed to send balance error notification to user',
                { telegramId: telegram_id, error: notifyError }
              )
            }
          }

          throw new Error(balanceCheck.error || 'Balance check failed')
        }

        logger.info({
          message: '✅ Balance check successful',
          telegramId: telegram_id,
          currentBalance: balanceCheck.currentBalance,
          requiredAmount: paymentAmount,
          step: 'check-balance',
        })

        return { currentBalance: balanceCheck.currentBalance, paymentAmount }
      }
    )

    try {
      // Отправляем уведомление о начале обработки
      await step.run('notify-start', async () => {
        logger.info({
          message: '📩 Sending start notification to user',
          telegramId: telegram_id,
          step: 'notify-start',
        })

        logger.info({
          message: '🔍 Attempting to get bot instance',
          bot_name,
          step: 'notify-start-debug',
        })

        const { bot, error } = getBotByName(bot_name)

        logger.info({
          message: '🤖 Bot retrieval result',
          bot_name,
          has_bot: !!bot,
          error: error || 'none',
          step: 'notify-start-debug',
        })

        if (error || !bot) {
          logger.error({
            message: '❌ Bot instance retrieval failed',
            bot_name,
            error,
            step: 'notify-start-debug',
          })
          throw new Error(`Bot instance not found or invalid: ${error}`)
        }
        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? `🧬 Начинаем создание морфинг-видео из ${image_count} изображений...`
            : `🧬 Starting morphing video creation from ${image_count} images...`
        )

        logger.info({
          message: '📨 Start notification sent successfully',
          telegramId: telegram_id,
          step: 'notify-start',
        })
      })

      // Выполняем морфинг через существующий сервис
      const morphingResult = await step.run('execute-morphing', async () => {
        logger.info({
          message: '🎬 Executing morphing generation',
          telegramId: telegram_id,
          imageCount: image_count,
          morphingType: morphing_type,
          zipFilePath: zip_file_path,
          step: 'execute-morphing',
        })

        const request: ProcessedMorphRequest = {
          type: 'morphing',
          telegram_id,
          image_count,
          morphing_type,
          model,
          is_ru,
          bot_name,
          zip_file_path,
        }

        // Используем существующий сервис
        const result = await generateMorphingVideo(request)

        logger.info({
          message: '✅ Morphing generation completed',
          telegramId: telegram_id,
          status: result.status,
          step: 'execute-morphing',
        })

        return result
      })

      if (morphingResult.status !== MorphingStatus.COMPLETED) {
        throw new Error(morphingResult.error || 'Morphing generation failed')
      }

      // Списываем баланс после успешного завершения
      await step.run('deduct-balance', async () => {
        logger.info({
          message: '💸 Deducting balance after successful morphing',
          telegramId: telegram_id,
          paymentAmount: paymentAmount,
          currentBalance: currentBalance,
          step: 'deduct-balance',
        })

        const newBalance = currentBalance - paymentAmount

        await updateUserBalance(
          telegram_id,
          paymentAmount,
          PaymentType.MONEY_OUTCOME,
          `Image morphing (${image_count} images, ${morphing_type})`,
          {
            stars: paymentAmount,
            payment_method: 'Internal',
            bot_name,
            language: is_ru ? 'ru' : 'en',
            service_type: ModeEnum.ImageMorphing,
            operation_id: morphingResult.job_id,
            category: 'REAL',
            cost: paymentAmount / 1.5,
          }
        )

        logger.info({
          message: '✅ Balance updated successfully',
          telegramId: telegram_id,
          newBalance: newBalance,
          step: 'deduct-balance',
        })

        const successMessage = is_ru
          ? `✅ Морфинг видео готово! С вашего баланса списано ${paymentAmount} ⭐. Ваш новый баланс: ${newBalance.toFixed(
              2
            )} ⭐.`
          : `✅ Morphing video ready! ${paymentAmount} ⭐ deducted from your balance. Your new balance: ${newBalance.toFixed(
              2
            )} ⭐.`

        const { bot, error } = getBotByName(bot_name)
        if (error || !bot) {
          throw new Error(`Bot instance not found or invalid: ${error}`)
        }
        await bot.telegram.sendMessage(telegram_id.toString(), successMessage)
      })

      logger.info({
        message: '🏁 Morphing process completed successfully',
        telegramId: telegram_id,
        imageCount: image_count,
        morphingType: morphing_type,
        videoUrl: morphingResult.final_video_url,
      })

      return {
        success: true,
        message: `Morphing completed successfully`,
        video_url: morphingResult.final_video_url,
        job_id: morphingResult.job_id,
      }
    } catch (error) {
      // В случае ошибки возвращаем списанные средства
      await step.run('refund-balance', async () => {
        logger.info({
          message: '♻️ Refunding payment due to error',
          telegramId: telegram_id,
          amount: paymentAmount,
          currentBalance: currentBalance,
          newBalance: currentBalance + paymentAmount,
          step: 'refund-balance',
        })

        await updateUserBalance(
          telegram_id,
          currentBalance + paymentAmount,
          PaymentType.MONEY_INCOME,
          `Refund for image morphing (${image_count} images)`,
          {
            payment_method: 'System',
            bot_name,
            language: is_ru ? 'ru' : 'en',
          }
        )

        logger.info({
          message: '✅ Payment refunded successfully',
          telegramId: telegram_id,
          newBalance: currentBalance + paymentAmount,
          step: 'refund-balance',
        })
      })

      // Логируем ошибку и отправляем уведомления
      await step.run('handle-error', async () => {
        logger.error({
          message: '🚨 Error during morphing',
          error: error.message,
          stack: error.stack,
          telegramId: telegram_id,
          imageCount: image_count,
          morphingType: morphing_type,
          step: 'handle-error',
        })

        // Отправляем уведомление пользователю
        const { bot, error: botError } = getBotByName(bot_name)
        if (bot && !botError) {
          try {
            await bot.telegram.sendMessage(
              telegram_id,
              is_ru
                ? `❌ Произошла ошибка при создании морфинг-видео. Средства возвращены на ваш баланс.\n\nОшибка: ${error.message}`
                : `❌ An error occurred during morphing video creation. Funds have been refunded to your balance.\n\nError: ${error.message}`
            )
          } catch (telegramError) {
            logger.error('❌ Failed to send error notification to user:', {
              telegram_id,
              bot_name,
              telegramError: telegramError.message,
            })
          }
        } else {
          logger.error('❌ Failed to get bot for error notification:', {
            bot_name,
            botError,
            telegram_id,
          })
        }

        // Отправляем уведомление администратору
        errorMessageAdmin(error as Error)
      })

      logger.error({
        message: '🛑 Morphing process failed',
        telegramId: telegram_id,
        imageCount: image_count,
        error: error.message,
      })

      throw error
    }
  }
)
