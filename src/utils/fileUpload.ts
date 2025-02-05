import multer from 'multer'
import path from 'path'
import fs from 'fs'

declare module 'express' {
  interface Request {
    files?: Express.Multer.File[]
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
      console.log('CASE: storage')
      console.log(req.body, 'req.body')
      const telegramId = req.body.telegram_id
      const type = req.body.type

      const userDir = path.join(
        __dirname,
        '../uploads',
        telegramId.toString(),
        type
      )
      console.log(`Saving file to directory: ${userDir}`)

      await ensureDirectoryExistence(userDir)

      cb(null, userDir)
    } catch (error) {
      cb(error, '')
    }
  },
  filename: function (req, file, cb) {
    console.log('CASE: filename')
    const filename = Date.now() + '-' + file.originalname
    console.log(`Saving file with name: ${filename}`)
    cb(null, filename)
  },
})

export const fileUpload = multer({ storage: storage })
