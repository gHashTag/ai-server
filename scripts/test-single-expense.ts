#!/usr/bin/env bun

/**
 * Тестовый скрипт для добавления одного расхода
 */

// Загружаем переменные окружения
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env' })
dotenvConfig({ path: `.env.${process.env.NODE_ENV || 'development'}.local` })

import { addBotFarmExpense } from '../src/core/supabase/addBotFarmExpense'
import { supabase } from '../src/core/supabase'

// Тестовый расход
const testExpense = {
  date: '01/05',
  name: 'TEST_EXPENSE',
  amount: 100.00,
  currency: 'THB',
  description: 'Тестовый расход для проверки системы',
  purpose: 'Проверка работоспособности системы управления бюджетом.',
  url: 'Test'
}

async function testConnection(): Promise<boolean> {
  console.log('🔍 Проверка подключения к Supabase...')
  
  console.log('📋 Переменные окружения:')
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? `✅ ${process.env.SUPABASE_URL}` : '❌ Не установлен')
  console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Установлен' : '❌ Не установлен')
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Установлен' : '❌ Не установлен')
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return false
  }
  
  try {
    // Тестируем простой запрос
    const { data, error } = await supabase
      .from('payments_v2')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ Ошибка подключения к Supabase:', error.message)
      console.error('📝 Детали ошибки:', error)
      return false
    }

    console.log('✅ Подключение к Supabase работает!')
    console.log('📊 Найдено записей в payments_v2:', data?.length || 0)
    return true
  } catch (error) {
    console.error('❌ Критическая ошибка подключения:', error)
    return false
  }
}

async function main() {
  console.log('🧪 Тестирование добавления одного расхода...')
  
  // Проверяем подключение
  const connectionOk = await testConnection()
  if (!connectionOk) {
    console.error('💥 Не удалось подключиться к Supabase. Завершение работы.')
    process.exit(1)
  }
  
  console.log('\n📝 Тестовый расход:')
  console.log(JSON.stringify(testExpense, null, 2))
  
  try {
    console.log('\n⏳ Добавляем тестовый расход...')
    const result = await addBotFarmExpense(testExpense)
    
    if (result) {
      console.log('\n🎉 Тестовый расход успешно добавлен!')
      
      // Проверяем, что запись действительно создалась
      console.log('\n🔍 Проверяем созданную запись...')
      const { data: createdRecord, error: selectError } = await supabase
        .from('payments_v2')
        .select('*')
        .eq('telegram_id', 'SYSTEM_BOT_FARM')
        .eq('description', `${testExpense.name}: ${testExpense.description}`)
        .limit(1)
      
      if (selectError) {
        console.error('❌ Ошибка при проверке созданной записи:', selectError.message)
      } else if (createdRecord && createdRecord.length > 0) {
        console.log('✅ Запись найдена в базе данных:')
        console.log(JSON.stringify(createdRecord[0], null, 2))
      } else {
        console.log('⚠️ Запись не найдена в базе данных')
      }
    } else {
      console.log('\n❌ Не удалось добавить тестовый расход')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Произошла ошибка:', error)
    process.exit(1)
  }
}

// Запускаем тест
main().catch(console.error)