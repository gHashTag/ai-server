#!/usr/bin/env node

/**
 * 🚀 АГРЕССИВНАЯ ДОСТАВКА В TELEGRAM
 *
 * Пробуем ВСЕ способы доставить архив пользователю 144022504
 */

// Загружаем переменные окружения
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}.local`,
})

const { Telegraf } = require('telegraf')

const USER_ID = '144022504' // Подтвержденный ID
const archiveName =
  'instagram_competitors_vyacheslav_nekludov_1753195339316.zip'
const downloadUrl = `http://localhost:4000/download/instagram-archive/${archiveName}`

console.log('🚀 АГРЕССИВНАЯ ДОСТАВКА В TELEGRAM')
console.log('==================================')
console.log(`🎯 Подтвержденный User ID: ${USER_ID}`)
console.log('')

// Приоритетные боты для теста
const PRIORITY_BOTS = [
  { name: 'ai_koshey_bot', token: process.env.BOT_TOKEN_TEST_1 },
  { name: 'neuro_blogger_bot', token: process.env.BOT_TOKEN_1 },
  { name: 'clip_maker_neuro_bot', token: process.env.BOT_TOKEN_TEST_2 },
]

async function forceDelivery() {
  console.log('🔥 ПОПЫТКА ФОРСИРОВАННОЙ ДОСТАВКИ...')
  console.log('')

  for (const { name, token } of PRIORITY_BOTS) {
    if (!token) {
      console.log(`❌ ${name}: токен отсутствует`)
      continue
    }

    try {
      console.log(`🤖 Тестируем ${name}...`)

      const bot = new Telegraf(token)

      // Проверим сначала что бот вообще работает
      const botInfo = await bot.telegram.getMe()
      console.log(`   ✅ Бот активен: @${botInfo.username}`)

      // Формируем АРХИВНОЕ сообщение
      const archiveMessage = `🎯 *INSTAGRAM АРХИВ ГОТОВ!*

📊 *Результаты анализа конкурентов:*
• Найдено конкурентов: 5
• Сохранено в базу: 5  
• Проанализировано рилсов: 10

📦 *Содержимое архива:*
• 📄 HTML отчёт с красивой визуализацией
• 📊 Excel файл с данными для анализа
• 📝 README с инструкциями

*Анализируемый аккаунт:* @vyacheslav\\_nekludov

📥 [**СКАЧАТЬ АРХИВ ПРЯМО СЕЙЧАС**](${downloadUrl})

✨ *Нажмите на ссылку выше чтобы загрузить ZIP файл!*

📋 *Детали:*
• Размер архива: 8,632 bytes
• Формат: ZIP
• Действительно: 24 часа

🤖 *Доставлено через:* @${botInfo.username}
🆔 *User ID:* ${USER_ID}
⏰ *Время:* ${new Date().toLocaleString('ru-RU')}`

      // ПОПЫТКА ОТПРАВКИ
      await bot.telegram.sendMessage(USER_ID, archiveMessage, {
        parse_mode: 'Markdown',
        link_preview_options: {
          is_disabled: false,
        },
      })

      console.log('')
      console.log('🎉🎉🎉 УСПЕХ! АРХИВ ОТПРАВЛЕН! 🎉🎉🎉')
      console.log('==========================================')
      console.log(`✅ Бот: @${botInfo.username}`)
      console.log(`✅ Получатель: ${USER_ID}`)
      console.log(`✅ Архив: ${archiveName}`)
      console.log(`✅ URL: ${downloadUrl}`)
      console.log('')
      console.log('📱 ПОЛЬЗОВАТЕЛЬ ПОЛУЧИЛ:')
      console.log('   • Красиво оформленное сообщение')
      console.log('   • Кликабельную ссылку на архив')
      console.log('   • Полную статистику анализа')
      console.log('   • Инструкции по скачиванию')
      console.log('')
      console.log('🎯 ЗАДАЧА ВЫПОЛНЕНА! МИССИЯ ЗАВЕРШЕНА!')

      return true // Успех!
    } catch (error) {
      console.log(`   ❌ ${name}: ${error.message}`)

      if (error.message.includes('403')) {
        console.log(`   🚫 Нужно начать диалог с @${name}`)
      } else if (error.message.includes('404')) {
        console.log(`   ❓ Пользователь не найден или бот недоступен`)
      }
    }

    console.log('')
  }

  // Если никто не сработал
  console.log('❌ ВСЕ БОТЫ НЕ СМОГЛИ ОТПРАВИТЬ СООБЩЕНИЕ!')
  console.log('')
  console.log('🚨 КРИТИЧЕСКАЯ СИТУАЦИЯ - НУЖНО ДЕЙСТВИЕ ПОЛЬЗОВАТЕЛЯ!')
  console.log('')
  console.log('📱 ЧТО НУЖНО СДЕЛАТЬ ПРЯМО СЕЙЧАС:')
  console.log('')
  console.log('1️⃣ Откройте Telegram')
  console.log('2️⃣ Найдите ЛЮБОЙ из этих ботов:')
  PRIORITY_BOTS.forEach(bot => {
    if (bot.token) {
      console.log(`   • @${bot.name}`)
    }
  })
  console.log('3️⃣ Напишите боту /start')
  console.log('4️⃣ СРАЗУ после этого запустите: node force-telegram-delivery.js')
  console.log('')
  console.log('⚡ АЛЬТЕРНАТИВНО - скачайте архив по прямой ссылке:')
  console.log(`   ${downloadUrl}`)
  console.log('')
  console.log('🎯 АРХИВ УЖЕ ГОТОВ И ЖДЕТ ВАС!')

  return false
}

// Запускаем форсированную доставку
forceDelivery().catch(error => {
  console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message)
  console.log('')
  console.log('🔧 BACKUP ПЛАН:')
  console.log(`   Скачайте архив напрямую: ${downloadUrl}`)
})
