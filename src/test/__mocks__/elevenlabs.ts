import { jest } from "@jest/globals"

export class ElevenLabsClient {
  constructor(options?: any) {}

  textToSpeech = {
    convert: jest.fn().mockResolvedValue({
      pipe: jest.fn(),
      on: jest.fn((event, callback) => {
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
    getAll: jest.fn().mockResolvedValue({
      voices: [
        {
          voice_id: 'test-voice-id',
          name: 'Test Voice',
          category: 'premade',
          description: 'Test voice description'
        }
      ]
    }),
    get: jest.fn().mockResolvedValue({
      voice_id: 'test-voice-id',
      name: 'Test Voice',
      category: 'premade',
      description: 'Test voice description'
    }),
    add: jest.fn().mockResolvedValue({
      voice_id: 'new-voice-id'
    }),
    edit: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
    getSettings: jest.fn().mockResolvedValue({
      stability: 0.5,
      similarity_boost: 0.5
    }),
    editSettings: jest.fn().mockResolvedValue(true)
  }

  models = {
    getAll: jest.fn().mockResolvedValue([
      {
        model_id: 'eleven_monolingual_v1',
        name: 'Eleven English v1',
        description: 'English model v1'
      }
    ])
  }

  user = {
    get: jest.fn().mockResolvedValue({
      subscription: {
        tier: 'free',
        character_count: 10000,
        character_limit: 10000
      }
    })
  }

  history = {
    getAll: jest.fn().mockResolvedValue({
      history: []
    }),
    get: jest.fn().mockResolvedValue({
      history_item_id: 'test-history-id',
      text: 'Test text',
      voice_id: 'test-voice-id'
    }),
    delete: jest.fn().mockResolvedValue(true),
    download: jest.fn().mockResolvedValue(Buffer.from('audio data'))
  }
}

export default ElevenLabsClient