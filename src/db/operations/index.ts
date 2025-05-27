// Экспорт всех Drizzle операций
export * from './users'
export * from './payments'
export * from './model-trainings'

// Объединенный экспорт для удобства
import { drizzleUsers } from './users'
import { drizzlePayments } from './payments'
import { drizzleModelTrainings } from './model-trainings'

export const drizzleORM = {
  users: drizzleUsers,
  payments: drizzlePayments,
  modelTrainings: drizzleModelTrainings,
}
