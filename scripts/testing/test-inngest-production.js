const axios = require('axios')

const PRODUCTION_INNGEST_URL =
  'https://ai-server-production-production-8e2d.up.railway.app'

async function testInngestProduction() {
  console.log(
    '🚀 Тестирование Instagram парсинга через Inngest в продакшене...\n'
  )

  try {
    // 1. Проверка регистрации функций
    console.log('1️⃣ Проверка регистрации функций Inngest...')
    const inngestInfo = await axios.get(`${PRODUCTION_INNGEST_URL}/api/inngest`)
    console.log('   ✅ Inngest активен')
    console.log(
      `   📊 Зарегистрировано функций: ${inngestInfo.data.function_count}`
    )
    console.log(`   🌐 Режим: ${inngestInfo.data.mode}`)

    // 2. Создание тестового события для Instagram парсинга
    console.log('\n2️⃣ Отправка тестового события для Instagram парсинга...')

    const testEvent = {
      name: 'instagram-scraper-v2/scrape.requested',
      data: {
        username_or_id: 'neuro_coder',
        project_id: 37,
        max_users: 1,
        scrape_reels: true,
        max_reels_per_user: 3,
      },
    }

    console.log('   📤 Событие:', JSON.stringify(testEvent, null, 2))

    // Попытка отправить событие через endpoint (если доступен)
    try {
      const eventResponse = await axios.post(
        `${PRODUCTION_INNGEST_URL}/api/inngest`,
        testEvent,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      console.log('   ✅ Событие отправлено успешно')
      console.log('   Ответ:', eventResponse.data)
    } catch (eventError) {
      console.log('   ⚠️ Не удалось отправить событие напрямую')
      console.log('   Требуется использование Inngest SDK или Cloud Dashboard')
    }

    // 3. Проверка других связанных функций
    console.log('\n3️⃣ Проверка связанных функций парсинга...')
    const parsingFunctions = [
      'instagramScraperV2',
      'instagramApifyScraper',
      'findCompetitors',
      'analyzeCompetitorReels',
      'extractTopContent',
    ]

    console.log('   Ожидаемые функции:')
    parsingFunctions.forEach(fn => {
      console.log(`   - ${fn}`)
    })

    console.log('\n' + '='.repeat(60))
    console.log('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:')
    console.log('='.repeat(60))
    console.log('✅ Продакшен сервер работает')
    console.log('✅ Inngest зарегистрирован и активен')
    console.log(
      `✅ ${inngestInfo.data.function_count} функций зарегистрировано`
    )
    console.log('⚠️ Для полного тестирования парсинга используйте:')
    console.log('   1. Inngest Cloud Dashboard: https://app.inngest.com')
    console.log('   2. Или локальный Inngest Dev Server')
    console.log('='.repeat(60))

    // 4. Инструкция для тестирования
    console.log('\n📝 ИНСТРУКЦИЯ ДЛЯ ПОЛНОГО ТЕСТИРОВАНИЯ:')
    console.log('1. Откройте Inngest Cloud Dashboard')
    console.log('2. Найдите функцию "Instagram Scraper V2 (Real API + Zod)"')
    console.log('3. Нажмите "Invoke" и используйте тестовые данные:')
    console.log(
      JSON.stringify(
        {
          data: {
            username_or_id: 'neuro_coder',
            project_id: 37,
            max_users: 1,
            scrape_reels: true,
            max_reels_per_user: 5,
          },
        },
        null,
        2
      )
    )
  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:', error.message)
    if (error.response) {
      console.error('Детали:', error.response.data)
    }
  }
}

testInngestProduction()
