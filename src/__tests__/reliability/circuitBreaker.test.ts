import { CircuitBreaker, CircuitState } from '@/utils/circuitBreaker'
import { logger } from '@/utils/logger'

// Мокируем logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker
  const mockLogger = logger as jest.Mocked<typeof logger>

  beforeEach(() => {
    jest.clearAllMocks()
    circuitBreaker = new CircuitBreaker('test-service', {
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringPeriod: 5000,
      successThreshold: 2,
    })
  })

  describe('Initialization', () => {
    it('should initialize with CLOSED state', () => {
      const stats = circuitBreaker.getStats()
      expect(stats.state).toBe(CircuitState.CLOSED)
      expect(stats.failures).toBe(0)
      expect(stats.successes).toBe(0)
      expect(stats.totalRequests).toBe(0)
    })
  })

  describe('Success Flow', () => {
    it('should execute operation successfully in CLOSED state', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success')

      const result = await circuitBreaker.execute(mockOperation)

      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(1)

      const stats = circuitBreaker.getStats()
      expect(stats.state).toBe(CircuitState.CLOSED)
      expect(stats.successes).toBe(1)
      expect(stats.totalRequests).toBe(1)
      expect(stats.totalSuccesses).toBe(1)
    })

    it('should reset failure count on success in CLOSED state', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')

      // Первый вызов - ошибка
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail'
      )

      let stats = circuitBreaker.getStats()
      expect(stats.failures).toBe(1)

      // Второй вызов - успех
      const result = await circuitBreaker.execute(mockOperation)
      expect(result).toBe('success')

      stats = circuitBreaker.getStats()
      expect(stats.failures).toBe(0) // Сброшен при успехе
      expect(stats.successes).toBe(1)
    })
  })

  describe('Failure Flow', () => {
    it('should track failures but stay CLOSED below threshold', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('fail'))

      // Два неудачных вызова (ниже порога 3)
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail'
      )
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail'
      )

      const stats = circuitBreaker.getStats()
      expect(stats.state).toBe(CircuitState.CLOSED)
      expect(stats.failures).toBe(2)
      expect(stats.totalFailures).toBe(2)
    })

    it('should open circuit breaker after failure threshold', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('fail'))

      // Три неудачных вызова (достигаем порога)
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail'
      )
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail'
      )
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail'
      )

      const stats = circuitBreaker.getStats()
      expect(stats.state).toBe(CircuitState.OPEN)
      expect(stats.failures).toBe(3)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker OPEN: test-service'),
        expect.objectContaining({
          state: CircuitState.OPEN,
          failures: 3,
          threshold: 3,
        })
      )
    })

    it('should reject requests immediately when OPEN', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('fail'))

      // Открываем circuit breaker
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail'
      )
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail'
      )
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail'
      )

      // Следующий вызов должен быть отклонен без выполнения операции
      mockOperation.mockClear()
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'Circuit breaker is OPEN for test-service'
      )

      expect(mockOperation).not.toHaveBeenCalled()
    })
  })

  describe('Recovery Flow', () => {
    beforeEach(async () => {
      // Открываем circuit breaker
      const mockOperation = jest.fn().mockRejectedValue(new Error('fail'))
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail'
      )
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail'
      )
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail'
      )
    })

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      // Ждем истечения recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100))

      const mockOperation = jest.fn().mockResolvedValue('success')
      await circuitBreaker.execute(mockOperation)

      // После одного успеха в HALF_OPEN должен остаться в HALF_OPEN (нужно 2 успеха)
      const stats = circuitBreaker.getStats()
      expect(stats.state).toBe(CircuitState.HALF_OPEN)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'Circuit breaker testing recovery: test-service'
        ),
        expect.objectContaining({
          state: CircuitState.HALF_OPEN,
        })
      )
    })

    it('should close circuit breaker after enough successes in HALF_OPEN', async () => {
      // Ждем истечения recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100))

      const mockOperation = jest.fn().mockResolvedValue('success')

      // Первый успех - остаемся в HALF_OPEN
      await circuitBreaker.execute(mockOperation)
      expect(circuitBreaker.getStats().state).toBe(CircuitState.HALF_OPEN)

      // Второй успех - переходим в CLOSED
      await circuitBreaker.execute(mockOperation)
      const stats = circuitBreaker.getStats()
      expect(stats.state).toBe(CircuitState.CLOSED)
      expect(stats.failures).toBe(0)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker CLOSED: test-service'),
        expect.objectContaining({
          state: CircuitState.CLOSED,
          successes: 2,
        })
      )
    })

    it('should reopen circuit breaker on failure in HALF_OPEN', async () => {
      // Ждем истечения recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100))

      const mockOperation = jest.fn().mockRejectedValue(new Error('fail again'))

      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail again'
      )

      const stats = circuitBreaker.getStats()
      expect(stats.state).toBe(CircuitState.OPEN)
    })
  })

  describe('Statistics', () => {
    it('should track all statistics correctly', async () => {
      const successOp = jest.fn().mockResolvedValue('success')
      const failOp = jest.fn().mockRejectedValue(new Error('fail'))

      // Успех
      await circuitBreaker.execute(successOp)

      // Неудача
      await expect(circuitBreaker.execute(failOp)).rejects.toThrow('fail')

      // Еще один успех
      await circuitBreaker.execute(successOp)

      const stats = circuitBreaker.getStats()
      expect(stats.totalRequests).toBe(3)
      expect(stats.totalSuccesses).toBe(2)
      expect(stats.totalFailures).toBe(1)
      expect(stats.successes).toBe(2) // Текущий счетчик успехов (не сбрасывается в CLOSED)
      expect(stats.failures).toBe(0) // Сброшен после последнего успеха
    })
  })

  describe('Reset', () => {
    it('should reset circuit breaker to initial state', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('fail'))

      // Открываем circuit breaker
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail'
      )
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail'
      )
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        'fail'
      )

      expect(circuitBreaker.getStats().state).toBe(CircuitState.OPEN)

      // Сбрасываем
      circuitBreaker.reset()

      const stats = circuitBreaker.getStats()
      expect(stats.state).toBe(CircuitState.CLOSED)
      expect(stats.failures).toBe(0)
      expect(stats.successes).toBe(0)
      expect(stats.lastFailureTime).toBe(0)
      expect(stats.lastSuccessTime).toBe(0)

      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔄 Circuit breaker reset: test-service'
      )
    })
  })
})
