import { jest } from "@jest/globals"

export class ElevenLabsClient {
  constructor(options?: any) {}

  textToSpeech = {
    convert: (jest.fn() as any).mockResolvedValue({
      pipe: (jest.fn() as any),
      on: (jest.fn() as any)((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('audio data')), 10)
        }
        if (event === 'end') {
          setTimeout(() => callback(), 20)
        }
      })
    })
  }

  voices = {
    getAll: (jest.fn() as any).mockResolvedValue({
      voices: [
        {
          voice_id: 'test-voice-id',
          name: 'Test Voice',
          category: 'premade',
          description: 'Test voice description'
        }
      ]
    }),
    get: (jest.fn() as any).mockResolvedValue({
      voice_id: 'test-voice-id',
      name: 'Test Voice',
      category: 'premade',
      description: 'Test voice description'
    }),
    add: (jest.fn() as any).mockResolvedValue({
      voice_id: 'new-voice-id'
    }),
    edit: (jest.fn() as any).mockResolvedValue(true),
    delete: (jest.fn() as any).mockResolvedValue(true),
    getSettings: (jest.fn() as any).mockResolvedValue({
      stability: 0.5,
      similarity_boost: 0.5
    }),
    editSettings: (jest.fn() as any).mockResolvedValue(true)
  }

  models = {
    getAll: (jest.fn() as any).mockResolvedValue([
      {
        model_id: 'eleven_monolingual_v1',
        name: 'Eleven English v1',
        description: 'English model v1'
      }
    ])
  }

  user = {
    get: (jest.fn() as any).mockResolvedValue({
      subscription: {
        tier: 'free',
        character_count: 10000,
        character_limit: 10000
      }
    })
  }

  history = {
    getAll: (jest.fn() as any).mockResolvedValue({
      history: []
    }),
    get: (jest.fn() as any).mockResolvedValue({
      history_item_id: 'test-history-id',
      text: 'Test text',
      voice_id: 'test-voice-id'
    }),
    delete: (jest.fn() as any).mockResolvedValue(true),
    download: (jest.fn() as any).mockResolvedValue(Buffer.from('audio data'))
  }
}

export default ElevenLabsClient