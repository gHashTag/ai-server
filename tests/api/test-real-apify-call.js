/**
 * Реальный тест вызова Apify Actor
 */

const { ApifyClient } = require('apify-client')

async function testRealApifyCall() {
  console.log('🧪 Реальный тест вызова Apify Instagram Actor...')

  if (!process.env.APIFY_TOKEN) {
    console.log('⚠️  APIFY_TOKEN не установлен - тест только синтаксиса')
  }

  try {
    // Инициализируем клиент
    const client = new ApifyClient({
      token: process.env.APIFY_TOKEN || 'test-token',
    })

    console.log('✅ Apify клиент создан успешно')

    // Подготавливаем тестовые данные
    const testInput = {
      username: ['cristiano'], // Простой тест на публичный аккаунт
      resultsLimit: 1, // Только 1 рил для теста
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
      },
    }

    console.log('📋 Тестовые данные подготовлены')

    // Главный тест - попробуем вызвать actor
    console.log('🎬 Пробуем вызвать actor...')

    if (process.env.APIFY_TOKEN) {
      // Реальный вызов
      const run = await client.actor('apify/instagram-scraper').call(testInput)

      console.log('✅ Actor вызван успешно!')
      console.log('📊 Результат:', {
        runId: run.id,
        status: run.status,
        startedAt: run.startedAt,
      })

      // Ждём завершения (максимум 30 секунд)
      console.log('⏳ Ожидаем результаты...')

      const finishedRun = await client.run(run.id).waitForFinish({
        waitSecs: 30,
      })

      console.log('🏁 Выполнение завершено:', finishedRun.status)

      if (finishedRun.status === 'SUCCEEDED') {
        // Получаем данные
        const { items } = await client
          .dataset(finishedRun.defaultDatasetId)
          .listItems()
        console.log(`📦 Получено ${items.length} элементов`)

        if (items.length > 0) {
          const firstItem = items[0]
          console.log('🎯 Первый элемент:', {
            type: firstItem.type || 'unknown',
            shortCode: firstItem.shortCode,
            url: firstItem.url,
            isVideo: firstItem.isVideo,
            timestamp: firstItem.timestamp,
          })
        }

        console.log('🎉 РЕАЛЬНЫЙ ТЕСТ ПРОШЁЛ УСПЕШНО!')
      } else {
        console.log('⚠️  Выполнение не успешно:', finishedRun.status)
      }
    } else {
      // Тест только синтаксиса
      console.log('ℹ️  Проверяем только синтаксис (без токена)...')

      const actorClient = client.actor('apify/instagram-scraper')
      console.log('✅ client.actor() работает')

      console.log('✅ Синтаксис корректный!')
      console.log('🔑 Установите APIFY_TOKEN для полного теста')
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message)

    if (error.message.includes('actor is not a function')) {
      console.error('🔍 Проблема с API - нужно исправить код!')
    } else if (error.message.includes('Invalid token')) {
      console.error('🔑 Проблема с токеном - но API работает')
    } else {
      console.error('❓ Неизвестная ошибка')
    }
  }
}

// Запуск теста
testRealApifyCall()
