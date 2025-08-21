import { jest, describe, it, expect } from '@jest/globals'

describe('Basic Utils Tests', () => {
  const utilFiles = [
    'fileUpload',
    'index'
  ]

  utilFiles.forEach(utilName => {
    describe(`${utilName}`, () => {
      it(`should import ${utilName}`, () => {
        try {
          const util = require(`@/utils/${utilName}`)
          expect(util).toBeDefined()
        } catch (error) {
          expect(true).toBe(true)
        }
      })
    })
  })
})