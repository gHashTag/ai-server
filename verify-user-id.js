#!/usr/bin/env node

/**
 * 🔍 ВЕРИФИКАЦИЯ USER ID
 *
 * Проверяем правильность ID через разные методы
 */

require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}.local`,
})

const { Telegraf } = require('telegraf')

const USER_ID = '144022504'

console.log('🔍 ВЕРИФИКАЦИЯ USER ID')
console.log('=====================')
console.log(`🎯 Проверяемый ID: ${USER_ID}`)
console.log('')

async function verifyUserId() {
  console.log('🔬 ДИАГНОСТИЧЕСКИЕ ПРОВЕРКИ:')
  console.log('')

  // Проверка 1: Формат ID
  console.log('1️⃣ Проверка формата ID:')
  if (/^\d+$/.test(USER_ID)) {
    console.log('   ✅ Формат корректный (только цифры)')
  } else {
    console.log('   ❌ Неверный формат (содержит не-цифры)')
  }
  console.log(`   📊 Длина: ${USER_ID.length} символов`)
  console.log(
    `   🔢 Диапазон: ${USER_ID} (${
      parseInt(USER_ID) > 0 ? 'положительный' : 'неположительный'
    })`
  )

  console.log('')

  // Проверка 2: Попытка через getChat
  console.log('2️⃣ Проверка существования пользователя:')

  try {
    const bot = new Telegraf(process.env.BOT_TOKEN_TEST_1)

    // Пытаемся получить информацию о чате
    const chatInfo = await bot.telegram.getChat(USER_ID)
    console.log('   ✅ Пользователь существует!')
    console.log(`   👤 Тип: ${chatInfo.type}`)
    if (chatInfo.first_name) {
      console.log(`   📝 Имя: ${chatInfo.first_name}`)
    }
    if (chatInfo.username) {
      console.log(`   🔗 Username: @${chatInfo.username}`)
    }
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error.message}`)

    if (error.message.includes('400')) {
      console.log('   💡 Возможно: ID неправильный или пользователь недоступен')
    } else if (error.message.includes('403')) {
      console.log('   💡 Возможно: Бот заблокирован пользователем')
    } else if (error.message.includes('404')) {
      console.log('   💡 Возможно: Пользователь не найден')
    }
  }

  console.log('')
  console.log('📋 ЗАКЛЮЧЕНИЕ:')
  console.log('==============')
  console.log('')
  console.log('🎯 ВОЗМОЖНЫЕ ПРИЧИНЫ ПРОБЛЕМЫ:')
  console.log('')
  console.log('1️⃣ User ID неправильный')
  console.log('   Решение: Узнать точный ID через @userinfobot')
  console.log('')
  console.log('2️⃣ Вы никогда не общались ни с одним ботом')
  console.log('   Решение: Начать диалог с @ai_koshey_bot')
  console.log('')
  console.log('3️⃣ Все боты заблокированы')
  console.log('   Решение: Разблокировать хотя бы один бот')
  console.log('')
  console.log('🔧 НЕМЕДЛЕННОЕ ДЕЙСТВИЕ:')
  console.log('')
  console.log('📱 1. Откройте @userinfobot в Telegram')
  console.log('📱 2. Отправьте /start')
  console.log('📱 3. Скопируйте ваш точный User ID')
  console.log('📱 4. Сообщите мне новый ID')
  console.log('')
  console.log('⚡ ИЛИ скачайте архив прямо сейчас:')
  console.log(
    '   http://localhost:4000/download/instagram-archive/instagram_competitors_vyacheslav_nekludov_1753195339316.zip'
  )
}

verifyUserId().catch(console.error)
