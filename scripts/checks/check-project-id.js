#!/usr/bin/env node

/**
 * 🔍 ПРОВЕРКА PROJECT_ID в базе данных
 *
 * Критическая диагностика - существует ли project_id в БД
 */

// Загружаем переменные окружения
require('dotenv').config({ path: '.env' })

const { Pool } = require('pg')

console.log('🔍 КРИТИЧЕСКАЯ ПРОВЕРКА PROJECT_ID')
console.log('===================================')
console.log('')

// Подключение к Neon базе данных
const dbPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function checkProjectIds() {
  let client

  try {
    console.log('📡 Подключаемся к базе данных...')
    client = await dbPool.connect()

    console.log('✅ Подключение установлено!')
    console.log('')

    // Проверяем есть ли таблица projects
    console.log('🔍 Проверяем таблицу projects...')
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%project%'
    `)

    console.log('📋 Найденные таблицы с project:')
    tablesResult.rows.forEach(row => {
      console.log(`   • ${row.table_name}`)
    })
    console.log('')

    // Попробуем найти проекты
    const possibleTables = ['projects', 'instagram_projects', 'project']

    for (const tableName of possibleTables) {
      try {
        console.log(`🔍 Проверяем таблицу "${tableName}"...`)

        const existsResult = await client.query(
          `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `,
          [tableName]
        )

        if (existsResult.rows[0].exists) {
          console.log(`✅ Таблица "${tableName}" существует!`)

          // Получаем первые 5 записей
          const projectsResult = await client.query(`
            SELECT * FROM "${tableName}" 
            ORDER BY CASE 
              WHEN ${tableName} ~ '.*id.*' THEN (${tableName})::text::int 
              ELSE 1 
            END
            LIMIT 5
          `)

          console.log(`📊 Записи в таблице "${tableName}":`)
          if (projectsResult.rows.length === 0) {
            console.log('   ⚠️ Таблица пустая!')
          } else {
            projectsResult.rows.forEach((row, index) => {
              console.log(`   ${index + 1}. ${JSON.stringify(row)}`)
            })
          }
          console.log('')

          // Проверяем конкретные ID
          for (const testId of [1, 37]) {
            try {
              const idCheckQuery = `SELECT * FROM "${tableName}" WHERE id = $1`
              const idResult = await client.query(idCheckQuery, [testId])

              if (idResult.rows.length > 0) {
                console.log(
                  `✅ Project ID ${testId} НАЙДЕН в таблице "${tableName}"!`
                )
                console.log(`   📋 Данные: ${JSON.stringify(idResult.rows[0])}`)
              } else {
                console.log(
                  `❌ Project ID ${testId} НЕ НАЙДЕН в таблице "${tableName}"`
                )
              }
            } catch (idError) {
              console.log(
                `❌ Ошибка проверки ID ${testId} в таблице "${tableName}": ${idError.message}`
              )
            }
          }
          console.log('')
        } else {
          console.log(`❌ Таблица "${tableName}" НЕ существует`)
        }
      } catch (tableError) {
        console.log(
          `❌ Ошибка проверки таблицы "${tableName}": ${tableError.message}`
        )
      }
    }

    console.log('')
    console.log('🎯 РЕЗУЛЬТАТ ДИАГНОСТИКИ:')
    console.log('   • Если project_id НАЙДЕН - функция должна работать')
    console.log('   • Если project_id НЕ НАЙДЕН - нужно создать проект')
    console.log('   • Если таблицы НЕТ - нужно создать схему БД')
  } catch (error) {
    console.error('❌ Критическая ошибка подключения к БД:', error.message)
    console.error('')
    console.error('🚨 Это объясняет почему функция не работает!')
    console.error('   Функция падает на этапе валидации project_id')
  } finally {
    if (client) {
      client.release()
    }
    await dbPool.end()
  }
}

checkProjectIds()
