#!/usr/bin/env node

/**
 * 🧪 ТЕСТ ИСПРАВЛЕНИЯ: Отправка результатов Instagram анализа в Telegram
 *
 * Проверяет что функция instagramScraperV2 теперь отправляет архив пользователю
 */

const BASE_URL = 'http://localhost:8288'

console.log('🧪 ТЕСТ ИСПРАВЛЕНИЯ: Отправка результатов в Telegram')
console.log('=======================================================')

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
    bot_name: 'neuro_blogger_bot', // ✅ ВАЖНО: Имя бота для отправки!
    language: 'ru', // ✅ ВАЖНО: Язык для сообщений!

    // Метаданные для отслеживания
    metadata: {
      test: 'telegram_delivery_fix',
      timestamp: new Date().toISOString(),
      description: 'Test fix for Telegram delivery of results',
    },
  },
}

async function testTelegramDeliveryFix() {
  try {
    console.log('📤 Отправляем событие на тестирование исправления...')
    console.log('📋 Параметры теста:')
    console.log(`   • Target user: ${testEvent.data.username_or_id}`)
    console.log(`   • Max competitors: ${testEvent.data.max_users}`)
    console.log(`   • Telegram ID: ${testEvent.data.requester_telegram_id}`)
    console.log(`   • Bot name: ${testEvent.data.bot_name}`)
    console.log(`   • Language: ${testEvent.data.language}`)
    console.log('')

    const response = await fetch(`${BASE_URL}/e/test-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEvent),
    })

    const result = await response.json()

    if (result.status === 200) {
      console.log('✅ Событие успешно отправлено!')
      console.log(`📋 Event ID: ${result.ids[0]}`)
      console.log('')

      console.log('⏳ Ожидаемое поведение после исправления:')
      console.log('   1. ✅ Функция найдет 3 конкурентов')
      console.log('   2. ✅ Создаст HTML отчет')
      console.log('   3. ✅ Создаст Excel файл')
      console.log('   4. ✅ Создаст ZIP архив')
      console.log('   5. 🆕 ОТПРАВИТ АРХИВ В TELEGRAM пользователю 144022504!')
      console.log('')

      console.log('📱 Проверьте в Telegram:')
      console.log('   • Бот должен отправить ZIP архив с отчетами')
      console.log('   • Сообщение должно содержать статистику анализа')
      console.log('   • Архив должен содержать HTML, Excel и README файлы')
      console.log('')

      console.log('🔍 Проверить статус выполнения:')
      console.log(`   Inngest Dashboard: http://localhost:8288/functions`)
      console.log(`   Event ID: ${result.ids[0]}`)
      console.log('')

      console.log('⚠️ Если архив НЕ ПРИШЕЛ:')
      console.log('   1. Проверьте логи функции в Inngest Dashboard')
      console.log('   2. Убедитесь что бот neuro_blogger_bot настроен')
      console.log('   3. Проверьте что файлы создались в папке output/')
    } else {
      console.log('❌ Ошибка отправки события:')
      console.log(JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

// Запускаем тест
testTelegramDeliveryFix()
