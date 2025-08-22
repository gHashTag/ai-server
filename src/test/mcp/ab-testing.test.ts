import { ABTestManager, measureExecution } from '@/core/mcp-server/ab-testing'

// Мокаем inngest и logger
jest.mock('@/core/inngest-client/clients')
jest.mock('@/utils/logger')

describe('A/B Testing', () => {
  let abTestManager: ABTestManager

  beforeEach(() => {
    abTestManager = new ABTestManager({
      enabled: true,
      planAPercentage: 50,
      planBPercentage: 50,
      minSampleSize: 10,
      maxExecutionTime: 5000,
      collectMetrics: true,
      logResults: false, // Отключаем логи для тестов
    })
  })

  describe('ABTestManager', () => {
    describe('decidePlan', () => {
      it('должен возвращать План A если A/B тестирование отключено', () => {
        const disabledManager = new ABTestManager({ enabled: false })
        expect(disabledManager.decidePlan()).toBe('A')
      })

      it('должен возвращать детерминированный результат для одного и того же userId', () => {
        const userId = 'test_user_123'
        const plan1 = abTestManager.decidePlan(userId)
        const plan2 = abTestManager.decidePlan(userId)
        
        expect(plan1).toBe(plan2)
        expect(['A', 'B']).toContain(plan1)
      })

      it('должен распределять пользователей между планами A и B', () => {
        const plans: ('A' | 'B')[] = []
        
        // Тестируем с большим количеством пользователей
        for (let i = 0; i < 100; i++) {
          const plan = abTestManager.decidePlan(`user_${i}`)
          plans.push(plan)
        }

        const planACount = plans.filter(p => p === 'A').length
        const planBCount = plans.filter(p => p === 'B').length

        // Проверяем, что есть распределение между планами (не 100% в одну сторону)
        expect(planACount).toBeGreaterThan(10)
        expect(planBCount).toBeGreaterThan(10)
        expect(planACount + planBCount).toBe(100)
      })

      it('должен учитывать процентное соотношение планов', () => {
        const manager70_30 = new ABTestManager({
          enabled: true,
          planAPercentage: 70,
          planBPercentage: 30,
        })

        const plans: ('A' | 'B')[] = []
        
        for (let i = 0; i < 100; i++) {
          const plan = manager70_30.decidePlan(`user_${i}`)
          plans.push(plan)
        }

        const planACount = plans.filter(p => p === 'A').length
        
        // С 70/30 распределением ожидаем больше Plan A (с некоторой погрешностью)
        expect(planACount).toBeGreaterThan(60)
        expect(planACount).toBeLessThan(80)
      })
    })

    describe('recordResult', () => {
      it('должен записывать успешный результат выполнения Plan A', () => {
        const result = {
          plan: 'A' as const,
          success: true,
          executionTime: 100,
          responseSize: 500,
        }

        abTestManager.recordResult(result)
        const metrics = abTestManager.getMetrics()

        expect(metrics.planA.totalExecutions).toBe(1)
        expect(metrics.planA.successfulExecutions).toBe(1)
        expect(metrics.planA.averageExecutionTime).toBe(100)
        expect(metrics.planA.averageResponseSize).toBe(500)
        expect(metrics.planA.errorRate).toBe(0)
      })

      it('должен записывать неуспешный результат выполнения Plan B', () => {
        const result = {
          plan: 'B' as const,
          success: false,
          executionTime: 200,
          errorMessage: 'Test error',
        }

        abTestManager.recordResult(result)
        const metrics = abTestManager.getMetrics()

        expect(metrics.planB.totalExecutions).toBe(1)
        expect(metrics.planB.successfulExecutions).toBe(0)
        expect(metrics.planB.averageExecutionTime).toBe(200)
        expect(metrics.planB.errorRate).toBe(100)
        expect(metrics.planB.errors).toContain('Test error')
      })

      it('должен правильно вычислять скользящие средние', () => {
        // Первый результат
        abTestManager.recordResult({
          plan: 'A',
          success: true,
          executionTime: 100,
          responseSize: 400,
        })

        // Второй результат
        abTestManager.recordResult({
          plan: 'A',
          success: true,
          executionTime: 200,
          responseSize: 600,
        })

        const metrics = abTestManager.getMetrics()

        expect(metrics.planA.totalExecutions).toBe(2)
        expect(metrics.planA.averageExecutionTime).toBe(150) // (100 + 200) / 2
        expect(metrics.planA.averageResponseSize).toBe(500) // (400 + 600) / 2
      })

      it('должен правильно вычислять процент ошибок', () => {
        // 3 успешных, 1 неуспешный
        abTestManager.recordResult({ plan: 'A', success: true, executionTime: 100 })
        abTestManager.recordResult({ plan: 'A', success: true, executionTime: 100 })
        abTestManager.recordResult({ plan: 'A', success: true, executionTime: 100 })
        abTestManager.recordResult({ plan: 'A', success: false, executionTime: 100 })

        const metrics = abTestManager.getMetrics()

        expect(metrics.planA.totalExecutions).toBe(4)
        expect(metrics.planA.successfulExecutions).toBe(3)
        expect(metrics.planA.errorRate).toBe(25) // 1/4 * 100
      })
    })

    describe('analyzeResults', () => {
      it('должен возвращать "inconclusive" при недостатке данных', () => {
        // Добавляем мало данных (меньше minSampleSize)
        for (let i = 0; i < 5; i++) {
          abTestManager.recordResult({ plan: 'A', success: true, executionTime: 100 })
        }

        const analysis = abTestManager.analyzeResults()

        expect(analysis.winner).toBe('inconclusive')
        expect(analysis.confidence).toBe(0)
        expect(analysis.recommendation).toContain('Недостаточно данных')
      })

      it('должен определять Plan A как победителя при лучших метриках', () => {
        // Plan A - высокий success rate, быстрое выполнение
        for (let i = 0; i < 15; i++) {
          abTestManager.recordResult({ plan: 'A', success: true, executionTime: 100 })
        }

        // Plan B - низкий success rate, медленное выполнение
        for (let i = 0; i < 15; i++) {
          const success = i < 10 // 10/15 успешных
          abTestManager.recordResult({ plan: 'B', success, executionTime: 200 })
        }

        const analysis = abTestManager.analyzeResults()

        expect(analysis.winner).toBe('A')
        expect(analysis.confidence).toBeGreaterThan(0)
        expect(analysis.recommendation).toContain('План A')
        expect(analysis.details.planA.successRate).toBeGreaterThan(analysis.details.planB.successRate)
      })

      it('должен определять Plan B как победителя при лучших метриках', () => {
        // Plan A - низкий success rate
        for (let i = 0; i < 15; i++) {
          const success = i < 8 // 8/15 успешных
          abTestManager.recordResult({ plan: 'A', success, executionTime: 200 })
        }

        // Plan B - высокий success rate, быстрое выполнение
        for (let i = 0; i < 15; i++) {
          abTestManager.recordResult({ plan: 'B', success: true, executionTime: 100 })
        }

        const analysis = abTestManager.analyzeResults()

        expect(analysis.winner).toBe('B')
        expect(analysis.confidence).toBeGreaterThan(0)
        expect(analysis.recommendation).toContain('План B')
        expect(analysis.details.planB.successRate).toBeGreaterThan(analysis.details.planA.successRate)
      })
    })

    describe('updateConfig', () => {
      it('должен обновлять конфигурацию', () => {
        const newConfig = {
          enabled: false,
          planAPercentage: 80,
          minSampleSize: 200,
        }

        abTestManager.updateConfig(newConfig)

        // Проверяем, что конфигурация обновилась
        const plan = abTestManager.decidePlan('test_user')
        expect(plan).toBe('A') // Должно быть A так как enabled = false
      })
    })

    describe('resetMetrics', () => {
      it('должен сбрасывать все метрики', () => {
        // Добавляем данные
        abTestManager.recordResult({ plan: 'A', success: true, executionTime: 100 })
        abTestManager.recordResult({ plan: 'B', success: false, executionTime: 200 })

        let metrics = abTestManager.getMetrics()
        expect(metrics.planA.totalExecutions).toBe(1)
        expect(metrics.planB.totalExecutions).toBe(1)

        // Сбрасываем
        abTestManager.resetMetrics()

        metrics = abTestManager.getMetrics()
        expect(metrics.planA.totalExecutions).toBe(0)
        expect(metrics.planB.totalExecutions).toBe(0)
        expect(metrics.overallStats.totalTests).toBe(0)
      })
    })

    describe('isStatisticallySignificant', () => {
      it('должен возвращать false при недостатке данных', () => {
        expect(abTestManager.isStatisticallySignificant()).toBe(false)
      })

      it('должен возвращать true при достаточных данных и явном победителе', () => {
        // Добавляем достаточно данных с явным победителем
        for (let i = 0; i < 20; i++) {
          abTestManager.recordResult({ plan: 'A', success: true, executionTime: 50 })
        }

        for (let i = 0; i < 20; i++) {
          const success = i < 10 // 50% успешности
          abTestManager.recordResult({ plan: 'B', success, executionTime: 200 })
        }

        expect(abTestManager.isStatisticallySignificant()).toBe(true)
      })
    })

    describe('exportMetrics', () => {
      it('должен экспортировать метрики в JSON формате', () => {
        abTestManager.recordResult({ plan: 'A', success: true, executionTime: 100 })
        
        const exported = abTestManager.exportMetrics()
        const data = JSON.parse(exported)

        expect(data).toHaveProperty('metrics')
        expect(data).toHaveProperty('config')
        expect(data).toHaveProperty('analysis')
        expect(data).toHaveProperty('exportTime')
        expect(data.metrics.planA.totalExecutions).toBe(1)
      })
    })
  })

  describe('measureExecution', () => {
    it('должен измерять время выполнения успешной операции', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success result')
      const recordResultSpy = jest.spyOn(abTestManager, 'recordResult')

      const result = await measureExecution('A', mockOperation, 'test_user')

      expect(result).toBe('success result')
      expect(mockOperation).toHaveBeenCalled()
      expect(recordResultSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: 'A',
          success: true,
          executionTime: expect.any(Number),
          responseSize: expect.any(Number),
          metadata: { userId: 'test_user' },
        })
      )
    })

    it('должен измерять время выполнения неуспешной операции', async () => {
      const error = new Error('Test error')
      const mockOperation = jest.fn().mockRejectedValue(error)
      const recordResultSpy = jest.spyOn(abTestManager, 'recordResult')

      await expect(measureExecution('B', mockOperation, 'test_user')).rejects.toThrow('Test error')

      expect(recordResultSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: 'B',
          success: false,
          executionTime: expect.any(Number),
          errorMessage: 'Test error',
          metadata: { userId: 'test_user' },
        })
      )
    })

    it('должен передавать метаданные в результат', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result')
      const recordResultSpy = jest.spyOn(abTestManager, 'recordResult')
      const metadata = { toolName: 'test_tool', custom: 'data' }

      await measureExecution('A', mockOperation, 'test_user', metadata)

      expect(recordResultSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { userId: 'test_user', toolName: 'test_tool', custom: 'data' },
        })
      )
    })
  })

  describe('Hash Function', () => {
    it('должен создавать консистентные хеши для одинаковых строк', () => {
      const manager = new ABTestManager({ enabled: true, planAPercentage: 50 })
      
      const plan1 = manager.decidePlan('consistent_user_id')
      const plan2 = manager.decidePlan('consistent_user_id')
      
      expect(plan1).toBe(plan2)
    })

    it('должен создавать разные результаты для разных пользователей', () => {
      const results = new Set()
      
      for (let i = 0; i < 20; i++) {
        const plan = abTestManager.decidePlan(`user_${i}`)
        results.add(plan)
      }

      // Должно быть как минимум 2 разных результата (A и B)
      expect(results.size).toBeGreaterThanOrEqual(2)
    })
  })
})