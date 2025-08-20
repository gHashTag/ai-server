import { getUSDtoRUBRate } from '@/services/exchangeRate.service'
import { logger } from '@/utils/logger'

/**
 * 🔖 Централизованная конфигурация ценообразования
 * Единый источник истины для всех ценовых констант
 * @updated 2025-08-19
 */

/**
 * Основные валютные константы
 */
export const CURRENCY_CONFIG = {
  // Стоимость одной звезды в долларах
  STAR_COST_USD: 0.016,
  
  // Коэффициент наценки (50% = 1.5x)
  MARKUP_RATE: 1.5,
  
  // Основная валюта системы
  DEFAULT_CURRENCY: 'RUB' as const,
  
  // Курс рубля к доллару (обновляется динамически)
  RUB_TO_USD_RATE: 85, // Базовый курс
} as const

// Динамический курс рубля к доллару (1 USD = X RUB)
// Обновляется через Bybit API каждые 5 минут
let currentRate = 85 // Значение по умолчанию

// Функция для получения текущего курса
export async function getCurrentRate(): Promise<number> {
  try {
    currentRate = await getUSDtoRUBRate()
    return currentRate
  } catch (error) {
    logger.error({
      message: '❌ Ошибка получения курса USDT/RUB',
      error: error instanceof Error ? error.message : 'Unknown error',
      using_rate: currentRate
    })
    return currentRate
  }
}

/**
 * Вычисляемые значения на основе базовых констант и текущего курса
 */
export function getDerivedValues() {
  return {
    // Стоимость одной звезды в рублях
    STAR_COST_RUB: CURRENCY_CONFIG.STAR_COST_USD * currentRate,
    
    // Стоимость одной звезды в рублях с наценкой
    STAR_COST_RUB_WITH_MARKUP: CURRENCY_CONFIG.STAR_COST_USD * currentRate * CURRENCY_CONFIG.MARKUP_RATE,
  }
}

/**
 * Конфигурация для тренировки моделей V1
 */
export const TRAINING_RATES_V1 = {
  costPerStepInStars: 0.22,
  costPerStarInDollars: CURRENCY_CONFIG.STAR_COST_USD,
  rublesToDollarsRate: currentRate,
} as const

/**
 * Конфигурация для тренировки моделей V2
 */
export const TRAINING_RATES_V2 = {
  costPerStepInStars: 2.1,
  costPerStarInDollars: CURRENCY_CONFIG.STAR_COST_USD,
  rublesToDollarsRate: currentRate,
} as const

/**
 * Системная конфигурация (для обратной совместимости)
 */
export const SYSTEM_CONFIG = {
  starCost: CURRENCY_CONFIG.STAR_COST_USD,
  interestRate: CURRENCY_CONFIG.MARKUP_RATE,
  currency: CURRENCY_CONFIG.DEFAULT_CURRENCY,
  rublesToDollarsRate: currentRate,
}

/**
 * Вспомогательные функции для расчетов
 */
export const PricingCalculator = {
  /**
   * Конвертация долларов в звезды с учетом наценки
   */
  usdToStars(usd: number): number {
    return Math.floor((usd / CURRENCY_CONFIG.STAR_COST_USD) * CURRENCY_CONFIG.MARKUP_RATE)
  },
  
  /**
   * Конвертация звезд в рубли
   */
  starsToRub(stars: number): number {
    return parseFloat((stars * CURRENCY_CONFIG.STAR_COST_USD * currentRate).toFixed(2))
  },
  
  /**
   * Конвертация долларов в рубли
   */
  usdToRub(usd: number): number {
    return parseFloat((usd * currentRate).toFixed(2))
  },
  
  /**
   * Конвертация рублей в звезды (для покупки)
   */
  rubToStars(rub: number): number {
    return Math.floor(rub / getDerivedValues().STAR_COST_RUB)
  },
}

// Экспорт для обратной совместимости
export const starCost = CURRENCY_CONFIG.STAR_COST_USD
export const interestRate = CURRENCY_CONFIG.MARKUP_RATE
export const rublesToDollarsRate = currentRate

// Инициализация курса при запуске
getCurrentRate().catch(error => {
  logger.error({
    message: '❌ Ошибка инициализации курса USDT/RUB',
    error: error instanceof Error ? error.message : 'Unknown error'
  })
})

// Обновление курса каждые 5 минут
setInterval(() => {
  getCurrentRate().catch(error => {
    logger.error({
      message: '❌ Ошибка обновления курса USDT/RUB',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  })
}, 300000) // 5 минут