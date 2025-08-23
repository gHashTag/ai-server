#!/usr/bin/env bun

/**
 * Скрипт для анализа прибыльности ботов за май, июнь, июль 2024
 *
 * Показывает доходность каждого бота в звездах и рублях по месяцам
 *
 * Использование:
 * bun run scripts/bot-profitability-analysis.ts
 */

// Загружаем переменные окружения
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env' })
dotenvConfig({ path: `.env.${process.env.NODE_ENV || 'development'}.local` })

import {
  getBotProfitability,
  generateBotProfitabilityStats,
  displayBotProfitabilityReport,
} from '../src/core/supabase/getBotProfitabilityReport'
import { supabaseAdmin as supabase } from '../src/core/supabase'

// Удалены неиспользуемые интерфейсы - используем из getBotProfitabilityReport

async function testConnection(): Promise<boolean> {
  console.log('🔍 Проверка подключения к Supabase...')

  // Проверяем переменные окружения
  if (!process.env.SUPABASE_URL) {
    console.error('❌ SUPABASE_URL не установлен')
    return false
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY не установлен')
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

async function analyzeBotProfitability() {
  console.log('📊 Начинаем анализ прибыльности ботов...')

  try {
    // Получаем данные за май-июль 2024 используя нашу функцию
    const profitabilityData = await getBotProfitability(
      '2024-05-01',
      '2024-07-31'
    )

    if (profitabilityData.length === 0) {
      console.log('❌ Данные о прибыльности ботов за май-июль 2024 не найдены')
      return
    }

    console.log(`✅ Получено ${profitabilityData.length} записей`)

    // Генерируем статистику
    const stats = generateBotProfitabilityStats(profitabilityData)

    // Отображаем отчет
    displayBotProfitabilityReport(stats)
  } catch (error) {
    console.error('❌ Ошибка анализа данных:', error)
    throw error
  }
}

// Функция displayResults удалена - используем displayBotProfitabilityReport из модуля

async function main() {
  console.log(
    '🚀 Начинаем анализ прибыльности ботов за май, июнь, июль 2024...'
  )

  try {
    // Сначала проверяем подключение
    const connectionOk = await testConnection()
    if (!connectionOk) {
      console.error('💥 Не удалось подключиться к Supabase. Завершение работы.')
      process.exit(1)
    }

    // Выполняем анализ (отчет отображается внутри функции)
    await analyzeBotProfitability()

    console.log('\n✅ Анализ завершен успешно!')
  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
    process.exit(1)
  }
}

// Запускаем основную функцию
main()
