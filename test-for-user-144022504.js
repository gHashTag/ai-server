#!/usr/bin/env node

/**
 * 🎯 Специальный тест для пользователя 144022504
 * Отправляет событие на анализ Instagram конкурентов + генерация отчётов
 */

const { Inngest } = require('inngest')

async function sendEventForUser144022504() {
  console.log(
    '🎯 Отправка события Instagram Scraper V2 для пользователя 144022504\n'
  )

  const inngest = new Inngest({ id: 'user-144022504-test' })

  // Событие для пользователя 144022504
  const eventForUser = {
    name: 'instagram/scraper-v2', // ← ТОЧНОЕ НАЗВАНИЕ СОБЫТИЯ
    data: {
      // ✅ ОБЯЗАТЕЛЬНЫЕ ПАРАМЕТРЫ
      username_or_id: 'vyacheslav_nekludov', // Instagram для анализа
      project_id: 37, // Project ID

      // ⚙️ НАСТРОЙКИ АНАЛИЗА
      max_users: 5, // 5 конкурентов для быстрого теста
      max_reels_per_user: 3, // 3 рилса на конкурента
      scrape_reels: true, // Включить анализ рилсов
      requester_telegram_id: '144022504', // ID пользователя Telegram
    },
  }

  try {
    console.log('📊 Параметры события:')
    console.log('• Event Name:', eventForUser.name)
    console.log('• Target User:', eventForUser.data.username_or_id)
    console.log('• Project ID:', eventForUser.data.project_id)
    console.log('• Max Competitors:', eventForUser.data.max_users)
    console.log('• Reels per User:', eventForUser.data.max_reels_per_user)
    console.log('• Scrape Reels:', eventForUser.data.scrape_reels)
    console.log('• Telegram ID:', eventForUser.data.requester_telegram_id)

    console.log('\n🚀 Отправляем событие в Inngest...')

    const result = await inngest.send(eventForUser)

    console.log('\n✅ Событие успешно отправлено!')
    console.log('🆔 Event ID:', result.ids[0])

    console.log('\n📋 Что происходит сейчас:')
    console.log('1. 🔍 Поиск 5 конкурентов для vyacheslav_nekludov')
    console.log('2. 🎬 Сбор 3 рилсов с каждого конкурента')
    console.log('3. 📊 Сохранение в базу данных')
    console.log('4. 📄 Генерация HTML отчёта с дизайном')
    console.log('5. 📈 Создание Excel файла (3 листа)')
    console.log('6. 📦 Упаковка в ZIP архив с README')

    console.log('\n⏰ Ожидаемый результат через 3-5 минут:')
    console.log('• Найдено конкурентов: ~5')
    console.log('• Собрано рилсов: ~15')
    console.log('• Создан HTML отчёт: Да')
    console.log('• Создан Excel файл: Да')
    console.log('• Создан ZIP архив: Да')

    console.log('\n🎯 Результат будет содержать:')
    console.log('finalResult.reports = {')
    console.log('  generated: true,')
    console.log('  htmlReport: "/path/to/html",')
    console.log('  excelReport: "/path/to/excel", ')
    console.log('  archivePath: "/path/to/zip",')
    console.log(
      '  archiveFileName: "instagram_competitors_vyacheslav_nekludov_xxx.zip"'
    )
    console.log('}')

    console.log('\n📱 Для интеграции в Telegram бот:')
    console.log('1. Используйте event name: "instagram/scraper-v2"')
    console.log('2. Обязательные поля: username_or_id, project_id')
    console.log('3. Получайте архив из finalResult.reports.archivePath')
    console.log('4. Отправляйте через ctx.replyWithDocument()')

    console.log(`\n🔍 Проверить статус: Event ID ${result.ids[0]}`)
    console.log('• Inngest Dashboard - детали выполнения')
    console.log('• Папка ./output - созданные файлы')
    console.log('• База данных - сохранённые данные')

    return result.ids[0]
  } catch (error) {
    console.error('\n❌ Ошибка отправки события:', error.message)

    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 Возможные проблемы:')
      console.log('• Inngest dev server не запущен')
      console.log('• Порт 8288 недоступен')
      console.log('• Сервер перезагружается')
    }

    throw error
  }
}

// ========================================
// 🚀 ЗАПУСК ТЕСТА
// ========================================

sendEventForUser144022504()
  .then(eventId => {
    console.log(`\n🎉 Тест успешно завершён!`)
    console.log(`📋 Event ID: ${eventId}`)
    console.log('\n⏳ Результаты через 3-5 минут в Inngest Dashboard')
  })
  .catch(error => {
    console.error('\n💥 Тест провален:', error.message)
    process.exit(1)
  })

module.exports = { sendEventForUser144022504 }
