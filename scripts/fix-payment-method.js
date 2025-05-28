#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Файлы для исправления (исключаем тесты, документацию и скрипты)
const filesToFix = [
  'src/inngest-functions/neuroImageGeneration.ts',
  'src/inngest-functions/modelTrainingV2.ts',
  'src/inngest-functions/generateModelTraining.ts',
  'src/services/generateImageToPrompt.ts',
  'src/services/createVoiceAvatar.ts',
  'src/services/generateTextToImage.ts',
  'src/services/generateTextToVideo.ts',
  'src/services/generateNeuroImageV2.ts',
  'src/services/generateNeuroImage.ts',
  'src/services/generateSpeech.ts',
  'src/services/generateImageToVideo.ts',
  'src/db/migration-layer.ts',
  'src/db/schema/payments.ts',
]

console.log('🔧 Исправление payment_method: "Internal" → "System"...\n')

let totalFixed = 0

filesToFix.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath)

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Файл не найден: ${filePath}`)
    return
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8')
    const originalContent = content

    // Исправляем payment_method: 'Internal' → 'System'
    content = content.replace(
      /payment_method:\s*['"]Internal['"]/g,
      "payment_method: 'System'"
    )

    // Исправляем default('Internal') в схемах
    content = content.replace(
      /\.default\(['"]Internal['"]\)/g,
      ".default('System')"
    )

    // Исправляем || 'Internal'
    content = content.replace(/\|\|\s*['"]Internal['"]/g, "|| 'System'")

    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8')
      const matches = (originalContent.match(/Internal/g) || []).length
      totalFixed += matches
      console.log(`✅ ${filePath} - исправлено ${matches} вхождений`)
    } else {
      console.log(`ℹ️  ${filePath} - изменений не требуется`)
    }
  } catch (error) {
    console.error(`❌ Ошибка при обработке ${filePath}:`, error.message)
  }
})

console.log(`\n🎉 Готово! Всего исправлено: ${totalFixed} вхождений`)
console.log('\n📝 Рекомендуется проверить типы: bun exec tsc --noEmit')
console.log('🧪 И запустить тесты: npm test')
