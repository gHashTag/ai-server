import { getBotByName } from '@/core/bot'
import type { Telegraf } from 'telegraf'

interface NotificationOptions {
  truncateError?: boolean
  maxLength?: number
}

export class NotificationService {
  private async getBotInstance(botName: string): Promise<Telegraf> {
    try {
      const { bot } = getBotByName(botName)
      if (!bot) throw new Error(`Бот ${botName} не найден`)
      return bot
    } catch (error) {
      console.error('🤖 Ошибка получения бота:', error)
      throw error
    }
  }

  async sendTrainingError(
    telegramId: string | undefined,
    botName: string,
    error: string,
    options: NotificationOptions = {}
  ): Promise<void> {
    if (!telegramId) {
      console.warn('⚠️ Не указан Telegram ID для отправки ошибки')
      return
    }

    try {
      const bot = await this.getBotInstance(botName)
      const maxLength = options.maxLength || 2000
      const message = options.truncateError
        ? `❌ Ошибка обучения:\n${error.substring(0, maxLength)}...`
        : error

      await bot.telegram.sendMessage(
        telegramId,
        `🚨 *Ошибка обучения модели*\n\n\`\`\`\n${message}\n\`\`\``,
        { parse_mode: 'Markdown' }
      )

      console.log(`📩 Уведомление отправлено пользователю ${telegramId}`)
    } catch (error) {
      console.error('💥 Ошибка отправки уведомления:', {
        telegramId,
        error: error.message,
      })
      // Здесь можно добавить fallback-логику (email, SMS и т.д.)
    }
  }

  // Дополнительные методы сервиса
  async sendSuccessNotification(
    telegramId: string,
    modelUrl: string
  ): Promise<void> {
    try {
      const bot = await this.getBotInstance('ZavaraBot')
      await bot.telegram.sendMessage(
        telegramId,
        `🎉 *Обучение завершено!*\n\n[Скачать модель](${modelUrl})`,
        { parse_mode: 'Markdown' }
      )
    } catch (error) {
      console.error('Ошибка отправки успешного уведомления:', error)
    }
  }
}
