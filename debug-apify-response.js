/**
 * Отладка ответа Apify API для понимания структуры данных
 */

require('dotenv').config()
const { ApifyClient } = require('apify-client')

async function debugApifyResponse() {
  console.log('🔍 Отладка Apify API для Instagram парсинга...')
  
  if (!process.env.APIFY_TOKEN) {
    console.error('❌ APIFY_TOKEN не найден в .env')
    return
  }

  const client = new ApifyClient({
    token: process.env.APIFY_TOKEN,
  })

  console.log('✅ Apify клиент создан')

  try {
    // Тестируем с простым известным аккаунтом
    const input = {
      username: ['theaisurfer'],
      resultsLimit: 5,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
      },
    }

    console.log('📝 Параметры запроса:', JSON.stringify(input, null, 2))
    console.log('🚀 Запуск Apify актора instagram-scraper...')

    const run = await client.actor('apify/instagram-scraper').call(input)
    
    console.log('✅ Актор завершен:', {
      runId: run.id,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
    })

    // Получаем результаты
    const { items } = await client.dataset(run.defaultDatasetId).listItems()
    
    console.log(`📦 Получено элементов: ${items.length}`)

    if (items.length > 0) {
      console.log('\n🔍 СТРУКТУРА ПЕРВОГО ЭЛЕМЕНТА:')
      console.log('=====================================')
      console.log(JSON.stringify(items[0], null, 2))
      console.log('=====================================')
      
      // Проверяем ключи
      console.log('\n🗝️ ДОСТУПНЫЕ КЛЮЧИ:')
      console.log(Object.keys(items[0]).sort())
      
      // Проверяем типы видео
      console.log('\n🎬 ПРОВЕРКА ТИПОВ ВИДЕО:')
      console.log('type:', items[0].type)
      console.log('productType:', items[0].productType) 
      console.log('isVideo:', items[0].isVideo)
      console.log('videoUrl:', !!items[0].videoUrl)
      console.log('displayUrl:', !!items[0].displayUrl)
      
      // Ищем альтернативные поля
      const videoKeys = Object.keys(items[0]).filter(key => 
        key.toLowerCase().includes('video') || 
        key.toLowerCase().includes('reel') ||
        key.toLowerCase().includes('clip')
      )
      console.log('\n🎥 ПОЛЯ СВЯЗАННЫЕ С ВИДЕО:', videoKeys)
      
    } else {
      console.log('❌ Нет элементов в результате!')
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    console.error('Стек:', error.stack)
  }
}

debugApifyResponse()