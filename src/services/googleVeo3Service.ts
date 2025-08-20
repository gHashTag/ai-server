import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleAIFileManager } from '@google/generative-ai/server'
import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { mkdir } from 'fs/promises'
import { errorMessage, errorMessageAdmin } from '@/helpers'

// Конфигурация для Veo 3 Fast
export const VEO3_CONFIG = {
  model: 'gemini-2.0-flash-exp', // Модель поддерживающая Veo 3
  videoGenerationConfig: {
    model: 'veo-3-fast',
    duration: 5, // секунды
    aspectRatio: '16:9', // или '9:16', '1:1'
    resolution: '720p', // 'SD', 'HD', '720p', '1080p'
    fps: 24,
  },
  pricing: {
    perSecond: 0.4, // $0.40 за секунду видео
    starsMultiplier: 2.5, // коэффициент для конвертации в звезды
  },
}

interface Veo3GenerationOptions {
  prompt: string
  duration?: number // в секундах, от 1 до 10
  aspectRatio?: '16:9' | '9:16' | '1:1'
  resolution?: 'SD' | 'HD' | '720p' | '1080p'
  fps?: 24 | 30 | 60
  imageUrl?: string // для image-to-video
  style?: string // стиль видео
  cameraMovement?: string // движение камеры
}

export class GoogleVeo3Service {
  private genAI: GoogleGenerativeAI
  private fileManager: GoogleAIFileManager

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Google AI API key is required')
    }
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.fileManager = new GoogleAIFileManager(apiKey)
  }

  /**
   * Генерация видео через Veo 3 Fast
   */
  async generateVideo(options: Veo3GenerationOptions): Promise<{
    videoUrl: string
    videoPath: string
    cost: number
    duration: number
  }> {
    try {
      const {
        prompt,
        duration = 5,
        aspectRatio = '16:9',
        resolution = '720p',
        fps = 24,
        imageUrl,
        style = '',
        cameraMovement = '',
      } = options

      // Формируем расширенный промпт
      const enhancedPrompt = this.enhancePrompt(prompt, style, cameraMovement)

      // Конфигурация для генерации
      const generationConfig = {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      }

      // Получаем модель
      const model = this.genAI.getGenerativeModel({
        model: VEO3_CONFIG.model,
        generationConfig,
      })

      // Подготавливаем части для запроса
      const parts: any[] = []

      // Если есть изображение для image-to-video
      if (imageUrl) {
        const imageFile = await this.uploadImageFromUrl(imageUrl)
        parts.push({
          fileData: {
            mimeType: imageFile.mimeType,
            fileUri: imageFile.uri,
          },
        })
      }

      // Добавляем текстовый промпт с инструкциями для Veo 3
      parts.push({
        text: JSON.stringify({
          task: 'video_generation',
          model: 'veo-3-fast',
          parameters: {
            prompt: enhancedPrompt,
            duration_seconds: duration,
            aspect_ratio: aspectRatio,
            resolution: resolution,
            fps: fps,
            use_audio: true, // Veo 3 поддерживает аудио
            style_preset: style || 'cinematic',
            camera_movement: cameraMovement || 'smooth',
          },
        }),
      })

      // Генерируем видео
      console.log('Starting Veo 3 Fast generation...')
      const result = await model.generateContent(parts)
      const response = await result.response

      // Парсим ответ
      const responseText = response.text()
      const videoData = JSON.parse(responseText)

      if (!videoData.videoUrl) {
        throw new Error('No video URL in response')
      }

      // Расчет стоимости
      const cost = duration * VEO3_CONFIG.pricing.perSecond

      return {
        videoUrl: videoData.videoUrl,
        videoPath: '', // будет заполнен после скачивания
        cost,
        duration,
      }
    } catch (error) {
      console.error('Veo 3 generation error:', error)
      throw new Error(`Failed to generate video with Veo 3: ${error.message}`)
    }
  }

  /**
   * Загрузка изображения из URL в Google Files API
   */
  private async uploadImageFromUrl(imageUrl: string): Promise<any> {
    try {
      // Скачиваем изображение
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      })

      // Создаем временный файл
      const tempPath = path.join('/tmp', `temp_${Date.now()}.jpg`)
      await fs.writeFile(tempPath, response.data)

      // Загружаем в Google
      const uploadResult = await this.fileManager.uploadFile(tempPath, {
        mimeType: 'image/jpeg',
        displayName: 'Input image for video generation',
      })

      // Удаляем временный файл
      await fs.unlink(tempPath)

      return uploadResult.file
    } catch (error) {
      console.error('Error uploading image:', error)
      throw new Error(`Failed to upload image: ${error.message}`)
    }
  }

  /**
   * Улучшение промпта для лучшего качества видео
   */
  private enhancePrompt(
    prompt: string,
    style?: string,
    cameraMovement?: string
  ): string {
    let enhanced = prompt

    // Добавляем стиль если указан
    if (style) {
      enhanced += `, ${style} style`
    }

    // Добавляем движение камеры если указано
    if (cameraMovement) {
      enhanced += `, ${cameraMovement} camera movement`
    }

    // Добавляем общие улучшения для качества
    enhanced +=
      ', high quality, detailed, smooth motion, professional cinematography'

    return enhanced
  }

  /**
   * Скачивание видео и сохранение локально
   */
  async downloadVideo(videoUrl: string, telegram_id: string): Promise<string> {
    try {
      const videoLocalPath = path.join(
        __dirname,
        '../uploads',
        telegram_id,
        'veo3-videos',
        `${new Date().toISOString()}.mp4`
      )

      await mkdir(path.dirname(videoLocalPath), { recursive: true })

      // Скачиваем видео
      const response = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
      })

      await fs.writeFile(videoLocalPath, response.data)

      return videoLocalPath
    } catch (error) {
      console.error('Error downloading video:', error)
      throw new Error(`Failed to download video: ${error.message}`)
    }
  }

  /**
   * Расчет стоимости в звездах
   */
  calculateStarsCost(duration: number): number {
    const dollarCost = duration * VEO3_CONFIG.pricing.perSecond
    return Math.ceil(dollarCost * VEO3_CONFIG.pricing.starsMultiplier)
  }
}
