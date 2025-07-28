const { config } = require('dotenv')

// Загружаем env файлы в том же порядке что и в приложении
config({ path: '.env' })
config({ path: '.env.development.local' })

const { Telegraf } = require('telegraf')

async function testBotTokens() {
  console.log('🧪 === ДИАГНОСТИКА ТОКЕНОВ БОТОВ ===\n')

  const BOT_NAMES = {
    ai_koshey_bot: process.env.BOT_TOKEN_TEST_1,
    clip_maker_neuro_bot: process.env.BOT_TOKEN_TEST_2,
  }

  console.log('📋 Доступные токены:')
  Object.entries(BOT_NAMES).forEach(([name, token]) => {
    console.log(`  ${name}: ${token ? '✅ ЕСТЬ' : '❌ ОТСУТСТВУЕТ'}`)
    if (token) {
      console.log(`    Длина: ${token.length} символов`)
      console.log(`    Начало: ${token.substring(0, 10)}...`)
    }
  })

  console.log('\n🤖 Тестирование подключения к Telegram API:')

  for (const [botName, token] of Object.entries(BOT_NAMES)) {
    if (token) {
      console.log(`\n🔍 Проверяем ${botName}...`)
      try {
        const bot = new Telegraf(token)

        // Проверяем getMe API call
        const botInfo = await bot.telegram.getMe()
        console.log(`✅ ${botName}: Подключение успешно`)
        console.log(`   Username: @${botInfo.username}`)
        console.log(`   Name: ${botInfo.first_name}`)
        console.log(`   ID: ${botInfo.id}`)

        // Проверяем, можем ли мы отправить сообщение в группу
        try {
          // Пробуем отправить тестовое сообщение в админскую группу
          await bot.telegram.sendMessage(
            '@neuro_blogger_pulse',
            `🧪 [ТЕСТ] Бот ${
              botInfo.username
            } работает корректно - ${new Date().toISOString()}`
          )
          console.log(`✅ ${botName}: Отправка сообщений работает`)
        } catch (sendError) {
          console.log(
            `⚠️ ${botName}: Отправка сообщений недоступна:`,
            sendError.message
          )
        }
      } catch (error) {
        console.error(`❌ ${botName}: ОШИБКА -`, error.message)

        if (error.message.includes('401')) {
          console.error(`   💡 Токен недействителен или отозван`)
        } else if (error.message.includes('Too Many Requests')) {
          console.error(`   💡 Слишком много запросов, попробуйте позже`)
        }
      }
    } else {
      console.log(`❌ ${botName}: Токен отсутствует`)
    }
  }

  console.log('\n📊 Результат диагностики завершен')
}

// Экспорт функции для тестирования из морфинга
async function testSpecificBot(botName, token) {
  if (!token) {
    return { success: false, error: 'Token missing' }
  }

  try {
    const bot = new Telegraf(token)
    const botInfo = await bot.telegram.getMe()
    return {
      success: true,
      botInfo: {
        username: botInfo.username,
        name: botInfo.first_name,
        id: botInfo.id,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      isUnauthorized: error.message.includes('401'),
    }
  }
}

if (require.main === module) {
  testBotTokens().catch(console.error)
}

module.exports = { testBotTokens, testSpecificBot }
