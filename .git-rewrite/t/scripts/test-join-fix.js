#!/usr/bin/env node

/**
 * Тестирование исправления JOIN запроса между model_trainings и users
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function testJoinFix() {
  console.log('🔧 Тестируем исправление JOIN запроса...\n')

  const trainingId = 'czx5g9e7bxrme0cq1d48v6zcmg' // ID из логов

  try {
    // 1. Сначала получаем запись из model_trainings
    console.log('📋 1. Получаем запись из model_trainings:')
    const { data: training, error: trainingError } = await supabase
      .from('model_trainings')
      .select('*')
      .eq('replicate_training_id', trainingId)
      .single()

    if (trainingError) {
      console.error('❌ Ошибка:', trainingError.message)
      return
    }

    console.log('✅ Запись найдена:')
    console.log('- telegram_id:', training.telegram_id, '(тип: bigint)')
    console.log('- bot_name:', training.bot_name)
    console.log('- gender:', training.gender)

    // 2. Ищем пользователя по telegram_id с приведением типов
    console.log('\n📋 2. Ищем пользователя с приведением типов:')
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('bot_name, telegram_id, language_code')
      .eq('telegram_id', training.telegram_id.toString())
      .single()

    if (userError) {
      console.error('❌ Ошибка поиска пользователя:', userError.message)
    } else {
      console.log('✅ Пользователь найден:')
      console.log('- telegram_id:', user.telegram_id, '(тип: uuid)')
      console.log('- bot_name:', user.bot_name)
      console.log('- language_code:', user.language_code)
    }

    // 3. Тестируем ручной JOIN
    console.log('\n📋 3. Ручной JOIN результат:')
    const result = {
      ...training,
      users: user || null,
    }

    console.log('✅ Объединенный результат:')
    console.log(JSON.stringify(result, null, 2))

    // 4. Тестируем альтернативный подход - поиск через RPC функцию
    console.log('\n📋 4. Создаем функцию для безопасного JOIN:')

    // Создаем временную функцию для тестирования
    const rpcQuery = `
      SELECT 
        mt.*,
        json_build_object(
          'bot_name', u.bot_name,
          'telegram_id', u.telegram_id,
          'language_code', u.language_code
        ) as users
      FROM model_trainings mt
      LEFT JOIN users u ON mt.telegram_id::text = u.telegram_id::text
      WHERE mt.replicate_training_id = $1
    `

    console.log('SQL запрос для тестирования:', rpcQuery)
  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
  }
}

testJoinFix().catch(console.error)
