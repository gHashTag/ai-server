const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function generateMissingServicesReport() {
  console.log('🔍 ИТОГОВЫЙ ОТЧЕТ: Анализ отсутствующих сервисов\n')

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

  console.log('📊 НАЙДЕННЫЕ service_type в базе данных:')
  Array.from(foundServiceTypes).forEach(type => console.log(`✅ ${type}`))

  console.log('\n🎯 АНАЛИЗ ОТСУТСТВУЮЩИХ СЕРВИСОВ:\n')

  const serviceAnalysis = [
    {
      name: 'NEURO_PHOTO_V2',
      description: 'Улучшенная версия NeuroPhoto',
      status: foundServiceTypes.has('NEURO_PHOTO_V2')
        ? '✅ НАЙДЕН'
        : '❌ ОТСУТСТВУЕТ',
      function: 'generateNeuroImageV2',
      file: 'src/services/generateNeuroImageV2.ts',
      fix_status: '✅ ИСПРАВЛЕНО - добавлен service_type в updateUserBalance',
    },
    {
      name: 'DIGITAL_AVATAR_BODY_V2',
      description: 'Улучшенная версия аватаров (V2)',
      status: foundServiceTypes.has('DIGITAL_AVATAR_BODY_V2')
        ? '✅ НАЙДЕН'
        : '❌ ОТСУТСТВУЕТ',
      function: 'modelTrainingV2 (Inngest)',
      file: 'src/inngest-functions/modelTrainingV2.ts',
      fix_status:
        '✅ УЖЕ ИСПРАВЛЕНО - service_type: ModeEnum.DigitalAvatarBodyV2',
    },
    {
      name: 'TEXT_TO_VIDEO',
      description: 'Генерация видео из текста',
      status: foundServiceTypes.has('TEXT_TO_VIDEO')
        ? '✅ НАЙДЕН'
        : '❌ ОТСУТСТВУЕТ',
      function: 'generateTextToVideo',
      file: 'src/services/generateTextToVideo.ts',
      fix_status: '✅ ИСПРАВЛЕНО - добавлен service_type в updateUserBalance',
    },
    {
      name: 'IMAGE_TO_VIDEO',
      description: 'Генерация видео из изображения',
      status: foundServiceTypes.has('IMAGE_TO_VIDEO')
        ? '✅ НАЙДЕН'
        : '❌ ОТСУТСТВУЕТ',
      function: 'generateImageToVideo',
      file: 'src/services/generateImageToVideo.ts',
      fix_status: '✅ ИСПРАВЛЕНО - добавлен service_type в updateUserBalance',
    },
    {
      name: 'TEXT_TO_IMAGE',
      description: 'Генерация изображений из текста',
      status: foundServiceTypes.has('TEXT_TO_IMAGE')
        ? '✅ НАЙДЕН'
        : '❌ ОТСУТСТВУЕТ',
      function: 'generateTextToImage',
      file: 'src/services/generateTextToImage.ts',
      fix_status:
        '❓ ТРЕБУЕТ ПРОВЕРКИ - функция существует, но нужно проверить updateUserBalance',
    },
    {
      name: 'TEXT_TO_SPEECH',
      description: 'Синтез речи',
      status: foundServiceTypes.has('TEXT_TO_SPEECH')
        ? '✅ НАЙДЕН'
        : '❌ ОТСУТСТВУЕТ',
      function: 'generateSpeech',
      file: 'src/services/generateSpeech.ts',
      fix_status:
        '✅ ИСПРАВЛЕНО - заменен sendBalanceMessage на updateUserBalance',
    },
    {
      name: 'VOICE',
      description: 'Создание голосового аватара',
      status: foundServiceTypes.has('VOICE') ? '✅ НАЙДЕН' : '❌ ОТСУТСТВУЕТ',
      function: 'createVoiceAvatar',
      file: 'src/services/createVoiceAvatar.ts',
      fix_status: '✅ УЖЕ ИСПРАВЛЕНО - service_type: ModeEnum.Voice',
    },
    {
      name: 'VOICE_TO_TEXT',
      description: 'Распознавание речи',
      status: foundServiceTypes.has('VOICE_TO_TEXT')
        ? '✅ НАЙДЕН'
        : '❌ ОТСУТСТВУЕТ',
      function: 'НЕ НАЙДЕНА',
      file: 'НЕ СУЩЕСТВУЕТ',
      fix_status: '❌ НЕ РЕАЛИЗОВАНО - функция распознавания речи отсутствует',
    },
  ]

  serviceAnalysis.forEach(service => {
    console.log(`${service.status} ${service.name}`)
    console.log(`   📝 ${service.description}`)
    console.log(`   📁 Функция: ${service.function}`)
    console.log(`   📄 Файл: ${service.file}`)
    console.log(`   🔧 Статус исправления: ${service.fix_status}`)
    console.log('')
  })

  console.log('🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ:\n')

  const missingServices = serviceAnalysis.filter(s =>
    s.status.includes('ОТСУТСТВУЕТ')
  )
  const unfixedServices = serviceAnalysis.filter(
    s => s.fix_status.includes('❌') || s.fix_status.includes('❓')
  )

  if (missingServices.length === 0) {
    console.log('✅ Все сервисы найдены в базе данных!')
  } else {
    console.log(`❌ Отсутствует ${missingServices.length} сервисов в БД:`)
    missingServices.forEach(service => {
      console.log(`   - ${service.name}: ${service.description}`)
    })
  }

  console.log('\n🔧 СТАТУС ИСПРАВЛЕНИЙ:\n')

  const fixedCount = serviceAnalysis.filter(s =>
    s.fix_status.includes('✅')
  ).length
  const totalCount = serviceAnalysis.length

  console.log(`✅ Исправлено: ${fixedCount}/${totalCount} сервисов`)
  console.log(`❌ Требует внимания: ${unfixedServices.length} сервисов`)

  if (unfixedServices.length > 0) {
    console.log('\n📋 ПЛАН ДЕЙСТВИЙ:\n')
    unfixedServices.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name}:`)
      if (service.function === 'НЕ НАЙДЕНА') {
        console.log('   🔨 Создать функцию распознавания речи (OpenAI Whisper)')
        console.log('   📝 Добавить роут в generation.route.ts')
        console.log('   🎯 Добавить контроллер в generation.controller.ts')
      } else {
        console.log(`   🔍 Проверить функцию ${service.function}`)
        console.log('   ➕ Добавить updateUserBalance с service_type')
        console.log('   ❌ Убрать sendBalanceMessage (если есть)')
      }
      console.log('')
    })
  }

  console.log('💡 РЕКОМЕНДАЦИИ:\n')
  console.log('1. ✅ Большинство сервисов уже исправлено!')
  console.log(
    '2. 🔍 Проверить generateTextToImage на наличие updateUserBalance'
  )
  console.log('3. 🎤 Реализовать функцию распознавания речи (voice_to_text)')
  console.log('4. 🧪 Протестировать все исправленные сервисы')
  console.log('5. 📊 Запустить повторную проверку после тестирования')

  console.log('\n🎯 СЛЕДУЮЩИЕ ШАГИ:\n')
  console.log('1. Проверить типы TypeScript: bun exec tsc --noEmit')
  console.log('2. Протестировать исправленные сервисы')
  console.log('3. Создать функцию voice_to_text (если нужна)')
  console.log('4. Запустить повторную проверку БД')
}

generateMissingServicesReport()
  .then(() => process.exit(0))
  .catch(console.error)
