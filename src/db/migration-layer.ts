/**
 * Миграционный слой для плавного перехода на Drizzle ORM
 *
 * Этот файл содержит wrapper функции, которые обеспечивают:
 * 1. Обратную совместимость со старым кодом
 * 2. Постепенную миграцию функций
 * 3. Единый интерфейс для работы с БД
 */

import { drizzleORM } from './operations'
import {
  TelegramId,
  normalizeTelegramId,
} from '@/interfaces/telegram.interface'
import { PaymentType } from '@/interfaces/payments.interface'
import { ModeEnum } from '@/interfaces/modes'

// ============================================================================
// ПОЛЬЗОВАТЕЛИ (Users)
// ============================================================================

/**
 * Получить пользователя по Telegram ID
 * Wrapper для плавного перехода на Drizzle
 */
export const getUserByTelegramId = async (telegram_id: TelegramId) => {
  const normalizedId = normalizeTelegramId(telegram_id)
  return await drizzleORM.users.findByTelegramId(normalizedId)
}

/**
 * Создать нового пользователя
 * Wrapper для плавного перехода на Drizzle
 */
export const createUser = async (userData: {
  telegram_id: TelegramId
  username?: string
  first_name?: string
  last_name?: string
  language_code?: string
  level?: number
  gender?: 'male' | 'female'
  bot_name?: string
}) => {
  const normalizedData = {
    ...userData,
    telegram_id: normalizeTelegramId(userData.telegram_id),
  }
  return await drizzleORM.users.insert(normalizedData)
}

/**
 * Обновить пользователя
 * Wrapper для плавного перехода на Drizzle
 */
export const updateUser = async (
  telegram_id: TelegramId,
  updateData: {
    username?: string
    first_name?: string
    last_name?: string
    language_code?: string
    level?: number
    gender?: 'male' | 'female'
    bot_name?: string
  }
) => {
  const normalizedId = normalizeTelegramId(telegram_id)
  return await drizzleORM.users.update(normalizedId, updateData)
}

// ============================================================================
// ПЛАТЕЖИ (Payments)
// ============================================================================

/**
 * Получить баланс пользователя
 * Wrapper для плавного перехода на Drizzle
 */
export const getUserBalance = async (
  telegram_id: TelegramId
): Promise<number> => {
  const normalizedId = normalizeTelegramId(telegram_id)
  return await drizzleORM.payments.getUserBalance(normalizedId)
}

/**
 * Обновить баланс пользователя (создать платеж)
 * Wrapper для плавного перехода на Drizzle
 */
export const updateUserBalance = async (
  telegram_id: TelegramId,
  amount: number,
  type: PaymentType,
  description: string,
  metadata?: {
    stars: number
    payment_method: string
    bot_name?: string
    language?: string
    service_type?: ModeEnum | string
    operation_id?: string
    category?: string
    cost?: number
  }
) => {
  const normalizedId = normalizeTelegramId(telegram_id)

  const paymentData = {
    telegram_id: normalizedId,
    bot_name: metadata?.bot_name || 'unknown',
    amount: amount,
    stars: metadata?.stars || amount,
    currency: 'STARS',
    status: 'COMPLETED' as const,
    type: type as 'MONEY_INCOME' | 'MONEY_OUTCOME' | 'REFUND',
    payment_method: metadata?.payment_method || 'System',
    description,
    service_type: metadata?.service_type,
    metadata: metadata
      ? {
          language: metadata.language,
          operation_id: metadata.operation_id,
          category: metadata.category,
          cost: metadata.cost,
        }
      : undefined,
  }

  return await drizzleORM.payments.insert(paymentData)
}

/**
 * Создать платеж
 * Wrapper для плавного перехода на Drizzle
 */
export const createPayment = async (paymentData: {
  telegram_id: TelegramId
  bot_name: string
  amount?: number
  stars?: number
  currency?: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  type: 'MONEY_INCOME' | 'MONEY_OUTCOME' | 'REFUND'
  payment_method?: string
  description?: string
  metadata?: Record<string, any>
  subscription_type?: 'NEUROPHOTO' | 'NEUROBASE' | 'NEUROTESTER'
  service_type?: string
  payment_date?: Date
}) => {
  const normalizedData = {
    ...paymentData,
    telegram_id: normalizeTelegramId(paymentData.telegram_id),
  }
  return await drizzleORM.payments.insert(normalizedData)
}

// ============================================================================
// ТРЕНИРОВКИ МОДЕЛЕЙ (Model Trainings)
// ============================================================================

/**
 * Создать тренировку модели
 * Wrapper для плавного перехода на Drizzle
 */
export const createModelTraining = async (trainingData: {
  telegram_id: TelegramId
  model_name: string
  trigger_word: string
  zip_url: string
  steps: number
  status: 'starting' | 'processing' | 'SUCCESS' | 'FAILED' | 'canceled'
  gender?: 'male' | 'female'
  bot_name?: string
  replicate_training_id?: string
  model_url?: string
}) => {
  const normalizedData = {
    ...trainingData,
    telegram_id: normalizeTelegramId(trainingData.telegram_id),
  }
  return await drizzleORM.modelTrainings.insert(normalizedData)
}

/**
 * Получить тренировку с данными пользователя
 * Wrapper для плавного перехода на Drizzle
 */
export const getTrainingWithUser = async (
  telegram_id: TelegramId,
  model_name: string
) => {
  const normalizedId = normalizeTelegramId(telegram_id)
  return await drizzleORM.modelTrainings.getTrainingWithUser(
    normalizedId,
    model_name
  )
}

/**
 * Обновить тренировку модели
 * Wrapper для плавного перехода на Drizzle
 */
export const updateModelTraining = async (
  id: string,
  updateData: {
    status?: 'starting' | 'processing' | 'SUCCESS' | 'FAILED' | 'canceled'
    replicate_training_id?: string
    model_url?: string
    gender?: 'male' | 'female'
    bot_name?: string
  }
) => {
  return await drizzleORM.modelTrainings.update(id, updateData)
}

/**
 * Обновить тренировку по Replicate ID
 * Wrapper для плавного перехода на Drizzle
 */
export const updateModelTrainingByReplicateId = async (
  replicate_id: string,
  updateData: {
    status?: 'starting' | 'processing' | 'SUCCESS' | 'FAILED' | 'canceled'
    model_url?: string
  }
) => {
  return await drizzleORM.modelTrainings.updateByReplicateId(
    replicate_id,
    updateData
  )
}

/**
 * Найти тренировку по Replicate ID
 * Wrapper для плавного перехода на Drizzle
 */
export const findModelTrainingByReplicateId = async (replicate_id: string) => {
  return await drizzleORM.modelTrainings.findByReplicateId(replicate_id)
}

// ============================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// ============================================================================

/**
 * Обновить уровень пользователя (legacy)
 * Wrapper для обратной совместимости
 */
export const updateUserLevelPlusOne = async (
  telegram_id: TelegramId,
  currentLevel: number
) => {
  const normalizedId = normalizeTelegramId(telegram_id)
  return await drizzleORM.users.update(normalizedId, {
    level: currentLevel + 1,
  })
}

/**
 * Обновить последнюю тренировку модели (legacy)
 * Wrapper для обратной совместимости
 */
export const updateLatestModelTraining = async (
  telegram_id: TelegramId,
  model_name: string,
  updateData: {
    status?: string
    model_url?: string
    replicate_training_id?: string
  },
  source = 'drizzle'
) => {
  // Находим последнюю тренировку пользователя с указанным именем модели
  const trainings = await drizzleORM.modelTrainings.findByTelegramId(
    normalizeTelegramId(telegram_id)
  )

  const latestTraining = trainings
    .filter(t => t.model_name === model_name)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

  if (!latestTraining) {
    throw new Error(`No training found for model ${model_name}`)
  }

  return await drizzleORM.modelTrainings.update(latestTraining.id, updateData)
}

// ============================================================================
// ЭКСПОРТ ВСЕХ ФУНКЦИЙ
// ============================================================================

export const drizzleMigrationLayer = {
  // Users
  getUserByTelegramId,
  createUser,
  updateUser,
  updateUserLevelPlusOne,

  // Payments
  getUserBalance,
  updateUserBalance,
  createPayment,

  // Model Trainings
  createModelTraining,
  getTrainingWithUser,
  updateModelTraining,
  updateModelTrainingByReplicateId,
  findModelTrainingByReplicateId,
  updateLatestModelTraining,
}
