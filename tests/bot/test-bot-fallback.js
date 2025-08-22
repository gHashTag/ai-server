/**
 * Тест работы с ботами когда токены - заглушки
 */

const { getBotByName } = require('../../dist/core/bot')

async function testBotFallback() {
  console.log('🧪 Тестируем getBotByName с placeholder токенами...')
  
  const result = getBotByName('neuro_blogger_bot')
  
  console.log('Результат:', result)
  
  if (result.error) {
    console.log('✅ Ошибка корректно обработана:', result.error)
  } else if (result.bot) {
    console.log('❌ Неожиданно получен бот, хотя токен placeholder')
  } else {
    console.log('❓ Неопределенный результат')
  }
}

// Запускаем тест
testBotFallback().catch(console.error)