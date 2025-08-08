#!/usr/bin/env bun

/**
 * Тестовый скрипт для проверки подключения к Supabase
 */

// Загружаем переменные окружения
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env' })
dotenvConfig({ path: `.env.${process.env.NODE_ENV || 'development'}.local` })

import { supabase } from '../src/core/supabase'

async function testConnection() {
  console.log('🔍 Тестирование подключения к Supabase...')
  
  // Проверяем переменные окружения
  console.log('📋 Переменные окружения:')
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Установлен' : '❌ Не установлен')
  console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Установлен' : '❌ Не установлен')
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Установлен' : '❌ Не установлен')
  console.log()

  try {
    // Тестируем простой запрос
    console.log('🧪 Тестирование простого запроса...')
    const { data, error } = await supabase
      .from('payments_v2')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ Ошибка при выполнении запроса:', error.message)
      console.error('📝 Детали ошибки:', error)
      return false
    }

    console.log('✅ Подключение к Supabase работает!')
    console.log('📊 Найдено записей:', data?.length || 0)
    
    // Проверяем существование записей системы фермы ботов
    console.log('\n🤖 Проверка записей фермы ботов...')
    const { data: farmData, error: farmError } = await supabase
      .from('payments_v2')
      .select('*')
      .eq('telegram_id', 'SYSTEM_BOT_FARM')
      .limit(5)

    if (farmError) {
      console.error('❌ Ошибка при поиске записей фермы ботов:', farmError.message)
    } else {
      console.log(`📋 Найдено записей фермы ботов: ${farmData?.length || 0}`)
      if (farmData && farmData.length > 0) {
        console.log('🔍 Пример записи:')
        console.log(JSON.stringify(farmData[0], null, 2))
      }
    }

    return true

  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
    return false
  }
}

// Запускаем тест
testConnection()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Тест подключения завершен успешно!')
      process.exit(0)
    } else {
      console.log('\n💥 Тест подключения не прошел!')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('💥 Неожиданная ошибка:', error)
    process.exit(1)
  })