// src/services/bot.service.ts
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'

export class BotService {
  private bots: Telegraf<MyContext>[] = []

  constructor(app: express.Application) {
    // Пример использования attachBot
    this.attachBot(app, process.env.BOT_TOKEN_1, 'token1')
  }

  private attachBot(app: express.Application, token: string, path: string) {
    console.log(`Attempting to attach bot with path: /${path}`)

    if (!token) {
      console.error(`Token for bot at path /${path} is missing`)
      return
    }

    console.log(`Token for bot at path /${path} is present`)

    const bot = new Telegraf<MyContext>(token)
    app.use(bot.webhookCallback(`/${path}`))
    console.log(`Webhook callback set for path: /${path}`)

    bot.on('message', ctx => {
      console.log(`Received message: ${ctx.message.text}`)
      ctx.reply('Hey')
    })

    bot.telegram
      .setWebhook(`${process.env.WEBHOOK_URL}/${path}`)
      .then(() => {
        console.log(
          `Webhook successfully set for bot at ${process.env.WEBHOOK_URL}/${path}`
        )
      })
      .catch(error => {
        console.error(
          `Failed to set webhook for bot at ${process.env.WEBHOOK_URL}/${path}:`,
          error
        )
      })

    this.bots.push(bot)
    console.log(`Bot added to the list. Total bots: ${this.bots.length}`)
  }
}
