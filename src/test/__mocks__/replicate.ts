import { jest } from '@jest/globals'

export class Replicate {
  constructor(options?: any) {}

  run = jest.fn().mockResolvedValue(['https://test-image-url.jpg'])

  predictions = {
    create: jest.fn().mockResolvedValue({
      id: 'test-prediction-id',
      status: 'starting',
      urls: {
        get: 'https://api.replicate.com/v1/predictions/test-prediction-id'
      }
    }),
    get: jest.fn().mockResolvedValue({
      id: 'test-prediction-id', 
      status: 'succeeded',
      output: ['https://test-image-url.jpg']
    }),
    cancel: jest.fn().mockResolvedValue({
      id: 'test-prediction-id',
      status: 'canceled'
    }),
    list: jest.fn().mockResolvedValue({
      results: []
    })
  }

  models = {
    get: jest.fn().mockResolvedValue({
      name: 'test-model',
      owner: 'test-owner',
      description: 'Test model'
    }),
    list: jest.fn().mockResolvedValue({
      results: []
    })
  }

  collections = {
    get: jest.fn().mockResolvedValue({
      name: 'test-collection',
      description: 'Test collection'
    })
  }

  trainings = {
    create: jest.fn().mockResolvedValue({
      id: 'test-training-id',
      status: 'starting'
    }),
    get: jest.fn().mockResolvedValue({
      id: 'test-training-id',
      status: 'succeeded'
    }),
    cancel: jest.fn().mockResolvedValue({
      id: 'test-training-id',
      status: 'canceled'
    }),
    list: jest.fn().mockResolvedValue({
      results: []
    })
  }
}

export default Replicate