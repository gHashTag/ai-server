import { Request, Response } from 'express'
import { logger } from '@utils/logger'

interface IngestData {
  url: string
  title: string
  price: string
  description: string
  imageUrl: string
}

export const ingest = async (req: Request, res: Response) => {
  try {
    const { url, title, price, description, imageUrl }: IngestData = req.body

    // Логируем входящие данные
    logger.info('🔄 Ingest function called with data:', {
      url,
      title,
      price,
      description,
      imageUrl
    })

    // Здесь можно добавить логику обработки данных:
    // - Валидация данных
    // - Сохранение в базу данных
    // - Обработка изображения
    // - Парсинг цены
    // и т.д.

    // Пример простой обработки
    const processedData = {
      id: Date.now().toString(),
      url,
      title: title.trim(),
      price: price.replace(/[^\d.,]/g, ''), // Оставляем только цифры, запятые и точки
      description: description.trim(),
      imageUrl,
      processedAt: new Date().toISOString(),
      status: 'processed'
    }

    logger.info('✅ Data processed successfully:', processedData)

    return res.status(200).json({
      success: true,
      message: 'Data ingested successfully',
      data: processedData
    })

  } catch (error) {
    logger.error('❌ Error in ingest function:', error)
    
    return res.status(500).json({
      success: false,
      message: 'Failed to ingest data',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}