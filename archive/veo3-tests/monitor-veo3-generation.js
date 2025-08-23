#!/usr/bin/env node

/**
 * 📊 Мониторинг генерации видео Veo3 в реальном времени
 * Показывает статус процесса, логи и результаты
 */

const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

const UPLOAD_PATH = './src/uploads'
const API_URL = 'http://localhost:4000'

console.log('🔍 Мониторинг генерации Veo3 видео')
console.log('='.repeat(50))

// Функция для проверки новых файлов
function checkForNewFiles() {
  try {
    if (!fs.existsSync(UPLOAD_PATH)) {
      console.log('📁 Папка uploads не найдена')
      return
    }

    const stats = fs.readdirSync(UPLOAD_PATH, { withFileTypes: true })
    const directories = stats.filter(dirent => dirent.isDirectory())

    if (directories.length === 0) {
      console.log('📁 Папка uploads пуста - генерация еще не завершена')
      return
    }

    console.log(`📁 Найдено папок пользователей: ${directories.length}`)

    directories.forEach(dir => {
      const userPath = path.join(UPLOAD_PATH, dir.name)

      // Проверяем подпапки
      const subDirs = fs
        .readdirSync(userPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

      console.log(`   👤 ${dir.name}: ${subDirs.join(', ')}`)

      // Ищем MP4 файлы
      subDirs.forEach(subDir => {
        const subPath = path.join(userPath, subDir)
        try {
          const files = fs.readdirSync(subPath)
          const mp4Files = files.filter(file => file.endsWith('.mp4'))

          if (mp4Files.length > 0) {
            console.log(`      🎬 ${subDir}: ${mp4Files.length} видео`)
            mp4Files.forEach(file => {
              const filePath = path.join(subPath, file)
              const stats = fs.statSync(filePath)
              const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
              console.log(
                `         📹 ${file} (${sizeMB} MB, ${stats.mtime.toLocaleString()})`
              )
            })
          }
        } catch (err) {
          console.log(`      ❌ Ошибка чтения ${subDir}: ${err.message}`)
        }
      })
    })
  } catch (error) {
    console.log(`❌ Ошибка проверки файлов: ${error.message}`)
  }
}

// Функция для проверки статуса API
async function checkAPIStatus() {
  return new Promise(resolve => {
    exec(`curl -s ${API_URL}/health`, (error, stdout, stderr) => {
      if (error) {
        console.log(`❌ API недоступен: ${error.message}`)
        resolve(false)
      } else {
        try {
          const response = JSON.parse(stdout)
          console.log(`✅ API работает: ${response.status}`)
          resolve(true)
        } catch (e) {
          console.log(`⚠️ API ответил, но формат неверный: ${stdout}`)
          resolve(false)
        }
      }
    })
  })
}

// Функция для проверки процессов
function checkProcesses() {
  exec(
    'ps aux | grep "node.*server" | grep -v grep',
    (error, stdout, stderr) => {
      if (error) {
        console.log(`❌ Не удается найти процессы сервера`)
        return
      }

      const lines = stdout
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
      console.log(`🔄 Активных процессов сервера: ${lines.length}`)

      lines.forEach(line => {
        const parts = line.split(/\s+/)
        const pid = parts[1]
        const cpu = parts[2]
        const mem = parts[3]
        const command = parts.slice(10).join(' ')
        console.log(`   PID ${pid}: CPU ${cpu}%, MEM ${mem}% - ${command}`)
      })
    }
  )
}

// Функция мониторинга с интервалом
async function startMonitoring() {
  console.log(`⏰ ${new Date().toLocaleTimeString()}: Проверка статуса...`)
  console.log('-'.repeat(50))

  // 1. Проверка API
  const apiOnline = await checkAPIStatus()

  // 2. Проверка процессов
  checkProcesses()

  // 3. Проверка файлов
  console.log('\n📁 Проверка результатов генерации:')
  checkForNewFiles()

  console.log('\n' + '='.repeat(50))
}

// Основная функция
async function main() {
  console.log('🚀 Запуск мониторинга...\n')

  // Первоначальная проверка
  await startMonitoring()

  // Мониторинг каждые 10 секунд
  console.log('⏱️  Мониторинг каждые 10 секунд. Ctrl+C для остановки.\n')

  setInterval(async () => {
    await startMonitoring()
  }, 10000)
}

// Обработка выхода
process.on('SIGINT', () => {
  console.log('\n👋 Мониторинг остановлен')
  process.exit(0)
})

// Запуск
if (require.main === module) {
  main()
}

module.exports = { checkForNewFiles, checkAPIStatus, checkProcesses }
