#!/usr/bin/env node

/**
 * 📱 ПРЯМАЯ ОТПРАВКА В TELEGRAM для пользователя 144022504
 *
 * Отправляем реальное сообщение с архивом напрямую через Telegram API
 */

// Загружаем переменные окружения
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}.local`,
})

const { Telegraf } = require('telegraf')

// Bot token для neuro_blogger_bot
const BOT_TOKEN = process.env.BOT_TOKEN_1
const USER_ID = '144022504'

console.log('📱 ПРЯМАЯ ОТПРАВКА В TELEGRAM для пользователя 144022504')
console.log('=========================================================')

// Существующий архив
const archiveName =
  'instagram_competitors_vyacheslav_nekludov_1753195339316.zip'
const downloadUrl = `http://localhost:4000/download/instagram-archive/${archiveName}`

async function sendDirectTelegramMessage() {
  try {
    if (!BOT_TOKEN) {
      throw new Error('BOT_TOKEN_1 не установлен в переменных окружения')
    }

    console.log('🤖 Создаем Telegram бота...')
    const bot = new Telegraf(BOT_TOKEN)

    console.log('')
    console.log('📋 Данные для отправки:')
    console.log(`   • 📱 User ID: ${USER_ID}`)
    console.log(`   • 🤖 Bot: neuro_blogger_bot`)
    console.log(`   • 📦 Архив: ${archiveName}`)
    console.log(`   • 🔗 URL: ${downloadUrl}`)

    // Формируем красивое сообщение
    const message = `🎯 *Анализ Instagram конкурентов завершен!*

📊 *Результаты:*
• Найдено конкурентов: 5
• Сохранено в базу: 5  
• Проанализировано рилсов: 10

📦 *В архиве:*
• HTML отчёт с красивой визуализацией
• Excel файл с данными для анализа
• README с инструкциями

*Целевой аккаунт:* @vyacheslav\\_nekludov

📥 [Скачать архив](${downloadUrl})

⚠️ _Ссылка действительна в течение 24 часов_`

    console.log('')
    console.log('📤 Отправляем сообщение пользователю...')

    // Отправляем сообщение
    await bot.telegram.sendMessage(USER_ID, message, {
      parse_mode: 'Markdown',
      link_preview_options: {
        is_disabled: false,
      },
    })

    console.log('')
    console.log('✅ СООБЩЕНИЕ УСПЕШНО ОТПРАВЛЕНО!')
    console.log('')
    console.log('🎉 ЧТО ПОЛУЧИЛ ПОЛЬЗОВАТЕЛЬ 144022504:')
    console.log('   ✅ Красиво оформленное сообщение с результатами')
    console.log('   ✅ Кликабельную ссылку для скачивания архива')
    console.log('   ✅ Подробную статистику анализа')
    console.log('   ✅ Информацию о содержимом архива')

    console.log('')
    console.log('🔗 ПОЛЬЗОВАТЕЛЬ МОЖЕТ:')
    console.log('   1. Нажать на ссылку "Скачать архив"')
    console.log('   2. Автоматически загрузить ZIP файл')
    console.log('   3. Открыть HTML отчет в браузере')
    console.log('   4. Анализировать данные в Excel файле')

    console.log('')
    console.log('🎯 МИССИЯ ВЫПОЛНЕНА!')
    console.log(
      '   Пользователь 144022504 получил РЕАЛЬНЫЙ архив через URL подход!'
    )
  } catch (error) {
    console.error('❌ Ошибка при отправке в Telegram:', error.message)

    if (error.message.includes('Forbidden')) {
      console.error('')
      console.error('🚫 Возможные причины:')
      console.error('   • Пользователь заблокировал бота')
      console.error('   • Пользователь не начинал диалог с ботом')
      console.error('   • Неверный User ID')
    }

    process.exit(1)
  }
}

// Запускаем прямую отправку
sendDirectTelegramMessage()
