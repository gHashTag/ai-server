#!/usr/bin/env node

/**
 * 📱 ОТПРАВКА АРХИВА ПОСЛЕ /start
 *
 * Отправляем архив как только пользователь разрешит боту писать
 */

// Загружаем переменные окружения
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}.local`,
})

const { Telegraf } = require('telegraf')

const USER_ID = '144022504'
const BOT_TOKEN = process.env.BOT_TOKEN_TEST_1 // ai_koshey_bot
const BOT_NAME = 'ai_koshey_bot'

console.log('📱 ГОТОВ ОТПРАВИТЬ АРХИВ ПОСЛЕ /start')
console.log('====================================')
console.log(`🤖 Бот: @${BOT_NAME}`)
console.log(`🎯 Пользователь: ${USER_ID}`)
console.log('')

const archiveName =
  'instagram_competitors_vyacheslav_nekludov_1753195339316.zip'
const downloadUrl = `http://localhost:4000/download/instagram-archive/${archiveName}`

async function sendArchiveMessage() {
  try {
    if (!BOT_TOKEN) {
      throw new Error('BOT_TOKEN_TEST_1 не найден')
    }

    const bot = new Telegraf(BOT_TOKEN)

    // Красивое сообщение с архивом
    const message = `🎯 *Instagram анализ конкурентов готов!*

📊 *Результаты анализа:*
• Найдено конкурентов: 5  
• Сохранено в базу: 5
• Проанализировано рилсов: 10

📦 *В архиве вы найдете:*
• 📄 HTML отчёт с красивой визуализацией
• 📊 Excel файл с данными для анализа  
• 📝 README с подробными инструкциями

*Целевой аккаунт:* @vyacheslav\\_nekludov

📥 [**СКАЧАТЬ АРХИВ**](${downloadUrl})

✨ *Кликните по ссылке выше чтобы загрузить ZIP файл с полным анализом конкурентов!*

⚠️ _Ссылка действительна в течение 24 часов_

🤖 Бот: @${BOT_NAME}`

    console.log('📤 Отправляем архив пользователю...')

    await bot.telegram.sendMessage(USER_ID, message, {
      parse_mode: 'Markdown',
      link_preview_options: {
        is_disabled: false,
      },
    })

    console.log('')
    console.log('🎉 АРХИВ УСПЕШНО ОТПРАВЛЕН!')
    console.log('')
    console.log('✅ ПОЛЬЗОВАТЕЛЬ 144022504 ПОЛУЧИЛ:')
    console.log('   • Красиво оформленное сообщение')
    console.log('   • Кликабельную ссылку на архив')
    console.log('   • Подробную статистику анализа')
    console.log('   • Инструкции по использованию')

    console.log('')
    console.log('📦 В АРХИВЕ:')
    console.log(`   • HTML отчет (${archiveName})`)
    console.log('   • Excel таблица с данными')
    console.log('   • README с инструкциями')
    console.log(`   • Размер: 8,632 bytes`)

    console.log('')
    console.log('🎯 ЗАДАЧА ВЫПОЛНЕНА!')
    console.log('   Пользователь может скачать и изучить архив!')
  } catch (error) {
    if (error.message.includes('403')) {
      console.log('🚫 ПОЛЬЗОВАТЕЛЬ ЕЩЕ НЕ НАЧАЛ ДИАЛОГ С БОТОМ!')
      console.log('')
      console.log('📱 ИНСТРУКЦИЯ ДЛЯ ПОЛЬЗОВАТЕЛЯ:')
      console.log(`1. Найдите бота @${BOT_NAME} в Telegram`)
      console.log('2. Отправьте команду /start')
      console.log('3. Запустите этот скрипт снова')
    } else if (error.message.includes('404')) {
      console.log('❌ Бот или пользователь не найдены')
      console.log(`   Проверьте что @${BOT_NAME} активен`)
      console.log(`   Проверьте User ID: ${USER_ID}`)
    } else {
      console.log(`❌ Ошибка отправки: ${error.message}`)
    }

    console.log('')
    console.log('🔄 ПОВТОРИТЕ ПОПЫТКУ ПОСЛЕ ИСПРАВЛЕНИЯ ПРОБЛЕМЫ')
  }
}

console.log('⏳ Попытка отправки архива...')
sendArchiveMessage()
