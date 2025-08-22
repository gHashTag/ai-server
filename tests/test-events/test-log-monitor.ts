#!/usr/bin/env ts-node

/**
 * Тестовый скрипт для запуска функции мониторинга логов
 * Запуск: npx ts-node test-events/test-log-monitor.ts
 */

import { inngest } from '../src/core/inngest/clients'
import dotenv from 'dotenv'

// Загружаем переменные окружения
dotenv.config()

async function testLogMonitor() {
  console.log('🚀 Отправка события для запуска мониторинга логов...')
  
  try {
    // Отправляем событие для ручного запуска мониторинга
    const result = await inngest.send({
      name: 'logs/monitor.trigger',
      data: {
        userId: 'admin',
        reason: 'manual_test',
        timestamp: new Date().toISOString()
      }
    })
    
    console.log('✅ Событие успешно отправлено!')
    console.log('📋 ID события:', result.ids?.[0] || result)
    console.log('\n🔍 Проверьте Inngest Dashboard: http://localhost:8288')
    console.log('📱 Проверьте Telegram группу: https://t.me/c/2250147975/1')
    
  } catch (error) {
    console.error('❌ Ошибка при отправке события:', error)
    process.exit(1)
  }
}

// Запускаем тест
testLogMonitor()
  .then(() => {
    console.log('\n✨ Тест завершен успешно!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Ошибка:', error)
    process.exit(1)
  })
