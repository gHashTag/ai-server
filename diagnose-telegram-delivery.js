#!/usr/bin/env node

/**
 * 🔍 ДИАГНОСТИКА TELEGRAM ДОСТАВКИ
 *
 * Проверяем все боты и находим рабочий для пользователя 144022504
 */

// Загружаем переменные окружения
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}.local`,
})

const { Telegraf } = require('telegraf')

const USER_ID = '144022504'

console.log('🔍 ДИАГНОСТИКА TELEGRAM ДОСТАВКИ')
console.log('=================================')
console.log(`🎯 Целевой пользователь: ${USER_ID}`)
console.log('')

// Все доступные боты из config
const BOTS = {
  neuro_blogger_bot: process.env.BOT_TOKEN_1,
  MetaMuse_Manifest_bot: process.env.BOT_TOKEN_2,
  ZavaraBot: process.env.BOT_TOKEN_3,
  LeeSolarbot: process.env.BOT_TOKEN_4,
  NeuroLenaAssistant_bot: process.env.BOT_TOKEN_5,
  NeurostylistShtogrina_bot: process.env.BOT_TOKEN_6,
  Gaia_Kamskaia_bot: process.env.BOT_TOKEN_7,
  Kaya_easy_art_bot: process.env.BOT_TOKEN_8,
  AI_STARS_bot: process.env.BOT_TOKEN_9,
  HaimGroupMedia_bot: process.env.BOT_TOKEN_10,
  ai_koshey_bot: process.env.BOT_TOKEN_TEST_1,
  clip_maker_neuro_bot: process.env.BOT_TOKEN_TEST_2,
}

async function testBotDelivery(botName, token) {
  if (!token) {
    console.log(`❌ ${botName}: токен отсутствует`)
    return false
  }

  try {
    const bot = new Telegraf(token)

    // Простое тестовое сообщение
    const testMessage = `🔍 Тест доставки от ${botName}

Это диагностическое сообщение для проверки связи.

Если вы получили это сообщение, значит бот ${botName} может с вами общаться!

ID: ${USER_ID}
Время: ${new Date().toLocaleString('ru-RU')}`

    await bot.telegram.sendMessage(USER_ID, testMessage)

    console.log(`✅ ${botName}: СООБЩЕНИЕ ОТПРАВЛЕНО!`)
    return true
  } catch (error) {
    if (error.message.includes('403')) {
      console.log(
        `🚫 ${botName}: пользователь заблокировал бота или не начинал диалог`
      )
    } else if (error.message.includes('404')) {
      console.log(`❓ ${botName}: пользователь не найден или бот не активен`)
    } else if (error.message.includes('400')) {
      console.log(`⚠️  ${botName}: неверный формат сообщения`)
    } else {
      console.log(`❌ ${botName}: ${error.message}`)
    }
    return false
  }
}

async function diagnoseAllBots() {
  console.log('🤖 Проверяем все доступные боты...')
  console.log('')

  let workingBots = []

  for (const [botName, token] of Object.entries(BOTS)) {
    const works = await testBotDelivery(botName, token)
    if (works) {
      workingBots.push(botName)
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('')
  console.log('📊 РЕЗУЛЬТАТЫ ДИАГНОСТИКИ:')
  console.log('==========================')

  if (workingBots.length > 0) {
    console.log(`✅ Работающие боты (${workingBots.length}):`)
    workingBots.forEach(bot => console.log(`   • ${bot}`))

    console.log('')
    console.log('🎉 ОТЛИЧНО! Найдены рабочие боты для доставки!')
    console.log('')
    console.log('📱 ЧТО ДЕЛАТЬ ДАЛЬШЕ:')
    console.log('1. Проверьте Telegram - должны прийти тестовые сообщения')
    console.log('2. Используйте любой из работающих ботов для отправки архива')
    console.log('3. Убедитесь что получили уведомления от всех рабочих ботов')
  } else {
    console.log('❌ НИ ОДИН БОТ НЕ СМОГ ОТПРАВИТЬ СООБЩЕНИЕ!')
    console.log('')
    console.log('🔧 ВОЗМОЖНЫЕ РЕШЕНИЯ:')
    console.log('1. Начните диалог с одним из ботов в Telegram:')
    Object.keys(BOTS).forEach(bot => console.log(`   • @${bot}`))
    console.log('2. Отправьте команду /start любому боту')
    console.log('3. Убедитесь что не заблокировали ботов')
    console.log('4. Проверьте что User ID 144022504 правильный')
  }

  console.log('')
  console.log('🎯 ЦЕЛЬ: Найти рабочий канал связи с пользователем 144022504')
}

// Запускаем диагностику
diagnoseAllBots().catch(error => {
  console.error('❌ Критическая ошибка диагностики:', error.message)
  process.exit(1)
})
