import request from 'supertest'
import { App } from '@/app'
import { GenerationRoute } from '@routes/generation.route'
import { generateImageToVideo } from '@/services/generateImageToVideo'
import { jest, describe, it, beforeAll, afterAll, expect } from '@jest/globals'
import type { Mock } from 'jest-mock'

jest.mock('@/services/generateImageToVideo', () => ({
  generateImageToVideo: jest.fn(),
}))

describe('POST /image-to-video', () => {
  const generationRoute = new GenerationRoute()
  const app = new App([generationRoute])

  beforeAll(() => {
    app.listen()
  })

  afterAll(done => {
    app.close(done)
  })

  it('should return 200 and start processing when valid data is provided', async () => {
    const testRequestPayload = {
      imageUrl: 'https://www.investopedia.com/thmb/YJBXk5A8fN78NMdeCk0IJKGNRuw=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/GettyImages-453930217-42848c04ff58410d952e1a5b65a00929.jpg',
      prompt: 'Create a video of a dance', 
      videoModel: 'haiper',
      paymentAmount: 1,
      telegram_id: 123456789,
      username: 'testuser',
      is_ru: true,
    };

    (generateImageToVideo as any).mockResolvedValue(
      '/path/to/generated/video.mp4'
    )

    const response = await request(app.getServer())
      .post('/generate/image-to-video')
      .send(testRequestPayload)

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('message', 'Processing started')

    expect(generateImageToVideo).toHaveBeenCalledWith(
      testRequestPayload.imageUrl,
      testRequestPayload.prompt,
      testRequestPayload.videoModel,
      testRequestPayload.paymentAmount,
      testRequestPayload.telegram_id,
      testRequestPayload.username,
      testRequestPayload.is_ru
    )
  })

  it('should return 400 when required fields are missing', async () => {
    const testRequestPayload = {
      // Оставьте поля пустыми, чтобы вызвать ошибку
    }

    const response = await request(app.getServer())
      .post('/generate/image-to-video')
      .send(testRequestPayload)

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('message', 'Image is required')
  })
})
