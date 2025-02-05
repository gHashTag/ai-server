export const costPerStepInStars = 1.47

const companyInterestRate = 2.0 // Добавляем интерес компании 200%

export function calculateTrainingCostInStars(steps: number): number {
  const totalCostInStars = steps * costPerStepInStars
  const totalCostWithInterest = totalCostInStars * (1 + companyInterestRate) // Учитываем интерес компании

  // Округляем до одного знака после запятой
  return parseFloat(totalCostWithInterest.toFixed(2)) // Возвращаем стоимость с учетом интереса
}

export function calculateTrainingCostInDollars(steps: number): number {
  const totalCostInStars = steps * costPerStepInStars

  // Округляем до одного знака после запятой
  return parseFloat(totalCostInStars.toFixed(2))
}
export function calculateTrainingCostInRub(steps: number): number {
  const totalCostInStars = steps * costPerStepInStars

  // Округляем до одного знака после запятой
  return parseFloat(totalCostInStars.toFixed(2))
}
