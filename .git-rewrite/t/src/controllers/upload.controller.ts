import { Request, Response } from 'express'
import { saveFileLinkToSupabase } from '@/core/supabase/saveFileLinkToSupabase'

export class UploadController {
  public async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      console.log('CASE: uploadController')
      const telegramId = req.body.telegram_id
      console.log(telegramId)
      const type = req.body.type
      console.log(type)
      const filePath = req.file.path
      console.log(`File path after upload: ${filePath}`)

      await saveFileLinkToSupabase(telegramId, filePath, type)

      res.status(200).json({ message: 'Файл успешно загружен', filePath })
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error)
      res.status(500).json({ message: 'Ошибка при загрузке файла' })
    }
  }
}
