#!/usr/bin/env node

/**
 * Проверка новой тренировки в реальном времени
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function testNewTraining() {
  const trainingId = 'qzydad4yz1rme0cq1e8979nj2g' // Новый ID из логов

  console.log('🔍 Проверяем новую тренировку:', trainingId)

  try {
    // Получаем запись из model_trainings
    const { data: training, error } = await supabase
      .from('model_trainings')
      .select('*')
      .eq('replicate_training_id', trainingId)
      .single()

    if (error) {
      console.error('❌ Ошибка:', error.message)
      return
    }

    if (!training) {
      console.log('⏳ Запись еще не создана в БД, ждем...')
      return
    }

    console.log('✅ Найдена запись в model_trainings:')
    console.log('- ID:', training.id)
    console.log('- telegram_id:', training.telegram_id)
    console.log('- model_name:', training.model_name)
    console.log('- gender:', training.gender || 'null')
    console.log('- bot_name:', training.bot_name || 'null')
    console.log('- status:', training.status)
    console.log('- created_at:', training.created_at)

    // Теперь тестируем нашу исправленную функцию getTrainingWithUser
    console.log('\n🧪 Тестируем исправленную функцию getTrainingWithUser:')

    // Получаем данные пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('bot_name, telegram_id, language_code')
      .eq('telegram_id', training.telegram_id.toString())
      .single()

    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError.message)
    } else {
      console.log('✅ Данные пользователя найдены:')
      console.log('- user bot_name:', user.bot_name)
      console.log('- user language_code:', user.language_code)
    }

    // Формируем результат как в исправленной функции
    const result = {
      id: training.id,
      model_name: training.model_name,
      gender: training.gender,
      bot_name: training.bot_name || user?.bot_name || 'neuro_blogger_bot',
      telegram_id: training.telegram_id.toString(),
      trigger_word: training.trigger_word,
      status: training.status,
      users: user
        ? {
            bot_name: user.bot_name,
            telegram_id: user.telegram_id,
            language_code: user.language_code,
          }
        : null,
    }

    console.log('\n🎯 Итоговый результат функции:')
    console.log('- bot_name (итоговый):', result.bot_name)
    console.log('- gender (итоговый):', result.gender || 'null')
    console.log('- fallback работает:', result.bot_name !== null ? '✅' : '❌')
  } catch (error) {
    console.error('💥 Ошибка:', error)
  }
}

testNewTraining().catch(console.error)
