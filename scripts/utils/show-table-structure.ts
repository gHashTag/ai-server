/**
 * 🔍 ПОКАЗАТЬ СТРУКТУРУ ТАБЛИЦ
 * Исследуем что у нас есть в базе данных
 */

import pkg from 'pg'
const { Pool } = pkg

async function showTableStructure() {
  console.log('🔍 === ИССЛЕДОВАНИЕ СТРУКТУРЫ БАЗЫ ДАННЫХ ===\n')

  const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error('❌ Database connection string is required')
    console.error('Please set NEON_DATABASE_URL or DATABASE_URL in your .env file')
    process.exit(1)
  }
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  })

  try {
    const client = await pool.connect()
    
    try {
      // Получаем все таблицы
      console.log('📋 Шаг 1: Список всех таблиц...')
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `)

      console.log('✅ Найденные таблицы:')
      tables.rows.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.table_name}`)
      })

      // Исследуем структуру каждой таблицы связанной с Instagram
      const instagramTables = tables.rows.filter(table => 
        table.table_name.includes('instagram') || 
        table.table_name.includes('competitors') ||
        table.table_name.includes('reels')
      )

      console.log('\n🔍 Шаг 2: Структура Instagram-связанных таблиц...')
      
      for (const table of instagramTables) {
        console.log(`\n📊 Таблица: ${table.table_name}`)
        
        // Получаем структуру колонок
        const columns = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [table.table_name])

        console.log('📋 Колонки:')
        columns.rows.forEach(col => {
          console.log(`   • ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
        })

        // Получаем количество записей
        const count = await client.query(`SELECT COUNT(*) FROM ${table.table_name}`)
        console.log(`📊 Записей: ${count.rows[0].count}`)

        // Показываем примеры данных (первые 2 записи)
        if (parseInt(count.rows[0].count) > 0) {
          const sample = await client.query(`SELECT * FROM ${table.table_name} LIMIT 2`)
          console.log('🧪 Примеры данных:')
          sample.rows.forEach((row, index) => {
            console.log(`   Запись ${index + 1}:`, Object.keys(row).slice(0, 5).map(key => `${key}: ${row[key]}`).join(', ') + '...')
          })
        }
      }

      // Специальный анализ для таблицы с рилзами
      const reelsTable = instagramTables.find(t => t.table_name.includes('reels'))
      if (reelsTable) {
        console.log(`\n🎬 Шаг 3: Детальный анализ таблицы рилз: ${reelsTable.table_name}`)
        
        // Получаем топ записи по популярности (пробуем разные поля)
        const columns = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
        `, [reelsTable.table_name])

        const columnNames = columns.rows.map(col => col.column_name)
        console.log('📋 Доступные колонки:', columnNames.join(', '))

        // Ищем поля с именами пользователей
        const userFields = columnNames.filter(col => 
          col.includes('user') || col.includes('name') || col.includes('account')
        )
        console.log('👤 Поля пользователей:', userFields.join(', '))

        // Ищем поля с метриками
        const metricFields = columnNames.filter(col => 
          col.includes('like') || col.includes('view') || col.includes('comment') || 
          col.includes('count') || col.includes('play')
        )
        console.log('📊 Поля метрик:', metricFields.join(', '))

        // Попробуем получить некоторые данные
        if (userFields.length > 0 && metricFields.length > 0) {
          const userField = userFields[0]
          const metricField = metricFields[0]
          
          const topData = await client.query(`
            SELECT ${userField}, ${metricField}, COUNT(*) as record_count
            FROM ${reelsTable.table_name} 
            GROUP BY ${userField}, ${metricField}
            ORDER BY ${metricField} DESC NULLS LAST
            LIMIT 5
          `)

          console.log(`\n🏆 Топ по ${metricField}:`)
          topData.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row[userField]}: ${row[metricField]} (${row.record_count} записей)`)
          })
        }
      }

      // Проверяем таблицу конкурентов
      const competitorsTable = instagramTables.find(t => t.table_name.includes('competitors'))
      if (competitorsTable) {
        console.log(`\n👥 Шаг 4: Анализ таблицы конкурентов: ${competitorsTable.table_name}`)
        
        const competitorsSample = await client.query(`SELECT * FROM ${competitorsTable.table_name} LIMIT 3`)
        console.log('🧪 Примеры конкурентов:')
        competitorsSample.rows.forEach((row, index) => {
          console.log(`   ${index + 1}.`, JSON.stringify(row, null, 2))
        })
      }

    } finally {
      client.release()
    }

    console.log('\n🎉 === ИССЛЕДОВАНИЕ ЗАВЕРШЕНО ===')
    console.log('✅ Структура базы данных изучена!')
    console.log('📊 Теперь можно создать правильные тесты')

  } catch (error) {
    console.error('❌ Ошибка исследования:', error)
    throw error
  } finally {
    await pool.end()
  }
}

showTableStructure()
  .then(() => {
    console.log('\n🎯 Исследование структуры завершено!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Исследование провалено:', error.message)
    process.exit(1)
  })