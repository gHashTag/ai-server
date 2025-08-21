#!/usr/bin/env node

/**
 * Простой тест функции Instagram Apify без зависимостей от .env
 */

const { ApifyClient } = require('apify-client')

console.log('🎯 ПРОСТОЙ ТЕСТ APIFY INSTAGRAM')
console.log('==============================')

async function testApifyDirect() {
  try {
    console.log('🔍 Проверяем переменные окружения...')
    
    const apifyToken = process.env.APIFY_TOKEN
    
    if (!apifyToken) {
      console.log('❌ APIFY_TOKEN не установлен в переменных окружения')
      console.log('💡 Установите его через:')
      console.log('   export APIFY_TOKEN="your_token_here"')
      return
    }
    
    console.log('✅ APIFY_TOKEN найден')
    
    console.log('\n🚀 Инициализируем Apify клиент...')
    
    const client = new ApifyClient({
      token: apifyToken,
    })
    
    console.log('✅ Apify клиент создан')
    
    console.log('\n🔍 Проверяем подключение к Apify...')
    
    try {
      const user = await client.user().get()
      console.log('✅ Подключение успешно!')
      console.log(`👤 Пользователь: ${user.username || user.email || 'Unknown'}`)
    } catch (error) {
      console.log('❌ Ошибка подключения к Apify:', error.message)
      return
    }
    
    console.log('\n📱 Запускаем парсинг Instagram...')
    
    const input = {
      directUrls: ['https://www.instagram.com/cristiano/'],
      resultsType: 'posts',
      resultsLimit: 3,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
      },
    }
    
    console.log('📋 Параметры:', JSON.stringify(input, null, 2))
    
    const run = await client
      .actor('apify/instagram-scraper')
      .call(input)
    
    console.log('✅ Актор завершён:', run.status)
    
    const { items } = await client
      .dataset(run.defaultDatasetId)
      .listItems()
    
    console.log(`📦 Получено ${items.length} элементов`)
    
    if (items.length > 0) {
      console.log('\n🎬 Анализируем рилсы...')
      
      const videos = items.filter(item => 
        item.type === 'Video' || 
        item.productType === 'clips' || 
        item.isVideo === true || 
        !!item.videoUrl
      )
      
      console.log(`🎯 Найдено ${videos.length} видео из ${items.length} постов`)
      
      if (videos.length > 0) {
        console.log('\n🏆 Топ видео:')
        videos.slice(0, 3).forEach((video, i) => {
          console.log(`${i + 1}. ${video.caption?.substring(0, 50) || 'No caption'}...`)
          console.log(`   👀 Просмотры: ${video.videoViewCount || 0}`)
          console.log(`   ❤️ Лайки: ${video.likesCount || 0}`)
          console.log(`   📝 Комментарии: ${video.commentsCount || 0}`)
          console.log('')
        })
      }
    }
    
    console.log('\n🎉 ТЕСТ ЗАВЕРШЁН УСПЕШНО!')
    console.log('✅ Instagram Apify функция работает корректно')
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ТЕСТА:', error.message)
    console.error('🔍 Стек:', error.stack)
  }
}

// Запускаем тест
testApifyDirect()