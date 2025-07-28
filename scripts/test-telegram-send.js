#!/usr/bin/env node
require('dotenv').config({ path: '.env' })
const { Telegraf } = require('telegraf')

const BOT_TOKEN = process.env.BOT_TOKEN_1
const TARGET_CHAT_ID = '144022504'

async function testTelegramSend() {
  console.log('🧪 Запускаем прямой тест отправки Telegram...')

  if (!BOT_TOKEN) {
    console.error('❌ Критическая ошибка: BOT_TOKEN_1 не найден в .env файлах.')
    return
  }

  console.log(`✅ Токен бота загружен. ID чата: ${TARGET_CHAT_ID}`)
  const bot = new Telegraf(BOT_TOKEN)
  const message = `✅ Прямой тест пройден!

Бот с токеном BOT_TOKEN_1 успешно отправил это сообщение.

Это значит, что проблема НЕ в токене и НЕ в Telegraf.
Проблема в Inngest, который не запускает функции.
`

  try {
    console.log('🚀 Отправляем сообщение...')
    await bot.telegram.sendMessage(TARGET_CHAT_ID, message)
    console.log('🎉 УСПЕХ! Сообщение успешно отправлено в Telegram.')
    console.log('Теперь мы знаем, что нужно чинить Inngest.')
  } catch (error) {
    console.error('❌ ПРОВАЛ! Не удалось отправить сообщение.')
    console.error('Детали ошибки:', error.message)
    console.error(
      'Это значит, что проблема в BOT_TOKEN_1 или сетевых настройках.'
    )
  }
}

testTelegramSend()
