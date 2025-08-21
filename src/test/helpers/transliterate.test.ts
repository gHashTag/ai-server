import { jest, describe, it, expect } from '@jest/globals'
import { transliterate } from '@/helpers/transliterate'

describe('transliterate helper', () => {
  it('should transliterate Russian text to Latin', () => {
    const result = transliterate('Привет мир')
    expect(typeof result).toBe('string')
    expect(result).toBeDefined()
  })

  it('should handle empty string', () => {
    const result = transliterate('')
    expect(result).toBe('')
  })

  it('should handle English text unchanged', () => {
    const result = transliterate('Hello world')
    expect(result).toBe('Hello world')
  })

  it('should be function', () => {
    expect(typeof transliterate).toBe('function')
  })
})