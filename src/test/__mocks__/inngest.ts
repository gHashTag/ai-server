import { jest } from "@jest/globals"

export class Inngest {
  constructor(config: any) {}

  createFunction = jest.fn((config, trigger, handler) => {
    return {
      config,
      trigger,
      handler,
      run: (jest.fn() as any).mockResolvedValue({ success: true })
    }
  })

  send = (jest.fn() as any).mockResolvedValue({
    ids: ['test-event-id']
  })

  sendAndWait = (jest.fn() as any).mockResolvedValue({
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
  run: (jest.fn() as any).mockResolvedValue({ success: true }),
  sleep: (jest.fn() as any).mockResolvedValue(undefined),
  sleepUntil: (jest.fn() as any).mockResolvedValue(undefined),
  waitForEvent: (jest.fn() as any).mockResolvedValue({ data: {} }),
  sendEvent: (jest.fn() as any).mockResolvedValue({ ids: ['test-event-id'] }),
  invoke: (jest.fn() as any).mockResolvedValue({ data: {} })
}))

export default {
  Inngest,
  serve,
  NonRetriableError,
  RetryAfterError,
  GetStepTools
}