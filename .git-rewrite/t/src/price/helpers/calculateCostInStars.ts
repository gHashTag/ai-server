import { starCost } from './modelsCost'
// Функция для расчета стоимости в звездах
export function calculateCostInStars(costInDollars: number): number {
  return costInDollars / starCost
}
