import { VIDEO_MODELS } from '@/helpers/VIDEO_MODELS'

import { VideoModel } from '@/interfaces'

import { starCost, interestRate } from './modelsCost'

// Функция для расчета окончательной стоимости модели
export function calculateFinalPrice(model: VideoModel): number {
  const basePrice = VIDEO_MODELS[model]
  const finalPrice = basePrice * (1 + interestRate)
  return Math.floor(finalPrice / starCost)
}
