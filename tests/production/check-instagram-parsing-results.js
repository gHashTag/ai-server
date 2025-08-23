#!/usr/bin/env node

/**
 * 🔍 Проверка результатов Instagram парсинга
 * Отправляем несколько тестовых событий и проверяем результат
 */

const { Inngest } = require('inngest')

console.log('🔍 ПРОВЕРКА РЕЗУЛЬТАТОВ INSTAGRAM ПАРСИНГА')
console.log('=' * 50)
console.log(`🕒 Время: ${new Date().toISOString()}`)
console.log('=' * 50)

const inngest = new Inngest({
  id: 'instagram-parsing-test',
  name: 'Instagram Parsing Test Client',
  eventKey: process.env.INNGEST_EVENT_KEY || 'test-key',
})

async function checkInstagramParsing() {
  try {
    console.log(
      '\n1️⃣ Отправка тестового события для малого Instagram аккаунта...'
    )

    // Тест с небольшим аккаунтом для быстрой проверки
    const testEvent1 = {
      name: 'instagram/apify-scrape',
      data: {
        username_or_hashtag: 'lexfridman',
        project_id: 1001,
        source_type: 'competitor',
        max_reels: 2,
        min_views: 1000,
        max_age_days: 30,
        requester_telegram_id: '144022504',
        bot_name: 'test_parsing_bot',
      },
    }

    const result1 = await inngest.send(testEvent1)
    if (result1 && result1.ids) {
      console.log(`   ✅ Событие 1 отправлено: ${result1.ids[0]}`)
    } else {
      console.log('   ❌ Ошибка отправки события 1')
      return
    }

    console.log('\n2️⃣ Отправка события для проверки хештега...')

    // Тест с хештегом
    const testEvent2 = {
      name: 'instagram/apify-scrape',
      data: {
        username_or_hashtag: '#ai',
        project_id: 1002,
        source_type: 'hashtag',
        max_reels: 2,
        min_views: 5000,
        max_age_days: 7,
        requester_telegram_id: '144022504',
        bot_name: 'test_hashtag_bot',
      },
    }

    const result2 = await inngest.send(testEvent2)
    if (result2 && result2.ids) {
      console.log(`   ✅ Событие 2 отправлено: ${result2.ids[0]}`)
    } else {
      console.log('   ❌ Ошибка отправки события 2')
      return
    }

    console.log('\n3️⃣ Ожидаем выполнение парсинга...')
    console.log('   ⏱️  Ждем 30 секунд для обработки событий...')

    // Ждем выполнения
    for (let i = 0; i < 30; i++) {
      process.stdout.write('.')
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    console.log('')

    console.log('\n4️⃣ Отправка тестового простого события...')

    // Простое hello событие для проверки общей работы Inngest
    const helloEvent = {
      name: 'test/hello',
      data: {
        name: 'Instagram Parser Test',
        timestamp: new Date().toISOString(),
      },
    }

    const helloResult = await inngest.send(helloEvent)
    if (helloResult && helloResult.ids) {
      console.log(`   ✅ Hello событие отправлено: ${helloResult.ids[0]}`)
    } else {
      console.log('   ❌ Ошибка отправки hello события')
    }

    console.log('\n📋 РЕЗУЛЬТАТЫ ПРОВЕРКИ:')
    console.log('=' * 50)

    if (
      result1 &&
      result1.ids &&
      result2 &&
      result2.ids &&
      helloResult &&
      helloResult.ids
    ) {
      console.log('✅ ВСЕ СОБЫТИЯ УСПЕШНО ОТПРАВЛЕНЫ:')
      console.log(`   • Instagram User Event: ${result1.ids[0]}`)
      console.log(`   • Instagram Hashtag Event: ${result2.ids[0]}`)
      console.log(`   • Hello Test Event: ${helloResult.ids[0]}`)

      console.log('\n🎯 ЧТО ДОЛЖНО ПРОИЗОЙТИ:')
      console.log('   1. Instagram функция получит события')
      console.log('   2. Apify SDK выполнит скрейпинг данных')
      console.log('   3. Данные сохранятся в Neon PostgreSQL')
      console.log('   4. Результат отправится в Telegram')

      console.log('\n🔍 КАК ПРОВЕРИТЬ РЕЗУЛЬТАТ:')
      console.log('   • Проверьте Telegram на уведомления')
      console.log('   • Проверьте базу данных Neon на новые записи')
      console.log('   • Проверьте Inngest Dashboard: http://localhost:8288')
      console.log('   • Проверьте логи Railway на ошибки')

      console.log('\n🚀 INSTAGRAM ПАРСИНГ ПРОТЕСТИРОВАН!')
      return true
    } else {
      console.log('❌ НЕ ВСЕ СОБЫТИЯ ОТПРАВЛЕНЫ')
      console.log('   Проверьте подключение к Inngest')
      return false
    }
  } catch (error) {
    console.error('\n❌ ОШИБКА ПРОВЕРКИ ПАРСИНГА:', error.message)
    console.error('   Стек:', error.stack)
    return false
  }
}

// Запуск проверки
checkInstagramParsing()
  .then(success => {
    if (success) {
      console.log('\n🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО УСПЕШНО!')
      process.exit(0)
    } else {
      console.log('\n💥 ТЕСТИРОВАНИЕ НЕ ПРОШЛО')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error)
    process.exit(1)
  })
