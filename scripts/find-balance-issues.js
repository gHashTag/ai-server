#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🔍 Поиск проблем с updateUserBalance')
console.log('===================================')

// Функция для рекурсивного поиска файлов
function findFiles(dir, extension) {
  const files = []

  function searchDir(currentDir) {
    const items = fs.readdirSync(currentDir)

    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)

      if (
        stat.isDirectory() &&
        !item.startsWith('.') &&
        item !== 'node_modules'
      ) {
        searchDir(fullPath)
      } else if (stat.isFile() && item.endsWith(extension)) {
        files.push(fullPath)
      }
    }
  }

  searchDir(dir)
  return files
}

// Ищем все TypeScript файлы
const tsFiles = findFiles('./src', '.ts')

let issuesFound = 0

console.log(`📁 Найдено ${tsFiles.length} TypeScript файлов`)

for (const file of tsFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8')

    // Ищем паттерны updateUserBalance с подозрительными параметрами
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNum = i + 1

      // Ищем вызовы updateUserBalance
      if (
        line.includes('updateUserBalance(') ||
        line.includes('updateUserBalance ')
      ) {
        // Проверяем следующие несколько строк для контекста
        let context = ''
        for (
          let j = Math.max(0, i - 2);
          j < Math.min(lines.length, i + 10);
          j++
        ) {
          context += `${j + 1}: ${lines[j]}\n`
        }

        // Ищем подозрительные паттерны
        const suspicious = [
          'newBalance',
          'balance -',
          'balance+',
          'currentBalance -',
          'currentBalance+',
        ]

        const hasSuspiciousPattern = suspicious.some(pattern =>
          context.toLowerCase().includes(pattern.toLowerCase())
        )

        if (hasSuspiciousPattern && context.includes('MONEY_OUTCOME')) {
          console.log(`\n⚠️  ПОДОЗРИТЕЛЬНЫЙ ВЫЗОВ в ${file}:${lineNum}`)
          console.log('Контекст:')
          console.log(context)
          console.log('---')
          issuesFound++
        }
      }
    }
  } catch (error) {
    console.error(`❌ Ошибка чтения файла ${file}:`, error.message)
  }
}

console.log(`\n📊 Результат: найдено ${issuesFound} подозрительных вызовов`)

if (issuesFound === 0) {
  console.log('✅ Проблем не обнаружено!')
} else {
  console.log('⚠️  Требуется проверка найденных вызовов')
}
