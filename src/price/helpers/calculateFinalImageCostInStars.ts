import { starCost, interestRate } from './modelsCost'

export function calculateFinalImageCostInStars(baseCost: number): number {
  const finalCostInDollars = baseCost * (1 + interestRate)
  return Math.floor(finalCostInDollars / starCost) // ← ИСПРАВЛЕНО: ceil → floor (справедливое округление в пользу пользователя)
}
