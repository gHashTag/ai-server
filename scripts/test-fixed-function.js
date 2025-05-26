#!/usr/bin/env node

/**
 * Тест исправленной функции getTrainingWithUser
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Копируем исправленную функцию для тестирования
async function getTrainingWithUser(trainingId) {
  try {
    // 1. Сначала получаем запись из model_trainings
    const { data: training, error: trainingError } = await supabase
      .from('model_trainings')
      .select('*')
      .eq('replicate_training_id', trainingId)
      .single()

    if (trainingError) {
      console.error('❌ Training fetch error:', trainingError)
      return null
    }

    if (!training) {
      console.error('❌ Training not found for ID:', trainingId)
      return null
    }

    // 2. Получаем данные пользователя по telegram_id с приведением типов
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('bot_name, telegram_id, language_code')
      .eq('telegram_id', training.telegram_id.toString()) // Приводим bigint к string
      .single()

    if (userError) {
      console.error('❌ User fetch error:', userError)
      // Продолжаем без данных пользователя
    }

    console.log('✅ Training data retrieved:', {
      training_id: trainingId,
      telegram_id: training.telegram_id,
      training_bot_name: training.bot_name,
      user_bot_name: user?.bot_name,
      gender: training.gender,
    })

    // 3. Формируем результат с приоритетом bot_name из model_trainings
    const result = {
      id: training.id,
      model_name: training.model_name,
      gender: training.gender,
      bot_name: training.bot_name || user?.bot_name || 'neuro_blogger_bot', // Fallback chain
      telegram_id: training.telegram_id.toString(), // Приводим к строке для совместимости
      trigger_word: training.trigger_word,
      zip_url: training.zip_url,
      steps: training.steps,
      replicate_training_id: training.replicate_training_id,
      status: training.status,
      created_at: training.created_at,
      updated_at: training.updated_at,
      users: user
        ? {
            bot_name: user.bot_name,
            telegram_id: user.telegram_id,
            language_code: user.language_code,
          }
        : null,
    }

    return result
  } catch (error) {
    console.error('❌ Training fetch error:', error)
    return null
  }
}

async function testFixedFunction() {
  console.log('🧪 Тестируем исправленную функцию getTrainingWithUser...\n')

  const trainingId = 'czx5g9e7bxrme0cq1d48v6zcmg' // ID из логов

  try {
    const result = await getTrainingWithUser(trainingId)

    if (result) {
      console.log('✅ Функция работает! Результат:')
      console.log(JSON.stringify(result, null, 2))

      console.log('\n🔍 Анализ результата:')
      console.log('- ID найден:', result.id ? '✅' : '❌')
      console.log(
        '- bot_name определен:',
        result.bot_name ? '✅' : '❌',
        `(${result.bot_name})`
      )
      console.log(
        '- gender определен:',
        result.gender !== null ? '✅' : '❌',
        `(${result.gender})`
      )
      console.log('- users данные:', result.users ? '✅' : '❌')

      if (result.users) {
        console.log('  - user bot_name:', result.users.bot_name)
        console.log('  - user language_code:', result.users.language_code)
      }
    } else {
      console.log('❌ Функция вернула null')
    }
  } catch (error) {
    console.error('💥 Ошибка тестирования:', error)
  }
}

testFixedFunction().catch(console.error)
