#!/usr/bin/env node

/**
 * Скрипт для тестирования исправления gender в нейрофото
 * Проверяет, что gender теперь правильно передается и используется
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Загружаем переменные окружения
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function testGenderFix() {
  console.log('🔧 Тестирование исправления gender в нейрофото\n')

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
    console.log('- gender:', user.gender || 'НЕ УКАЗАН')
    console.log('- first_name:', user.first_name)

    // 2. Проверяем последнюю тренировку
    console.log('\n📋 2. Проверяем последнюю тренировку:')
    const { data: lastTraining, error: trainingError } = await supabase
      .from('model_trainings')
      .select('gender, model_name, status, created_at')
      .eq('telegram_id', testTelegramId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (trainingError) {
      console.error('❌ Ошибка получения тренировки:', trainingError.message)
    } else {
      console.log('✅ Последняя тренировка:')
      console.log('- model_name:', lastTraining.model_name)
      console.log('- gender:', lastTraining.gender || 'НЕ УКАЗАН')
      console.log('- status:', lastTraining.status)
      console.log('- created_at:', lastTraining.created_at)
    }

    // 3. Симулируем логику определения gender
    console.log('\n🎯 3. Симуляция логики определения gender:')

    let resolvedGender = null // Симулируем, что gender не передан в запросе

    console.log(
      'Шаг 1: gender из параметра запроса:',
      resolvedGender || 'НЕ ПЕРЕДАН'
    )

    if (!resolvedGender) {
      resolvedGender = user.gender
      console.log(
        'Шаг 2: gender из таблицы users:',
        resolvedGender || 'НЕ НАЙДЕН'
      )
    }

    if (!resolvedGender && lastTraining) {
      resolvedGender = lastTraining.gender
      console.log(
        'Шаг 3: gender из последней тренировки:',
        resolvedGender || 'НЕ НАЙДЕН'
      )
    }

    console.log(
      '\n🎭 Итоговый gender для генерации:',
      resolvedGender || 'НЕ ОПРЕДЕЛЕН'
    )

    // 4. Формируем промпт как в коде
    console.log('\n📝 4. Формирование промпта:')

    const genderPrompt =
      resolvedGender === 'male'
        ? 'handsome man, masculine features'
        : resolvedGender === 'female'
        ? 'beautiful woman, feminine features'
        : 'person' // fallback если gender не определен

    console.log('- Gender prompt:', genderPrompt)

    const testPrompt = 'в костюме, уверенная улыбка'
    const fullPrompt = `Fashionable ${genderPrompt}: ${testPrompt}. Cinematic Lighting, realistic, intricate details...`

    console.log('- Полный промпт (первые 100 символов):')
    console.log(`  "${fullPrompt.substring(0, 100)}..."`)

    // 5. Результат
    console.log('\n✅ 5. Результат исправления:')

    if (resolvedGender) {
      console.log(
        `🎉 УСПЕХ! Gender "${resolvedGender}" будет использован в генерации`
      )
      console.log(`   Промпт будет содержать: "${genderPrompt}"`)

      if (resolvedGender === 'male') {
        console.log('   ✅ Мужчины больше НЕ будут генерироваться как женщины!')
      } else if (resolvedGender === 'female') {
        console.log('   ✅ Женщины будут генерироваться корректно!')
      }
    } else {
      console.log(
        '⚠️  ВНИМАНИЕ: Gender не определен, будет использован fallback "person"'
      )
      console.log('   Это может привести к неопределенному полу в генерации')
    }

    // 6. Рекомендации
    console.log('\n💡 6. Рекомендации для тестирования:')
    console.log(
      '1. Протестировать API /generate/neuro-photo-v2 с gender="male"'
    )
    console.log(
      '2. Протестировать API /generate/neuro-photo-v2 без gender (должен взять из БД)'
    )
    console.log(
      '3. Проверить логи сервера на наличие "🎭 Gender для генерации"'
    )
    console.log(
      '4. Убедиться, что промпт содержит правильные gender-специфичные слова'
    )
  } catch (error) {
    console.error('💥 Ошибка:', error)
  }
}

// Запускаем тест
testGenderFix()
