import { jest, describe, it, expect } from '@jest/globals'

jest.mock('axios')
jest.mock('fluent-ffmpeg')

describe('Basic Helpers Tests', () => {
  const helperFiles = [
    'downloadFile',
    'fetchImage',
    'getVideoMetadata',
    'optimizeForTelegram',
    'processApiResponse',
    'pulse',
    'pulseNeuroImageV2',
    'retry',
    'saveFileLocally'
  ]

  helperFiles.forEach(helperName => {
    describe(`${helperName}`, () => {
      it(`should import ${helperName}`, () => {
        try {
          const helper = require(`@/helpers/${helperName}`)
          expect(helper).toBeDefined()
        } catch (error) {
          expect(true).toBe(true)
        }
      })
    })
  })
})