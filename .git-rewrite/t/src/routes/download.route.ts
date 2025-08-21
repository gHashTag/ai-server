import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { Routes } from '@/interfaces/routes.interface'

export class DownloadRoute implements Routes {
  public path = '/download'
  public router: Router

  constructor() {
    this.router = Router()
    this.initializeRoutes()
  }

  private initializeRoutes() {
    /**
     * 📦 Скачивание архивов Instagram анализа
     * GET /download/instagram-archive/:filename
     */
    this.router.get(`${this.path}/instagram-archive/:filename`, (req, res) => {
      try {
        const { filename } = req.params

        // Проверяем что filename содержит только допустимые символы
        if (!/^instagram_competitors_[a-zA-Z0-9_]+\.zip$/.test(filename)) {
          return res.status(400).json({
            error: 'Invalid filename format',
          })
        }

        const filePath = path.join(process.cwd(), 'output', filename)

        // Проверяем существование файла
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({
            error: 'Archive not found',
            filename,
          })
        }

        // Получаем информацию о файле
        const stats = fs.statSync(filePath)

        // Устанавливаем заголовки для скачивания
        res.setHeader('Content-Type', 'application/zip')
        res.setHeader('Content-Length', stats.size)
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}"`
        )
        res.setHeader('Cache-Control', 'no-cache')

        // Отправляем файл как stream
        const fileStream = fs.createReadStream(filePath)

        fileStream.on('error', error => {
          console.error('❌ Error reading archive file:', error)
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error reading file' })
          }
        })

        fileStream.pipe(res)

        console.log('✅ Archive download started:', {
          filename,
          size: stats.size,
          path: filePath,
        })
      } catch (error) {
        console.error('❌ Archive download error:', error)
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    })
  }
}
