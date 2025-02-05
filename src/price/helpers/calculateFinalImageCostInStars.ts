import { starCost, interestRate } from '..'

export function calculateFinalImageCostInStars(baseCost: number): number {
  const finalCostInDollars = baseCost * (1 + interestRate)
  return Math.ceil(finalCostInDollars / starCost)
}
