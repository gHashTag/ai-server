import { supabase } from './index'
import { logger } from '@/utils/logger'
import { PaymentType } from '@/interfaces/payments.interface'

/**
 * Категории расходов фермы ботов
 */
export enum ExpenseCategory {
  PERSONAL = 'PERSONAL', // Личные расходы
  SHARED = 'SHARED', // Общие расходы проекта
  INFRASTRUCTURE = 'INFRASTRUCTURE', // Инфраструктура
  AI_SERVICES = 'AI_SERVICES', // AI сервисы
  DEVELOPMENT = 'DEVELOPMENT', // Разработка
  HOSTING = 'HOSTING', // Хостинг
  OTHER = 'OTHER', // Прочие
}

/**
 * Тип расхода для фермы ботов
 */
export enum ExpenseType {
  CLOUDCONVERT = 'CLOUDCONVERT',
  HOSTING = 'HOSTING',
  AI_API = 'AI_API',
  DEVELOPMENT_TOOLS = 'DEVELOPMENT_TOOLS',
  VOICE_GENERATION = 'VOICE_GENERATION',
  IMAGE_GENERATION = 'IMAGE_GENERATION',
  VIDEO_GENERATION = 'VIDEO_GENERATION',
  MUSIC_GENERATION = 'MUSIC_GENERATION',
  DATABASE = 'DATABASE',
  STORAGE = 'STORAGE',
  TUNNELING = 'TUNNELING',
  RESEARCH = 'RESEARCH',
  OTHER = 'OTHER',
}

/**
 * Интерфейс для расхода фермы ботов
 */
export interface BotFarmExpense {
  date: string // Дата в формате 'YYYY-MM-DD' или 'DD/MM/YYYY'
  name: string // Название расхода
  amount: number // Сумма в исходной валюте
  currency: string // Валюта (THB, USD, RUB и т.д.)
  description: string // Описание
  purpose: string // Для чего нужно
  url?: string // Ссылка на магазин/сервис
  category: ExpenseCategory // Категория расхода
  expenseType: ExpenseType // Тип расхода
}

/**
 * Конвертирует дату из формата DD/MM в YYYY-MM-DD
 */
function convertDateFormat(
  dateStr: string,
  year: number = new Date().getFullYear()
): string {
  // Если дата уже в формате YYYY-MM-DD, возвращаем как есть
  if (dateStr.includes('-') && dateStr.length === 10) {
    return dateStr
  }

  // Конвертируем из DD/MM в YYYY-MM-DD
  const [day, month] = dateStr.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/**
 * Определяет категорию расхода на основе типа
 */
function determineCategory(expenseType: ExpenseType): ExpenseCategory {
  switch (expenseType) {
    case ExpenseType.AI_API:
    case ExpenseType.VOICE_GENERATION:
    case ExpenseType.IMAGE_GENERATION:
    case ExpenseType.VIDEO_GENERATION:
    case ExpenseType.MUSIC_GENERATION:
      return ExpenseCategory.AI_SERVICES

    case ExpenseType.HOSTING:
    case ExpenseType.DATABASE:
    case ExpenseType.STORAGE:
    case ExpenseType.TUNNELING:
      return ExpenseCategory.INFRASTRUCTURE

    case ExpenseType.DEVELOPMENT_TOOLS:
      return ExpenseCategory.DEVELOPMENT

    case ExpenseType.RESEARCH:
      return ExpenseCategory.SHARED

    default:
      return ExpenseCategory.OTHER
  }
}

/**
 * Определяет тип расхода на основе названия сервиса
 */
function determineExpenseType(name: string): ExpenseType {
  const nameUpper = name.toUpperCase()

  if (nameUpper.includes('OPENAI') || nameUpper.includes('CHATGPT')) {
    return ExpenseType.AI_API
  }
  if (nameUpper.includes('ELEVENLABS')) {
    return ExpenseType.VOICE_GENERATION
  }
  if (
    nameUpper.includes('REPLICATE') ||
    nameUpper.includes('RUNWAY') ||
    nameUpper.includes('HEYGEN') ||
    nameUpper.includes('HEDRA')
  ) {
    return ExpenseType.VIDEO_GENERATION
  }
  if (nameUpper.includes('SUNO') || nameUpper.includes('JAMMABLE')) {
    return ExpenseType.MUSIC_GENERATION
  }
  if (nameUpper.includes('CLOUDCONVERT')) {
    return ExpenseType.CLOUDCONVERT
  }
  if (nameUpper.includes('ELEST') || nameUpper.includes('HOSTING')) {
    return ExpenseType.HOSTING
  }
  if (
    nameUpper.includes('CURSOR') ||
    nameUpper.includes('WARP') ||
    nameUpper.includes('AUGMENT')
  ) {
    return ExpenseType.DEVELOPMENT_TOOLS
  }
  if (nameUpper.includes('PINECONE')) {
    return ExpenseType.DATABASE
  }
  if (nameUpper.includes('NGROK')) {
    return ExpenseType.TUNNELING
  }
  if (nameUpper.includes('HIGGSFIELD')) {
    return ExpenseType.RESEARCH
  }
  if (nameUpper.includes('OBSIDIAN') || nameUpper.includes('STORAGE')) {
    return ExpenseType.STORAGE
  }

  return ExpenseType.OTHER
}

/**
 * Добавляет расход фермы ботов в таблицу payments_v2
 *
 * @param expense - Данные расхода
 * @returns Promise<boolean> - успешно ли добавлен расход
 */
export const addBotFarmExpense = async (
  expense: Omit<BotFarmExpense, 'category' | 'expenseType'>
): Promise<boolean> => {
  try {
    // Автоматически определяем тип и категорию расхода
    const expenseType = determineExpenseType(expense.name)
    const category = determineCategory(expenseType)

    // Конвертируем дату в правильный формат
    const paymentDate = convertDateFormat(expense.date, 2024) // Предполагаем 2024 год для майских расходов

    // Генерируем уникальный inv_id для системного расхода
    const invId = `farm_expense_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`

    console.log('💰 Добавление расхода фермы ботов:', {
      name: expense.name,
      amount: expense.amount,
      currency: expense.currency,
      category,
      expenseType,
      paymentDate,
    })

    // Проверяем подключение к Supabase
    if (!supabase) {
      console.error('❌ Supabase client не инициализирован')
      return false
    }

    // Добавляем запись в payments_v2
    const { data, error } = await supabase
      .from('payments_v2')
      .insert({
        inv_id: invId,
        telegram_id: 'SYSTEM_BOT_FARM', // Специальный ID для расходов фермы ботов
        bot_name: 'bot_farm_manager',
        amount: expense.amount,
        stars: 0, // Для системных расходов звезды не используются
        currency: expense.currency,
        status: 'COMPLETED',
        type: 'MONEY_OUTCOME', // Все расходы - это MONEY_OUTCOME
        payment_method: 'System',
        description: `${expense.name}: ${expense.description}`,
        metadata: {
          expense_category: category,
          expense_type: expenseType,
          purpose: expense.purpose,
          original_name: expense.name,
          url: expense.url || null,
          is_bot_farm_expense: true,
          processed_at: new Date().toISOString(),
        },
        subscription_type: null, // Не связано с подпиской
        service_type: null, // Не связано с пользовательскими сервисами
        payment_date: new Date(paymentDate),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .select() // Возвращаем созданную запись

    if (error) {
      console.error('❌ Ошибка при добавлении расхода фермы ботов:', {
        name: expense.name,
        error: error.message,
        error_details: error,
        error_code: error.code,
        error_hint: error.hint,
      })
      return false
    }

    console.log('✅ Расход фермы ботов успешно добавлен:', {
      name: expense.name,
      amount: expense.amount,
      currency: expense.currency,
      category,
      expenseType,
      inv_id: invId,
      record_id: data?.[0]?.id,
    })

    return true
  } catch (error) {
    console.error('❌ Критическая ошибка в addBotFarmExpense:', {
      error: error instanceof Error ? error.message : String(error),
      expense_name: expense.name,
      stack: error instanceof Error ? error.stack : undefined,
    })
    return false
  }
}

/**
 * Добавляет массив расходов фермы ботов
 *
 * @param expenses - Массив расходов
 * @returns Promise<{ success: number, failed: number, errors: string[] }>
 */
export const addMultipleBotFarmExpenses = async (
  expenses: Array<Omit<BotFarmExpense, 'category' | 'expenseType'>>
): Promise<{ success: number; failed: number; errors: string[] }> => {
  let successCount = 0
  let failedCount = 0
  const errors: string[] = []

  console.log('📊 Начинаем обработку массива расходов фермы ботов:', {
    total_count: expenses.length,
  })

  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i]
    console.log(`\n⏳ Обработка ${i + 1}/${expenses.length}: ${expense.name}`)

    const result = await addBotFarmExpense(expense)

    if (result) {
      successCount++
      console.log(
        `✅ ${i + 1}/${expenses.length}: ${expense.name} - успешно добавлен`
      )
    } else {
      failedCount++
      const errorMsg = `Не удалось добавить расход: ${expense.name}`
      errors.push(errorMsg)
      console.log(`❌ ${i + 1}/${expenses.length}: ${expense.name} - ошибка`)
    }

    // Небольшая пауза между запросами, чтобы не перегружать БД
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log('\n📈 Завершена обработка расходов фермы ботов:', {
    total: expenses.length,
    success: successCount,
    failed: failedCount,
  })

  return { success: successCount, failed: failedCount, errors }
}
