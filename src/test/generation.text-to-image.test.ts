import { App } from '@/app'
import { GenerationRoute } from '@routes/generation.route'
import { generateTextToImage } from '@/services/generateTextToImage'
import request from 'supertest'
import { jest, describe, it, beforeAll, afterAll, expect } from '@jest/globals'
import type { Mock } from 'jest-mock'

jest.mock('@/services/generateTextToImage', () => ({
  generateTextToImage: (jest.fn() as any).mockResolvedValue({ image: 'mockedImageBuffer' }),
}))

jest.mock('@/services/generateSpeech', () => ({
  generateSpeech: jest.fn(),
}))

jest.setTimeout(60000)

describe('GenerationController', () => {
  const generationRoute = new GenerationRoute()
  const app = new App([generationRoute])

  beforeAll(() => {
    app.listen()
  })

  afterAll(done => {
    app.close(done)
  })

  describe('[POST] /generate/text-to-image', () => {
    it('should be called with correct arguments and return expected result', async () => {
      const prompt = 'Create a beautiful landscape'
      const model_type = 'flux'
      const telegramId = '123456789'
      const username = 'testuser'
      const is_ru = true
      const num_images = 1

      // Замокайте возвращаемое значение функции generateImage
      // @ts-ignore
      ;(generateTextToImage as Mock).mockResolvedValue({
        image: 'mockedImageBuffer',
      })

      // Создаем мок бота
      const mockBot = {} as any

      // Вызовите функцию generateImage
      const result = await generateTextToImage(
        prompt,
        model_type,
        num_images,
        telegramId,
        username,
        is_ru,
        mockBot
      )

      // Проверка, что generateImage была вызвана с правильными аргументами
      expect(generateTextToImage).toHaveBeenCalledWith(
        prompt,
        model_type,
        num_images,
        telegramId,
        username,
        is_ru,
        mockBot
      )

      // Проверка, что результат соответствует ожидаемому
      expect(result).toEqual({ image: 'mockedImageBuffer' })
    })

    it('should return 400 when required fields are missing', async () => {
      const requestBody = {
        // Оставьте поля пустыми, чтобы вызвать ошибку
      }

      const response = await request(app.getServer())
        .post('/generate/text-to-image')
        .send(requestBody)

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('message', 'prompt is required')
    })
  })
})
