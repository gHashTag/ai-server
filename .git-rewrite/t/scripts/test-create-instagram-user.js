#!/usr/bin/env node

/**
 * Тестовый скрипт для функции создания Instagram пользователя
 * Демонстрирует использование новой Inngest функции createInstagramUser
 */

import { triggerCreateInstagramUser } from '../src/inngest-functions/instagramScraper-v2.js'

console.log('🚀 Testing Instagram User Creation Function...')
console.log('='=50)

async function testCreateUser() {
  try {
    // Пример данных для создания пользователя
    const userData = {
      pk: '1234567890', // Instagram PK (уникальный ID)
      username: 'test_user_manual', // Username
      full_name: 'Test User Manual', // Полное имя
      is_private: false, // Публичный аккаунт
      is_verified: false, // Не верифицирован
      profile_pic_url: 'https://example.com/avatar.jpg', // URL аватара
      profile_chaining_secondary_label: 'Тестовый пользователь', // Дополнительное описание
      social_context: 'Создан вручную через Inngest функцию', // Контекст
      project_id: 1, // ID проекта (должен существовать в таблице projects)
      requester_telegram_id: '144022504', // ID инициатора (опционально)
      metadata: {
        source: 'manual_creation',
        created_by: 'test_script',
        timestamp: new Date().toISOString()
      }
    }

    console.log('📝 Данные пользователя для создания:')
    console.log(JSON.stringify(userData, null, 2))
    console.log()

    console.log('⏳ Отправка события в Inngest...')
    const result = await triggerCreateInstagramUser(userData)
    
    console.log('✅ Событие отправлено успешно!')
    console.log('📋 Event ID:', result.eventId)
    console.log()
    console.log('🔍 Проверьте Inngest Dashboard для мониторинга выполнения:')
    console.log('   - http://localhost:8288 (если dev сервер запущен)')
    console.log('   - Или Inngest Cloud Dashboard')
    console.log()
    console.log('📊 Ожидаемые результаты:')
    console.log('   - Валидация данных через Zod')
    console.log('   - Проверка существования project_id')
    console.log('   - Создание записи в таблице instagram_similar_users')
    console.log('   - Или уведомление о том, что пользователь уже существует')
    console.log()

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message)
    console.error('🔍 Детали ошибки:', error)
    process.exit(1)
  }
}

// Пример с множественными пользователями
async function testCreateMultipleUsers() {
  const users = [
    {
      pk: '1111111111',
      username: 'user_one',
      full_name: 'User One',
      project_id: 1,
      requester_telegram_id: '144022504'
    },
    {
      pk: '2222222222', 
      username: 'user_two',
      full_name: 'User Two',
      is_verified: true,
      project_id: 1,
      requester_telegram_id: '144022504'
    },
    {
      pk: '3333333333',
      username: 'user_three', 
      full_name: 'User Three',
      is_private: true,
      project_id: 1,
      requester_telegram_id: '144022504'
    }
  ]

  console.log('🔄 Тестирование создания нескольких пользователей...')
  console.log('='=50)

  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    console.log(`📝 Создание пользователя ${i + 1}/${users.length}: ${user.username}`)
    
    try {
      const result = await triggerCreateInstagramUser(user)
      console.log(`✅ Event ID: ${result.eventId}`)
      
      // Добавляем небольшую задержку между запросами
      if (i < users.length - 1) {
        console.log('⏳ Ожидание 2 секунды...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.error(`❌ Ошибка при создании ${user.username}:`, error.message)
    }
    
    console.log()
  }
  
  console.log('🎉 Тестирование множественного создания завершено!')
}

// Запуск тестов
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--multiple')) {
    await testCreateMultipleUsers()
  } else {
    await testCreateUser()
  }
  
  console.log('🏁 Тестирование завершено!')
}

main().catch(console.error) 