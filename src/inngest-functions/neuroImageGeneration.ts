import { inngest } from '@/core/inngest/clients'
import { replicate } from '@/core/replicate'
import { getAspectRatio } from '@/core/supabase/ai'
import { savePrompt } from '@/core/supabase/savePrompt'
import { getUserByTelegramId, updateUserLevelPlusOne } from '@/core/supabase'
import { processApiResponse } from '@/helpers/processApiResponse'

import { saveFileLocally } from '@/helpers'
import { pulse } from '@/helpers/pulse'
import { processBalanceOperation } from '@/price/helpers'

import { modeCosts, ModeEnum } from '@/price/helpers/modelsCost'
import path from 'path'
import { API_URL } from '@/config'
import fs from 'fs'
import { logger } from '@/utils/logger'
import { getBotByName } from '@/core/bot'

export const neuroImageGeneration = inngest.createFunction(
  {
    id: 'neuro-image-generation',
    // idempotency: 'event.data.telegram_id',
    retries: 3,
  },
  { event: 'neuro/photo.generate' },
  async ({ event, step }) => {
    try {
      const {
        prompt,
        model_url,
        num_images,
        telegram_id,
        username,
        is_ru,
        bot_name,
      } = event.data

      logger.info({
        message: '🎨 Starting neuro image generation',
        telegram_id,
        prompt: prompt.substring(0, 50) + '...',
        model_url,
      })

      const botData = (await step.run('get-bot', async () => {
        logger.info({
          message: '🤖 Getting bot instance',
          botName: bot_name,
          step: 'get-bot',
        })

        return getBotByName(bot_name)
      })) as { bot: any }
      console.log('botData', botData)
      const bot = botData.bot

      if (!bot) {
        logger.error({
          message: '❌ Bot instance not found',
          bot_name,
          telegram_id,
        })
      } else {
        logger.info({
          message: '✅ Bot instance found',
          bot_name,
          telegram_id,
        })
      }

      const userExists = await step.run('check-user', async () => {
        logger.info({
          message: '👤 Validating user existence',
          telegram_id,
        })
        const user = await getUserByTelegramId(telegram_id)
        if (!user) throw new Error(`User ${telegram_id} not found`)
        return user
      })

      // Уровень пользователя
      if (userExists.level === 1) {
        await step.run('update-level', async () => {
          await updateUserLevelPlusOne(telegram_id, userExists.level)
          logger.info({
            message: '⬆️ User level upgraded',
            telegram_id,
            newLevel: userExists.level + 1,
          })
        })
      }

      const costPerImage = await step.run('calculate-cost', async () => {
        const cost =
          typeof modeCosts[ModeEnum.NeuroPhoto] === 'function'
            ? modeCosts[ModeEnum.NeuroPhoto](num_images)
            : modeCosts[ModeEnum.NeuroPhoto]

        logger.info({
          message: '💸 Calculated image cost',
          costPerImage: cost,
          num_images,
          totalCost: cost * num_images,
        })
        return cost
      })

      const balanceCheck = await step.run('process-payment', async () => {
        const result = await processBalanceOperation({
          telegram_id,
          paymentAmount: costPerImage * num_images,
          is_ru,
          bot,
          bot_name,
          description: `Payment for generating ${num_images} image${
            num_images === 1 ? '' : 's'
          } with prompt: ${prompt.substring(0, 30)}...`,
        })

        if (!result.success) {
          logger.error({
            message: '⚠️ Payment processing failed',
            error: result.error,
          })
          throw new Error(result.error)
        }

        return result
      })

      const aspect_ratio = await step.run('get-aspect-ratio', async () => {
        const ratio = await getAspectRatio(telegram_id)
        logger.info({
          message: '📐 Using aspect ratio',
          ratio,
        })
        return ratio
      })

      const generatedImages = []

      for (let i = 0; i < num_images; i++) {
        const generationResult = await step.run(
          `generate-image-${i}`,
          async () => {
            const { bot } = getBotByName(bot_name)
            await bot.telegram.sendMessage(
              telegram_id,
              is_ru
                ? `⏳ Генерация изображения ${i + 1} из ${num_images}`
                : `⏳ Generating image ${i + 1} of ${num_images}`
            )

            const input = {
              prompt: `Fashionable: ${prompt}. Cinematic Lighting, realistic, intricate details, extremely detailed, incredible details, full colored, complex details, insanely detailed and intricate, hypermaximalist, extremely detailed with rich colors. Masterpiece, best quality, aerial view, HDR, UHD, unreal engine, Representative, fair skin, beautiful face, Rich in details, high quality, gorgeous, glamorous, 8K, super detail, gorgeous light and shadow, detailed decoration, detailed lines.`,
              negative_prompt: 'nsfw, erotic, violence, bad anatomy...',
              num_inference_steps: 40,
              guidance_scale: 3,
              lora_scale: 1,
              megapixels: '1',
              output_quality: 80,
              prompt_strength: 0.8,
              extra_lora_scale: 1,
              go_fast: false,
              ...(aspect_ratio === '1:1'
                ? { width: 1024, height: 1024 }
                : aspect_ratio === '16:9'
                ? { width: 1368, height: 768 }
                : aspect_ratio === '9:16'
                ? { width: 768, height: 1368 }
                : { width: 1024, height: 1024 }),
              sampler: 'flowmatch',
              num_outputs: 1,
              aspect_ratio,
            }

            const output = await replicate.run(model_url, { input })
            const imageUrl = await processApiResponse(output)

            if (!imageUrl) throw new Error('Image generation failed')

            const localPath = await saveFileLocally(
              telegram_id,
              imageUrl,
              'neuro-photo',
              '.jpeg'
            )

            const prompt_id = await savePrompt(
              prompt,
              model_url,
              ModeEnum.NeuroPhoto,
              imageUrl,
              telegram_id,
              'SUCCESS'
            )

            if (!prompt_id) {
              logger.error('Failed to save prompt')
              throw new Error('Prompt save failed')
            }

            await pulse(
              localPath,
              prompt,
              `/${model_url}`,
              telegram_id,
              username,
              is_ru,
              bot_name
            )

            return {
              url: `${API_URL}/uploads/${telegram_id}/neuro-photo/${path.basename(
                localPath
              )}`,
              path: localPath,
              prompt_id,
            }
          }
        )

        await step.run(`notify-image-${i}`, async () => {
          const { bot } = getBotByName(bot_name)
          await bot.telegram.sendPhoto(telegram_id, {
            source: fs.createReadStream(generationResult.path),
          })
        })

        generatedImages.push(generationResult.url)
      }

      await step.run('final-notification', async () => {
        const { bot } = getBotByName(bot_name)
        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? `Ваши изображения сгенерированы! Стоимость: ${(
                costPerImage * num_images
              ).toFixed(
                2
              )} ⭐️\nНовый баланс: ${balanceCheck.newBalance.toFixed(2)} ⭐️`
            : `Your images generated! Cost: ${(
                costPerImage * num_images
              ).toFixed(2)} ⭐️\nNew balance: ${balanceCheck.newBalance.toFixed(
                2
              )} ⭐️`,
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
      })

      logger.info({
        message: '✅ Successfully completed neuro generation',
        telegram_id,
        numImages: generatedImages.length,
      })

      return { success: true, images: generatedImages }
    } catch (error) {
      logger.error({
        message: '🚨 Neuro image generation failed',
        error: error.message,
        stack: error.stack,
        telegram_id: event.data.telegram_id,
      })

      await inngest.send({
        name: 'neuro/photo.failed',
        data: {
          ...event.data,
          error: error.message,
        },
      })

      throw error
    }
  }
)
