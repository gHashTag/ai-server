import request from 'supertest'
import { App } from '@/app'
import { GenerationRoute } from '@routes/generation.route'
import { generateImageToPrompt } from '@/services/generateImageToPrompt'
import { jest, describe, it, beforeAll, afterAll, expect } from '@jest/globals'
import type { Mock } from 'jest-mock'

jest.mock('@/services/generateImageToPrompt', () => ({
  generateImageToPrompt: jest.fn(),
}))

describe('POST /image-to-prompt', () => {
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
      image: 'https://dmrooqbmxdhdyblqzswu.supabase.co/storage/v1/object/public/neuro_coder/cover01.png',
      telegram_id: 123456789,
      username: 'testuser',
      is_ru: true,
    };

    // @ts-ignore
    (generateImageToPrompt as Mock).mockResolvedValue(
      'This is a generated caption.'
    )

    const response = await request(app.getServer())
      .post('/generate/image-to-prompt')
      .send(testRequestPayload)

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('message', 'Processing started')

    expect(generateImageToPrompt).toHaveBeenCalledWith(
      testRequestPayload.image,
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
      .post('/generate/image-to-prompt')
      .send(testRequestPayload)

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('message', 'Image is required')
  })
})
