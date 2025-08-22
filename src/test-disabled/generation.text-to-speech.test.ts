import request from 'supertest'
import { App } from '@/app'
import { GenerationRoute } from '@routes/generation.route'
import { generateSpeech } from '@/services/generateSpeech'
import { BOT_TOKENS } from '@/config'

jest.mock('@/services/generateSpeech', () => ({
  generateSpeech: jest.fn(),
}))

describe('POST /text-to-speech', () => {
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
      text: 'Hello, world!',
      voice_id: 'gPxfjvn7IXljXm1Tlb8o',
      telegram_id: 123456789,
      username: 'testuser',
      is_ru: true,
    }

    ;(generateSpeech as jest.Mock).mockResolvedValue({
      audioUrl: `https://api.telegram.org/file/bot${BOT_TOKENS[0]}/voice/file_74.oga`,
    })

    const response = await request(app.getServer())
      .post('/generate/text-to-speech')
      .send(requestBody)

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('message', 'Processing started')

    expect(generateSpeech).toHaveBeenCalledWith({
      text: requestBody.text,
      voice_id: requestBody.voice_id,
      telegram_id: requestBody.telegram_id,
      is_ru: requestBody.is_ru,
    })
  })

  it('should return 400 when required fields are missing', async () => {
    const requestBody = {
      // Оставьте поля пустыми, чтобы вызвать ошибку
    }

    const response = await request(app.getServer())
      .post('/generate/text-to-speech')
      .send(requestBody)

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('message', 'Text is required')
  })
})
