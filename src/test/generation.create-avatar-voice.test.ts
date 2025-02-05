import request from 'supertest'
import { App } from '@/app'
import { GenerationRoute } from '@routes/generation.route'
import { createVoiceAvatar } from '@/services/createVoiceAvatar'
import { BOT_TOKEN } from '@/config'

jest.mock('../services/createVoiceAvatar', () => ({
  createVoiceAvatar: jest.fn().mockResolvedValue({
    voiceId: 'voiceId',
  }),
}))

describe('POST /create-avatar-voice', () => {
  const generationRoute = new GenerationRoute()
  const app = new App([generationRoute])

  beforeAll(() => {
    app.listen()
  })

  afterAll(done => {
    app.close(done)
  })

  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/voice/file_74.oga`

  test('should return 200 and start voice creation when valid data is provided', async () => {
    const requestBody = {
      fileUrl: fileUrl,
      telegram_id: 123456789,
      username: 'testuser',
      is_ru: true,
    }

    const response = await request(app.getServer())
      .post('/generate/create-avatar-voice')
      .send(requestBody)

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('message', 'Voice creation started')

    expect(createVoiceAvatar).toHaveBeenCalledWith(
      requestBody.fileUrl,
      requestBody.telegram_id,
      requestBody.username,
      requestBody.is_ru
    )
  })

  it('should return 400 when required fields are missing', async () => {
    const requestBody = {
      // Отсутствуют обязательные поля
    }

    const response = await request(app.getServer())
      .post('/generate/create-avatar-voice')
      .send(requestBody)

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('message', 'fileUrl is required')
  })
})
