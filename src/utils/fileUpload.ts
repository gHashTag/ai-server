import multer from 'multer'
import path from 'path'
import fs from 'fs'

declare module 'express' {
  interface Request {
    files?: Express.Multer.File[]
    // Если у вас есть AuthMiddleware, который добавляет req.user,
    // то здесь можно было бы также расширить Request интерфейс:
    // user?: { telegram_id: string | number; /* другие поля пользователя */ }
  }
}

// Функция для создания директории, если она не существует
async function ensureDirectoryExistence(filePath: string) {
  console.log(`Ensuring directory exists: ${filePath}`) // Лог для проверки пути
  try {
    await fs.promises.mkdir(filePath, { recursive: true })
    console.log(`Directory created: ${filePath}`) // Лог для подтверждения создания
  } catch (error) {
    console.error(`Error creating directory: ${error}`)
    throw error
  }
}

// Настройка хранилища для multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      console.log('CASE: storage destination function entered')
      console.log('req.body:', req.body) // Выводим все тело запроса

      // 🔧 FIX: Используем временную папку, так как req.body может быть не готов
      // telegram_id будет обработан в контроллере после парсинга всех полей
      const tempDir = path.join(
        __dirname, // Это будет dist/utils
        '..', // Подняться до dist/
        '..', // Подняться до корня проекта (где src/, uploads/)
        'tmp' // Временная папка
      )

      // Создаем временную папку если её нет (синхронно)
      try {
        const fsSync = require('fs')
        fsSync.mkdirSync(tempDir, { recursive: true })
        console.log('📁 Using temp directory:', tempDir)
        cb(null, tempDir)
      } catch (mkdirError) {
        console.error('Error creating temp directory:', mkdirError)
        cb(mkdirError, '')
      }
    } catch (error) {
      console.error('Error in multer destination function:', error)
      cb(error, '')
    }
  },
  filename: function (req, file, cb) {
    console.log('CASE: filename function entered')
    console.log('req.body for filename:', req.body) // Проверим, доступен ли req.body и здесь
    const originalFilename = file.originalname || 'unknown_file'
    const safeOriginalFilename = originalFilename.replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    )
    const filename = Date.now() + '-' + safeOriginalFilename
    console.log(`Generated filename: ${filename}`)
    cb(null, filename)
  },
})

export const fileUpload = multer({ storage: storage })
