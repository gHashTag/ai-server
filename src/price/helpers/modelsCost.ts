import { ModeEnum } from '@/interfaces/modes'
import { Scenes } from 'telegraf'
import { MyContext } from '@/interfaces'

import { logger } from '@/utils/logger'

// Экспортируем примитивные значения
export const starCost = 0.016
export const interestRate = 1.5

// Теперь создаем объект конфигурации на основе этих значений
export const SYSTEM_CONFIG = {
  starCost: starCost,
  interestRate: interestRate,
  currency: 'RUB',
}

interface ConversionRates {
  costPerStarInDollars: number
  costPerStepInStars: number
  rublesToDollarsRate: number
}

// Определяем конверсии
export const conversionRates: ConversionRates = {
  costPerStepInStars: 0.25,
  costPerStarInDollars: 0.016,
  rublesToDollarsRate: 100,
}

export const conversionRatesV2: ConversionRates = {
  costPerStepInStars: 2.1,
  costPerStarInDollars: 0.016,
  rublesToDollarsRate: 100,
}

export function calculateCostInStars(
  steps: number,
  rates: { costPerStepInStars: number }
): number {
  const totalCostInStars = steps * rates.costPerStepInStars
  return parseFloat(totalCostInStars.toFixed(2))
}

export function calculateCostInDollars(
  steps: number,
  rates: { costPerStepInStars: number; costPerStarInDollars: number }
): number {
  const totalCostInDollars =
    steps * rates.costPerStepInStars * rates.costPerStarInDollars
  return parseFloat(totalCostInDollars.toFixed(2))
}

export function calculateCostInRubles(
  steps: number,
  rates: {
    costPerStepInStars: number
    costPerStarInDollars: number
    rublesToDollarsRate: number
  }
): number {
  const totalCostInRubles =
    steps *
    rates.costPerStepInStars *
    rates.costPerStarInDollars *
    rates.rublesToDollarsRate
  return parseFloat(totalCostInRubles.toFixed(2))
}

export const stepOptions = {
  v1: [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000],
  v2: [100, 200, 300, 400, 500, 600, 700, 800, 1000],
}

export const costDetails = {
  v1: stepOptions.v1.map(steps => calculateCost(steps, 'v1')),
  v2: stepOptions.v2.map(steps => calculateCost(steps, 'v2')),
}

export interface CostDetails {
  steps: number
  stars: number
  rubles: number
  dollars: number
}

export function calculateCost(
  steps: number,
  version: 'v1' | 'v2' = 'v1'
): CostDetails {
  const rates = version === 'v1' ? conversionRates : conversionRatesV2
  const baseCost = steps * rates.costPerStepInStars

  return {
    steps,
    stars: baseCost,
    dollars: baseCost * rates.costPerStarInDollars,
    rubles: baseCost * rates.costPerStarInDollars * rates.rublesToDollarsRate,
  }
}

export const BASE_COSTS: Partial<Record<ModeEnum, CostValue>> = {
  [ModeEnum.DigitalAvatarBody]: (steps: number) => {
    const cost = calculateCost(steps, 'v1')
    return cost.stars
  },
  [ModeEnum.DigitalAvatarBodyV2]: (steps: number) => {
    const cost = calculateCost(steps, 'v2')
    return cost.stars
  },
  [ModeEnum.NeuroPhoto]: calculateCostInStars(0.08, conversionRates),
  [ModeEnum.NeuroPhotoV2]: calculateCostInStars(0.14, conversionRatesV2),
  [ModeEnum.ImageToPrompt]: calculateCostInStars(0.03, conversionRates),
  [ModeEnum.Avatar]: 0,
  [ModeEnum.ChatWithAvatar]: calculateCostInStars(0, conversionRates),
  [ModeEnum.SelectModel]: calculateCostInStars(0, conversionRates),
  [ModeEnum.Voice]: calculateCostInStars(0.9, conversionRates),
  [ModeEnum.TextToSpeech]: calculateCostInStars(0.12, conversionRates),
  [ModeEnum.ImageToVideo]: calculateCostInStars(0, conversionRates),
  [ModeEnum.TextToVideo]: calculateCostInStars(0, conversionRates),
  [ModeEnum.TextToImage]: calculateCostInStars(0, conversionRates),
  [ModeEnum.LipSync]: calculateCostInStars(0.9, conversionRates),
  [ModeEnum.VoiceToText]: calculateCostInStars(0, conversionRates),
  [ModeEnum.SelectAiTextModel]: calculateCostInStars(0, conversionRates),
  [ModeEnum.SelectModelWizard]: calculateCostInStars(0, conversionRates),
  [ModeEnum.Subscribe]: calculateCostInStars(0, conversionRates),
  [ModeEnum.NeuroAudio]: calculateCostInStars(0, conversionRates),
  [ModeEnum.ChangeSize]: calculateCostInStars(0, conversionRates),
  [ModeEnum.Invite]: calculateCostInStars(0, conversionRates),
  [ModeEnum.CheckBalanceScene]: calculateCostInStars(0, conversionRates),
}

export interface CostCalculationParams {
  mode: ModeEnum | string
  steps?: number
  numImages?: number
  modelId?: string
}

export interface CostCalculationResult {
  stars: number
  rubles: number
  dollars: number
}

export type CostValue = number | ((steps: number) => number)
// Определяем стоимость для каждого режима

export function calculateModeCost(
  params: CostCalculationParams
): CostCalculationResult {
  const { mode, steps = 0, numImages = 1 } = params

  try {
    let stars = 0

    let normalizedMode = mode
    if (mode === ModeEnum.NeuroPhotoV2) {
      normalizedMode = ModeEnum.NeuroPhotoV2
      logger.info({
        message: '🔄 Использован алиас режима',
        description: 'Mode alias used',
        originalMode: mode,
        normalizedMode,
      })
    }

    const costValue = BASE_COSTS[normalizedMode as keyof typeof BASE_COSTS]

    if (costValue === undefined) {
      logger.error({
        message: '❌ Неизвестный режим или стоимость не определена',
        description: 'Unknown mode or cost not defined in BASE_COSTS',
        mode,
        normalizedMode,
      })
      stars = 0
    } else {
      let numericCostValue: number
      if (typeof costValue === 'function') {
        if (steps === undefined || steps === null) {
          logger.error({
            message:
              '❌ Не передано количество шагов для режима с функцией стоимости',
            description: 'Steps parameter is missing for function-based cost',
            mode,
            normalizedMode,
          })
          numericCostValue = 0
        } else {
          numericCostValue = costValue(steps)
        }
      } else {
        numericCostValue = costValue
      }

      if (
        (normalizedMode === ModeEnum.DigitalAvatarBody ||
          normalizedMode === ModeEnum.DigitalAvatarBodyV2) &&
        steps
      ) {
        stars = numericCostValue * numImages
      } else {
        stars = numericCostValue * numImages
      }
    }

    // Дополнительные переопределения стоимости, если нужны
    if (mode === ModeEnum.VoiceToText) {
      stars = 5
    }

    stars = parseFloat(stars.toFixed(2))
    const dollars = parseFloat((stars * starCost).toFixed(2))
    const rubles = parseFloat((dollars * SYSTEM_CONFIG.interestRate).toFixed(2))

    return { stars, dollars, rubles }
  } catch (error) {
    logger.error({
      message: '❌ Ошибка при расчете стоимости',
      description: 'Error during cost calculation',
      error: error instanceof Error ? error.message : 'Unknown error',
      mode,
      steps,
      numImages,
    })
    throw error
  }
}

export const modeCosts: Record<string, number | ((param?: any) => number)> = {
  [ModeEnum.DigitalAvatarBody]: (steps: number) =>
    calculateModeCost({ mode: ModeEnum.DigitalAvatarBody, steps }).stars,
  [ModeEnum.DigitalAvatarBodyV2]: (steps: number) =>
    calculateModeCost({ mode: ModeEnum.DigitalAvatarBodyV2, steps }).stars,
  [ModeEnum.NeuroPhoto]: calculateModeCost({ mode: ModeEnum.NeuroPhoto }).stars,
  [ModeEnum.NeuroPhotoV2]: calculateModeCost({ mode: ModeEnum.NeuroPhotoV2 })
    .stars,
  [ModeEnum.NeuroAudio]: calculateModeCost({ mode: ModeEnum.NeuroAudio }).stars,
  neuro_photo_2: calculateModeCost({ mode: ModeEnum.NeuroPhotoV2 }).stars,
  [ModeEnum.ImageToPrompt]: calculateModeCost({ mode: ModeEnum.ImageToPrompt })
    .stars,
  [ModeEnum.Avatar]: calculateModeCost({ mode: ModeEnum.Avatar }).stars,
  [ModeEnum.ChatWithAvatar]: calculateModeCost({
    mode: ModeEnum.ChatWithAvatar,
  }).stars,
  [ModeEnum.SelectModel]: calculateModeCost({ mode: ModeEnum.SelectModel })
    .stars,
  [ModeEnum.SelectAiTextModel]: calculateModeCost({
    mode: ModeEnum.SelectAiTextModel,
  }).stars,
  [ModeEnum.Voice]: calculateModeCost({ mode: ModeEnum.Voice }).stars,
  [ModeEnum.TextToSpeech]: calculateModeCost({ mode: ModeEnum.TextToSpeech })
    .stars,
  [ModeEnum.ImageToVideo]: calculateModeCost({ mode: ModeEnum.ImageToVideo })
    .stars,
  [ModeEnum.TextToVideo]: calculateModeCost({ mode: ModeEnum.TextToVideo })
    .stars,
  [ModeEnum.TextToImage]: calculateModeCost({ mode: ModeEnum.TextToImage })
    .stars,
  [ModeEnum.LipSync]: calculateModeCost({ mode: ModeEnum.LipSync }).stars,
  [ModeEnum.VoiceToText]: calculateModeCost({ mode: ModeEnum.VoiceToText })
    .stars,
}
// Найдите минимальную и максимальную стоимость среди всех моделей
export const minCost = Math.min(
  ...Object.values(modeCosts).map(cost =>
    typeof cost === 'function' ? cost() : cost
  )
)
export const maxCost = Math.max(
  ...Object.values(modeCosts).map(cost =>
    typeof cost === 'function' ? cost() : cost
  )
)
export const checkBalanceScene = new Scenes.BaseScene<MyContext>(
  ModeEnum.CheckBalanceScene
)

// Функция для получения числового значения стоимости
function getCostValue(cost: number | ((param?: any) => number)): number {
  return typeof cost === 'function' ? cost() : cost
}
