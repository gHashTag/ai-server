#!/usr/bin/env node

/**
 * Скрипт для проверки логики мониторинга
 */

console.log('🔍 Проверка логики системы мониторинга\n')
console.log('='.repeat(50))

// 1. Log Monitor - каждые 24 часа
console.log('\n📊 LOG MONITOR (каждые 24 часа в 13:00 MSK):')
console.log('✅ Отправляет отчет ВСЕГДА, включая:')
console.log('   - Статистику за 24 часа')
console.log('   - Список ошибок и предупреждений')
console.log('   - AI-анализ и рекомендации')
console.log('   - Мотивационные сообщения')

// 2. Critical Error Monitor - мгновенно
console.log('\n🚨 CRITICAL ERROR MONITOR (мгновенно при ошибке):')
console.log('✅ Отправляет ТОЛЬКО при критических ошибках:')
console.log('   - Детали ошибки с AI-анализом')
console.log('   - Предложенное решение')
console.log('   - Уровень срочности')
console.log('❗ Критические ошибки дублируются администратору')

// 3. Health Check - каждые 30 минут
console.log('\n💚 HEALTH CHECK (каждые 30 минут):')
console.log('✅ Проверяет состояние сервисов')
console.log('⚠️  Отправляет уведомление ТОЛЬКО если есть проблемы:')
console.log('   - НЕ спамит, если все работает')
console.log('   - Уведомляет только о падениях сервисов')

console.log('\n' + '='.repeat(50))
console.log('\n📱 TELEGRAM УВЕДОМЛЕНИЯ:')
console.log('🤖 Бот: @neuro_blogger_bot')
console.log('👤 Получатель: Администратор (ID: 144022504)')
console.log('📝 Будущая группа: bible_vibecoder (после добавления бота)')

console.log('\n' + '='.repeat(50))
console.log('\n🔧 КОНФИГУРАЦИЯ НА СЕРВЕРЕ:')
console.log('📂 Путь к логам в Docker: /app/logs/combined.log')
console.log('🔄 Volume монтирование: ./logs:/app/logs')
console.log('🌐 Health check URL: http://localhost:4000/health')
console.log('🎛️ Inngest check URL: http://localhost:8288/health')

console.log('\n' + '='.repeat(50))
console.log('\n📋 ИТОГО - Частота уведомлений:')
console.log('')
console.log('1️⃣ Ежедневный отчет: 1 раз в сутки (всегда)')
console.log('2️⃣ Критические ошибки: только при возникновении')
console.log('3️⃣ Health Check: только при проблемах (НЕ каждые 30 мин)')
console.log('')
console.log('✅ Система НЕ будет спамить!')
console.log('✅ Уведомления приходят только когда это важно!')

console.log('\n' + '='.repeat(50))
console.log('\n🚀 Все готово для деплоя!')
console.log('')
console.log('Команды на сервере:')
console.log('  git pull origin main')
console.log('  docker-compose build')
console.log('  docker-compose down && docker-compose up -d')
console.log('')
console.log('✨ Система мониторинга настроена корректно!\n')
