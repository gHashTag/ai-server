import { Router } from 'express'
import { Container } from 'typedi'
import { MCPController } from '@/controllers/mcp.controller'
import { validationMiddleware } from '@/middlewares/validation.middleware'
import { Routes } from '@/interfaces/routes.interface'
import { body } from 'express-validator'

/**
 * MCP Route класс для управления MCP-сервером
 */
export class MCPRoute implements Routes {
  public path = '/mcp'
  public router = Router()
  public mcpController = new MCPController()

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    /**
     * @route   GET /api/mcp/status
     * @desc    Получить статус MCP-сервера
     * @access  Public
     */
    this.router.get(`${this.path}/status`, this.mcpController.getMCPStatus)

    /**
     * @route   GET /api/mcp/tools
     * @desc    Получить список доступных MCP инструментов
     * @access  Public
     */
    this.router.get(`${this.path}/tools`, this.mcpController.getMCPTools)

    /**
     * @route   GET /api/mcp/ab-test/metrics
     * @desc    Получить метрики A/B тестирования
     * @access  Public
     */
    this.router.get(`${this.path}/ab-test/metrics`, this.mcpController.getABTestMetrics)

    /**
     * @route   POST /api/mcp/ab-test/reset
     * @desc    Сбросить метрики A/B тестирования
     * @access  Admin
     */
    this.router.post(`${this.path}/ab-test/reset`, this.mcpController.resetABTestMetrics)

    /**
     * @route   PUT /api/mcp/ab-test/config
     * @desc    Обновить конфигурацию A/B тестирования
     * @access  Admin
     */
    this.router.put(
      `${this.path}/ab-test/config`,
      [
        body('enabled')
          .optional()
          .isBoolean()
          .withMessage('enabled должен быть boolean'),
        body('planAPercentage')
          .optional()
          .isInt({ min: 0, max: 100 })
          .withMessage('planAPercentage должен быть числом от 0 до 100'),
        body('minSampleSize')
          .optional()
          .isInt({ min: 1 })
          .withMessage('minSampleSize должен быть положительным числом'),
      ],
      validationMiddleware,
      this.mcpController.updateABTestConfig
    )

    /**
     * @route   GET /api/mcp/ab-test/export
     * @desc    Экспортировать метрики A/B тестирования в JSON
     * @access  Admin
     */
    this.router.get(`${this.path}/ab-test/export`, this.mcpController.exportABTestMetrics)

    /**
     * @route   GET /api/mcp/ai-providers/health
     * @desc    Проверить здоровье AI провайдеров
     * @access  Public
     */
    this.router.get(`${this.path}/ai-providers/health`, this.mcpController.checkAIProvidersHealth)

    /**
     * @route   POST /api/mcp/ai-providers/test
     * @desc    Тестовое выполнение AI анализа
     * @access  Public
     */
    this.router.post(
      `${this.path}/ai-providers/test`,
      [
        body('query')
          .notEmpty()
          .withMessage('Параметр query обязателен')
          .isLength({ min: 1, max: 1000 })
          .withMessage('query должен быть от 1 до 1000 символов'),
        body('context')
          .optional()
          .isLength({ max: 2000 })
          .withMessage('context не должен превышать 2000 символов'),
      ],
      validationMiddleware,
      this.mcpController.testAIAnalysis
    )
  }
}