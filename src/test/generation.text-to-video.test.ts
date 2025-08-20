import request from 'supertest'
import { App } from '@/app'
import { GenerationRoute } from '@routes/generation.route'
import { generateTextToVideo } from '@/services/generateTextToVideo'
import { jest, describe, it, beforeAll, afterAll, expect } from '@jest/globals'

jest.mock('@/services/generateTextToVideo', () => ({
  generateTextToVideo: jest.fn(),
}))

describe('POST /text-to-video', () => {
  const generationRoute = new GenerationRoute()
  const app = new App([generationRoute])

  beforeAll(() => {
    app.listen()
  })

  afterAll(done => {
    app.close(done)
  })

  it('should return 200 and start processing when valid data is provided', async () => {
    const requestBody = {
      prompt: 'Create a video of a sunset',
      videoModel: 'haiper',
      telegram_id: 123456789,
      username: 'testuser',
      is_ru: true,
    }

    // @ts-ignore
    ;(generateTextToVideo as Mock).mockResolvedValue('/path/to/video.mp4')

    const response = await request(app.getServer())
      .post('/generate/text-to-video')
      .send(requestBody)

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('message', 'Processing started')

    // Проверяем, что функция была вызвана с отдельными параметрами
    expect(generateTextToVideo).toHaveBeenCalledWith(
      requestBody.prompt,
      requestBody.videoModel,
      requestBody.telegram_id,
      requestBody.username,
      requestBody.is_ru
    )
  })

  it('should return 400 when required fields are missing', async () => {
    const requestBody = {
      prompt: 'Create a video of a sunset',
    }

    const response = await request(app.getServer())
      .post('/generate/text-to-video')
      .send(requestBody)

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('message', 'Video model is required')
  })
})
