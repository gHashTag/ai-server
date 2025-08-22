#!/usr/bin/env node

/**
 * Тест функции createModelTraining для проверки сохранения gender и bot_name
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Копируем функцию createModelTraining для тестирования
async function createModelTraining(trainingData) {
  console.log('🔍 Данные для вставки в БД:', {
    telegram_id: trainingData.telegram_id,
    model_name: trainingData.model_name,
    gender: trainingData.gender,
    bot_name: trainingData.bot_name,
    fullData: trainingData,
  })

  try {
    // Подготавливаем данные для вставки
    const insertData = {
      telegram_id: trainingData.telegram_id,
      model_name: trainingData.model_name,
      trigger_word: trainingData.trigger_word,
      zip_url: trainingData.zip_url,
      steps: Number(trainingData.steps),
      replicate_training_id: trainingData.replicate_training_id,
      status: trainingData.status || 'processing',
      api: trainingData.api || 'replicate',
      cancel_url: trainingData.cancel_url,
      error: trainingData.error,
      gender: trainingData.gender,
      bot_name: trainingData.bot_name,
    }

    console.log('📝 Финальные данные для INSERT:', insertData)

    // Создаем запись в таблице model_trainings
    const { data: dbTraining, error } = await supabase
      .from('model_trainings')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Ошибка при сохранении в БД:', error)
      throw new Error(`Ошибка при сохранении в БД: ${error.message}`)
    }

    console.log('✅ Данные успешно сохранены в БД:', {
      id: dbTraining.id,
      telegram_id: dbTraining.telegram_id,
      model_name: dbTraining.model_name,
      gender: dbTraining.gender,
      bot_name: dbTraining.bot_name,
    })

    return dbTraining
  } catch (error) {
    console.error('💥 Критическая ошибка при сохранении в БД:', error)
    throw error
  }
}

async function testCreateTraining() {
  console.log('🧪 Тестируем функцию createModelTraining...\n')

  const testData = {
    telegram_id: '144022504',
    model_name: 'test_model_' + Date.now(),
    trigger_word: 'TEST_TRIGGER',
    zip_url: 'https://example.com/test.zip',
    steps: 500,
    status: 'testing',
    gender: 'female',
    bot_name: 'test_bot',
    api: 'replicate',
  }

  try {
    console.log('📋 Создаем тестовую запись с данными:')
    console.log(JSON.stringify(testData, null, 2))

    const result = await createModelTraining(testData)

    console.log('\n✅ Запись создана! Проверяем результат:')
    console.log('- ID:', result.id ? '✅' : '❌')
    console.log(
      '- telegram_id:',
      result.telegram_id ? '✅' : '❌',
      `(${result.telegram_id})`
    )
    console.log(
      '- model_name:',
      result.model_name ? '✅' : '❌',
      `(${result.model_name})`
    )
    console.log('- gender:', result.gender ? '✅' : '❌', `(${result.gender})`)
    console.log(
      '- bot_name:',
      result.bot_name ? '✅' : '❌',
      `(${result.bot_name})`
    )
    console.log(
      '- trigger_word:',
      result.trigger_word ? '✅' : '❌',
      `(${result.trigger_word})`
    )

    // Проверяем, что запись действительно сохранилась с правильными данными
    console.log('\n🔍 Проверяем запись в БД:')
    const { data: savedRecord, error: fetchError } = await supabase
      .from('model_trainings')
      .select('*')
      .eq('id', result.id)
      .single()

    if (fetchError) {
      console.error('❌ Ошибка при получении сохраненной записи:', fetchError)
    } else {
      console.log('✅ Запись найдена в БД:')
      console.log(
        '- gender в БД:',
        savedRecord.gender ? '✅' : '❌',
        `(${savedRecord.gender})`
      )
      console.log(
        '- bot_name в БД:',
        savedRecord.bot_name ? '✅' : '❌',
        `(${savedRecord.bot_name})`
      )
      console.log('- Полная запись:', JSON.stringify(savedRecord, null, 2))
    }

    // Удаляем тестовую запись
    console.log('\n🧹 Удаляем тестовую запись...')
    const { error: deleteError } = await supabase
      .from('model_trainings')
      .delete()
      .eq('id', result.id)

    if (deleteError) {
      console.error('❌ Ошибка при удалении тестовой записи:', deleteError)
    } else {
      console.log('✅ Тестовая запись удалена')
    }
  } catch (error) {
    console.error('💥 Ошибка тестирования:', error)
  }
}

testCreateTraining().catch(console.error)
