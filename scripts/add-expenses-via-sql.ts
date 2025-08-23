#!/usr/bin/env bun

/**
 * Скрипт для добавления расходов через прямые SQL запросы
 * Обходит проблемы с API ключом
 */

import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env' })

// Генерируем SQL для вставки расходов
const mayExpenses = [
  {
    date: '01/05',
    name: 'CLOUDCONVERT',
    amount: 309.13,
    currency: 'THB',
    description: 'Конвертация файлов',
    purpose:
      'Используется для преобразования файлов в нужные форматы для работы с данными.',
    url: 'CloudConvert',
    category: 'INFRASTRUCTURE',
    expenseType: 'CLOUDCONVERT',
  },
  {
    date: '01/05',
    name: 'ELEST.IO',
    amount: 1030.43,
    currency: 'THB',
    description: 'Хостинг и инструменты',
    purpose: 'Хостинг и управление проектами для разработки.',
    url: 'Elest',
    category: 'HOSTING',
    expenseType: 'HOSTING',
  },
  {
    date: '07/05',
    name: 'OPENAI',
    amount: 17282.83,
    currency: 'THB',
    description: 'AI API / ChatGPT',
    purpose: 'Генерация текстов и взаимодействие с пользователями.',
    url: 'OpenAI',
    category: 'AI_SERVICES',
    expenseType: 'AI_API',
  },
  // Добавим остальные позже, сначала проверим на нескольких
]

function generateInsertSQL(expenses: any[]): string {
  const values = expenses
    .map(expense => {
      const invId = `farm_expense_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`
      const paymentDate = `2024-05-${expense.date
        .split('/')[0]
        .padStart(2, '0')}`

      return `(
      '${invId}',
      'SYSTEM_BOT_FARM',
      'bot_farm_manager',
      ${expense.amount},
      0,
      '${expense.currency}',
      'COMPLETED',
      'MONEY_OUTCOME',
      'System',
      '${expense.name}: ${expense.description.replace(/'/g, "''")}',
      '{"expense_category": "${expense.category}", "expense_type": "${
        expense.expenseType
      }", "purpose": "${expense.purpose.replace(
        /'/g,
        "''"
      )}", "original_name": "${expense.name}", "url": "${
        expense.url
      }", "is_bot_farm_expense": true, "processed_at": "${new Date().toISOString()}"}',
      NULL,
      NULL,
      '${paymentDate}T00:00:00.000Z',
      NOW(),
      NOW()
    )`
    })
    .join(',\n')

  return `
INSERT INTO payments_v2 (
  inv_id,
  telegram_id,
  bot_name,
  amount,
  stars,
  currency,
  status,
  type,
  payment_method,
  description,
  metadata,
  subscription_type,
  service_type,
  payment_date,
  created_at,
  updated_at
) VALUES ${values};
`
}

async function main() {
  console.log('🚀 Генерируем SQL для добавления расходов фермы ботов...')

  const sql = generateInsertSQL(mayExpenses)

  console.log('📝 Сгенерированный SQL:')
  console.log('='.repeat(60))
  console.log(sql)
  console.log('='.repeat(60))

  console.log('\n📋 Инструкции:')
  console.log('1. Скопируйте SQL выше')
  console.log('2. Откройте Supabase Dashboard → SQL Editor')
  console.log('3. Вставьте и выполните SQL')
  console.log('4. Проверьте результат командой:')
  console.log(
    "   SELECT * FROM payments_v2 WHERE telegram_id = 'SYSTEM_BOT_FARM';"
  )
}

main().catch(console.error)
