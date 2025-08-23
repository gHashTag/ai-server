#!/usr/bin/env node

const { Telegraf } = require('telegraf')

const BOT_TOKEN = process.env.MONITORING_BOT_TOKEN || process.env.BOT_TOKEN_1
const ADMIN_ID = '144022504'

async function checkSystemStatus() {
  console.log('🔍 Проверка статуса системы мониторинга...\n')

  const status = {
    inngest: false,
    api: false,
    telegram: false,
    functions: [],
  }

  // Проверка Inngest
  try {
    const response = await fetch('http://localhost:8288/health')
    const data = await response.json()
    status.inngest = data.status === 200
    console.log(`✅ Inngest Dev Server: Работает (порт 8288)`)
  } catch (error) {
    console.log(`❌ Inngest Dev Server: Не доступен`)
  }

  // Проверка API
  try {
    const response = await fetch('http://localhost:4000/health')
    status.api = response.ok
    console.log(`✅ API Server: Работает (порт 4000)`)
  } catch (error) {
    console.log(`❌ API Server: Не доступен`)
  }

  // Проверка Telegram
  try {
    const bot = new Telegraf(BOT_TOKEN)
    const me = await bot.telegram.getMe()
    status.telegram = true
    console.log(`✅ Telegram Bot: @${me.username} активен`)
  } catch (error) {
    console.log(`❌ Telegram Bot: Не доступен`)
  }

  console.log('\n📊 Функции мониторинга:')
  console.log('• Log Monitor - анализ логов каждые 24 часа (cron: 0 10 * * *)')
  console.log('• Critical Error Monitor - мгновенные уведомления об ошибках')
  console.log(
    '• Health Check - проверка сервисов каждые 30 минут (cron: */30 * * * *)'
  )

  // Отправка статуса в Telegram
  if (status.telegram) {
    const bot = new Telegraf(BOT_TOKEN)

    const statusEmoji = status.inngest && status.api ? '✅' : '⚠️'
    const message =
      `${statusEmoji} <b>Статус системы мониторинга</b>\n\n` +
      `${status.inngest ? '✅' : '❌'} Inngest: ${
        status.inngest ? 'Работает' : 'Не доступен'
      }\n` +
      `${status.api ? '✅' : '❌'} API: ${
        status.api ? 'Работает' : 'Не доступен'
      }\n` +
      `${status.telegram ? '✅' : '❌'} Telegram: ${
        status.telegram ? 'Активен' : 'Не доступен'
      }\n\n` +
      `<b>Активные функции:</b>\n` +
      `• 📊 Log Monitor (24ч)\n` +
      `• 🚨 Critical Error Monitor\n` +
      `• 💚 Health Check (30мин)\n\n` +
      `<i>Проверка выполнена: ${new Date().toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
      })}</i>`

    try {
      await bot.telegram.sendMessage(ADMIN_ID, message, {
        parse_mode: 'HTML',
      })
      console.log('\n✅ Отчет о статусе отправлен в Telegram')
    } catch (error) {
      console.log('\n⚠️ Не удалось отправить отчет в Telegram:', error.message)
    }
  }

  // Итоговый статус
  console.log('\n' + '='.repeat(50))
  if (status.inngest && status.api && status.telegram) {
    console.log('✅ Система мониторинга полностью работоспособна!')
  } else {
    console.log('⚠️ Обнаружены проблемы в системе мониторинга')
    if (!status.inngest)
      console.log(
        '  - Запустите Inngest: npx inngest-cli@latest dev --port 8288'
      )
    if (!status.api) console.log('  - Запустите API: npm run dev')
  }
  console.log('='.repeat(50))
}

checkSystemStatus().catch(console.error)
