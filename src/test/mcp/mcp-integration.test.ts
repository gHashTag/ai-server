import request from 'supertest'
import App from '@/app'
import { MCPRoute } from '@/routes/mcp.route'

// Мокаем зависимости для тестирования
jest.mock('@/core/mcp-server/ab-testing')
jest.mock('@/core/mcp-server/ai-providers')
jest.mock('@/utils/logger')

describe('MCP Integration Tests', () => {
  let app: App
  let mcpRoute: MCPRoute

  beforeAll(() => {
    mcpRoute = new MCPRoute()
    app = new App([mcpRoute])
  })

  afterAll(() => {
    // Очистка после тестов
  })

  describe('GET /api/mcp/status', () => {
    it('должен возвращать статус MCP-сервера', async () => {
      const response = await request(app.getServer())
        .get('/api/mcp/status')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          server: {
            name: 'ai-server-mcp',
            version: '1.0.0',
            status: 'running',
          },
          abTesting: expect.any(Object),
          aiProviders: expect.any(Object),
          environment: expect.any(Object),
        },
      })
    })
  })

  describe('GET /api/mcp/tools', () => {
    it('должен возвращать список доступных инструментов', async () => {
      const response = await request(app.getServer())
        .get('/api/mcp/tools')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          tools: expect.arrayContaining([
            expect.objectContaining({
              name: 'generate_text_to_image',
              description: expect.any(String),
              category: 'image_generation',
              planSupport: expect.arrayContaining(['A', 'B']),
            }),
          ]),
          summary: {
            total: expect.any(Number),
            categories: expect.any(Object),
            planASupported: expect.any(Number),
            planBSupported: expect.any(Number),
          },
        },
      })

      // Проверяем, что у нас есть основные инструменты
      const tools = response.body.data.tools
      const toolNames = tools.map((tool: any) => tool.name)

      expect(toolNames).toContain('generate_text_to_image')
      expect(toolNames).toContain('generate_text_to_video')
      expect(toolNames).toContain('generate_speech')
      expect(toolNames).toContain('generate_neuro_image')
      expect(toolNames).toContain('analyze_with_ai')
    })
  })

  describe('GET /api/mcp/ab-test/metrics', () => {
    it('должен возвращать метрики A/B тестирования', async () => {
      const response = await request(app.getServer())
        .get('/api/mcp/ab-test/metrics')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          metrics: expect.any(Object),
          analysis: expect.any(Object),
          isStatisticallySignificant: expect.any(Boolean),
          exportedAt: expect.any(String),
        },
      })
    })
  })

  describe('POST /api/mcp/ab-test/reset', () => {
    it('должен сбрасывать метрики A/B тестирования', async () => {
      const response = await request(app.getServer())
        .post('/api/mcp/ab-test/reset')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Метрики A/B тестирования сброшены',
        timestamp: expect.any(String),
      })
    })
  })

  describe('PUT /api/mcp/ab-test/config', () => {
    it('должен обновлять конфигурацию A/B тестирования с валидными данными', async () => {
      const configUpdate = {
        enabled: true,
        planAPercentage: 70,
        minSampleSize: 200,
      }

      const response = await request(app.getServer())
        .put('/api/mcp/ab-test/config')
        .send(configUpdate)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Конфигурация A/B тестирования обновлена',
        updatedConfig: {
          enabled: true,
          planAPercentage: 70,
          planBPercentage: 30,
          minSampleSize: 200,
        },
        timestamp: expect.any(String),
      })
    })

    it('должен отклонять невалидные данные', async () => {
      const invalidConfig = {
        planAPercentage: 150, // Некорректное значение > 100
        minSampleSize: -5, // Отрицательное значение
      }

      const response = await request(app.getServer())
        .put('/api/mcp/ab-test/config')
        .send(invalidConfig)
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/mcp/ab-test/export', () => {
    it('должен экспортировать метрики в JSON', async () => {
      const response = await request(app.getServer())
        .get('/api/mcp/ab-test/export')
        .expect(200)

      expect(response.headers['content-type']).toContain('application/json')
      expect(response.headers['content-disposition']).toContain('attachment')
      expect(response.headers['content-disposition']).toContain('ab-test-metrics')

      // Проверяем, что ответ можно распарсить как JSON
      const exportedData = JSON.parse(response.text)
      expect(exportedData).toHaveProperty('metrics')
      expect(exportedData).toHaveProperty('config')
      expect(exportedData).toHaveProperty('analysis')
      expect(exportedData).toHaveProperty('exportTime')
    })
  })

  describe('GET /api/mcp/ai-providers/health', () => {
    it('должен проверять здоровье AI провайдеров', async () => {
      const response = await request(app.getServer())
        .get('/api/mcp/ai-providers/health')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          health: expect.any(Object),
          usage: expect.any(Object),
          checkedAt: expect.any(String),
        },
      })
    })
  })

  describe('POST /api/mcp/ai-providers/test', () => {
    it('должен выполнять тестовый AI анализ с валидными данными', async () => {
      const testData = {
        query: 'Проанализируй тенденции AI технологий',
        context: 'В контексте современного рынка',
      }

      const response = await request(app.getServer())
        .post('/api/mcp/ai-providers/test')
        .send(testData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Object),
        timestamp: expect.any(String),
      })
    })

    it('должен отклонять запросы без обязательного параметра query', async () => {
      const testData = {
        context: 'Только контекст без запроса',
      }

      const response = await request(app.getServer())
        .post('/api/mcp/ai-providers/test')
        .send(testData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('должен отклонять слишком длинные запросы', async () => {
      const testData = {
        query: 'a'.repeat(1001), // Превышает лимит в 1000 символов
      }

      const response = await request(app.getServer())
        .post('/api/mcp/ai-providers/test')
        .send(testData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('должен отклонять слишком длинный контекст', async () => {
      const testData = {
        query: 'Нормальный запрос',
        context: 'a'.repeat(2001), // Превышает лимит в 2000 символов
      }

      const response = await request(app.getServer())
        .post('/api/mcp/ai-providers/test')
        .send(testData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('должен обрабатывать несуществующие маршруты', async () => {
      const response = await request(app.getServer())
        .get('/api/mcp/nonexistent')
        .expect(404)
    })

    it('должен обрабатывать некорректные HTTP методы', async () => {
      const response = await request(app.getServer())
        .delete('/api/mcp/status')
        .expect(404)
    })
  })

  describe('Performance Tests', () => {
    it('статус сервера должен отвечать быстро', async () => {
      const startTime = Date.now()
      
      await request(app.getServer())
        .get('/api/mcp/status')
        .expect(200)
      
      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(1000) // Менее 1 секунды
    })

    it('список инструментов должен отвечать быстро', async () => {
      const startTime = Date.now()
      
      await request(app.getServer())
        .get('/api/mcp/tools')
        .expect(200)
      
      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(500) // Менее 0.5 секунды
    })
  })

  describe('Concurrent Requests', () => {
    it('должен обрабатывать несколько одновременных запросов', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app.getServer())
          .get('/api/mcp/status')
          .expect(200)
      )

      const responses = await Promise.all(requests)
      
      // Все запросы должны успешно выполниться
      responses.forEach(response => {
        expect(response.body.success).toBe(true)
      })
    })

    it('должен обрабатывать смешанные типы запросов одновременно', async () => {
      const requests = [
        request(app.getServer()).get('/api/mcp/status'),
        request(app.getServer()).get('/api/mcp/tools'),
        request(app.getServer()).get('/api/mcp/ab-test/metrics'),
        request(app.getServer()).get('/api/mcp/ai-providers/health'),
      ]

      const responses = await Promise.all(requests)
      
      // Все запросы должны вернуть 200
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
    })
  })
})