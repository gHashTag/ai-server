export const conversionRates = {
  costPerStarInDollars: 0.016, // Стоимость одной звезды в долларах
  costPerStepInStars: 0.5, // Стоимость за шаг в звездах
  rublesToDollarsRate: 100, // 100 рублей = 1 доллар
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

const stepOptions = [
  1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000,
]

export const costDetails = stepOptions.map(steps => {
  const costInRubles = calculateTrainingCostInRubles(steps)
  const costInStars = calculateTrainingCostInStars(steps)
  const costInDollars = calculateTrainingCostInDollars(steps)

  return {
    steps,
    stars: costInStars.toFixed(0), // Форматируем до двух знаков после запятой
    rubles: costInRubles.toFixed(0), // Форматируем до двух знаков после запятой
    dollars: costInDollars.toFixed(0), // Форматируем до двух знаков после запятой
  }
})

// Функция для расчета стоимости в звездах
export function calculateTrainingCostInStars(steps: number): number {
  const totalCostInStars = conversionRates.costPerStepInStars * steps // Умножаем количество шагов на стоимость за шаг в звездах
  return parseFloat(totalCostInStars.toFixed(2))
}

// Функция для расчета стоимости в рублях
export function calculateTrainingCostInRubles(steps: number): number {
  return (
    steps *
    conversionRates.costPerStepInStars *
    conversionRates.costPerStarInDollars *
    conversionRates.rublesToDollarsRate
  ) // Умножаем количество шагов на стоимость за шаг в рублях
}

export function calculateTrainingCostInDollars(steps: number): number {
  return (
    steps *
    conversionRates.costPerStepInStars *
    conversionRates.costPerStarInDollars
  ) // Умножаем количество шагов на стоимость за шаг в долларах
}
