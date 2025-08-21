#!/usr/bin/env node

/**
 * Скрипт для диагностики схемы базы данных Supabase
 * Проверяет существование таблиц, их структуру и связи
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Загружаем переменные окружения
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌ Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_SERVICE_KEY'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnoseDatabase() {
  console.log('🔍 Начинаем диагностику схемы базы данных...\n')

  try {
    // 1. Проверяем существование таблицы model_trainings
    console.log('📋 1. Проверка таблицы model_trainings:')
    const { data: modelTrainings, error: mtError } = await supabase
      .from('model_trainings')
      .select('*')
      .limit(1)

    if (mtError) {
      console.error(
        '❌ Ошибка доступа к таблице model_trainings:',
        mtError.message
      )
    } else {
      console.log('✅ Таблица model_trainings существует и доступна')
      if (modelTrainings && modelTrainings.length > 0) {
        console.log(
          '📊 Пример записи:',
          JSON.stringify(modelTrainings[0], null, 2)
        )
      }
    }

    // 2. Проверяем существование таблицы users
    console.log('\n📋 2. Проверка таблицы users:')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)

    if (usersError) {
      console.error('❌ Ошибка доступа к таблице users:', usersError.message)
    } else {
      console.log('✅ Таблица users существует и доступна')
      if (users && users.length > 0) {
        console.log('📊 Пример записи:', JSON.stringify(users[0], null, 2))
      }
    }

    // 3. Проверяем JOIN между таблицами (как в getTrainingWithUser)
    console.log('\n📋 3. Проверка JOIN между model_trainings и users:')
    const { data: joinData, error: joinError } = await supabase
      .from('model_trainings')
      .select(
        `
        *,
        users (
          bot_name,
          telegram_id,
          language_code
        )
      `
      )
      .limit(1)

    if (joinError) {
      console.error('❌ Ошибка JOIN запроса:', joinError.message)
      console.error('📝 Детали ошибки:', JSON.stringify(joinError, null, 2))
    } else {
      console.log('✅ JOIN запрос выполнен успешно')
      if (joinData && joinData.length > 0) {
        console.log(
          '📊 Пример JOIN результата:',
          JSON.stringify(joinData[0], null, 2)
        )
      }
    }

    // 4. Проверяем альтернативный JOIN (как в getModelTrainingData)
    console.log('\n📋 4. Проверка альтернативного JOIN:')
    const { data: altJoinData, error: altJoinError } = await supabase
      .from('model_trainings')
      .select('telegram_id, users(bot_name, language_code)')
      .limit(1)

    if (altJoinError) {
      console.error('❌ Ошибка альтернативного JOIN:', altJoinError.message)
    } else {
      console.log('✅ Альтернативный JOIN выполнен успешно')
      if (altJoinData && altJoinData.length > 0) {
        console.log(
          '📊 Пример результата:',
          JSON.stringify(altJoinData[0], null, 2)
        )
      }
    }

    // 5. Проверяем конкретную запись по replicate_training_id
    console.log('\n📋 5. Проверка поиска по replicate_training_id:')
    const { data: specificData, error: specificError } = await supabase
      .from('model_trainings')
      .select('*')
      .eq('replicate_training_id', 'czx5g9e7bxrme0cq1d48v6zcmg') // ID из логов
      .single()

    if (specificError) {
      console.error(
        '❌ Ошибка поиска конкретной записи:',
        specificError.message
      )
    } else {
      console.log('✅ Запись найдена:', JSON.stringify(specificData, null, 2))
    }

    // 6. Проверяем структуру таблицы model_trainings
    console.log('\n📋 6. Анализ структуры таблицы model_trainings:')
    const { data: allTrainings, error: allError } = await supabase
      .from('model_trainings')
      .select('*')
      .limit(5)

    if (allError) {
      console.error('❌ Ошибка получения записей:', allError.message)
    } else {
      console.log('✅ Получено записей:', allTrainings?.length || 0)
      if (allTrainings && allTrainings.length > 0) {
        console.log('📊 Поля в таблице:', Object.keys(allTrainings[0]))

        // Проверяем наличие важных полей
        const firstRecord = allTrainings[0]
        console.log('\n🔍 Проверка важных полей:')
        console.log('- gender:', firstRecord.gender !== undefined ? '✅' : '❌')
        console.log(
          '- bot_name:',
          firstRecord.bot_name !== undefined ? '✅' : '❌'
        )
        console.log(
          '- telegram_id:',
          firstRecord.telegram_id !== undefined ? '✅' : '❌'
        )
        console.log(
          '- replicate_training_id:',
          firstRecord.replicate_training_id !== undefined ? '✅' : '❌'
        )
      }
    }
  } catch (error) {
    console.error('💥 Критическая ошибка диагностики:', error)
  }

  console.log('\n🏁 Диагностика завершена')
}

// Запускаем диагностику
diagnoseDatabase().catch(console.error)
