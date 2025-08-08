#!/usr/bin/env bun

/**
 * Скрипт для добавления расходов фермы ботов за май 2024
 * 
 * Использование:
 * bun run scripts/add-may-expenses.ts
 */

// Загружаем переменные окружения
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env' })
dotenvConfig({ path: `.env.${process.env.NODE_ENV || 'development'}.local` })

import { addMultipleBotFarmExpenses } from '../src/core/supabase/addBotFarmExpense'

// Расходы за май 2024 из предоставленной таблицы
const mayExpenses = [
  {
    date: '01/05',
    name: 'CLOUDCONVERT',
    amount: 309.13,
    currency: 'THB',
    description: 'Конвертация файлов',
    purpose: 'Используется для преобразования файлов в нужные форматы для работы с данными.',
    url: 'CloudConvert'
  },
  {
    date: '01/05',
    name: 'ELEST.IO',
    amount: 1030.43,
    currency: 'THB',
    description: 'Хостинг и инструменты',
    purpose: 'Хостинг и управление проектами для разработки.',
    url: 'Elest'
  },
  {
    date: '02/05',
    name: 'PINECONE SYSTEMS, IN',
    amount: 40.19,
    currency: 'THB',
    description: 'Векторная база данных',
    purpose: 'Хранение и управление векторными данными для AI приложений.',
    url: 'Pinecone'
  },
  {
    date: '02/05',
    name: 'WARP.DEV',
    amount: 1726.61,
    currency: 'THB',
    description: 'Инструменты разработки',
    purpose: 'Оптимизация процессов разработки и тестирования приложений.',
    url: 'Warp'
  },
  {
    date: '03/05',
    name: 'REPLICATE',
    amount: 6088.40,
    currency: 'THB',
    description: 'Хостинг моделей',
    purpose: 'Хостинг моделей для генерации изображений и других AI задач.',
    url: 'Replicate'
  },
  {
    date: '03/05',
    name: 'WISPR',
    amount: 517.37,
    currency: 'THB',
    description: 'AI сообщения',
    purpose: 'Автоматизация общения с пользователями через AI.',
    url: 'Wispr'
  },
  {
    date: '05/05',
    name: 'CURSOR USAGE MID MA',
    amount: 689.83,
    currency: 'THB',
    description: 'Инструменты разработки',
    purpose: 'Используется для оптимизации процессов разработки.',
    url: 'Cursor'
  },
  {
    date: '07/05',
    name: 'OPENAI',
    amount: 17282.83,
    currency: 'THB',
    description: 'AI API / ChatGPT',
    purpose: 'Генерация текстов и взаимодействие с пользователями.',
    url: 'OpenAI'
  },
  {
    date: '08/05',
    name: 'ELEVENLABS',
    amount: 741.22,
    currency: 'THB',
    description: 'Генерация голоса',
    purpose: 'Создание реалистичных голосов для озвучивания контента.',
    url: 'ElevenLabs'
  },
  {
    date: '08/05',
    name: 'CURSOR USAGE MID MA',
    amount: 673.84,
    currency: 'THB',
    description: 'Инструменты разработки',
    purpose: 'Используется для автоматизации задач и улучшения функционала бота.',
    url: 'Cursor'
  },
  {
    date: '09/05',
    name: 'ELEVENLABS',
    amount: 744.15,
    currency: 'THB',
    description: 'Генерация голоса',
    purpose: 'Создание реалистичных голосов для озвучивания контента.',
    url: 'ElevenLabs'
  },
  {
    date: '09/05',
    name: 'CURSOR USAGE APR',
    amount: 336.90,
    currency: 'THB',
    description: 'Инструменты разработки',
    purpose: 'Оптимизация процессов разработки и тестирования приложений.',
    url: 'Cursor'
  },
  {
    date: '17/05',
    name: 'ELEST.IO',
    amount: 686.34,
    currency: 'THB',
    description: 'Хостинг и инструменты',
    purpose: 'Хостинг и управление проектами для разработки.',
    url: 'Elest'
  },
  {
    date: '17/05',
    name: 'NGROK INC.',
    amount: 343.17,
    currency: 'THB',
    description: 'Туннелирование',
    purpose: 'Создание безопасных туннелей для тестирования приложений.',
    url: 'Ngrok'
  },
  {
    date: '18/05',
    name: 'CURSOR USAGE MID MA',
    amount: 687.71,
    currency: 'THB',
    description: 'Инструменты разработки',
    purpose: 'Используется для автоматизации задач и улучшения функционала бота.',
    url: 'Cursor'
  },
  {
    date: '18/05',
    name: 'SUNO INC.',
    amount: 343.17,
    currency: 'THB',
    description: 'Генерация музыки',
    purpose: 'Генерация музыки для улучшения контента.',
    url: 'Suno'
  },
  {
    date: '18/05',
    name: 'JAMMABLE.COM',
    amount: 308.85,
    currency: 'THB',
    description: 'Генерация музыки',
    purpose: 'Создание музыкального контента для улучшения взаимодействия с аудиторией.',
    url: 'Jammable'
  },
  {
    date: '18/05',
    name: 'HEYGEN TECHNOLOGY IN',
    amount: 514.76,
    currency: 'THB',
    description: 'AI генерация видео',
    purpose: 'Генерация видео для визуализации контента.',
    url: 'Heygen'
  },
  {
    date: '18/05',
    name: 'HIGGSFIELD INC.',
    amount: 995.19,
    currency: 'THB',
    description: 'Исследования',
    purpose: 'Анализ данных и генерация идей для улучшения функционала бота.',
    url: 'Higgsfield'
  },
  {
    date: '21/05',
    name: 'SUNO INC.',
    amount: 1023.67,
    currency: 'THB',
    description: 'Генерация музыки',
    purpose: 'Генерация музыки для улучшения контента.',
    url: 'Suno'
  },
  {
    date: '21/05',
    name: 'OPENAI',
    amount: 365.11,
    currency: 'THB',
    description: 'AI API / ChatGPT',
    purpose: 'Генерация текстов и взаимодействие с пользователями.',
    url: 'OpenAI'
  },
  {
    date: '21/05',
    name: 'OPENROUTER, INC',
    amount: 371.93,
    currency: 'THB',
    description: 'Маршрутизация запросов',
    purpose: 'Управление маршрутизацией запросов к языковым моделям.',
    url: 'OpenRouter'
  },
  {
    date: '21/05',
    name: 'LOVABLE',
    amount: 853.06,
    currency: 'THB',
    description: 'AI аватары',
    purpose: 'Создание сайта для взаимодействия с аудиторией.',
    url: 'Lovable'
  },
  {
    date: '23/05',
    name: 'RUNWAY UNLIMITED PLA',
    amount: 3211.43,
    currency: 'THB',
    description: 'AI генерация видео',
    purpose: 'Генерация видео для визуализации контента.',
    url: 'Runway'
  },
  {
    date: '23/05',
    name: 'OPENAI (CHATGPT SUBS',
    amount: 2170.25,
    currency: 'THB',
    description: 'AI API / ChatGPT',
    purpose: 'Подписка на ChatGPT для генерации текстов и взаимодействия с пользователями.',
    url: 'OpenAI'
  },
  {
    date: '24/05',
    name: 'HEDRA INC.',
    amount: 337.64,
    currency: 'THB',
    description: 'Инфраструктура',
    purpose: 'Решения для поддержки работы приложений.',
    url: 'Hedra'
  },
  {
    date: '25/05',
    name: 'ELEVENLABS.IO',
    amount: 742.80,
    currency: 'THB',
    description: 'Генерация голоса',
    purpose: 'Создание реалистичных голосов для озвучивания контента.',
    url: 'ElevenLabs'
  },
  {
    date: '26/05',
    name: 'DODOPAY COMFYICU',
    amount: 337.64,
    currency: 'THB',
    description: 'Разные сервисы',
    purpose: 'Сервисы для поддержки проекта.',
    url: 'DodoPay'
  },
  {
    date: '27/05',
    name: 'CURSOR, AI POWERED I',
    amount: 675.27,
    currency: 'THB',
    description: 'AI инструменты',
    purpose: 'Используется для автоматизации задач и улучшения функционала бота.',
    url: 'Cursor'
  },
  {
    date: '27/05',
    name: 'WISPR',
    amount: 502.46,
    currency: 'THB',
    description: 'AI сообщения',
    purpose: 'Автоматизация общения с пользователями через AI.',
    url: 'Wispr'
  },
  {
    date: '27/05',
    name: 'OBSIDIAN.MD',
    amount: 167.49,
    currency: 'THB',
    description: 'Облачное хранилище',
    purpose: 'Организация и хранение документации проекта.',
    url: 'Obsidian'
  },
  {
    date: '29/05',
    name: 'AUGMENT CODE',
    amount: 1284.08,
    currency: 'THB',
    description: 'AI инструменты',
    purpose: 'Инструменты для улучшения кода.',
    url: 'Augment Code'
  },
  {
    date: '29/05',
    name: 'OBSIDIAN.MD',
    amount: 673.63,
    currency: 'THB',
    description: 'Облачное хранилище',
    purpose: 'Организация и хранение документации проекта.',
    url: 'Obsidian'
  },
  {
    date: '30/05',
    name: 'ELEST.IO',
    amount: 674.86,
    currency: 'THB',
    description: 'Хостинг и инструменты',
    purpose: 'Хостинг и управление проектами для разработки.',
    url: 'Elest'
  },
  {
    date: '31/05',
    name: 'BLACK FOREST LABS',
    amount: 341.81,
    currency: 'THB',
    description: 'AI инструменты',
    purpose: 'Инструменты для автоматизации задач.',
    url: 'Black Forest Labs'
  },
  {
    date: '31/05',
    name: 'HIGGSFIELD INC.',
    amount: 977.95,
    currency: 'THB',
    description: 'Исследования',
    purpose: 'Анализ данных и генерация идей для улучшения функционала бота.',
    url: 'Higgsfield'
  }
]

import { supabase } from '../src/core/supabase'

async function testConnection(): Promise<boolean> {
  console.log('🔍 Проверка подключения к Supabase...')
  
  // Проверяем переменные окружения
  if (!process.env.SUPABASE_URL) {
    console.error('❌ SUPABASE_URL не установлен')
    return false
  }
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY не установлен')
    return false
  }
  
  console.log('✅ Переменные окружения настроены')
  
  try {
    // Тестируем простой запрос
    const { data, error } = await supabase
      .from('payments_v2')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ Ошибка подключения к Supabase:', error.message)
      return false
    }

    console.log('✅ Подключение к Supabase работает!')
    return true
  } catch (error) {
    console.error('❌ Критическая ошибка подключения:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Начинаем добавление расходов фермы ботов за май 2024...')
  
  // Сначала проверяем подключение
  const connectionOk = await testConnection()
  if (!connectionOk) {
    console.error('💥 Не удалось подключиться к Supabase. Завершение работы.')
    process.exit(1)
  }
  
  console.log(`📊 Всего расходов для обработки: ${mayExpenses.length}`)
  
  // Подсчитываем общую сумму
  const totalAmount = mayExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  console.log(`💰 Общая сумма расходов: ${totalAmount.toFixed(2)} THB`)
  
  try {
    const result = await addMultipleBotFarmExpenses(mayExpenses)
    
    console.log('\n📈 Результаты обработки:')
    console.log(`✅ Успешно добавлено: ${result.success}`)
    console.log(`❌ Не удалось добавить: ${result.failed}`)
    
    if (result.errors.length > 0) {
      console.log('\n🔍 Ошибки:')
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`)
      })
    }
    
    if (result.success === mayExpenses.length) {
      console.log('\n🎉 Все расходы успешно добавлены в базу данных!')
    } else {
      console.log('\n⚠️ Некоторые расходы не были добавлены. Проверьте логи для получения подробностей.')
    }
    
  } catch (error) {
    console.error('❌ Произошла ошибка при добавлении расходов:', error)
    process.exit(1)
  }
}

// Запускаем скрипт
main().catch(console.error)