import request from 'supertest'
import { App } from '@/app'
import { GenerationRoute } from '@routes/generation.route'
import { generateNeuroImage } from '@/services/generateNeuroImage'

jest.mock('@/services/generateNeuroImage', () => ({
  generateNeuroImage: jest.fn(),
}))

describe('POST /neuro-photo', () => {
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
      prompt: 'Create a futuristic cityscape',
      model_url:
        'ghashtag/neuro_coder_flux-dev-lora:5ff9ea5918427540563f09940bf95d6efc16b8ce9600e82bb17c2b188384e355',
      num_images: 1,
      telegram_id: 123456789,
      username: 'testuser',
      is_ru: true,
    }

    ;(generateNeuroImage as jest.Mock).mockResolvedValue({
      prompt_id: 'prompt123',
      image: '/path/to/generated/image.jpg',
    })

    const response = await request(app.getServer())
      .post('/generate/neuro-photo')
      .send(requestBody)

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('message', 'Processing started')

    expect(generateNeuroImage).toHaveBeenCalledWith(
      requestBody.prompt,
      requestBody.model_url,
      requestBody.num_images,
      requestBody.telegram_id,
      requestBody.username,
      requestBody.is_ru
    )
  })

  it('should return 400 when required fields are missing', async () => {
    const requestBody = {
      // Оставьте поля пустыми, чтобы вызвать ошибку
    }

    const response = await request(app.getServer())
      .post('/generate/neuro-photo')
      .send(requestBody)

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('message', 'prompt is required')
  })
})
