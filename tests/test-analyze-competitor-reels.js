/**
 * 🎬 ТЕСТ АНАЛИЗА РИЛЗ КОНКУРЕНТОВ
 * Тестируем функцию analyzeCompetitorReels с реальными данными
 */

const { inngest } = require('./src/core/inngest/clients')

async function testAnalyzeCompetitorReels() {
  console.log('🎬 === ТЕСТИРОВАНИЕ АНАЛИЗА РИЛЗ КОНКУРЕНТОВ ===\n')

  try {
    // Тест 1: Анализ популярного блогера
    console.log('📊 Тест 1: Анализ рилз популярного блогера...')
    const event1 = await inngest.send({
      name: 'instagram/analyze-reels',
      data: {
        username: 'alexyanovsky', // Популярный блогер о саморазвитии
        max_reels: 10,
        days_back: 14,
        project_id: 1,
        requester_telegram_id: '144022504',
        metadata: {
          test: 'popular-blogger-analysis',
          timestamp: new Date().toISOString(),
          description: 'Анализ рилз популярного блогера о саморазвитии'
        }
      }
    })
    
    console.log('✅ Event 1 отправлен:', event1.ids[0])
    console.log('🎯 Цель: Анализ engagement и популярных тем')
    
    // Небольшая задержка между тестами
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Тест 2: Анализ бизнес-аккаунта  
    console.log('\n💼 Тест 2: Анализ бизнес-аккаунта...')
    const event2 = await inngest.send({
      name: 'instagram/analyze-reels',
      data: {
        username: 'garyvee', // Известный предприниматель
        max_reels: 15,
        days_back: 7, // Последняя неделя
        project_id: 1,
        requester_telegram_id: '144022504',
        metadata: {
          test: 'business-account-analysis',
          timestamp: new Date().toISOString(),
          description: 'Анализ бизнес-контента предпринимателя'
        }
      }
    })
    
    console.log('✅ Event 2 отправлен:', event2.ids[0])
    console.log('🎯 Цель: Анализ бизнес-контента и стратегий')

    // Задержка между тестами
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Тест 3: Анализ технического блогера
    console.log('\n💻 Тест 3: Анализ технического блогера...')
    const event3 = await inngest.send({
      name: 'instagram/analyze-reels',
      data: {
        username: 'mkbhd', // Технический блогер
        max_reels: 8,
        days_back: 21, // Последние 3 недели
        project_id: 1,
        requester_telegram_id: '144022504',
        metadata: {
          test: 'tech-blogger-analysis',
          timestamp: new Date().toISOString(),
          description: 'Анализ технического контента и обзоров'
        }
      }
    })
    
    console.log('✅ Event 3 отправлен:', event3.ids[0])
    console.log('🎯 Цель: Анализ технического контента')

    // Финальная информация
    console.log('\n🔥 === ИНФОРМАЦИЯ О ТЕСТАХ ===')
    console.log('📈 Что мы тестируем:')
    console.log('   ✅ Реальные вызовы Instagram API')
    console.log('   ✅ Анализ метрик (лайки, коменты, просмотры)')
    console.log('   ✅ Фильтрацию по датам')
    console.log('   ✅ Сортировку по engagement')
    console.log('   ✅ Сохранение в PostgreSQL базу')
    console.log('   ✅ Error handling и retry logic')

    console.log('\n📊 Ожидаемые результаты:')
    console.log('   🎯 Список топ рилз по engagement')
    console.log('   📈 Метрики: views, likes, comments')
    console.log('   📅 Фильтрация по выбранному периоду')
    console.log('   💾 Сохранение в таблицу reels_analysis')
    console.log('   📱 Telegram уведомления (опционально)')

    console.log('\n⏱️ Время выполнения: ~30-60 секунд на каждый тест')
    console.log('📊 Мониторинг: Смотри логи Inngest Dashboard')
    
    console.log('\n🚀 Все тесты запущены! Проверяй результаты в базе данных.')

    return {
      tests: [
        { id: event1.ids[0], username: 'alexyanovsky', type: 'popular-blogger' },
        { id: event2.ids[0], username: 'garyvee', type: 'business-account' },
        { id: event3.ids[0], username: 'mkbhd', type: 'tech-blogger' }
      ],
      message: 'Все 3 теста запущены успешно!'
    }

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error)
    
    // Детальная диагностика
    if (error.message.includes('RAPIDAPI_INSTAGRAM_KEY')) {
      console.log('\n🔧 ДИАГНОСТИКА: Проверь переменную окружения RAPIDAPI_INSTAGRAM_KEY')
    }
    
    if (error.message.includes('NEON_DATABASE_URL')) {
      console.log('\n🔧 ДИАГНОСТИКА: Проверь переменную окружения NEON_DATABASE_URL')
    }
    
    if (error.message.includes('network')) {
      console.log('\n🔧 ДИАГНОСТИКА: Проблемы с сетью или API недоступен')
    }

    throw error
  }
}

// Запускаем тест
if (require.main === module) {
  testAnalyzeCompetitorReels()
    .then(result => {
      console.log('\n🎉 === ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===')
      console.log('📊 Результат:', JSON.stringify(result, null, 2))
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 === ТЕСТИРОВАНИЕ ПРОВАЛЕНО ===')
      console.error('❌ Ошибка:', error.message)
      process.exit(1)
    })
}

module.exports = { testAnalyzeCompetitorReels }