import { VIDEO_MODELS_CONFIG } from '@/helpers/VIDEO_MODELS'
import { SYSTEM_CONFIG } from '@/price/helpers/modelsCost'

// Функция для расчета окончательной стоимости модели
export function calculateFinalPrice(modelId: string): number {
  const model = VIDEO_MODELS_CONFIG[modelId]
  const finalPrice = model.basePrice * (1 + SYSTEM_CONFIG.interestRate)
  return Math.floor(finalPrice / SYSTEM_CONFIG.starCost)
}
