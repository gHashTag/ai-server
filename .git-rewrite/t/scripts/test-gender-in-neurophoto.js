#!/usr/bin/env node

/**
 * Скрипт для диагностики проблемы с gender в нейрофото
 * Проверяет, как обрабатывается поле gender в разных версиях нейрофото
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Загружаем переменные окружения
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function testGenderInNeurophoto() {
  console.log('🔍 Диагностика проблемы с gender в нейрофото\n')

  const testTelegramId = '144022504'

  try {
    // 1. Проверяем данные пользователя
    console.log('📋 1. Проверяем данные пользователя:')
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('telegram_id, bot_name, gender, first_name, last_name')
      .eq('telegram_id', testTelegramId)
      .single()

    if (userError) {
      console.error('❌ Ошибка получения пользователя:', userError.message)
      return
    }

    console.log('✅ Данные пользователя:')
    console.log('- telegram_id:', user.telegram_id)
    console.log('- bot_name:', user.bot_name)
    console.log('- gender:', user.gender || 'НЕ УКАЗАН')
    console.log('- first_name:', user.first_name)
    console.log('- last_name:', user.last_name)

    // 2. Проверяем последние обученные модели
    console.log('\n📋 2. Проверяем последние обученные модели:')
    const { data: trainings, error: trainingsError } = await supabase
      .from('model_trainings')
      .select('*')
      .eq('telegram_id', testTelegramId)
      .order('created_at', { ascending: false })
      .limit(3)

    if (trainingsError) {
      console.error('❌ Ошибка получения тренировок:', trainingsError.message)
    } else {
      console.log(`✅ Найдено ${trainings.length} тренировок:`)
      trainings.forEach((training, index) => {
        console.log(`\n${index + 1}. Модель: ${training.model_name}`)
        console.log(`   - gender: ${training.gender || 'НЕ УКАЗАН'}`)
        console.log(`   - bot_name: ${training.bot_name}`)
        console.log(`   - status: ${training.status}`)
        console.log(`   - created_at: ${training.created_at}`)
      })
    }

    // 3. Проверяем последние промпты нейрофото
    console.log('\n📋 3. Проверяем последние промпты нейрофото:')
    const { data: prompts, error: promptsError } = await supabase
      .from('prompts')
      .select('*')
      .eq('telegram_id', testTelegramId)
      .in('mode', ['NeuroPhoto', 'NeuroPhotoV2'])
      .order('created_at', { ascending: false })
      .limit(5)

    if (promptsError) {
      console.error('❌ Ошибка получения промптов:', promptsError.message)
    } else {
      console.log(`✅ Найдено ${prompts.length} промптов нейрофото:`)
      prompts.forEach((prompt, index) => {
        console.log(`\n${index + 1}. Промпт: "${prompt.prompt}"`)
        console.log(`   - mode: ${prompt.mode}`)
        console.log(`   - model_url: ${prompt.model_url}`)
        console.log(`   - status: ${prompt.status}`)
        console.log(`   - created_at: ${prompt.created_at}`)
      })
    }

    // 4. Анализируем проблему
    console.log('\n🔍 4. Анализ проблемы:')

    const hasUserGender = user.gender !== null && user.gender !== undefined
    const hasTrainingGender = trainings.some(
      t => t.gender !== null && t.gender !== undefined
    )

    console.log('\n📊 Статус gender:')
    console.log(
      `- В таблице users: ${hasUserGender ? '✅ ЕСТЬ' : '❌ НЕТ'} (${
        user.gender || 'null'
      })`
    )
    console.log(
      `- В model_trainings: ${hasTrainingGender ? '✅ ЕСТЬ' : '❌ НЕТ'}`
    )

    if (hasTrainingGender) {
      const genderCounts = trainings.reduce((acc, t) => {
        const gender = t.gender || 'null'
        acc[gender] = (acc[gender] || 0) + 1
        return acc
      }, {})
      console.log('- Распределение gender в тренировках:', genderCounts)
    }

    // 5. Проверяем, какой gender используется по умолчанию
    console.log('\n🎯 5. Проблема с дефолтным gender:')

    if (!hasUserGender && !hasTrainingGender) {
      console.log(
        '❌ ПРОБЛЕМА: Gender не указан ни в users, ни в model_trainings!'
      )
      console.log(
        '   Это означает, что система может использовать дефолтное значение.'
      )
      console.log('   Нужно проверить код генерации нейрофото.')
    } else if (hasTrainingGender) {
      const lastTraining = trainings[0]
      console.log(
        `✅ Последняя тренировка имеет gender: ${lastTraining.gender}`
      )
      console.log('   Нейрофото должно использовать этот gender.')
    }

    // 6. Рекомендации
    console.log('\n💡 6. Рекомендации:')
    console.log('1. Проверить код generateNeuroImageV2 - передается ли gender?')
    console.log(
      '2. Проверить контроллер neuroPhotoV2 - извлекается ли gender из req.body?'
    )
    console.log(
      '3. Проверить промпт генерации - добавляется ли gender в промпт?'
    )
    console.log('4. Проверить, есть ли дефолтное значение gender в коде.')
  } catch (error) {
    console.error('💥 Ошибка:', error)
  }
}

// Запускаем тест
testGenderInNeurophoto()
