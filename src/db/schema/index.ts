// Экспорт всех Drizzle схем
export * from './users'
export * from './payments'
export * from './model-trainings'

// Объединенный экспорт схем для удобства
import { users } from './users'
import { paymentsV2 } from './payments'
import { modelTrainings } from './model-trainings'

export const schema = {
  users,
  paymentsV2,
  modelTrainings,
}
