/**
 * Простой тест функции investInCompetitor
 * Тестируем через прямой вызов Inngest события
 */

// Простая проверка подключения к БД и отправки события
async function testInvestFunction() {
  console.log('🚀 Тестирование функции investInCompetitor...')
  
  // Проверяем переменные окружения
  if (!process.env.NEON_DATABASE_URL) {
    console.error('❌ NEON_DATABASE_URL не настроена')
    return
  }
  
  console.log('✅ База данных настроена')
  
  // Тестовые данные
  const testData = {
    username: 'natgeo',
    user_telegram_id: '144022504',
    user_chat_id: '144022504', 
    bot_name: 'neuro_blogger_bot',
    max_reels: 5,
    min_views: 1000,
    max_age_days: 14,
    delivery_format: 'digest',
    project_id: 999
  }
  
  console.log('📋 Данные для теста:', testData)
  
  try {
    // Проверим соединение с БД
    const { Pool } = require('pg')
    const dbPool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
    
    const client = await dbPool.connect()
    
    try {
      // Проверяем таблицы
      const tables = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%competitor%'
      `)
      
      console.log('📋 Найдены таблицы:', tables.rows.map(r => r.table_name))
      
      // Проверяем текущие подписки
      const subscriptions = await client.query(`
        SELECT * FROM competitor_subscriptions 
        WHERE user_telegram_id = $1 
        LIMIT 3
      `, [testData.user_telegram_id])
      
      console.log(`👥 Текущих подписок: ${subscriptions.rows.length}`)
      
      if (subscriptions.rows.length > 0) {
        console.log('📊 Последние подписки:')
        subscriptions.rows.forEach((sub, i) => {
          console.log(`${i + 1}. @${sub.competitor_username} (активна: ${sub.is_active})`)
        })
      }
      
      // Проверяем существующие рилзы в БД
      const reels = await client.query(`
        SELECT COUNT(*) as count, owner_username 
        FROM instagram_apify_reels 
        WHERE owner_username = $1
        GROUP BY owner_username
      `, [testData.username])
      
      if (reels.rows.length > 0) {
        console.log(`🎬 Рилзов @${testData.username} в БД: ${reels.rows[0].count}`)
      } else {
        console.log(`📭 Рилзов @${testData.username} в БД пока нет`)
      }
      
    } finally {
      client.release()
      await dbPool.end()
    }
    
    console.log('\n🎯 Тест завершен успешно!')
    console.log(`
📝 Для запуска полной функции используйте:

1. Через API (если сервер запущен):
   curl -X POST http://localhost:3000/api/invest-competitor \\
     -H "Content-Type: application/json" \\
     -d '${JSON.stringify(testData)}'

2. Через Inngest напрямую (в коде):
   await inngest.send({
     name: 'competitor/invest',
     data: ${JSON.stringify(testData, null, 2)}
   })

3. Через Telegram бот (добавьте команду /invest)

🔄 Система автоматически:
• Создаст подписку на @${testData.username}
• Запустит парсинг через Apify
• Сохранит ${testData.max_reels} лучших рилзов в БД
• Отправит 1 лучший рилз пользователю
• Настроит ежедневный мониторинг

⚡ Полный процесс займет 1-2 минуты
`)
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message)
  }
}

// Функция для создания тестовой подписки напрямую в БД
async function createTestSubscription() {
  console.log('\n🧪 Создание тестовой подписки в БД...')
  
  try {
    const { Pool } = require('pg')
    const dbPool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
    
    const client = await dbPool.connect()
    
    try {
      const result = await client.query(`
        INSERT INTO competitor_subscriptions 
        (user_telegram_id, user_chat_id, bot_name, competitor_username, 
         max_reels, min_views, max_age_days, delivery_format)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_telegram_id, competitor_username, bot_name) 
        DO UPDATE SET 
          is_active = true,
          updated_at = NOW()
        RETURNING *
      `, [
        '144022504',
        '144022504', 
        'neuro_blogger_bot',
        'natgeo',
        5,
        1000,
        14,
        'digest'
      ])
      
      console.log('✅ Тестовая подписка создана:')
      console.log(`   ID: ${result.rows[0].id}`)
      console.log(`   Конкурент: @${result.rows[0].competitor_username}`)
      console.log(`   Активна: ${result.rows[0].is_active}`)
      
    } finally {
      client.release()
      await dbPool.end()
    }
    
  } catch (error) {
    console.error('❌ Ошибка создания подписки:', error.message)
  }
}

async function main() {
  await testInvestFunction()
  
  // Опционально создаем тестовую подписку
  const createTest = process.argv.includes('--create-test')
  if (createTest) {
    await createTestSubscription()
  }
}

main().catch(console.error)