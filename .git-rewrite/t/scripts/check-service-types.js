const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function checkServiceTypes() {
  console.log('🔍 Проверяем service_type в payments_v2...')

  const { data, error } = await supabase
    .from('payments_v2')
    .select('service_type, description, type')
    .eq('type', 'MONEY_OUTCOME')
    .not('service_type', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('❌ Ошибка:', error)
    return
  }

  console.log('📊 Найденные service_type в базе:')
  const serviceTypes = new Set()
  data.forEach(row => {
    serviceTypes.add(row.service_type)
    console.log(`- ${row.service_type}: ${row.description}`)
  })

  console.log('\n🎯 Уникальные service_type:')
  Array.from(serviceTypes).forEach(type => console.log(`- ${type}`))

  console.log('\n🔍 Проверяем отсутствующие сервисы...')
  const expectedServices = [
    'NEURO_PHOTO_V2',
    'DIGITAL_AVATAR_BODY_V2',
    'TEXT_TO_VIDEO',
    'TEXT_TO_IMAGE',
    'VOICE',
    'VOICE_TO_TEXT',
  ]

  expectedServices.forEach(service => {
    if (!serviceTypes.has(service)) {
      console.log(`❌ Отсутствует: ${service}`)
    } else {
      console.log(`✅ Найден: ${service}`)
    }
  })
}

checkServiceTypes()
  .then(() => process.exit(0))
  .catch(console.error)
