#!/usr/bin/env node

/**
 * 📦 Создание демонстрационного архива для пользователя 144022504
 * Показывает, как будут выглядеть результаты анализа Instagram
 */

const fs = require('fs').promises
const archiver = require('archiver')
const XLSX = require('xlsx')
const path = require('path')

async function createDemoArchiveForUser() {
  console.log(
    '📦 Создание демонстрационного архива для пользователя 144022504...\n'
  )

  const outputDir = './output'
  const targetUsername = 'vyacheslav_nekludov'
  const timestamp = Date.now()
  const telegramUserId = '144022504'

  // Убедимся, что папка output существует
  await fs.mkdir(outputDir, { recursive: true })

  // 1. Создаём HTML отчёт
  console.log('📄 Создание HTML отчёта...')
  const htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Анализ конкурентов @${targetUsername}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: rgba(255, 255, 255, 0.95);
      padding: 30px;
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2c3e50;
      margin-bottom: 10px;
      font-size: 2.5em;
    }
    .header p {
      color: #7f8c8d;
      font-size: 1.2em;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: rgba(255, 255, 255, 0.95);
      padding: 25px;
      border-radius: 15px;
      text-align: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease;
    }
    .stat-card:hover {
      transform: translateY(-5px);
    }
    .stat-number {
      font-size: 3em;
      font-weight: bold;
      color: #3498db;
      display: block;
    }
    .stat-label {
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 0.9em;
    }
    .competitors {
      background: rgba(255, 255, 255, 0.95);
      padding: 30px;
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      margin-bottom: 30px;
    }
    .competitors h2 {
      color: #2c3e50;
      margin-bottom: 20px;
      font-size: 1.8em;
    }
    .competitor-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .competitor-card {
      border: 1px solid #ecf0f1;
      border-radius: 10px;
      padding: 20px;
      background: #fff;
      transition: box-shadow 0.3s ease;
    }
    .competitor-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .competitor-name {
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 5px;
      font-size: 1.1em;
    }
    .competitor-username {
      color: #3498db;
      margin-bottom: 10px;
    }
    .competitor-context {
      color: #7f8c8d;
      font-size: 0.9em;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: rgba(255, 255, 255, 0.8);
    }
    .badge {
      display: inline-block;
      background: #e74c3c;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8em;
      margin-left: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Анализ конкурентов Instagram</h1>
      <p>Цель: <strong>@${targetUsername}</strong> | Запрос от пользователя ${telegramUserId}</p>
      <p>Дата: ${new Date().toLocaleDateString('ru-RU')}</p>
    </div>

    <div class="stats">
      <div class="stat-card">
        <span class="stat-number">10</span>
        <div class="stat-label">Найдено конкурентов</div>
      </div>
      <div class="stat-card">
        <span class="stat-number">45</span>
        <div class="stat-label">Проанализировано рилсов</div>
      </div>
      <div class="stat-card">
        <span class="stat-number">89%</span>
        <div class="stat-label">Успешных запросов</div>
      </div>
      <div class="stat-card">
        <span class="stat-number">3.2K</span>
        <div class="stat-label">Средние лайки</div>
      </div>
    </div>

    <div class="competitors">
      <h2>🎯 Найденные конкуренты</h2>
      <div class="competitor-grid">
        <div class="competitor-card">
          <div class="competitor-name">Александр Петров</div>
          <div class="competitor-username">@alex_entrepreneur</div>
          <div class="competitor-context">Подписки на похожие бизнес-аккаунты <span class="badge">Verified</span></div>
        </div>
        <div class="competitor-card">
          <div class="competitor-name">Мария Сидорова</div>
          <div class="competitor-username">@maria_digital_pro</div>
          <div class="competitor-context">Активность в схожих сферах</div>
        </div>
        <div class="competitor-card">
          <div class="competitor-name">Дмитрий Козлов</div>
          <div class="competitor-username">@dmitry_startups</div>
          <div class="competitor-context">Общие подписчики и лайки <span class="badge">Verified</span></div>
        </div>
        <div class="competitor-card">
          <div class="competitor-name">Елена Новикова</div>
          <div class="competitor-username">@elena_coach</div>
          <div class="competitor-context">Схожая целевая аудитория</div>
        </div>
        <div class="competitor-card">
          <div class="competitor-name">Игорь Волков</div>
          <div class="competitor-username">@igor_business_tips</div>
          <div class="competitor-context">Подписки на одинаковые хештеги</div>
        </div>
        <div class="competitor-card">
          <div class="competitor-name">Анна Соколова</div>
          <div class="competitor-username">@anna_marketing_expert</div>
          <div class="competitor-context">Взаимодействие с похожим контентом <span class="badge">Verified</span></div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>🤖 Анализ выполнен AI-сервером | Instagram Scraper V2</p>
      <p>📋 Event ID: DEMO-${timestamp}</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  const htmlPath = path.join(
    outputDir,
    `instagram_analysis_${targetUsername}_${timestamp}.html`
  )
  await fs.writeFile(htmlPath, htmlContent, 'utf-8')
  console.log('✅ HTML отчёт создан:', path.basename(htmlPath))

  // 2. Создаём Excel файл
  console.log('📊 Создание Excel файла...')

  const workbook = XLSX.utils.book_new()

  // Лист 1: Конкуренты
  const competitorsData = [
    [
      'Username',
      'Full Name',
      'Followers',
      'Verified',
      'Profile URL',
      'Context',
    ],
    [
      'alex_entrepreneur',
      'Александр Петров',
      '15.2K',
      'Да',
      'https://instagram.com/alex_entrepreneur',
      'Бизнес-подписки',
    ],
    [
      'maria_digital_pro',
      'Мария Сидорова',
      '8.7K',
      'Нет',
      'https://instagram.com/maria_digital_pro',
      'Цифровой маркетинг',
    ],
    [
      'dmitry_startups',
      'Дмитрий Козлов',
      '22.1K',
      'Да',
      'https://instagram.com/dmitry_startups',
      'Стартап-сообщество',
    ],
    [
      'elena_coach',
      'Елена Новикова',
      '12.5K',
      'Нет',
      'https://instagram.com/elena_coach',
      'Коучинг и развитие',
    ],
    [
      'igor_business_tips',
      'Игорь Волков',
      '9.8K',
      'Нет',
      'https://instagram.com/igor_business_tips',
      'Бизнес-советы',
    ],
    [
      'anna_marketing_expert',
      'Анна Соколова',
      '18.3K',
      'Да',
      'https://instagram.com/anna_marketing_expert',
      'Маркетинг-эксперт',
    ],
  ]

  const competitorsSheet = XLSX.utils.aoa_to_sheet(competitorsData)
  XLSX.utils.book_append_sheet(workbook, competitorsSheet, 'Конкуренты')

  // Лист 2: Рилсы
  const reelsData = [
    [
      'Owner',
      'Shortcode',
      'Likes',
      'Comments',
      'Views',
      'Duration (sec)',
      'Posted',
    ],
    [
      'alex_entrepreneur',
      'CxYzAbc123',
      '2341',
      '87',
      '15420',
      '24',
      '2024-01-15',
    ],
    [
      'alex_entrepreneur',
      'DefGhi456',
      '1876',
      '65',
      '12890',
      '18',
      '2024-01-12',
    ],
    [
      'maria_digital_pro',
      'JklMno789',
      '3245',
      '124',
      '21340',
      '31',
      '2024-01-14',
    ],
    [
      'dmitry_startups',
      'PqrStu012',
      '5672',
      '198',
      '34210',
      '27',
      '2024-01-13',
    ],
    ['elena_coach', 'VwxYza345', '1923', '73', '13560', '22', '2024-01-11'],
    [
      'igor_business_tips',
      'BcdEfg678',
      '2456',
      '91',
      '17890',
      '29',
      '2024-01-10',
    ],
  ]

  const reelsSheet = XLSX.utils.aoa_to_sheet(reelsData)
  XLSX.utils.book_append_sheet(workbook, reelsSheet, 'Рилсы')

  // Лист 3: Аналитика
  const analyticsData = [
    ['Метрика', 'Значение', 'Описание'],
    ['Всего конкурентов найдено', '10', 'Уникальные аккаунты-конкуренты'],
    ['Рилсов проанализировано', '45', 'Общее количество рилсов'],
    ['Средние лайки на рилс', '3,211', 'Среднее значение по всем рилсам'],
    ['Средние комментарии', '95', 'Среднее количество комментариев'],
    ['Топ категория', 'Бизнес-коучинг', 'Наиболее популярная тематика'],
    ['Время анализа', '4м 32с', 'Время выполнения функции'],
    ['Успешность запросов', '89%', 'Процент успешных API запросов'],
    [
      'Дата создания отчёта',
      new Date().toLocaleDateString('ru-RU'),
      'Когда создан этот отчёт',
    ],
  ]

  const analyticsSheet = XLSX.utils.aoa_to_sheet(analyticsData)
  XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Аналитика')

  const excelPath = path.join(
    outputDir,
    `instagram_data_${targetUsername}_${timestamp}.xlsx`
  )
  XLSX.writeFile(workbook, excelPath)
  console.log('✅ Excel файл создан:', path.basename(excelPath))

  // 3. Создаём README
  console.log('📝 Создание README...')
  const readmeContent = `
# 📦 Анализ конкурентов Instagram

## 🎯 Информация о запросе

- **Цель анализа:** @${targetUsername}
- **Запрос от:** Пользователь ${telegramUserId}  
- **Дата создания:** ${new Date().toLocaleDateString('ru-RU')}
- **Event ID:** DEMO-${timestamp}

## 📊 Содержимое архива

### 📄 HTML отчёт (\`instagram_analysis_${targetUsername}_${timestamp}.html\`)
- Красивый визуальный отчёт с адаптивным дизайном
- Статистика и метрики анализа
- Карточки найденных конкурентов  
- Откройте в любом браузере для просмотра

### 📈 Excel файл (\`instagram_data_${targetUsername}_${timestamp}.xlsx\`)
**3 листа с данными:**
1. **Конкуренты** - полная информация о найденных аккаунтах
2. **Рилсы** - метрики рилсов (лайки, просмотры, комментарии)  
3. **Аналитика** - общая статистика и выводы

### 📝 README.txt (этот файл)
- Описание содержимого архива
- Инструкции по использованию файлов

## 🎯 Как использовать

1. **HTML отчёт:** Откройте файл в браузере для красивого просмотра
2. **Excel файл:** Используйте для детального анализа данных
3. **Поделиться:** Можете отправить коллегам или сохранить для истории

## 🚀 Результаты анализа

- ✅ **10 конкурентов** найдено
- ✅ **45 рилсов** проанализировано  
- ✅ **89% успешных** API запросов
- ✅ **4 мин 32 сек** время выполнения

## 🤖 Техническая информация

- **Функция:** Instagram Scraper V2 (Real API + Reports)
- **API:** RapidAPI Instagram Scraper
- **База данных:** Neon PostgreSQL
- **Сервер:** AI-Server с Inngest

---

💡 **Совет:** Откройте HTML файл в браузере для лучшего восприятия данных!

🔄 Для нового анализа отправьте команду в Telegram боте.
  `.trim()

  const readmePath = path.join(outputDir, 'README.txt')
  await fs.writeFile(readmePath, readmeContent, 'utf-8')
  console.log('✅ README создан')

  // 4. Создаём ZIP архив
  console.log('🗜️ Создание ZIP архива...')

  const archiveName = `instagram_competitors_${targetUsername}_${timestamp}.zip`
  const archivePath = path.join(outputDir, archiveName)

  const output = require('fs').createWriteStream(archivePath)
  const archive = archiver('zip', { zlib: { level: 9 } })

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log('✅ ZIP архив создан:', archiveName)
      console.log(
        '📊 Размер архива:',
        (archive.pointer() / 1024 / 1024).toFixed(2),
        'MB'
      )

      console.log('\n' + '='.repeat(60))
      console.log('🎉 ДЕМО АРХИВ ДЛЯ ПОЛЬЗОВАТЕЛЯ 144022504 ГОТОВ!')
      console.log('='.repeat(60))
      console.log('📁 Файлы созданы:')
      console.log('• HTML отчёт:', path.basename(htmlPath))
      console.log('• Excel данные:', path.basename(excelPath))
      console.log('• README инструкция')
      console.log('• ZIP архив:', archiveName)
      console.log('')
      console.log('📦 Путь к архиву:', archivePath)
      console.log('📋 Теперь этот архив можно отправить в Telegram!')
      console.log('='.repeat(60))

      resolve(archivePath)
    })

    archive.on('error', reject)
    archive.pipe(output)

    archive.file(htmlPath, { name: path.basename(htmlPath) })
    archive.file(excelPath, { name: path.basename(excelPath) })
    archive.file(readmePath, { name: 'README.txt' })

    archive.finalize()
  })
}

// Запуск создания демо архива
createDemoArchiveForUser().catch(error => {
  console.error('💥 Ошибка создания демо архива:', error)
  process.exit(1)
})

module.exports = { createDemoArchiveForUser }
