#!/usr/bin/env node

/**
 * 🧪 ТЕСТ URL ПОДХОДА: Отправка ссылки на архив вместо файла
 *
 * Проверяет что функция instagramScraperV2 теперь отправляет URL для скачивания
 */

const BASE_URL = 'http://localhost:8288/e/url-test-client'

console.log('🧪 ТЕСТ URL ПОДХОДА: Отправка ссылки вместо файла')
console.log('======================================================')

// Событие для тестирования с небольшими параметрами
const testEvent = {
  name: 'instagram/scraper-v2',
  data: {
    username_or_id: 'neuro_sage',
    project_id: 37,
    max_users: 3, // Малое количество для быстрого теста
    max_reels_per_user: 2, // Малое количество рилсов
    scrape_reels: true,
    requester_telegram_id: '144022504', // ✅ ВАЖНО: ID для отправки результатов!
    bot_name: 'neuro_blogger_bot', // ✅ ВАЖНО: Имя бота для отправки
    language: 'ru', // ✅ ВАЖНО: Язык сообщений
    timestamp: new Date().toISOString(),
    debug_session_id: `url-test-${Date.now()}`,
    debug_source: 'url-delivery-test',
  },
}

async function sendTestEvent() {
  try {
    console.log('📤 Отправляем событие на тестирование URL подхода...')
    console.log('📋 Параметры теста:')
    console.log(`   • Target user: ${testEvent.data.username_or_id}`)
    console.log(`   • Max competitors: ${testEvent.data.max_users}`)
    console.log(`   • Telegram ID: ${testEvent.data.requester_telegram_id}`)
    console.log(`   • Bot name: ${testEvent.data.bot_name}`)
    console.log(`   • Language: ${testEvent.data.language}`)

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEvent),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    console.log('')
    console.log('✅ Событие успешно отправлено!')
    console.log(`📋 Event ID: ${result.ids?.[0] || 'unknown'}`)

    console.log('')
    console.log('⏳ Ожидаемое поведение после URL исправления:')
    console.log('   1. ✅ Функция найдет 3 конкурентов')
    console.log('   2. ✅ Создаст HTML отчет')
    console.log('   3. ✅ Создаст Excel файл')
    console.log('   4. ✅ Создаст ZIP архив')
    console.log('   5. 🆕 ОТПРАВИТ URL ДЛЯ СКАЧИВАНИЯ в Telegram!')

    console.log('')
    console.log('📱 Проверьте в Telegram:')
    console.log('   • Бот должен отправить СООБЩЕНИЕ С ССЫЛКОЙ')
    console.log('   • Сообщение должно содержать статистику анализа')
    console.log('   • Ссылка должна вести на скачивание ZIP архива')
    console.log(
      '   • URL формат: https://your-domain/download/instagram-archive/filename.zip'
    )

    console.log('')
    console.log('🔍 Проверить статус выполнения:')
    console.log('   Inngest Dashboard: http://localhost:8288/functions')
    console.log(`   Event ID: ${result.ids?.[0] || 'unknown'}`)

    console.log('')
    console.log('⚠️ Если URL НЕ ПРИШЕЛ:')
    console.log('   1. Проверьте логи функции в Inngest Dashboard')
    console.log('   2. Убедитесь что бот neuro_blogger_bot настроен')
    console.log('   3. Проверьте что файлы создались в папке output/')
    console.log(
      '   4. Проверьте что endpoint /download/instagram-archive работает'
    )
  } catch (error) {
    console.error('❌ Ошибка при отправке события:', error.message)
    process.exit(1)
  }
}

// Запускаем тест
sendTestEvent()
