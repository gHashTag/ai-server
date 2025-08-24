#!/usr/bin/env node

/**
 * 🔍 Диагностика проблем с генерацией видео
 * Проверяет все необходимые API ключи и настройки
 */

const axios = require('axios')
require('dotenv').config()

console.log('🔍 ДИАГНОСТИКА ПРОБЛЕМ С ГЕНЕРАЦИЕЙ ВИДЕО')
console.log('='.repeat(60))

// Список критически важных переменных окружения для видео
const REQUIRED_ENV_VARS = [
  {
    name: 'KIE_AI_API_KEY',
    description: 'API ключ Kie.ai (основной провайдер видео)',
    required: false,
    service: 'kie-ai',
    url: 'https://kie.ai',
  },
  {
    name: 'GOOGLE_CLOUD_PROJECT',
    description: 'ID проекта Google Cloud (fallback для Vertex AI)',
    required: false,
    service: 'vertex-ai',
    url: 'https://console.cloud.google.com',
  },
  {
    name: 'GOOGLE_APPLICATION_CREDENTIALS',
    description: 'Путь к файлу credentials Google Cloud',
    required: false,
    service: 'vertex-ai',
  },
  {
    name: 'SUPABASE_URL',
    description: 'URL базы данных Supabase',
    required: true,
    service: 'database',
  },
  {
    name: 'SUPABASE_ANON_KEY',
    description: 'Anon ключ Supabase',
    required: true,
    service: 'database',
  },
]

async function checkEnvironmentVariables() {
  console.log('\n📊 ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ:')
  console.log('-'.repeat(40))

  let criticalMissing = []
  let videoProviders = []

  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name]
    const isSet = !!value

    if (isSet) {
      console.log(`✅ ${envVar.name}: настроен`)

      // Скрываем чувствительные данные
      if (envVar.name.includes('KEY') || envVar.name.includes('SECRET')) {
        const masked =
          value.substring(0, 8) + '***' + value.substring(value.length - 4)
        console.log(`   🔑 Значение: ${masked}`)
      }

      if (envVar.service === 'kie-ai') {
        videoProviders.push('Kie.ai (87% экономии)')
      }
      if (envVar.service === 'vertex-ai') {
        videoProviders.push('Vertex AI (дорогой fallback)')
      }
    } else {
      if (envVar.required) {
        console.log(`❌ ${envVar.name}: КРИТИЧЕСКИ ВАЖЕН - отсутствует!`)
        criticalMissing.push(envVar)
      } else {
        console.log(`⚠️  ${envVar.name}: не настроен (опционально)`)
        console.log(`   💡 ${envVar.description}`)
        if (envVar.url) {
          console.log(`   🌐 Получить: ${envVar.url}`)
        }
      }
    }
  }

  return { criticalMissing, videoProviders }
}

async function testKieAiConnection() {
  console.log('\n🎬 ТЕСТИРОВАНИЕ KIE.AI API:')
  console.log('-'.repeat(40))

  const kieApiKey = process.env.KIE_AI_API_KEY
  if (!kieApiKey) {
    console.log('❌ KIE_AI_API_KEY не найден')
    console.log('   ⚠️  Будет использоваться дорогой Vertex AI')
    console.log('   💰 Экономия до 87% НЕДОСТУПНА')
    return false
  }

  try {
    const response = await axios.get('https://api.kie.ai/api/v1/chat/credit', {
      headers: {
        Authorization: `Bearer ${kieApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })

    const credits = response.data.credits || 0
    console.log('✅ Kie.ai API подключение успешно')
    console.log(`💰 Баланс: ${credits} кредитов`)

    if (credits < 1) {
      console.log('⚠️  НИЗКИЙ БАЛАНС! Пополните аккаунт')
      console.log('   💡 Рекомендуется: минимум $5-10')
    } else {
      console.log('✅ Баланс достаточен для генерации')
    }

    return true
  } catch (error) {
    console.log('❌ Ошибка подключения к Kie.ai')

    if (error.response) {
      const status = error.response.status
      if (status === 401) {
        console.log('   🚫 Неверный API ключ')
        console.log('   💡 Проверьте KIE_AI_API_KEY в настройках')
      } else if (status === 429) {
        console.log('   ⏱  Превышен лимит запросов')
        console.log('   💡 Подождите или обновите план')
      } else {
        console.log(`   ⚠️  HTTP ${status}: ${error.response.statusText}`)
      }
    } else {
      console.log(`   🌐 Сетевая ошибка: ${error.message}`)
    }

    return false
  }
}

async function checkVertexAiFallback() {
  console.log('\n🧠 ПРОВЕРКА VERTEX AI (FALLBACK):')
  console.log('-'.repeat(40))

  const hasProject = !!process.env.GOOGLE_CLOUD_PROJECT
  const hasCredentials = !!process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (!hasProject) {
    console.log('❌ GOOGLE_CLOUD_PROJECT не настроен')
  } else {
    console.log(`✅ Google Cloud Project: ${process.env.GOOGLE_CLOUD_PROJECT}`)
  }

  if (!hasCredentials) {
    console.log('❌ GOOGLE_APPLICATION_CREDENTIALS не настроен')
  } else {
    console.log('✅ Google Application Credentials настроены')
  }

  if (!hasProject || !hasCredentials) {
    console.log('⚠️  Vertex AI недоступен как fallback')
    console.log('   🚨 Если Kie.ai не работает - генерация НЕВОЗМОЖНА')
    return false
  }

  console.log('✅ Vertex AI настроен как fallback')
  return true
}

async function checkDatabaseConnection() {
  console.log('\n🗄️  ПРОВЕРКА БАЗЫ ДАННЫХ:')
  console.log('-'.repeat(40))

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Supabase настройки отсутствуют')
    return false
  }

  try {
    // Простая проверка подключения
    const response = await axios.get(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      timeout: 5000,
    })

    console.log('✅ Подключение к Supabase успешно')
    return true
  } catch (error) {
    console.log(`❌ Ошибка подключения к Supabase: ${error.message}`)
    return false
  }
}

function generateSolutions(checks) {
  console.log('\n💡 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:')
  console.log('='.repeat(60))

  if (checks.criticalMissing.length > 0) {
    console.log('\n🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ:')
    checks.criticalMissing.forEach(env => {
      console.log(`❌ ${env.name}: ${env.description}`)
    })
  }

  if (!checks.kieAiOk && !checks.vertexAiOk) {
    console.log('\n🚨 ВИДЕО ГЕНЕРАЦИЯ ПОЛНОСТЬЮ НЕДОСТУПНА!')
    console.log('   Необходимо настроить хотя бы один провайдер:')
    console.log('   1. Kie.ai (дешевый) - получите ключ на https://kie.ai')
    console.log('   2. Vertex AI (дорогой) - настройте Google Cloud')
  } else if (!checks.kieAiOk) {
    console.log('\n⚠️  ИСПОЛЬЗУЕТСЯ ДОРОГОЙ VERTEX AI!')
    console.log('   💰 Экономьте до 87% - настройте Kie.ai:')
    console.log('   1. Зарегистрируйтесь: https://kie.ai')
    console.log('   2. Получите API ключ в Settings → API Keys')
    console.log('   3. Добавьте KIE_AI_API_KEY в переменные окружения')
    console.log('   4. Пополните баланс (минимум $5)')
  } else if (checks.kieAiOk && checks.vertexAiOk) {
    console.log('\n✅ ОПТИМАЛЬНАЯ НАСТРОЙКА!')
    console.log('   🎯 Kie.ai как основной (экономия 87%)')
    console.log('   🛡️  Vertex AI как надежный fallback')
  }

  if (!checks.databaseOk) {
    console.log('\n🚨 БАЗА ДАННЫХ НЕДОСТУПНА!')
    console.log('   📊 Результаты видео не будут сохраняться')
    console.log('   🔧 Настройте Supabase переменные окружения')
  }
}

async function main() {
  try {
    // Проверяем переменные окружения
    const envCheck = await checkEnvironmentVariables()

    // Тестируем подключения
    const kieAiOk = await testKieAiConnection()
    const vertexAiOk = await checkVertexAiFallback()
    const databaseOk = await checkDatabaseConnection()

    // Генерируем рекомендации
    generateSolutions({
      criticalMissing: envCheck.criticalMissing,
      videoProviders: envCheck.videoProviders,
      kieAiOk,
      vertexAiOk,
      databaseOk,
    })

    // Итоговая оценка
    console.log('\n📊 ИТОГОВАЯ ОЦЕНКА:')
    console.log('='.repeat(60))

    if (kieAiOk && vertexAiOk && databaseOk) {
      console.log('🎉 ВСЕ СИСТЕМЫ РАБОТАЮТ ОПТИМАЛЬНО!')
      console.log('   ✅ Дешевая генерация через Kie.ai')
      console.log('   ✅ Надежный fallback через Vertex AI')
      console.log('   ✅ База данных подключена')
    } else if ((kieAiOk || vertexAiOk) && databaseOk) {
      console.log('⚠️  ЧАСТИЧНАЯ ГОТОВНОСТЬ')
      console.log('   ✅ Генерация видео возможна')
      console.log('   ✅ База данных работает')
      if (!kieAiOk) {
        console.log('   ⚠️  Используется дорогой Vertex AI')
      }
    } else {
      console.log('🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ НАЙДЕНЫ!')
      console.log('   ❌ Генерация видео может не работать')
      console.log('   🔧 Следуйте рекомендациям выше')
    }
  } catch (error) {
    console.error('💥 Критическая ошибка диагностики:', error.message)
    console.error('   🔍 Проверьте настройки проекта')
  }
}

// Запускаем диагностику
main()
