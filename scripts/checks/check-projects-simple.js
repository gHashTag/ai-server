#!/usr/bin/env node

/**
 * 🔍 ПРОСТАЯ ПРОВЕРКА таблицы projects
 */

require('dotenv').config({ path: '.env' })
const { Pool } = require('pg')

console.log('🔍 ПРОСТАЯ ПРОВЕРКА ТАБЛИЦЫ PROJECTS')
console.log('====================================')
console.log('')

const dbPool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function checkProjectsSimple() {
  let client

  try {
    client = await dbPool.connect()
    console.log('✅ Подключение к БД установлено!')
    console.log('')

    // Простая проверка структуры таблицы
    console.log('🔍 Структура таблицы projects:')
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      ORDER BY ordinal_position
    `)

    columnsResult.rows.forEach(row => {
      console.log(`   • ${row.column_name}: ${row.data_type}`)
    })
    console.log('')

    // Простая проверка записей
    console.log('📊 Записи в таблице projects:')
    const projectsResult = await client.query(`SELECT * FROM projects LIMIT 10`)

    if (projectsResult.rows.length === 0) {
      console.log('❌ ТАБЛИЦА ПУСТАЯ!')
      console.log('')
      console.log('🚨 НАЙДЕНА ПРИЧИНА ПРОБЛЕМЫ!')
      console.log('   • Таблица projects существует, но пустая')
      console.log('   • Функция падает при валидации project_id')
      console.log('   • Нужно создать тестовый проект')
    } else {
      console.log(`✅ Найдено ${projectsResult.rows.length} проектов:`)
      projectsResult.rows.forEach((row, index) => {
        console.log(
          `   ${index + 1}. ID: ${row.id}, Name: ${row.name || 'Без названия'}`
        )
      })

      // Проверяем конкретные ID
      console.log('')
      console.log('🎯 Проверка конкретных project_id:')

      for (const testId of [1, 37]) {
        const idResult = await client.query(
          'SELECT * FROM projects WHERE id = $1',
          [testId]
        )

        if (idResult.rows.length > 0) {
          console.log(`✅ Project ID ${testId} НАЙДЕН!`)
          console.log(`   📋 ${JSON.stringify(idResult.rows[0])}`)
        } else {
          console.log(`❌ Project ID ${testId} НЕ НАЙДЕН`)
        }
      }
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  } finally {
    if (client) client.release()
    await dbPool.end()
  }
}

checkProjectsSimple()
