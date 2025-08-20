import { jest } from "@jest/globals"

export class Inngest {
  constructor(config: any) {}

  createFunction = jest.fn((config, trigger, handler) => {
    return {
      config,
      trigger,
      handler,
      run: jest.fn().mockResolvedValue({ success: true })
    }
  })

  send = jest.fn().mockResolvedValue({
    ids: ['test-event-id']
  })

  sendAndWait = jest.fn().mockResolvedValue({
    data: { success: true },
    event: { id: 'test-event-id' }
  })
}

export const serve = jest.fn(() => {
  return {
    GET: jest.fn(),
    POST: jest.fn(),
    PUT: jest.fn()
  }
})

export const NonRetriableError = class NonRetriableError extends Error {
  name = 'NonRetriableError'
  constructor(message: string) {
    super(message)
  }
}

export const RetryAfterError = class RetryAfterError extends Error {
  name = 'RetryAfterError'
  retryAfter: Date
  constructor(message: string, retryAfter: Date) {
    super(message)
    this.retryAfter = retryAfter
  }
}

export const GetStepTools = jest.fn(() => ({
  run: jest.fn().mockResolvedValue({ success: true }),
  sleep: jest.fn().mockResolvedValue(undefined),
  sleepUntil: jest.fn().mockResolvedValue(undefined),
  waitForEvent: jest.fn().mockResolvedValue({ data: {} }),
  sendEvent: jest.fn().mockResolvedValue({ ids: ['test-event-id'] }),
  invoke: jest.fn().mockResolvedValue({ data: {} })
}))

export default {
  Inngest,
  serve,
  NonRetriableError,
  RetryAfterError,
  GetStepTools
}