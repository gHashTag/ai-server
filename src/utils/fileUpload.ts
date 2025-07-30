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
  destination: async function (req, file, cb) {
    try {
      console.log('CASE: storage destination function entered')
      console.log('req.body:', req.body) // Выводим все тело запроса

      const telegramId = req.body.telegram_id
      // Устанавливаем 'model' как тип по умолчанию, если он не предоставлен
      const type = req.body.type || 'model'

      if (!telegramId) {
        console.error('Error: telegram_id is missing in req.body')
        return cb(new Error('telegram_id is missing in request body'), '')
      }

      // 🔧 RESTORED: Возвращаем РАБОЧУЮ логику - сохраняем сразу в uploads
      const userDir = path.join(
        __dirname, // Это будет dist/utils
        '..', // Подняться до dist/
        '..', // Подняться до корня проекта (где src/, uploads/)
        'uploads', // Перейти в uploads/
        String(telegramId), // Используем String() для большей безопасности
        String(type) // Используем String() для большей безопасности
      )
      console.log(`Target directory for upload: ${userDir}`)

      await ensureDirectoryExistence(userDir)

      cb(null, userDir)
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
