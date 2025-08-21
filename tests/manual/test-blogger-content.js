/**
 * 🎬 Тест новой блогерской системы генерации контента
 */

console.log('🎬 Тестируем Blogger Content Generator!')

// Пример данных для разных блогерских стилей
const bloggerExamples = {
  TIKTOK: {
    prompt: 'Молодая девушка делает утреннюю рутину красоты',
    scenes: 8,
    variants: 2,
    aspect_ratio: '9:16',
    expected_scenes: [
      'Hook moment - яркое начало, которое зацепит зрителя в первые 3 секунды',
      'Story setup - быстрая подача основной идеи или проблемы',
      'Conflict moment - момент напряжения или неожиданный поворот',
      'Resolution - быстрое решение или кульминация',
      'Call to action - призыв к действию, подписке или лайку',
      'Bonus content - дополнительная ценность или секрет',
      'Viral moment - момент, который захочется пересматривать',
      'Community hook - что-то для комментариев и обсуждений',
    ],
    tips: [
      'Первые 3 секунды - самые важные',
      'Используй популярные звуки и музыку',
      'Добавь субтитры для лучшего восприятия',
      'Создай момент для паузы и комментирования',
    ],
  },

  YOUTUBE: {
    prompt: 'Обзор лучших техник изучения языков',
    scenes: 8,
    variants: 3,
    aspect_ratio: '16:9',
    expected_scenes: [
      'Strong intro - мощное вступление с обещанием ценности',
      'Problem identification - четкое определение проблемы зрителя',
      'Context building - создание контекста и background истории',
      'Main content delivery - основная ценная информация',
      'Example demonstration - практические примеры или кейсы',
      'Expert insights - экспертные мнения или глубокие знания',
      'Action steps - конкретные шаги для зрителя',
      'Conclusion & CTA - итоги и призыв к действию',
    ],
    tips: [
      'Создай интригу в первые 15 секунд',
      'Используй визуальные примеры и графики',
      'Структурируй контент с четкими разделами',
      'Добавь моменты для взаимодействия с аудиторией',
    ],
  },

  INSTAGRAM: {
    prompt: 'День из жизни успешного фрилансера',
    scenes: 8,
    variants: 2,
    aspect_ratio: '1:1',
    expected_scenes: [
      'Aesthetic opener - красивое визуальное начало',
      'Lifestyle moment - момент из повседневной жизни',
      'Behind the scenes - закулисье или процесс создания',
      'Personal story - личная история или опыт',
      'Value sharing - полезная информация или совет',
      'Community moment - взаимодействие с подписчиками',
      'Inspiration shot - вдохновляющий момент или цитата',
      'Next content teaser - анонс следующего контента',
    ],
    tips: [
      'Поддерживай единый эстетический стиль',
      'Используй естественное освещение',
      'Создавай контент для Stories и постов',
      'Добавляй интерактивные элементы',
    ],
  },

  BUSINESS: {
    prompt: 'Как увеличить продажи в интернете на 300%',
    scenes: 8,
    variants: 2,
    aspect_ratio: '16:9',
    expected_scenes: [
      'Industry insight - экспертный взгляд на индустрию',
      'Case study intro - представление кейса или примера',
      'Problem analysis - анализ бизнес-проблемы',
      'Solution presentation - представление решения',
      'Results showcase - демонстрация результатов',
      'Lessons learned - выводы и уроки',
      'Professional advice - профессиональные советы',
      'Network building - призыв к профессиональному общению',
    ],
    tips: [
      'Фокусируйся на ценности для бизнеса',
      'Используй данные и факты',
      'Поддерживай профессиональный тон',
      'Создавай контент для принятия решений',
    ],
  },
}

console.log('\n🎨 Доступные блогерские стили:')
Object.keys(bloggerExamples).forEach(style => {
  const example = bloggerExamples[style]
  console.log(`\n📱 ${style}:`)
  console.log(`   Промпт: "${example.prompt}"`)
  console.log(`   Формат: ${example.aspect_ratio}`)
  console.log(`   Сцен: ${example.scenes}`)
  console.log(`   Советы: ${example.tips[0]}`)
})

// Пример того, как вызывать новую функцию
const examplePayload = {
  name: 'content/generate-scenario-clips',
  data: {
    project_id: 12345,
    requester_telegram_id: 'blogger_001',
    photo_url: 'https://example.com/base-photo.jpg',
    prompt: 'Утренняя рутина современного блогера',
    scene_count: 8,
    variants_per_scene: 2,
    aspect_ratio: '9:16',
    flux_model: 'black-forest-labs/flux-kontext-max',
    metadata: {
      blogger_style: 'TIKTOK', // 🔥 Вот тут новая магия!
      timestamp: new Date().toISOString(),
      version: 'blogger_v1.0',
    },
  },
}

console.log('\n🚀 Пример вызова новой системы:')
console.log('```javascript')
console.log('// Для TikTok контента')
console.log(JSON.stringify(examplePayload, null, 2))
console.log('```')

console.log('\n🎯 Что получится:')
console.log('✅ 8 сценарных изображений оптимизированных для TikTok')
console.log('✅ Вертикальный формат 9:16')
console.log('✅ Динамичные, энергичные композиции')
console.log('✅ HTML отчёт с советами для TikTok-блогеров')
console.log('✅ Excel таблица с планом контента')
console.log('✅ ZIP архив готовый к использованию')

console.log('\n🎬 Типы сцен для TikTok:')
bloggerExamples.TIKTOK.expected_scenes.forEach((scene, i) => {
  console.log(`   ${i + 1}. ${scene}`)
})

console.log('\n💡 Советы для TikTok блогеров:')
bloggerExamples.TIKTOK.tips.forEach((tip, i) => {
  console.log(`   💎 ${tip}`)
})

console.log('\n🎉 Система готова к использованию!')
console.log('🚀 Запускайте через Inngest или прямо из кода!')
