const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function checkMissingServices() {
  console.log('🔍 Анализ отсутствующих сервисов и их списания средств...\n')

  // Проверяем service_type в базе данных
  const { data: existingServices, error } = await supabase
    .from('payments_v2')
    .select('service_type')
    .eq('type', 'MONEY_OUTCOME')
    .not('service_type', 'is', null)

  if (error) {
    console.error('❌ Ошибка получения данных:', error)
    return
  }

  const foundServiceTypes = new Set(
    existingServices.map(row => row.service_type)
  )

  console.log('📊 Найденные service_type в базе данных:')
  Array.from(foundServiceTypes).forEach(type => console.log(`✅ ${type}`))

  console.log('\n🎯 Анализ отсутствующих сервисов:')

  // Список сервисов, которые должны списывать средства
  const expectedServices = [
    {
      name: 'NEURO_PHOTO_V2',
      description: 'Улучшенная версия NeuroPhoto',
      modeEnum: 'neuro_photo_v2',
      status: foundServiceTypes.has('NEURO_PHOTO_V2')
        ? '✅ НАЙДЕН'
        : '❌ ОТСУТСТВУЕТ',
    },
    {
      name: 'DIGITAL_AVATAR_BODY_V2',
      description: 'Улучшенная версия аватаров',
      modeEnum: 'digital_avatar_body_v2',
      status: foundServiceTypes.has('DIGITAL_AVATAR_BODY_V2')
        ? '✅ НАЙДЕН'
        : '❌ ОТСУТСТВУЕТ',
    },
    {
      name: 'TEXT_TO_VIDEO',
      description: 'Генерация видео из текста',
      modeEnum: 'text_to_video',
      status: foundServiceTypes.has('TEXT_TO_VIDEO')
        ? '✅ НАЙДЕН'
        : '❌ ОТСУТСТВУЕТ',
    },
    {
      name: 'TEXT_TO_IMAGE',
      description: 'Генерация изображений из текста',
      modeEnum: 'text_to_image',
      status: foundServiceTypes.has('TEXT_TO_IMAGE')
        ? '✅ НАЙДЕН'
        : '❌ ОТСУТСТВУЕТ',
    },
    {
      name: 'VOICE',
      description: 'Создание голосового аватара',
      modeEnum: 'voice',
      status: foundServiceTypes.has('VOICE') ? '✅ НАЙДЕН' : '❌ ОТСУТСТВУЕТ',
    },
    {
      name: 'VOICE_TO_TEXT',
      description: 'Распознавание речи',
      modeEnum: 'voice_to_text',
      status: foundServiceTypes.has('VOICE_TO_TEXT')
        ? '✅ НАЙДЕН'
        : '❌ ОТСУТСТВУЕТ',
    },
    {
      name: 'TEXT_TO_SPEECH',
      description: 'Синтез речи',
      modeEnum: 'text_to_speech',
      status: foundServiceTypes.has('TEXT_TO_SPEECH')
        ? '✅ НАЙДЕН'
        : '❌ ОТСУТСТВУЕТ',
    },
  ]

  expectedServices.forEach(service => {
    console.log(`${service.status} ${service.name} (${service.description})`)
  })

  console.log('\n🚨 ПРОБЛЕМЫ:')
  const missingServices = expectedServices.filter(s =>
    s.status.includes('ОТСУТСТВУЕТ')
  )

  if (missingServices.length === 0) {
    console.log('✅ Все сервисы найдены в базе данных!')
  } else {
    console.log(`❌ Отсутствует ${missingServices.length} сервисов:`)
    missingServices.forEach(service => {
      console.log(`   - ${service.name}: ${service.description}`)
    })

    console.log('\n💡 ВОЗМОЖНЫЕ ПРИЧИНЫ:')
    console.log(
      '1. Функция не списывает средства (отсутствует updateUserBalance)'
    )
    console.log(
      '2. Функция использует sendBalanceMessage вместо updateUserBalance'
    )
    console.log('3. Сервис не реализован или не используется')
    console.log('4. Неправильный service_type в updateUserBalance')
  }

  console.log('\n🔍 РЕКОМЕНДАЦИИ ДЛЯ ИСПРАВЛЕНИЯ:')
  console.log('1. Найти функции для отсутствующих сервисов')
  console.log('2. Добавить updateUserBalance с правильным service_type')
  console.log('3. Убрать sendBalanceMessage (только уведомление, не списание)')
  console.log('4. Добавить проверку баланса перед операцией')
}

checkMissingServices()
  .then(() => process.exit(0))
  .catch(console.error)
